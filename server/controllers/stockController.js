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

    const item = await Item.findOne({
      _id: itemId,
      householdId: req.householdId,
    }).lean();

    // 다른 가구의 아이템이거나 존재하지 않으면 변경 불가
    if (!item) {
      return res
        .status(404)
        .json({ message: '해당 ID의 아이템을 찾을 수 없습니다.' });
    }

    const threshold = item.lowStockThreshold ?? 1;

    const stock = await applyStockChange({
      itemId,
      householdId: req.householdId,
      nextQuantity,
      threshold,
    });

    // 클라이언트가 카드 한 개를 갱신하기에 충분한 평탄한 형태로 응답
    res.json(serializeItem(item, stock));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  updateStock,
};
