import { createContext, useContext } from 'react';
import type {
  Alert,
  BrokerConfig,
  ConnectionMode,
  ConnectionStatus,
  DeviceState,
  HistoryPoint,
  PowerState,
  Schedule,
  Telemetry,
  ThemeMode,
  Thresholds,
} from '../types';
import type { Toast } from '../hooks/useToasts';

export type AppTab = 'dashboard' | 'rooms' | 'schedules' | 'settings';

export interface HomeContextValue {
  status: ConnectionStatus;
  statusDetail: string;
  mode: ConnectionMode;
  config: BrokerConfig;
  isConnected: boolean;
  isAuthenticated: boolean;
  saveConfig: (config: BrokerConfig) => void;
  connect: (config: BrokerConfig, mode: ConnectionMode) => void;
  disconnect: () => void;
  logout: () => void;

  telemetry: Telemetry | null;
  lastUpdatedAt: number | null;
  history: HistoryPoint[];

  deviceStates: Record<string, DeviceState>;
  pendingDeviceIds: string[];
  sendDeviceState: (deviceId: string, state: PowerState) => void;
  toggleDevice: (deviceId: string) => void;

  alerts: Alert[];
  dismissAlert: (id: string) => void;
  clearAlerts: () => void;

  theme: ThemeMode;
  toggleTheme: () => void;
  thresholds: Thresholds;
  saveThresholds: (thresholds: Thresholds) => void;

  schedules: Schedule[];
  addSchedule: (schedule: Omit<Schedule, 'id' | 'enabled'>) => string | null;
  updateSchedule: (schedule: Schedule) => string | null;
  removeSchedule: (id: string) => void;
  toggleSchedule: (id: string) => void;

  toasts: Toast[];
  pushToast: (message: string, level?: Alert['level']) => void;
  dismissToast: (id: string) => void;

  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
}

export const HomeContext = createContext<HomeContextValue | undefined>(undefined);

export function useHome(): HomeContextValue {
  const value = useContext(HomeContext);
  if (!value) throw new Error('useHome phải được dùng bên trong HomeProvider');
  return value;
}
