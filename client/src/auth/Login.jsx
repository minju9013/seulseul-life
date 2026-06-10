import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import './Login.css';

function Login() {
  const { signInWithKakao } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleKakao = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const { error: signInError } = (await signInWithKakao()) || {};
      if (signInError) {
        setError(signInError.message || '로그인에 실패했어요.');
        setSubmitting(false);
      }
      // 성공 시 카카오 OAuth 페이지로 리다이렉트되므로 별도 처리 불필요
    } catch (err) {
      setError(err?.message || '로그인에 실패했어요.');
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <img
            src="/favicon-v2.png?v=2"
            alt=""
            aria-hidden="true"
            className="login-brand-icon"
          />
          <h1 className="login-brand-title">슬슬살게</h1>
        </div>
        <p className="login-subtitle">
          집안 생필품 재고를 가족과 함께 관리해요
        </p>

        <button
          type="button"
          className="login-kakao-btn"
          onClick={handleKakao}
          disabled={submitting}
        >
          <span className="login-kakao-icon" aria-hidden="true">💬</span>
          {submitting ? '이동 중...' : '카카오로 시작하기'}
        </button>

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default Login;
