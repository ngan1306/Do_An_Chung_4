import { useCallback, useEffect, useRef, useState } from 'react';
import { ALERT_CAPACITY } from '../config/constants';
import type { Alert, Telemetry, Thresholds } from '../types';
import { formatDecimal } from '../utils/format';

const MOTION_ALERT_TTL_MS = 8000;

/**
 * Sinh cảnh báo từ dữ liệu cảm biến (mục 16 & 18).
 *
 * Nguyên tắc: mỗi điều kiện chỉ tạo MỘT cảnh báo khi nó chuyển từ "bình thường"
 * sang "vượt ngưỡng", tránh việc mỗi gói tin lại spam thêm cảnh báo trùng.
 */
export function useAlertEngine(thresholds: Thresholds) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const activeKeys = useRef<Set<string>>(new Set());
  const motionTimer = useRef<number | null>(null);

  const pushAlert = useCallback((alert: Alert) => {
    if (activeKeys.current.has(alert.id)) return;
    activeKeys.current.add(alert.id);
    setAlerts((current) => [alert, ...current].slice(0, ALERT_CAPACITY));
  }, []);

  const resolveAlert = useCallback((id: string) => {
    if (!activeKeys.current.has(id)) return;
    activeKeys.current.delete(id);
    setAlerts((current) => current.filter((alert) => alert.id !== id));
  }, []);

  const evaluate = useCallback(
    (telemetry: Telemetry) => {
      if (telemetry.temperature > thresholds.temperatureHigh) {
        pushAlert({
          id: 'temperature-high',
          level: 'warning',
          title: 'Nhiệt độ vượt ngưỡng',
          detail: `${formatDecimal(telemetry.temperature)}°C > ${thresholds.temperatureHigh}°C`,
          createdAt: telemetry.receivedAt,
        });
      } else {
        resolveAlert('temperature-high');
      }

      if (telemetry.humidity > thresholds.humidityHigh) {
        pushAlert({
          id: 'humidity-high',
          level: 'warning',
          title: 'Độ ẩm vượt ngưỡng',
          detail: `${telemetry.humidity}% > ${thresholds.humidityHigh}%`,
          createdAt: telemetry.receivedAt,
        });
      } else {
        resolveAlert('humidity-high');
      }

      if (telemetry.smoke >= thresholds.smokeHigh) {
        pushAlert({
          id: 'smoke-high',
          level: 'critical',
          title: 'Cảnh báo cháy / khói',
          detail: `Nồng độ khói ${telemetry.smoke} vượt ngưỡng ${thresholds.smokeHigh}`,
          createdAt: telemetry.receivedAt,
        });
      } else {
        resolveAlert('smoke-high');
      }

      if (telemetry.motion) {
        pushAlert({
          id: 'motion-detected',
          level: 'info',
          title: 'Phát hiện chuyển động',
          detail: 'Cảm biến PIR vừa ghi nhận chuyển động trong nhà',
          createdAt: telemetry.receivedAt,
        });

        if (motionTimer.current !== null) window.clearTimeout(motionTimer.current);
        motionTimer.current = window.setTimeout(() => resolveAlert('motion-detected'), MOTION_ALERT_TTL_MS);
      }
    },
    [pushAlert, resolveAlert, thresholds.humidityHigh, thresholds.smokeHigh, thresholds.temperatureHigh],
  );

  const dismissAlert = useCallback(
    (id: string) => {
      activeKeys.current.delete(id);
      setAlerts((current) => current.filter((alert) => alert.id !== id));
    },
    [],
  );

  const clearAlerts = useCallback(() => {
    activeKeys.current.clear();
    setAlerts([]);
  }, []);

  useEffect(() => {
    return () => {
      if (motionTimer.current !== null) window.clearTimeout(motionTimer.current);
    };
  }, []);

  return { alerts, evaluate, dismissAlert, clearAlerts };
}
