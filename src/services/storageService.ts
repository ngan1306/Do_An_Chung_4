import { STORAGE_KEYS } from '../config/constants';
import type { BrokerConfig, PersistedSettings, Schedule } from '../types';

/**
 * Bọc localStorage để:
 *  - không crash khi trình duyệt chặn storage (chế độ riêng tư),
 *  - luôn kiểm tra kiểu dữ liệu đọc lên.
 */

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Bỏ qua: storage đầy hoặc bị chặn thì ứng dụng vẫn chạy trong bộ nhớ.
  }
}

function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Bỏ qua
  }
}

/** Đọc cấu hình broker đã lưu (mục 15). */
export function loadBrokerConfig(): BrokerConfig | null {
  const stored = readJson<Partial<BrokerConfig>>(STORAGE_KEYS.brokerConfig);
  if (!stored || typeof stored.host !== 'string') return null;
  return stored as BrokerConfig;
}

export function saveBrokerConfig(config: BrokerConfig): void {
  writeJson(STORAGE_KEYS.brokerConfig, config);
}

export function clearBrokerConfig(): void {
  removeKey(STORAGE_KEYS.brokerConfig);
}

export function loadSettings(): PersistedSettings | null {
  const stored = readJson<Partial<PersistedSettings>>(STORAGE_KEYS.settings);
  if (!stored) return null;
  return stored as PersistedSettings;
}

export function saveSettings(settings: PersistedSettings): void {
  writeJson(STORAGE_KEYS.settings, settings);
}

export function loadSchedules(): Schedule[] {
  const stored = readJson<Schedule[]>(STORAGE_KEYS.schedules);
  if (!Array.isArray(stored)) return [];
  return stored.filter(
    (item): item is Schedule =>
      typeof item?.id === 'string' &&
      typeof item?.deviceId === 'string' &&
      typeof item?.time === 'string' &&
      Array.isArray(item?.weekdays),
  );
}

export function saveSchedules(schedules: Schedule[]): void {
  writeJson(STORAGE_KEYS.schedules, schedules);
}
