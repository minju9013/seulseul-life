// 부족 기준(임계값)을 1~99 정수 범위로 보정한다.
// 숫자로 변환할 수 없으면 fallback 을 반환한다.
function clampThreshold(value, fallback = 1) {
  const n = Number(value);
  if (Number.isNaN(n)) return fallback;
  return Math.min(99, Math.max(1, Math.round(n)));
}

module.exports = { clampThreshold };
