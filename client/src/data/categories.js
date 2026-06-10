// 신규 사용자 기본 노출 카테고리: 전체 + 화장품, 욕실용품, 세탁청소용품, 주방용품
export const CATEGORIES = [
  { id: 'cosmetics', label: '화장품', emoji: '💄' },
  { id: 'bathroom', label: '욕실용품', emoji: '🧼' },
  { id: 'tissue', label: '휴지', emoji: '🧻' },
  { id: 'laundry', label: '세탁청소용품', emoji: '🧺' },
  { id: 'kitchen', label: '주방용품', emoji: '🍽️' },
];

// 기본 탭에서 숨기는 내장 카테고리 (override 로 이름을 지정하면 다시 노출)
export const DEFAULT_HIDDEN_BUILTIN_IDS = ['tissue'];

// "전체" 가상 카테고리. 실제 품목에는 이 categoryId 가 들어가지 않고,
// 화면에서 모든 카테고리의 품목을 한 번에 보여줄 때만 사용한다.
export const ALL_CATEGORY_ID = 'all';
export const ALL_CATEGORY = { id: ALL_CATEGORY_ID, label: '전체', emoji: '🗂️' };

export function getCategoryById(id) {
  if (id === ALL_CATEGORY_ID) return ALL_CATEGORY;
  return CATEGORIES.find((c) => c.id === id);
}
