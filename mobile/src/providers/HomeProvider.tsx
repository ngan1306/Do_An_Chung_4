/**
 * HomeProvider - quan ly toan bo state app:
 *  - Ket noi MQTT (qua WebSocket bridge cua server, cong /ws hoac 8080 tu broker aedes)
 *  - Poll REST fallback /api/iotmqtt de hien du lieu khi MQTT khong kha dung
 *  - Dieu khien thiet bi, canh bao, nguong, hen gio, chu de, toast, dang nhap
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HomeContext } from '../state/HomeContext';
import type { HomeContextValue, AppTab } from '../state/HomeContext';
import { useToasts } from '../hooks/useToasts';
import { useSchedules } from '../hooks/useSchedules';
import type {
  Alert,
  BrokerConfig,
  ConnectionMode,
  ConnectionStatus,
  DeviceState,
  HistoryPoint,
  PowerState,
  Telemetry,
  ThemeMode,
  Thresholds,
} from '../types';

const DEFAULT_CONFIG: BrokerConfig = {
  host: '192.168.1.100',
  port: '3000',
  username: 'admin',
  password: 'admin123',
};

const DEVICE_META: Omit<DeviceState, 'state'>[] = [
  { id: 'home/livingroom/light1', name: 'Đèn phòng khách', room: 'Phòng khách', kind: 'light' },
  { id: 'home/bedroom/light2', name: 'Đèn phòng ngủ', room: 'Phòng ngủ', kind: 'light' },
  { id: 'home/bedroom/fan1', name: 'Quạt phòng ngủ', room: 'Phòng ngủ', kind: 'fan' },
  { id: 'home/kitchen/pump1', name: 'Máy bơm bếp', room: 'Bếp', kind: 'pump' },
];

const SENSOR_TOPIC = 'home/livingroom/sensor1';
const LS_CONFIG = 'home.config';
const LS_THEME = 'home.theme';
const LS_THRESHOLDS = 'home.thresholds';
const LS_AUTH = 'home.auth';

async function storageGet(key: string): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return await AsyncStorage.getItem(key);
  } catch {
    try {
      if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
    } catch { /* web bi chan */ }
    return null;
  }
}

async function storageSet(key: string, value: string): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(key, value);
  } catch {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    } catch { /* web bi chan */ }
  }
}

