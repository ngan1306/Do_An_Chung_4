import { createContext, useContext } from 'react';
import type { Toast } from '../hooks/useToasts';
import type { ScheduleDraft } from '../hooks/useSchedules';
import type {
  Alert,
  BrokerConfig,
  ConnectionMode,
  ConnectionStatus,
  DeviceState,
  HistoryPoint,
  Schedule,
  Telemetry,
  ThemeMode,
  Thresholds,
} from '../types';

export type AppTab = 'dashboard' | 'rooms' | 'schedules' | 'settings';

/** Toàn bộ dữ liệu & hành động mà các màn hình dùng chung. */
export interface HomeContextValue {
  databaseStatus: 'checking' | 'connected' | 'offline';
  databaseName: string | null;
  /* Kết nối */
  status: ConnectionStatus;
  statusDetail: string;
  mode: ConnectionMode;
  config: BrokerConfig;
  isConnected: boolean;
  saveConfig: (config: BrokerConfig) => void;
  connect: (config: BrokerConfig, mode: ConnectionMode) => void;
  disconnect: () => void;

  /* Dữ liệu cảm biến */
  telemetry: Telemetry | null;
  lastUpdatedAt: number | null;
  history: HistoryPoint[];

  /* Thiết bị */
  deviceStates: Record<string, DeviceState>;
  pendingDeviceIds: string[];
  sendDeviceState: (deviceId: string, state: DeviceState) => void;
  toggleDevice: (deviceId: string) => void;

  /* Cảnh báo */
  alerts: Alert[];
  dismissAlert: (id: string) => void;
  clearAlerts: () => void;

  /* Cài đặt */
  theme: ThemeMode;
  toggleTheme: () => void;
  thresholds: Thresholds;
  saveThresholds: (thresholds: Thresholds) => void;

  /* Hẹn giờ */
  schedules: Schedule[];
  addSchedule: (draft: ScheduleDraft) => string | null;
  updateSchedule: (schedule: Schedule) => string | null;
  removeSchedule: (id: string) => void;
  toggleSchedule: (id: string) => void;

  /* Thông báo ngắn */
  toasts: Toast[];
  pushToast: (message: string, level?: Alert['level']) => void;
  dismissToast: (id: string) => void;

  /* Điều hướng & phiên đăng nhập */
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isAuthenticated: boolean;
  logout: () => void;
}

export const HomeContext = createContext<HomeContextValue | null>(null);

/** Truy cập state chung, báo lỗi rõ ràng nếu quên bọc Provider. */
export function useHome(): HomeContextValue {
  const context = useContext(HomeContext);
  if (!context) {
    throw new Error('useHome phải được dùng bên trong <HomeProvider>');
  }
  return context;
}
