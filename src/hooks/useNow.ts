import { useEffect, useState } from 'react';

/**
 * Trả về thời điểm hiện tại, cập nhật mỗi giây.
 * Dùng để nhãn "cập nhật lần cuối" tự đếm mà không cần re-render toàn bộ dữ liệu.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}
