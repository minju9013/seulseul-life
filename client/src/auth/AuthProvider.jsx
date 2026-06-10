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
      return supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: window.location.origin,
          // account_email 은 카카오 비즈앱/동의항목 설정이 없으면 400 오류가 난다.
          // 로그인에는 닉네임·프로필만으로 충분하다.
          scopes: 'profile_nickname profile_image',
        },
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
