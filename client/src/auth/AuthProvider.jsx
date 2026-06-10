import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, isAuthConfigured } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState(null);
  // 인증 미설정이면 로딩을 기다릴 필요가 없다.
  const [loading, setLoading] = useState(isAuthConfigured);

  useEffect(() => {
    if (!supabase) return undefined;

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession((prev) => {
        // 다른 사용자로 바뀌거나 로그아웃되면 React Query 캐시를 비워
        // 이전 가구의 데이터가 남지 않도록 한다.
        if (prev?.user?.id !== nextSession?.user?.id) {
          queryClient.clear();
        }
        return nextSession ?? null;
      });
      setLoading(false);
    });

    return () => {
      active = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [queryClient]);

  const value = useMemo(() => {
    const signInWithKakao = () => {
      if (!supabase) return Promise.resolve();
      // scopes 는 Supabase 서버가 관리한다. 클라이언트에서 넘기면 서버 scope 와
      // 중복·병합되어 account_email+profile_* 가 두 번 붙을 수 있다.
      // 이메일 제외는 Supabase Kakao 설정의 "Allow users without an email" 로 처리한다.
      return supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: { redirectTo: window.location.origin },
      });
    };

    const signOut = async () => {
      if (!supabase) return;
      await supabase.auth.signOut();
      queryClient.clear();
    };

    return {
      isConfigured: isAuthConfigured,
      session,
      user: session?.user ?? null,
      loading,
      signInWithKakao,
      signOut,
    };
  }, [session, loading, queryClient]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
