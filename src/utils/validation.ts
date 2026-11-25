import type { BrokerConfig, DeviceState, Schedule, Telemetry } from '../types';

/** Kết quả kiểm tra một form: lỗi theo từng trường. */
export type FieldErrors<T> = Partial<Record<keyof T, string>>;

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const HOSTNAME_PATTERN = /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.(?!-)[a-zA-Z0-9-]{1,63}(?<!-))*$/;

/** Kiểm tra một chuỗi có phải IPv4 hợp lệ. */
export function isIpv4(value: string): boolean {
  const match = IPV4_PATTERN.exec(value.trim());
  if (!match) return false;
  return match.slice(1).every((part) => Number(part) <= 255);
}

/** Host hợp lệ: IPv4 hoặc tên miền (ví dụ broker.local, mqtt.example.com). */
export function isHost(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (isIpv4(trimmed)) return true;
  if (trimmed.length > 253) return false;
  return HOSTNAME_PATTERN.test(trimmed);
}

/** Cổng hợp lệ: số nguyên 1..65535. */
export function isPort(value: string | number): boolean {
  const port = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * Kiểm tra toàn bộ form cấu hình broker (mục 1 & 10).
 * Trả về object rỗng nếu hợp lệ.
 */
export function validateBrokerConfig(config: BrokerConfig): FieldErrors<BrokerConfig> {
  const errors: FieldErrors<BrokerConfig> = {};

  if (!config.host.trim()) {
    errors.host = 'Vui lòng nhập IP hoặc tên miền của broker';
  } else if (!isHost(config.host)) {
    errors.host = 'IP / tên miền không hợp lệ (ví dụ 192.168.1.100)';
  }

  if (!isPort(config.port)) {
    errors.port = 'Cổng phải là số từ 1 đến 65535';
  }

  if (!config.path.trim().startsWith('/')) {
    errors.path = 'Đường dẫn WebSocket phải bắt đầu bằng "/" (ví dụ /mqtt)';
  }

  if (!config.topicPrefix.trim()) {
    errors.topicPrefix = 'Vui lòng nhập tiền tố topic';
  } else if (/[#+]/.test(config.topicPrefix)) {
    errors.topicPrefix = 'Tiền tố topic không được chứa ký tự đại diện # hoặc +';
  }

  return errors;
}

/** Kiểm tra form đăng nhập (mục 11): user/password của broker. */
export function validateCredentials(username: string, password: string): {
  username?: string;
  password?: string;
} {
  const errors: { username?: string; password?: string } = {};

  if (!username.trim()) {
    errors.username = 'Vui lòng nhập tên đăng nhập broker';
  }
  if (password.length === 0) {
    errors.password = 'Vui lòng nhập mật khẩu broker';
  } else if (password.length < 4) {
    errors.password = 'Mật khẩu phải có ít nhất 4 ký tự';
  }

  return errors;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toBooleanish(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'on';
  }
  return false;
}

/**
 * Kiểm tra & chuyển payload JSON nhận từ topic cảm biến thành Telemetry (mục 10).
 * Chấp nhận nhiều kiểu đặt tên khoá để dễ ghép với firmware ESP32 khác nhau.
 */
export function parseTelemetry(raw: string): { data?: Telemetry; error?: string } {
  let decoded: unknown;

  try {
    decoded = JSON.parse(raw);
  } catch {
    return { error: 'Payload cảm biến không phải JSON hợp lệ' };
  }

  if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) {
    return { error: 'Payload cảm biến phải là một object JSON' };
  }

  const record = decoded as Record<string, unknown>;
  const temperature = toFiniteNumber(record.temperature ?? record.temp ?? record.t);
  const humidity = toFiniteNumber(record.humidity ?? record.hum ?? record.h);
  const smoke = toFiniteNumber(record.smoke ?? record.gas ?? record.co2) ?? 0;
  const motion = toBooleanish(record.motion ?? record.pir ?? false);

  if (temperature === null) {
    return { error: 'Thiếu hoặc sai trường "temperature"' };
  }
  if (humidity === null) {
    return { error: 'Thiếu hoặc sai trường "humidity"' };
  }
  if (temperature < -40 || temperature > 125) {
    return { error: `Nhiệt độ ${temperature}°C nằm ngoài dải hợp lệ (-40..125)` };
  }
  if (humidity < 0 || humidity > 100) {
    return { error: `Độ ẩm ${humidity}% nằm ngoài dải hợp lệ (0..100)` };
  }

  return {
    data: {
      temperature: round(temperature, 1),
      humidity: round(humidity, 0),
      smoke: Math.max(0, Math.round(smoke)),
      motion,
      receivedAt: Date.now(),
    },
  };
}

/** Chuẩn hoá payload trạng thái thiết bị: "ON" / "OFF" / {"state":"ON"} / 1 / true. */
export function parseDeviceState(raw: string): DeviceState | null {
  const value = raw.trim();
  if (value === '') return null;

  if (value.startsWith('{')) {
    try {
      const decoded = JSON.parse(value) as Record<string, unknown>;
      const state = decoded.state ?? decoded.value ?? decoded.power;
      return normalizeState(state);
    } catch {
      return null;
    }
  }

  return normalizeState(value);
}

function normalizeState(value: unknown): DeviceState | null {
  if (typeof value === 'boolean') return value ? 'ON' : 'OFF';
  if (typeof value === 'number') return value === 0 ? 'OFF' : 'ON';
  if (typeof value === 'string') {
    const normalized = value.trim().toUpperCase();
    if (normalized === 'ON' || normalized === '1' || normalized === 'TRUE') return 'ON';
    if (normalized === 'OFF' || normalized === '0' || normalized === 'FALSE') return 'OFF';
  }
  return null;
}

/** Kiểm tra giờ hẹn dạng "HH:mm". */
export function isTimeOfDay(value: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

/** Kiểm tra một lịch hẹn giờ trước khi lưu (mục 17). */
export function validateSchedule(schedule: Schedule): string | null {
  if (!schedule.deviceId) return 'Vui lòng chọn thiết bị';
  if (!isTimeOfDay(schedule.time)) return 'Giờ hẹn không hợp lệ (định dạng HH:mm)';
  if (schedule.weekdays.length === 0) return 'Chọn ít nhất một ngày trong tuần';
  return null;
}

/** Làm tròn số tới n chữ số thập phân. */
export function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Chặn giá trị trong khoảng [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
