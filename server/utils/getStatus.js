// 현재 수량과 부족 기준(임계값)을 기반으로 재고 상태를 반환한다.
// - quantity <= 0 → '소진'
// - 1 ~ lowStockThreshold → '부족'
// - 그 외 → '충분'
// lowStockThreshold 기본 1 이면 기존 규칙(2개부터 넉넉)과 동일하다.
const { clampThreshold } = require('./clampThreshold');

function getStatus(quantity, lowStockThreshold = 1) {
  const q = Number(quantity) || 0;
  const t = clampThreshold(lowStockThreshold);
  if (q <= 0) return '소진';
  if (q <= t) return '부족';
  return '충분';
}

module.exports = {
  getStatus,
};

