import { createClient } from '@supabase/supabase-js';

// Supabase 프로젝트 URL / anon key (.env 의 VITE_SUPABASE_* 로 주입)
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 환경변수가 없으면 null. 앱은 "인증 설정 안내" 화면을 보여준다.
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

// 인증이 설정되어 있는지 여부
export const isAuthConfigured = Boolean(supabase);
