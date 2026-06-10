// 재고 아이템이 속할 수 있는 카테고리 목록
// DB에 저장하지 않고, 상수로만 관리한다.
const CATEGORIES = [
  { id: 'cosmetics', name: '화장품', icon: '💄', order: 1 },
  { id: 'bathroom', name: '욕실용품', icon: '🧼', order: 2 },
  // 기본 탭에서는 숨김. 기존 품목·커스텀 설정 호환용으로 id 는 유지한다.
  { id: 'tissue', name: '휴지', icon: '🧻', order: 3 },
  { id: 'laundry', name: '세탁청소용품', icon: '🧺', order: 4 },
  { id: 'kitchen', name: '주방용품', icon: '🍽️', order: 5 },
];

// 유효한 카테고리 id 목록 (검증용)
const VALID_CATEGORY_IDS = CATEGORIES.map((c) => c.id);

// 다른 모듈에서 불러다 쓸 수 있도록 export
module.exports = {
  CATEGORIES,
  VALID_CATEGORY_IDS,
};

