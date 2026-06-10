// 재고 수량 변경에 관한 공용 로직
// - 수량 변경 + 이력 기록 + 소진율/예상 소진일 계산을 한 곳에서 처리한다.
// - itemController(updateItem)와 stockController(updateStock)가 함께 사용한다.
const Stock = require('../models/Stock');
const StockHistory = require('../models/StockHistory');

const DAY_MS = 1000 * 60 * 60 * 24;

// 최근 10개 이력 중 "수량이 감소한" 기록만 모아 하루 평균 소진량을 계산한다.
// 충분한 데이터가 없으면 undefined 를 반환한다(기존 값을 덮어쓰지 않기 위함).
async function computeConsumptionRate(itemId) {
  const histories = await StockHistory.find({ item: itemId })
    .sort({ changedAt: -1 })
    .limit(10)
    .lean();

  const decreasing = histories
    .filter((h) => h.quantityAfter < h.quantityBefore)
    .sort((a, b) => a.changedAt - b.changedAt); // 오래된 것부터 순서대로

  if (decreasing.length < 1) return undefined;

  const first = decreasing[0];
  const last = decreasing[decreasing.length - 1];

  const totalConsumed = decreasing.reduce(
    (sum, h) => sum + (h.quantityBefore - h.quantityAfter),
    0,
  );
  const totalDays = (last.changedAt - first.changedAt) / DAY_MS || 0;

  if (totalConsumed > 0 && totalDays > 0) {
    return totalConsumed / totalDays;
  }
  return undefined;
}

// 특정 아이템의 재고 수량을 nextQuantity 로 변경한다.
// - Stock 이 없으면 새로 만든다.
// - 수량이 실제로 바뀌면 StockHistory 에 이력을 남긴다.
// - 최근 이력으로 소진율/예상 소진일을 갱신한다.
// 상태(status)와 lastUpdated 는 Stock 모델의 pre('save') 훅이 자동 계산한다.
async function applyStockChange({ itemId, nextQuantity, threshold, now = new Date() }) {
  let stock = await Stock.findOne({ item: itemId });
  const quantityBefore = stock?.quantity ?? 0;

  if (!stock) {
    stock = new Stock({
      item: itemId,
      quantity: nextQuantity,
      lowStockThreshold: threshold,
    });
  } else {
    stock.quantity = nextQuantity;
    stock.lowStockThreshold = threshold;
  }

  if (quantityBefore !== nextQuantity) {
    await StockHistory.create({
      item: itemId,
      quantityBefore,
      quantityAfter: nextQuantity,
      changedAt: now,
    });
  }

  const consumptionRate = await computeConsumptionRate(itemId);
  if (consumptionRate && consumptionRate > 0) {
    stock.consumptionRate = consumptionRate;
    stock.estimatedRunOut =
      nextQuantity > 0
        ? new Date(now.getTime() + (nextQuantity / consumptionRate) * DAY_MS)
        : null;
  }

  await stock.save();
  return stock;
}

module.exports = {
  computeConsumptionRate,
  applyStockChange,
};
