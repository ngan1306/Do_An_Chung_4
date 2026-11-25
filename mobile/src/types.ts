/** Cac kieu du lieu dung chung cho app. */

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';
export type ConnectionMode = 'live' | 'demo';
export type ThemeMode = 'light' | 'dark';

export interface BrokerConfig {
  /** IP/hostname may chay server, vd 192.168.1.10 */
  host: string;
  /** Cong HTTP cua server (mac dinh 3000) */
  port: string;
  username: string;
  password: string;
}

export interface Telemetry {
  temperature: number;
  humidity: number;
  fire: boolean;
  motion: boolean;
  at: number;
}

export interface HistoryPoint extends Telemetry {
  id: string;
  deviceId: string;
}

export type DeviceKind = 'light' | 'fan' | 'pump';
export type PowerState = 'ON' | 'OFF';

export interface DeviceState {
  id: string;
  name: string;
  room: string;
  kind: DeviceKind;
  state: PowerState;
}

export interface Alert {
  id: string;
  title: string;
  body: string;
  level: 'info' | 'warning' | 'danger';
  at: number;
}

export interface Thresholds {
  tempHigh: number;
  tempLow: number;
}

export interface Schedule {
  id: string;
  deviceId: string;
  time: string; // "HH:mm"
  state: PowerState;
  enabled: boolean;
}
