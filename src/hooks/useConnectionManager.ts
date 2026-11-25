import { useCallback, useMemo, useRef, useState } from 'react';
import type { BrokerConfig, ConnectionMode, ConnectionStatus, DeviceState } from '../types';
import type { IoTClient, IoTClientHandlers } from '../services/iotClient';
import { MqttClientService } from '../services/mqttService';
import { SimulatorService } from '../services/simulatorService';

type PayloadHandlers = Pick<IoTClientHandlers, 'onTelemetry' | 'onDeviceState' | 'onPayloadError'>;

/**
 * Quản lý vòng đời kết nối: tạo client (thật hoặc mô phỏng), ngắt, gửi lệnh.
 *
 * Tách khỏi UI để màn hình không phải quan tâm tới mqtt.js; trạng thái kết nối
 * được đẩy lên state để hiển thị (mục 2) và tự kết nối lại (mục 3).
 */
export function useConnectionManager() {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [statusDetail, setStatusDetail] = useState<string>('');
  const [mode, setMode] = useState<ConnectionMode>('broker');
  const [activeConfig, setActiveConfig] = useState<BrokerConfig | null>(null);

  const clientRef = useRef<IoTClient | null>(null);
  const handlersRef = useRef<PayloadHandlers | null>(null);

  /** Đăng ký callback xử lý dữ liệu; gọi lại mỗi khi provider render. */
  const registerHandlers = useCallback((handlers: PayloadHandlers) => {
    handlersRef.current = handlers;
  }, []);

  const internalHandlers: IoTClientHandlers = useMemo(
    () => ({
      onStatusChange: (nextStatus, detail) => {
        setStatus(nextStatus);
        setStatusDetail(detail ?? '');
      },
      onTelemetry: (telemetry) => handlersRef.current?.onTelemetry(telemetry),
      onDeviceState: (deviceId, state) => handlersRef.current?.onDeviceState(deviceId, state),
      onPayloadError: (message) => handlersRef.current?.onPayloadError(message),
    }),
    [],
  );

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    setStatus('idle');
    setStatusDetail('');
  }, []);

  const connect = useCallback(
    (config: BrokerConfig, nextMode: ConnectionMode) => {
      clientRef.current?.disconnect();

      const client: IoTClient =
        nextMode === 'demo'
          ? new SimulatorService(internalHandlers)
          : new MqttClientService(config, internalHandlers);

      clientRef.current = client;
      setMode(nextMode);
      setActiveConfig(config);
      setStatusDetail('');
      client.connect();
    },
    [internalHandlers],
  );

  const sendDevice = useCallback((deviceId: string, state: DeviceState) => {
    clientRef.current?.setDevice(deviceId, state);
  }, []);

  return { status, statusDetail, mode, activeConfig, connect, disconnect, sendDevice, registerHandlers };
}
