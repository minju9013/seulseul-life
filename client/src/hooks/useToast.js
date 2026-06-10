// 토스트 메시지 상태를 관리하는 훅
// - showToast 에 문자열 또는 { message, actionLabel, onAction } 객체를 넘길 수 있다.
// - 매번 새 id 를 부여해 같은 메시지여도 토스트가 다시 뜨도록 한다.

import { useCallback, useState } from 'react';

export default function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((messageOrOpts) => {
    const base = { id: Date.now() };
    if (typeof messageOrOpts === 'string') {
      setToast({ ...base, message: messageOrOpts });
    } else if (messageOrOpts && typeof messageOrOpts === 'object') {
      setToast({ ...base, ...messageOrOpts });
    }
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  return { toast, showToast, dismissToast };
}
