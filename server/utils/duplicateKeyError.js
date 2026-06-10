// 품목 unique 인덱스(categoryId+name) 위반 시 보내는 메시지
const DUPLICATE_ITEM_MESSAGE =
  '같은 카테고리에 동일한 이름의 품목이 이미 있습니다.';

// MongoDB 중복키 에러(11000)이면 409 응답을 보내고 true 를 반환한다.
// 그 외 에러면 false 를 반환해 호출부가 next(err)로 넘기도록 한다.
function sendIfDuplicateKey(res, err) {
  if (err && err.code === 11000) {
    res.status(409).json({ message: DUPLICATE_ITEM_MESSAGE });
    return true;
  }
  return false;
}

module.exports = {
  DUPLICATE_ITEM_MESSAGE,
  sendIfDuplicateKey,
};
