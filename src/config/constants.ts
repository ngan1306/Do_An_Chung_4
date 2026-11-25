import type { BrokerConfig, PersistedSettings, Thresholds } from '../types';
import { DEFAULT_TOPIC_PREFIX } from './mqttTopics';

/** Số điểm dữ liệu giữ lại cho biểu đồ lịch sử (mục 13). */
export const HISTORY_CAPACITY = 40;

/** Số cảnh báo giữ lại trong danh sách. */
export const ALERT_CAPACITY = 30;

/** Nhãn thứ trong tuần dùng cho form hẹn giờ. */
export const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export const DEFAULT_THRESHOLDS: Thresholds = {
  temperatureHigh: 35,
  humidityHigh: 80,
  smokeHigh: 300,
};

export const DEFAULT_BROKER_CONFIG: BrokerConfig = {
  host: '192.168.1.100',
  port: 9001,
  username: '',
  password: '',
  useTls: false,
  path: '/mqtt',
  topicPrefix: DEFAULT_TOPIC_PREFIX,
  clientId: '',
};

export const DEFAULT_SETTINGS: PersistedSettings = {
  theme: 'dark',
  thresholds: DEFAULT_THRESHOLDS,
  autoConnect: false,
};

/** Khoá localStorage, gom một chỗ để tránh gõ sai. */
export const STORAGE_KEYS = {
  brokerConfig: 'smarthome.brokerConfig',
  settings: 'smarthome.settings',
  schedules: 'smarthome.schedules',
} as const;

/** Thông số kết nối MQTT. */
export const MQTT_OPTIONS = {
  reconnectPeriodMs: 3000,
  connectTimeoutMs: 8000,
  keepaliveSeconds: 30,
} as const;

/** Nhịp mô phỏng dữ liệu cảm biến ở chế độ demo (ms). */
export const DEMO_TELEMETRY_INTERVAL_MS = 4000;

/** Chu kỳ kiểm tra lịch hẹn giờ (ms). */
export const SCHEDULE_TICK_MS = 15000;
