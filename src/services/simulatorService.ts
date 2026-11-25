import { DEMO_TELEMETRY_INTERVAL_MS } from '../config/constants';
import { DEVICES } from '../config/homeLayout';
import type { DeviceState, Telemetry } from '../types';
import { clamp, round } from '../utils/validation';
import type { IoTClient, IoTClientHandlers } from './iotClient';

/** Độ trễ giả lập để thấy rõ trạng thái "đang chờ phản hồi" của thiết bị. */
const DEVICE_ECHO_DELAY_MS = 420;
const CONNECT_DELAY_MS = 700;

interface DemoState {
  temperature: number;
  humidity: number;
  smoke: number;
  motion: boolean;
}

/**
 * Bộ mô phỏng ESP32 chạy hoàn toàn trong trình duyệt.
 *
 * Dùng khi chưa có broker / chưa có phần cứng: sinh dữ liệu cảm biến theo chu kỳ,
 * phản hồi lại lệnh điều khiển (mục 7), thỉnh thoảng tạo tình huống vượt ngưỡng
 * để kiểm tra cảnh báo (mục 16 & 18).
 */
export class SimulatorService implements IoTClient {
  public readonly mode = 'demo' as const;

  private telemetryTimer: number | null = null;
  private connectTimer: number | null = null;
  private readonly echoTimers = new Set<number>();
  private readonly deviceStates = new Map<string, DeviceState>();
  private state: DemoState = { temperature: 27.4, humidity: 62, smoke: 120, motion: false };
  private tick = 0;

  constructor(private readonly handlers: IoTClientHandlers) {
    DEVICES.forEach((device, index) => {
      this.deviceStates.set(device.id, index % 3 === 0 ? 'ON' : 'OFF');
    });
  }

  connect(): void {
    this.handlers.onStatusChange('connecting');

    this.connectTimer = window.setTimeout(() => {
      this.handlers.onStatusChange('connected');
      this.emitTelemetry();
      this.telemetryTimer = window.setInterval(() => this.emitTelemetry(), DEMO_TELEMETRY_INTERVAL_MS);
    }, CONNECT_DELAY_MS);
  }

  disconnect(): void {
    if (this.connectTimer !== null) window.clearTimeout(this.connectTimer);
    if (this.telemetryTimer !== null) window.clearInterval(this.telemetryTimer);
    this.echoTimers.forEach((timer) => window.clearTimeout(timer));
    this.echoTimers.clear();
    this.connectTimer = null;
    this.telemetryTimer = null;
    this.handlers.onStatusChange('idle');
  }

  /** Gửi lệnh và mô phỏng ESP32 phản hồi lại đúng trạng thái sau một độ trễ ngắn. */
  setDevice(deviceId: string, state: DeviceState): void {
    if (state === 'UNKNOWN') return;

    const timer = window.setTimeout(() => {
      this.echoTimers.delete(timer);
      this.deviceStates.set(deviceId, state);
      this.handlers.onDeviceState(deviceId, state);
    }, DEVICE_ECHO_DELAY_MS);

    this.echoTimers.add(timer);
  }

  private emitTelemetry(): void {
    this.tick += 1;
    const next = this.nextState();
    this.state = next;

    const telemetry: Telemetry = {
      temperature: round(next.temperature, 1),
      humidity: Math.round(next.humidity),
      smoke: Math.round(next.smoke),
      motion: next.motion,
      receivedAt: Date.now(),
    };

    // Phát lại trạng thái thiết bị định kỳ, mô phỏng message retained của broker thật.
    if (this.tick % 3 === 1) {
      this.deviceStates.forEach((state, deviceId) => this.handlers.onDeviceState(deviceId, state));
    }

    this.handlers.onTelemetry(telemetry);
  }

  private nextState(): DemoState {
    const drift = (Math.random() - 0.5) * 0.8;
    const heatWave = this.tick % 17 === 0 ? 7.5 : 0;
    const temperature = clamp(this.state.temperature + drift + heatWave, 21, 41);

    const humidity = clamp(this.state.humidity + (Math.random() - 0.5) * 5, 40, 95);

    const smokeSpike = Math.random() < 0.07;
    const smoke = smokeSpike
      ? 320 + Math.random() * 160
      : clamp(this.state.smoke + (Math.random() - 0.5) * 40, 60, 260);

    const motion = Math.random() < 0.18;

    return { temperature, humidity, smoke, motion };
  }
}
