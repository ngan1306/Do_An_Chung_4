/**
 * Kiểu dữ liệu dùng chung cho toàn bộ ứng dụng SmartHome MQTT.
 * Mọi service / hook / component đều import từ đây để tránh trùng lặp định nghĩa.
 */

/** Trạng thái kết nối tới MQTT broker (mục 2 trong bảng chức năng). */
export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline'
  | 'auth-failed';

/** Nguồn dữ liệu: broker thật hoặc bộ mô phỏng chạy trong trình duyệt. */
export type ConnectionMode = 'broker' | 'demo';

/** Cấu hình broker, được lưu lại để lần sau không phải nhập lại. */
export interface BrokerConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  /** Dùng wss:// thay vì ws:// (bắt buộc khi trang chạy qua HTTPS). */
  useTls: boolean;
  /** Đường dẫn WebSocket của broker, mặc định /mqtt. */
  path: string;
  /** Tiền tố topic, ví dụ `smarthome`. */
  topicPrefix: string;
  /** Client id dùng khi kết nối; rỗng => tự sinh. */
  clientId: string;
}

/** Một mẫu dữ liệu cảm biến nhận từ ESP32. */
export interface Telemetry {
  temperature: number;
  humidity: number;
  /** Giá trị ADC / ppm của cảm biến khói. */
  smoke: number;
  /** Cảm biến chuyển động PIR. */
  motion: boolean;
  /** Thời điểm nhận được ở phía client (ms). */
  receivedAt: number;
}

/** Một điểm dữ liệu trong biểu đồ lịch sử. */
export interface HistoryPoint {
  time: number;
  temperature: number;
  humidity: number;
}

/** Trạng thái thực tế của thiết bị, phản hồi từ ESP32. */
export type DeviceState = 'ON' | 'OFF' | 'UNKNOWN';

export type DeviceKind = 'light' | 'fan' | 'relay' | 'pump';

export interface Device {
  id: string;
  name: string;
  roomId: string;
  kind: DeviceKind;
}

export interface Room {
  id: string;
  name: string;
  /** Mô tả ngắn hiển thị dưới tên phòng. */
  hint: string;
}

export type AlertLevel = 'critical' | 'warning' | 'info';

/** Cảnh báo sinh ra từ dữ liệu cảm biến (mục 16 & 18). */
export interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  detail: string;
  createdAt: number;
}

/** Ngưỡng cảnh báo, người dùng chỉnh được trong Cài đặt. */
export interface Thresholds {
  temperatureHigh: number;
  humidityHigh: number;
  smokeHigh: number;
}

export type ScheduleAction = 'ON' | 'OFF';

/** Lịch hẹn giờ bật/tắt thiết bị (mục 17). */
export interface Schedule {
  id: string;
  deviceId: string;
  action: ScheduleAction;
  /** Định dạng "HH:mm" theo giờ 24h. */
  time: string;
  /** Các thứ trong tuần: 0 = Chủ nhật ... 6 = Thứ bảy. */
  weekdays: number[];
  enabled: boolean;
}

export type ThemeMode = 'light' | 'dark';

/** Cấu hình người dùng lưu xuống localStorage. */
export interface PersistedSettings {
  theme: ThemeMode;
  thresholds: Thresholds;
  autoConnect: boolean;
}
