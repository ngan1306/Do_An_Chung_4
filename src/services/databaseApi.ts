import type { DeviceState, HistoryPoint, PersistedSettings, Schedule, Telemetry } from '../types';

interface DatabaseTelemetryRow {
  temperature: number;
  humidity: number;
  smoke: number;
  motion: boolean;
  received_at: string;
}

interface DatabaseDeviceRow {
  device_id: string;
  state: DeviceState;
}

export interface DatabaseHealth {
  success: boolean;
  database?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function checkDatabase(): Promise<DatabaseHealth | null> {
  return request('/api/health');
}

export async function loadTelemetryHistory(): Promise<HistoryPoint[] | null> {
  const rows = await request<DatabaseTelemetryRow[]>('/api/telemetry?limit=40');
  if (!rows) return null;
  return rows.map((row) => ({
    time: Date.parse(row.received_at),
    temperature: Number(row.temperature),
    humidity: Number(row.humidity),
  })).filter((point) => Number.isFinite(point.time));
}

export function saveTelemetry(telemetry: Telemetry): Promise<unknown | null> {
  return request('/api/telemetry', {
    method: 'POST',
    body: JSON.stringify(telemetry),
  });
}

export async function loadDeviceStates(): Promise<Record<string, DeviceState> | null> {
  const rows = await request<DatabaseDeviceRow[]>('/api/devices');
  if (!rows) return null;
  return Object.fromEntries(rows.map((row) => [row.device_id, row.state]));
}

export function saveDeviceState(deviceId: string, state: DeviceState): Promise<unknown | null> {
  return request(`/api/devices/${encodeURIComponent(deviceId)}`, {
    method: 'PUT',
    body: JSON.stringify({ state }),
  });
}

export function loadSchedules(): Promise<Schedule[] | null> {
  return request('/api/schedules');
}

export function createSchedule(schedule: Schedule): Promise<unknown | null> {
  return request('/api/schedules', { method: 'POST', body: JSON.stringify(schedule) });
}

export function updateSchedule(schedule: Schedule): Promise<unknown | null> {
  return request(`/api/schedules/${encodeURIComponent(schedule.id)}`, {
    method: 'PUT',
    body: JSON.stringify(schedule),
  });
}

export function deleteSchedule(id: string): Promise<unknown | null> {
  return request(`/api/schedules/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function loadDatabaseSettings(): Promise<PersistedSettings | null> {
  const row = await request<{
    theme: PersistedSettings['theme'];
    temperatureHigh: number;
    humidityHigh: number;
    smokeHigh: number;
  }>('/api/settings');
  if (!row) return null;
  return {
    theme: row.theme,
    thresholds: {
      temperatureHigh: Number(row.temperatureHigh),
      humidityHigh: Number(row.humidityHigh),
      smokeHigh: Number(row.smokeHigh),
    },
    autoConnect: false,
  };
}

export function saveDatabaseSettings(settings: PersistedSettings): Promise<unknown | null> {
  return request('/api/settings', {
    method: 'PUT',
    body: JSON.stringify({
      theme: settings.theme,
      temperatureHigh: settings.thresholds.temperatureHigh,
      humidityHigh: settings.thresholds.humidityHigh,
      smokeHigh: settings.thresholds.smokeHigh,
    }),
  });
}
