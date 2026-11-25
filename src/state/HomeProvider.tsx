import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_BROKER_CONFIG, DEFAULT_SETTINGS } from '../config/constants';
import { DEVICES, findDevice } from '../config/homeLayout';
import { useAlertEngine } from '../hooks/useAlertEngine';
import { useConnectionManager } from '../hooks/useConnectionManager';
import { useScheduleRunner } from '../hooks/useScheduleRunner';
import { useSchedules } from '../hooks/useSchedules';
import { useSensorHistory } from '../hooks/useSensorHistory';
import * as databaseApi from '../services/databaseApi';
import { useThemeSync } from '../hooks/useThemeSync';
import { useToasts } from '../hooks/useToasts';
import {
  loadBrokerConfig,
  loadSettings,
  saveBrokerConfig,
  saveSettings,
} from '../services/storageService';
import type {
  BrokerConfig,
  ConnectionMode,
  DeviceState,
  PersistedSettings,
  Schedule,
  Telemetry,
  ThemeMode,
  Thresholds,
} from '../types';
import { HomeContext, type AppTab, type HomeContextValue } from './HomeContext';

/** Thời gian chờ ESP32 phản hồi trạng thái trước khi báo lỗi. */
const DEVICE_ACK_TIMEOUT_MS = 8000;
const INITIAL_STATE: DeviceState = 'UNKNOWN';

function createInitialDeviceStates(): Record<string, DeviceState> {
  return DEVICES.reduce<Record<string, DeviceState>>((accumulator, device) => {
    accumulator[device.id] = INITIAL_STATE;
    return accumulator;
  }, {});
}

/**
 * Nơi duy nhất nối các service / hook lại với nhau và chia sẻ qua context.
 * Các màn hình chỉ đọc state và gọi action, không tự tạo kết nối MQTT.
 */
