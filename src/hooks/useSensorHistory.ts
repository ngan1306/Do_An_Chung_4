import { useCallback, useState } from 'react';
import { HISTORY_CAPACITY } from '../config/constants';
import type { HistoryPoint, Telemetry } from '../types';

/**
 * Lưu vài chục điểm dữ liệu gần nhất trong state để vẽ biểu đồ (mục 13).
 * Không dùng backend — dữ liệu mất khi tải lại trang, đúng yêu cầu bài lab.
 */
export function useSensorHistory(capacity: number = HISTORY_CAPACITY) {
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  const appendTelemetry = useCallback(
    (telemetry: Telemetry) => {
      setHistory((current) => {
        const next: HistoryPoint = {
          time: telemetry.receivedAt,
          temperature: telemetry.temperature,
          humidity: telemetry.humidity,
        };
        return [...current, next].slice(-capacity);
      });
    },
    [capacity],
  );

  const replaceHistory = useCallback(
    (points: HistoryPoint[]) => setHistory(points.slice(-capacity)),
    [capacity],
  );

  const resetHistory = useCallback(() => setHistory([]), []);

  return { history, appendTelemetry, replaceHistory, resetHistory };
}
