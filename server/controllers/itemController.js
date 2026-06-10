// 품목(Item) 관련 비즈니스 로직
const Item = require('../models/Item');
const Stock = require('../models/Stock');
const StockHistory = require('../models/StockHistory');
const { destroyFromCloudinary } = require('../utils/cloudinary');
const { isValidCategoryId } = require('../utils/isValidCategoryId');
const { clampThreshold } = require('../utils/clampThreshold');
const { serializeItem } = require('../utils/serializeItem');
const { applyStockChange } = require('../utils/stockService');
const { sendIfDuplicateKey } = require('../utils/duplicateKeyError');

// GET /api/items
// - query.categoryId 로 카테고리 필터 가능
// - 각 아이템에 연결된 재고(Stock) 정보를 합쳐서 평탄한 형태로 반환
async function getItems(req, res, next) {
  try {
    const { categoryId } = req.query;

    const filter = {};
    if (categoryId) {
      filter.categoryId = categoryId;
    }

    const items = await Item.find(filter).sort({ order: 1, createdAt: 1 }).lean();
    const itemIds = items.map((item) => item._id);
    const stocks = await Stock.find({ item: { $in: itemIds } }).lean();
    const stockMap = new Map(stocks.map((stock) => [String(stock.item), stock]));

    const result = items.map((item) =>
      serializeItem(item, stockMap.get(String(item._id))),
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// POST /api/items
// - name, categoryId, unit, order, image, imagePublicId, quantity 로 Item + Stock 생성
async function createItem(req, res, next) {
  try {
    const {
      name,
      categoryId,
      unit,
      order,
      image,
      imagePublicId,
      quantity,
      lowStockThreshold,
      notes,
    } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({ message: 'name과 categoryId는 필수입니다.' });
    }

    if (!isValidCategoryId(categoryId)) {
      return res.status(400).json({ message: '유효하지 않은 categoryId입니다.' });
    }

    const initialQuantity = Math.max(0, Number(quantity ?? 0));
    const threshold = clampThreshold(lowStockThreshold, 1);

    const item = await Item.create({
      name: String(name).trim(),
      categoryId: String(categoryId).trim(),
      unit: unit || '개',
      order,
      lowStockThreshold: threshold,
      notes: notes !== undefined ? String(notes).slice(0, 500) : '',
      image: image || undefined,
      imagePublicId: imagePublicId || undefined,
    });

    const stock = await Stock.create({
      item: item._id,
      quantity: initialQuantity,
      lowStockThreshold: threshold,
    });

    if (initialQuantity > 0) {
      await StockHistory.create({
        item: item._id,
        quantityBefore: 0,
        quantityAfter: initialQuantity,
      });
    }

    res.status(201).json(serializeItem(item, stock));
  } catch (err) {
    if (sendIfDuplicateKey(res, err)) return;
    next(err);
  }
}

// PUT /api/items/:id
// - name, categoryId, image, imagePublicId, unit, order, quantity 까지 한 번에 수정 가능
async function updateItem(req, res, next) {
  try {
    const { id } = req.params;
    const {
      name,
      categoryId,
      image,
      imagePublicId,
      unit,
      order,
      quantity,
      lowStockThreshold,
      notes,
    } = req.body;

    const item = await Item.findById(id);
    if (!item) {
      return res
        .status(404)
        .json({ message: '해당 ID의 아이템을 찾을 수 없습니다.' });
    }

    // 이미지가 새로 들어오는 경우, 기존 Cloudinary 자원은 백그라운드로 정리
    const previousPublicId = item.imagePublicId;

    if (name !== undefined) item.name = String(name).trim();
    if (categoryId !== undefined) {
      if (!isValidCategoryId(categoryId)) {
        return res.status(400).json({ message: '유효하지 않은 categoryId입니다.' });
      }
      item.categoryId = String(categoryId).trim();
    }
    if (unit !== undefined) item.unit = unit;
    if (order !== undefined) item.order = order;
    if (lowStockThreshold !== undefined) {
      item.lowStockThreshold = clampThreshold(lowStockThreshold, item.lowStockThreshold ?? 1);
    }
    if (notes !== undefined) item.notes = String(notes).slice(0, 500);
    if (image !== undefined) item.image = image || undefined;
    if (imagePublicId !== undefined) item.imagePublicId = imagePublicId || undefined;

    await item.save();

    // 수량도 함께 들어오면 Stock 업데이트 + 이력 기록 (공용 헬퍼 사용)
    let stock = await Stock.findOne({ item: item._id });
    const threshold = item.lowStockThreshold ?? 1;

    if (quantity !== undefined) {
      const nextQuantity = Math.max(0, Number(quantity));
      stock = await applyStockChange({
        itemId: item._id,
        nextQuantity,
        threshold,
      });
    } else if (lowStockThreshold !== undefined && stock) {
      stock.lowStockThreshold = threshold;
      await stock.save();
    }

    // 이미지가 교체된 경우 이전 자원 정리 (실패해도 응답에는 영향 없음)
    if (
      image !== undefined &&
      previousPublicId &&
      previousPublicId !== item.imagePublicId
    ) {
      destroyFromCloudinary(previousPublicId).catch((cleanupErr) => {
        // eslint-disable-next-line no-console
        console.warn('이전 이미지 삭제 실패:', cleanupErr?.message);
      });
    }

    res.json(serializeItem(item, stock));
  } catch (err) {
    if (sendIfDuplicateKey(res, err)) return;
    next(err);
  }
}

// DELETE /api/items/:id
// - Item 삭제 시 연결된 Stock, StockHistory, Cloudinary 이미지까지 정리
async function deleteItem(req, res, next) {
  try {
    const { id } = req.params;

    const item = await Item.findByIdAndDelete(id);
    if (!item) {
      return res
        .status(404)
        .json({ message: '해당 ID의 아이템을 찾을 수 없습니다.' });
    }

    await Stock.deleteOne({ item: item._id });
    await StockHistory.deleteMany({ item: item._id });

    if (item.imagePublicId) {
      destroyFromCloudinary(item.imagePublicId).catch((cleanupErr) => {
        // eslint-disable-next-line no-console
        console.warn('이미지 삭제 실패:', cleanupErr?.message);
      });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getItems,
  createItem,
  updateItem,
  deleteItem,
};
