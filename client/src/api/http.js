// 서버 API 공통 fetch 래퍼
// - 모든 요청에 Supabase 액세스 토큰(Authorization: Bearer)을 자동으로 붙인다.
// - JSON / FormData 를 모두 지원하고, 에러를 ApiError 로 통일한다.
import { supabase } from '../lib/supabaseClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : '/api';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function parseJsonOrThrow(res) {
  if (res.status === 204) return null;
  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const message = body?.message || `요청 실패 (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return body;
}

async function authHeader() {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// path 는 '/items' 처럼 /api 이후 경로.
// options: { method, body, isForm }
//  - isForm=true 면 body 를 FormData 로 그대로 전송(Content-Type 자동)
export async function apiFetch(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = { ...(await authHeader()) };
  let payload;

  if (body !== undefined) {
    if (isForm) {
      payload = body;
    } else {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
  }

  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: payload });
  return parseJsonOrThrow(res);
}
