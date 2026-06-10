// 서버 API 클라이언트
// - 모든 호출은 /api/* 로 보내고, Vite dev 서버의 프록시로 백엔드(4000) 에 도달한다.
// - 인증 토큰 부착/에러 처리는 공통 래퍼(apiFetch)가 담당한다.
// - 서버 응답은 이미 평탄화된 형태({ id, name, categoryId, image, quantity, status, ... }).
import { apiFetch, ApiError } from './http';

// 품목 목록 조회 (전체 또는 카테고리별)
export function listItems(categoryId) {
  const qs = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : '';
  return apiFetch(`/items${qs}`);
}

// 새 품목 생성
export function createItem(payload) {
  return apiFetch('/items', { method: 'POST', body: payload });
}

// 품목 수정 (이름/카테고리/이미지/수량 등)
export function updateItem(id, payload) {
  return apiFetch(`/items/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: payload,
  });
}

// 품목 삭제
export function deleteItem(id) {
  return apiFetch(`/items/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// 수량만 빠르게 변경 (스피너용)
export function updateStock(itemId, quantity) {
  return apiFetch(`/stocks/${encodeURIComponent(itemId)}`, {
    method: 'PUT',
    body: { quantity },
  });
}

// 이미지 파일을 서버로 업로드 → 서버가 Cloudinary 로 보낸 뒤 { url, publicId } 반환
export function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  return apiFetch('/uploads/image', { method: 'POST', body: formData, isForm: true });
}

export { ApiError };