export function HomeProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<BrokerConfig>(() => loadBrokerConfig() ?? DEFAULT_BROKER_CONFIG);
  const [settings, setSettings] = useState<PersistedSettings>(() => loadSettings() ?? DEFAULT_SETTINGS);
  const [deviceStates, setDeviceStates] = useState<Record<string, DeviceState>>(createInitialDeviceStates);
  const [pendingDeviceIds, setPendingDeviceIds] = useState<string[]>([]);
  const [hasSession, setHasSession] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [databaseStatus, setDatabaseStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [databaseName, setDatabaseName] = useState<string | null>(null);

  const { toasts, pushToast, dismissToast } = useToasts();
  const { history, appendTelemetry, replaceHistory, resetHistory } = useSensorHistory();
  const { alerts, evaluate, dismissAlert, clearAlerts } = useAlertEngine(settings.thresholds);
  const { schedules, addSchedule, updateSchedule, removeSchedule, toggleSchedule } = useSchedules();
  const {
    status,
    statusDetail,
    mode,
    activeConfig,
    connect: openConnection,
    disconnect: closeConnection,
    sendDevice,
    registerHandlers,
  } = useConnectionManager();

  const pendingTimers = useRef(new Map<string, number>());
  const databaseSettingsLoaded = useRef(false);
  const hasLiveTelemetry = useRef(false);
  const telemetryValue = useMemo(() => {
    const latest = history[history.length - 1];
    if (!latest) return null;
    return {
      temperature: latest.temperature,
      humidity: latest.humidity,
      smoke: 0,
      motion: false,
      receivedAt: latest.time,
    } satisfies Telemetry;
  }, [history]);
  const statusRef = useRef(status);
  statusRef.current = status;

  useThemeSync(settings.theme);

  /* Có kết nối thành công => coi như đăng nhập xong (mục 11). */
  useEffect(() => {
    if (status === 'connected') setHasSession(true);
  }, [status]);

  /* Lưu cài đặt (theme, ngưỡng) mỗi khi thay đổi (mục 15). */
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    let active = true;
    void databaseApi.loadDatabaseSettings().then((saved) => {
      if (!active) return;
      if (saved) {
        setSettings((current) => ({ ...saved, autoConnect: current.autoConnect }));
      }
      databaseSettingsLoaded.current = true;
    });
    void databaseApi.loadTelemetryHistory().then((saved) => {
      if (active && saved && !hasLiveTelemetry.current) replaceHistory(saved);
    });
    void databaseApi.loadDeviceStates().then((saved) => {
      if (!active || !saved) return;
      setDeviceStates((current) => ({
        ...current,
        ...Object.fromEntries(Object.entries(saved).filter(([, state]) => state === 'ON' || state === 'OFF')),
      }));
    });
    return () => { active = false; };
  }, [replaceHistory]);

  useEffect(() => {
    let active = true;
    const refreshDatabase = async () => {
      const health = await databaseApi.checkDatabase();
      if (!active) return;
      setDatabaseStatus(health?.success ? 'connected' : 'offline');
      setDatabaseName(health?.success ? health.database ?? null : null);

      if (health?.success) {
        const saved = await databaseApi.loadTelemetryHistory();
        if (active && saved && !hasLiveTelemetry.current) replaceHistory(saved);
      }
    };

    void refreshDatabase();
    const timer = window.setInterval(refreshDatabase, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [replaceHistory]);

  useEffect(() => {
    if (databaseSettingsLoaded.current) void databaseApi.saveDatabaseSettings(settings);
  }, [settings]);

  const clearPending = useCallback((deviceId: string) => {
    const timer = pendingTimers.current.get(deviceId);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      pendingTimers.current.delete(deviceId);
    }
    setPendingDeviceIds((current) => current.filter((id) => id !== deviceId));
  }, []);

  /* Nối dữ liệu từ client vào state của ứng dụng. */
  useEffect(() => {
    registerHandlers({
      onTelemetry: (nextTelemetry) => {
        hasLiveTelemetry.current = true;
        appendTelemetry(nextTelemetry);
        void databaseApi.saveTelemetry(nextTelemetry);
        evaluate(nextTelemetry);
      },
      onDeviceState: (deviceId, state) => {
        setDeviceStates((current) => ({ ...current, [deviceId]: state }));
        if (state === 'ON' || state === 'OFF') void databaseApi.saveDeviceState(deviceId, state);
        clearPending(deviceId);
      },
      onPayloadError: (message) => pushToast(message, 'warning'),
    });
  }, [registerHandlers, appendTelemetry, evaluate, clearPending, pushToast]);

  const sendDeviceState = useCallback(
    (deviceId: string, state: DeviceState) => {
      if (state === INITIAL_STATE) return;

      if (statusRef.current !== 'connected') {
        pushToast('Chưa kết nối broker — lệnh chưa được gửi', 'warning');
        return;
      }

      sendDevice(deviceId, state);
      setPendingDeviceIds((current) => (current.includes(deviceId) ? current : [...current, deviceId]));

      const existingTimer = pendingTimers.current.get(deviceId);
      if (existingTimer !== undefined) window.clearTimeout(existingTimer);

      const timer = window.setTimeout(() => {
        pendingTimers.current.delete(deviceId);
        setPendingDeviceIds((current) => current.filter((id) => id !== deviceId));
        const name = findDevice(deviceId)?.name ?? deviceId;
        pushToast(`${name} không phản hồi sau 8 giây`, 'warning');
      }, DEVICE_ACK_TIMEOUT_MS);

      pendingTimers.current.set(deviceId, timer);
    },
    [pushToast, sendDevice],
  );

  const toggleDevice = useCallback(
    (deviceId: string) => {
      const currentState = deviceStates[deviceId] ?? INITIAL_STATE;
      sendDeviceState(deviceId, currentState === 'ON' ? 'OFF' : 'ON');
    },
    [deviceStates, sendDeviceState],
  );

  const handleScheduledFire = useCallback(
    (schedule: Schedule) => {
      const name = findDevice(schedule.deviceId)?.name ?? schedule.deviceId;
      sendDeviceState(schedule.deviceId, schedule.action);
      pushToast(`Hẹn giờ: ${schedule.action === 'ON' ? 'bật' : 'tắt'} ${name}`, 'info');
    },
    [pushToast, sendDeviceState],
  );

  useScheduleRunner(schedules, handleScheduledFire);

  const saveConfig = useCallback((nextConfig: BrokerConfig) => {
    setConfig(nextConfig);
    saveBrokerConfig(nextConfig);
  }, []);

  const connect = useCallback(
    (nextConfig: BrokerConfig, nextMode: ConnectionMode) => {
      saveConfig(nextConfig);
      resetHistory();
      clearAlerts();
      openConnection(nextConfig, nextMode);
    },
    [clearAlerts, openConnection, resetHistory, saveConfig],
  );

  const disconnect = useCallback(() => {
    closeConnection();
    setHasSession(false);
  }, [closeConnection]);

  const logout = useCallback(() => {
    disconnect();
    setActiveTab('dashboard');
  }, [disconnect]);

  const toggleTheme = useCallback(() => {
    setSettings((current) => ({
      ...current,
      theme: (current.theme === 'dark' ? 'light' : 'dark') as ThemeMode,
    }));
  }, []);

  const saveThresholds = useCallback((thresholds: Thresholds) => {
    setSettings((current) => ({ ...current, thresholds }));
  }, []);

  useEffect(() => {
    const timers = pendingTimers.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const value: HomeContextValue = {
    databaseStatus,
    databaseName,
    status,
    statusDetail,
    mode,
    config: activeConfig ?? config,
    isConnected: status === 'connected',
    saveConfig,
    connect,
    disconnect,
    telemetry: telemetryValue ?? null,
    lastUpdatedAt: telemetryValue?.receivedAt ?? null,
    history,
    deviceStates,
    pendingDeviceIds,
    sendDeviceState,
    toggleDevice,
    alerts,
    dismissAlert,
    clearAlerts,
    theme: settings.theme,
    toggleTheme,
    thresholds: settings.thresholds,
    saveThresholds,
    schedules,
    addSchedule,
    updateSchedule,
    removeSchedule,
    toggleSchedule,
    toasts,
    pushToast,
    dismissToast,
    activeTab,
    setActiveTab,
    isAuthenticated: hasSession,
    logout,
  };

  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
}
