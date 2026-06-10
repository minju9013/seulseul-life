import { apiFetch } from './http';

export function getPreferences() {
  return apiFetch('/preferences');
}

export function putPreferences(payload) {
  return apiFetch('/preferences', { method: 'PUT', body: payload });
}

// 현재 로그인한 사용자/가구 정보
export function getMe() {
  return apiFetch('/auth/me');
}
