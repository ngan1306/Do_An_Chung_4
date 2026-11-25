/** Hook thong bao ngan (toast). */
import { useCallback, useRef, useState } from 'react';
import type { Alert } from '../types';

export interface Toast {
  id: string;
  message: string;
  level: Alert['level'];
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const pushToast = useCallback((message: string, level: Alert['level'] = 'info') => {
    const id = `toast-${Date.now()}-${counter.current++}`;
    setToasts((prev) => [...prev.slice(-2), { id, message, level }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, pushToast, dismissToast };
}
