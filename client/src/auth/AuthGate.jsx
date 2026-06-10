import React from 'react';
import { useAuth } from './AuthProvider';
import Login from './Login';
import './AuthGate.css';

// 인증 상태에 따라 로그인 화면 / 앱을 가른다.
function AuthGate({ children }) {
  const { isConfigured, loading, user } = useAuth();

  // Supabase 환경변수가 없으면 설정 안내
  if (!isConfigured) {
    return (
      <div className="auth-gate-message">
        <div className="auth-gate-card">
          <h2>인증 설정이 필요해요</h2>
          <p>
            <code>VITE_SUPABASE_URL</code> 과 <code>VITE_SUPABASE_ANON_KEY</code>{' '}
            환경변수를 설정한 뒤 다시 빌드해 주세요.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="auth-gate-splash" aria-busy="true">
        <div className="auth-gate-spinner" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return children;
}

export default AuthGate;
