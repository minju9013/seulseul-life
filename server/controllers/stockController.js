// 재고(Stock) 관련 비즈니스 로직
const Item = require('../models/Item');
const { applyStockChange } = require('../utils/stockService');
const { serializeItem } = require('../utils/serializeItem');

// PUT /api/stocks/:itemId
// - quantity 를 받아 해당 아이템의 재고를 업데이트
// - 변경 이력 기록 및 소진율/예상 소진일 계산은 stockService 가 담당
async function updateStock(req, res, next) {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || quantity === null) {
      return res.status(400).json({ message: 'quantity 값이 필요합니다.' });
    }

    const nextQuantity = Number(quantity);
    if (Number.isNaN(nextQuantity) || nextQuantity < 0) {
      return res.status(400).json({ message: 'quantity는 0 이상의 숫자여야 합니다.' });
    }

    const item = await Item.findById(itemId).lean();
    const threshold = item?.lowStockThreshold ?? 1;

    const stock = await applyStockChange({ itemId, nextQuantity, threshold });

    // 아이템이 없더라도 재고 변경 자체는 반영하고, 최소 정보만 응답
    if (!item) {
      return res.json({
        id: String(itemId),
        quantity: stock.quantity,
        status: stock.status,
        consumptionRate: stock.consumptionRate ?? null,
        estimatedRunOut: stock.estimatedRunOut ?? null,
        lastUpdated: stock.lastUpdated,
      });
    }

    // 클라이언트가 카드 한 개를 갱신하기에 충분한 평탄한 형태로 응답
    res.json(serializeItem(item, stock));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  updateStock,
};
