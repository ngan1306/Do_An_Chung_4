import { useCallback, useRef, useState } from 'react';
import type { AlertLevel } from '../types';

export interface Toast {
  id: string;
  level: AlertLevel;
  message: string;
}

const TOAST_TTL_MS = 4000;

/**
 * Hàng đợi thông báo ngắn (góc màn hình).
 * Tự động xoá sau vài giây, có thể xoá tay.
 */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const pushToast = useCallback(
    (message: string, level: AlertLevel = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
      setToasts((current) => [...current.slice(-2), { id, level, message }]);

      const timer = window.setTimeout(() => dismissToast(id), TOAST_TTL_MS);
      timers.current.set(id, timer);
    },
    [dismissToast],
  );

  return { toasts, pushToast, dismissToast };
}