export function HomeProvider({ children }: { children: React.ReactNode }) {
  /* --- Kết nối --- */
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [statusDetail, setStatusDetail] = useState('Chưa kết nối');
  const [mode, setMode] = useState<ConnectionMode>('demo');
  const [config, setConfig] = useState<BrokerConfig>(DEFAULT_CONFIG);
  const mqttRef = useRef<any>(null);

  /* --- Dữ liệu cảm biến --- */
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  /* --- Thiết bị --- */
  const [deviceStates, setDeviceStates] = useState<Record<string, DeviceState>>(() =>
    Object.fromEntries(
      DEVICE_META.map((d) => [d.id, { ...d, state: 'OFF' as PowerState }]),
    ),
  );
  const [pendingDeviceIds, setPendingDeviceIds] = useState<string[]>([]);

  /* --- Cảnh báo --- */
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const alertCounter = useRef(0);

  /* --- Cài đặt --- */
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [thresholds, setThresholds] = useState<Thresholds>({ tempHigh: 40, tempLow: 10 });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');

  const { toasts, pushToast, dismissToast } = useToasts();

  const addAlert = useCallback((title: string, body: string, level: Alert['level']) => {
    const id = `alert-${Date.now()}-${alertCounter.current++}`;
    setAlerts((prev) => [{ id, title, body, level, at: Date.now() }, ...prev].slice(0, 50));
  }, []);

  /* --- Nạp cấu hình đã lưu --- */
  useEffect(() => {
    (async () => {
      const savedConfig = await storageGet(LS_CONFIG);
      if (savedConfig) setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) });
      const savedTheme = await storageGet(LS_THEME);
      if (savedTheme === 'dark' || savedTheme === 'light') setTheme(savedTheme);
      const savedTh = await storageGet(LS_THRESHOLDS);
      if (savedTh) setThresholds(JSON.parse(savedTh));
      const savedAuth = await storageGet(LS_AUTH);
      if (savedAuth === '1') setIsAuthenticated(true);
    })();
  }, []);

  const disconnect = useCallback(() => {
    if (mqttRef.current) {
      mqttRef.current.end(true);
      mqttRef.current = null;
    }
    setStatus('idle');
    setStatusDetail('Đã ngắt kết nối');
  }, []);

  /* --- Kiểm tra đăng nhập tới server REST --- */
  const login = useCallback(
    async (cfg: BrokerConfig): Promise<boolean> => {
      try {
        const res = await fetch(`http://${cfg.host}:${cfg.port}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cfg.username, password: cfg.password }),
        });
        const json = await res.json();
        if (json.success) {
          setIsAuthenticated(true);
          await storageSet(LS_AUTH, '1');
          await storageSet(LS_CONFIG, JSON.stringify(cfg));
        } else {
          setStatus('error');
          setStatusDetail(json.error || 'Sai thông tin đăng nhập');
        }
        return !!json.success;
      } catch {
        setStatus('error');
        setStatusDetail('Không kết nối được server');
        return false;
      }
    },
    [],
  );

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    storageSet(LS_AUTH, '0');
    disconnect();
    setActiveTab('dashboard');
  }, [disconnect]);

  /* --- Kết nối: REST poll (fallback) --- */
  const connect = useCallback(
    (cfg: BrokerConfig, connectMode: ConnectionMode) => {
      setStatus('connecting');
      setStatusDetail('Đang kết nối...');
      setMode(connectMode);
      setConfig(cfg);
      storageSet(LS_CONFIG, JSON.stringify(cfg));
      if (connectMode === 'demo') {
        // Demo: mo phong du lieu cam bien ngay trong app, khong can server
        setStatus('connected');
        setStatusDetail('Chế độ demo (không cần server)');
        return;
      }
      // Live: kiem tra login roi poll du lieu moi 3 giay
      void login(cfg).then((ok) => {
        if (ok) {
          setStatus('connected');
          setStatusDetail(`Đã kết nối ${cfg.host}:${cfg.port}`);
          pushToast('Đã kết nối server', 'info');
        }
      });
    },
    [login, pushToast],
  );

  /* --- Poll du lieu tu REST khi live --- */
  useEffect(() => {
    if (status !== 'connected' || mode !== 'live') return;
    const authHeader = `Basic ${Buffer.from(
      `${config.username}:${config.password}`,
    ).toString('base64')}`;
    let stop = false;

    const poll = async () => {
      try {
        const [devRes, alertRes] = await Promise.all([
          fetch(`http://${config.host}:${config.port}/api/iotmqtt/devices`, {
            headers: { Authorization: authHeader },
          }),
          fetch(`http://${config.host}:${config.port}/api/iotmqtt/alerts`, {
            headers: { Authorization: authHeader },
          }),
        ]);
        if (stop) return;
        if (!devRes.ok) throw new Error(`HTTP ${devRes.status}`);
        const devices: any[] = await devRes.json();
        const alertsJson: any[] = await alertRes.json();

        // Cap nhat trang thai thiet bi (ON/OFF) va online
        setDeviceStates((prev) => {
          const next = { ...prev };
          devices.forEach((d: any) => {
            if (next[d.id] && d.state) next[d.id] = { ...next[d.id], state: d.state };
          });
          return next;
        });
        // Telemetry: lay sensor moi nhat co temperature
        const sensor = devices
          .filter((d) => typeof d.temperature === 'number')
          .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0];
        if (sensor) {
          setTelemetry({
            temperature: sensor.temperature,
            humidity: sensor.humidity ?? 0,
            fire: !!sensor.fire,
            motion: !!sensor.motion,
            at: new Date(sensor.at || Date.now()).getTime(),
          });
          setLastUpdatedAt(Date.now());
        }
        // Canh bao tu server (notificationHistory)
        alertsJson.slice(0, 10).forEach((a: any, i: number) => {
          if (!a._seen) {
            a._seen = true;
            addAlert(
              a.title || 'Cảnh báo',
              a.body || a.message || '',
              'warning',
            );
            void i;
          }
        });
        setStatusDetail('Đã kết nối (live)');
      } catch (e: any) {
        if (!stop) setStatusDetail(`Lỗi đồng bộ: ${e.message}`);
      }
    };
    void poll();
    const timer = setInterval(poll, 3000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [status, mode, config, addAlert]);

  /* --- Demo mode: mo phong cam bien --- */
  useEffect(() => {
    if (status !== 'connected' || mode !== 'demo') return;
    let temp = 28, hum = 60, fire = false;
    const timer = setInterval(() => {
      temp = Math.max(20, Math.min(45, temp + (Math.random() - 0.5) * 2));
      hum = Math.max(30, Math.min(90, hum + (Math.random() - 0.5) * 3));
      fire = Math.random() < 0.03;
      const at = Date.now();
      setTelemetry({ temperature: +temp.toFixed(1), humidity: Math.round(hum), fire, motion: Math.random() < 0.2, at });
      setLastUpdatedAt(at);
      setHistory((prev) =>
        [...prev, { id: `h-${at}`, deviceId: SENSOR_TOPIC, temperature: +temp.toFixed(1), humidity: Math.round(hum), fire, motion: false, at }].slice(-50),
      );
      if (fire) addAlert('🔥 Phát hiện cháy!', 'Cảm biến báo khói/lửa ở khu vực!', 'danger');
    }, 3000);
    return () => clearInterval(timer);
  }, [status, mode, addAlert]);

  /* --- Dieu khien thiet bi: REST /api/iotmqtt/devices/:id/set --- */
  const sendDeviceState = useCallback(
    (deviceId: string, state: PowerState) => {
      setPendingDeviceIds((prev) => [...prev, deviceId]);
      setDeviceStates((prev) =>
        prev[deviceId] ? { ...prev, [deviceId]: { ...prev[deviceId], state } } : prev,
      );
      const finish = () =>
        setPendingDeviceIds((prev) => prev.filter((id) => id !== deviceId));

      if (mode === 'demo') {
        setTimeout(() => {
          finish();
          pushToast(`${deviceId} -> ${state}`, 'info');
        }, 300);
        return;
      }
      fetch(`http://${config.host}:${config.port}/api/iotmqtt/devices/${encodeURIComponent(deviceId)}/set`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`,
        },
        body: JSON.stringify({ state }),
      })
        .then((r) => r.json())
        .then((j) => {
          finish();
          if (j.success) pushToast(`${deviceId} -> ${state}`, 'info');
          else pushToast('Lỗi điều khiển thiết bị', 'danger');
        })
        .catch(() => {
          finish();
          pushToast('Không gửi được lệnh', 'danger');
        });
    },
    [mode, config, pushToast],
  );

  const toggleDevice = useCallback(
    (deviceId: string) => {
      const current = deviceStates[deviceId]?.state ?? 'OFF';
      sendDeviceState(deviceId, current === 'ON' ? 'OFF' : 'ON');
    },
    [deviceStates, sendDeviceState],
  );

  /* --- Canh bao --- */
  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);
  const clearAlerts = useCallback(() => setAlerts([]), []);

  /* --- Cai dat --- */
  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      storageSet(LS_THEME, next);
      return next;
    });
  }, []);
  const saveThresholds = useCallback((t: Thresholds) => {
    setThresholds(t);
    storageSet(LS_THRESHOLDS, JSON.stringify(t));
    pushToast('Đã lưu ngưỡng cảnh báo', 'info');
  }, [pushToast]);

  /* --- Hen gio --- */
  const handleScheduleFire = useCallback(
    (schedule: { deviceId: string; state: PowerState }) => {
      sendDeviceState(schedule.deviceId, schedule.state);
      addAlert('⏰ Hẹn giờ', `${schedule.deviceId} -> ${schedule.state}`, 'info');
    },
    [sendDeviceState, addAlert],
  );
  const {
    schedules,
    addSchedule,
    updateSchedule,
    removeSchedule,
    toggleSchedule,
  } = useSchedules(handleScheduleFire);

  const value: HomeContextValue = useMemo(
    () => ({
      status, statusDetail, mode, config, isConnected: status === 'connected',
      saveConfig: (c) => { setConfig(c); storageSet(LS_CONFIG, JSON.stringify(c)); },
      connect, disconnect,

      telemetry, lastUpdatedAt, history,

      deviceStates, pendingDeviceIds, sendDeviceState, toggleDevice,

      alerts, dismissAlert, clearAlerts,

      theme, toggleTheme, thresholds, saveThresholds,

      schedules, addSchedule, updateSchedule, removeSchedule, toggleSchedule,

      toasts, pushToast, dismissToast,

      activeTab, setActiveTab, isAuthenticated, logout,
    }),
    [
      status, statusDetail, mode, config, connect, disconnect,
      telemetry, lastUpdatedAt, history,
      deviceStates, pendingDeviceIds, sendDeviceState, toggleDevice,
      alerts, dismissAlert, clearAlerts,
      theme, toggleTheme, thresholds, saveThresholds,
      schedules, addSchedule, updateSchedule, removeSchedule, toggleSchedule,
      toasts, pushToast, dismissToast,
      activeTab, isAuthenticated, logout,
    ],
  );

  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
}

/** Dang nhap su dung config hien tai (goi tu man hinh Login). */
export async function loginWithConfig(cfg: BrokerConfig): Promise<boolean> {
  try {
    const res = await fetch(`http://${cfg.host}:${cfg.port}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cfg.username, password: cfg.password }),
    });
    return (await res.json()).success === true;
  } catch {
    return false;
  }
}
