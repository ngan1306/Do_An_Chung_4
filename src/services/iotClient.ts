import type { ConnectionStatus, DeviceState, Telemetry } from '../types';

/**
 * Hợp đồng chung cho mọi nguồn dữ liệu (broker thật hoặc mô phỏng).
 * Nhờ vậy tầng UI/hook không cần biết dữ liệu đến từ đâu.
 */
export interface IoTClientHandlers {
  onStatusChange: (status: ConnectionStatus, detail?: string) => void;
  onTelemetry: (telemetry: Telemetry) => void;
  onDeviceState: (deviceId: string, state: DeviceState) => void;
  /** Lỗi payload / lỗi nghiệp vụ cần hiển thị cho người dùng. */
  onPayloadError: (message: string) => void;
}

export interface IoTClient {
  readonly mode: 'broker' | 'demo';
  connect(): void;
  disconnect(): void;
  setDevice: (deviceId: string, state: DeviceState) => void;
}

/** Dựng URL WebSocket từ cấu hình broker. */
export function buildBrokerUrl(host: string, port: number, path: string, useTls: boolean): string {
  const scheme = useTls ? 'wss' : 'ws';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${scheme}://${host}:${port}${normalizedPath}`;
}
