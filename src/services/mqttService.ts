import mqtt, { type MqttClient as MqttJsClient } from 'mqtt';
import { MQTT_OPTIONS } from '../config/constants';
import { createTopics, parseDeviceIdFromStateTopic } from '../config/mqttTopics';
import type { BrokerConfig, ConnectionStatus } from '../types';
import { parseDeviceState, parseTelemetry } from '../utils/validation';
import { buildBrokerUrl, type IoTClient, type IoTClientHandlers } from './iotClient';

const AUTH_ERROR_HINTS = ['not authorized', 'unauthorized', 'bad username', 'bad user name', 'auth'];

function looksLikeAuthError(message: string): boolean {
  const normalized = message.toLowerCase();
  return AUTH_ERROR_HINTS.some((hint) => normalized.includes(hint));
}

/** Sinh client id ngẫu nhiên khi người dùng để trống. */
function generateClientId(): string {
  const suffix = Math.random().toString(16).slice(2, 8);
  return `smarthome-web-${suffix}`;
}

/**
 * Kết nối MQTT qua WebSocket tới broker (Mosquitto / EMQX / HiveMQ).
 *
 * Trách nhiệm:
 *  - quản lý vòng đời kết nối và tự động kết nối lại (mục 3),
 *  - báo trạng thái connected / reconnecting / offline cho UI (mục 2),
 *  - publish lệnh điều khiển, đăng ký nhận dữ liệu cảm biến & trạng thái thiết bị.
 */
export class MqttClientService implements IoTClient {
  public readonly mode = 'broker' as const;

  private client: MqttJsClient | null = null;
  private manualDisconnect = false;
  private lastConnectionError = '';
  private lastConnectionDetail = '';

  constructor(
    private readonly config: BrokerConfig,
    private readonly handlers: IoTClientHandlers,
  ) {}

  connect(): void {
    this.manualDisconnect = false;
    this.emit('connecting');

    const topics = createTopics(this.config.topicPrefix);
    const url = buildBrokerUrl(this.config.host, this.config.port, this.config.path, this.config.useTls);

    this.client = mqtt.connect(url, {
      clientId: this.config.clientId.trim() || generateClientId(),
      username: this.config.username || undefined,
      password: this.config.password || undefined,
      clean: true,
      reconnectPeriod: MQTT_OPTIONS.reconnectPeriodMs,
      connectTimeout: MQTT_OPTIONS.connectTimeoutMs,
      keepalive: MQTT_OPTIONS.keepaliveSeconds,
    });

    this.client.on('connect', () => {
      this.lastConnectionError = '';
      this.lastConnectionDetail = '';
      this.emit('connected');
      this.client?.subscribe([topics.sensors, topics.deviceStateWildcard, topics.alarm], { qos: 0 }, (error) => {
        if (error) {
          this.handlers.onPayloadError(`Không đăng ký được topic: ${error.message}`);
        }
      });
    });

    this.client.on('reconnect', () => {
      if (!this.manualDisconnect) this.emit('reconnecting', this.lastConnectionDetail || 'Đang thử kết nối lại…');
    });

    this.client.on('close', () => {
      if (!this.manualDisconnect) this.emit('offline', this.lastConnectionDetail || undefined);
    });

    this.client.on('offline', () => {
      if (!this.manualDisconnect) this.emit('offline');
    });

    this.client.on('error', (error: Error) => {
      if (looksLikeAuthError(error.message)) {
        this.emit('auth-failed', 'Sai tên đăng nhập hoặc mật khẩu broker');
        return;
      }
      if (error.message === 'connack timeout') {
        const detail = 'Broker không phản hồi MQTT. Kiểm tra IP, cổng và đường dẫn WebSocket.';
        this.lastConnectionDetail = detail;
        this.emit('offline', detail);
        if (this.lastConnectionError !== error.message) {
          this.handlers.onPayloadError(`Hết thời gian chờ broker. Kiểm tra MQTT over WebSocket và đường dẫn ${this.config.path}.`);
        }
        this.lastConnectionError = error.message;
        return;
      }
      this.lastConnectionDetail = error.message;
      this.handlers.onPayloadError(`Lỗi MQTT: ${error.message}`);
      this.lastConnectionError = error.message;
    });

    this.client.on('message', (topic: string, payload: Uint8Array) => {
      this.handleMessage(topic, new TextDecoder().decode(payload));
    });
  }

  disconnect(): void {
    this.manualDisconnect = true;
    this.client?.end(true);
    this.client = null;
    this.emit('idle');
  }

  setDevice(deviceId: string, state: 'ON' | 'OFF' | 'UNKNOWN'): void {
    if (state === 'UNKNOWN') return;
    if (!this.client?.connected) {
      this.handlers.onPayloadError('Chưa kết nối broker — lệnh chưa được gửi');
      return;
    }
    const topics = createTopics(this.config.topicPrefix);
    this.client.publish(topics.deviceSet(deviceId), state, { qos: 0, retain: false });
  }

  private handleMessage(topic: string, payload: string): void {
    const topics = createTopics(this.config.topicPrefix);

    if (topic === topics.sensors) {
      const { data, error } = parseTelemetry(payload);
      if (data) {
        this.handlers.onTelemetry(data);
      } else if (error) {
        this.handlers.onPayloadError(`Dữ liệu cảm biến không hợp lệ: ${error}`);
      }
      return;
    }

    if (topic === topics.alarm) {
      this.handlers.onPayloadError(`Cảnh báo từ thiết bị: ${payload}`);
      return;
    }

    const deviceId = parseDeviceIdFromStateTopic(topic);
    if (deviceId) {
      const state = parseDeviceState(payload);
      if (state) {
        this.handlers.onDeviceState(deviceId, state);
      } else {
        this.handlers.onPayloadError(`Trạng thái thiết bị "${deviceId}" không đọc được: ${payload}`);
      }
    }
  }

  private emit(status: ConnectionStatus, detail?: string): void {
    this.handlers.onStatusChange(status, detail);
  }
}
