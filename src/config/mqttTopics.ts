/**
 * Quy ước topic MQTT dùng giữa ứng dụng và ESP32.
 *
 * Với tiền tố mặc định `smarthome`:
 *   smarthome/sensors              ESP32 -> App   JSON {temperature, humidity, smoke, motion}
 *   smarthome/device/<id>/state    ESP32 -> App   "ON" | "OFF" (retained)
 *   smarthome/device/<id>/set      App   -> ESP32 "ON" | "OFF"
 *   smarthome/alarm                ESP32 -> App   JSON {type, message} (tùy chọn)
 */

export const DEFAULT_TOPIC_PREFIX = 'smarthome';

export interface TopicMap {
  sensors: string;
  deviceStateWildcard: string;
  alarm: string;
  deviceState: (deviceId: string) => string;
  deviceSet: (deviceId: string) => string;
}

/** Sinh bộ topic từ tiền tố người dùng cấu hình. */
export function createTopics(prefix: string): TopicMap {
  const root = (prefix || DEFAULT_TOPIC_PREFIX).replace(/\/+$/, '');

  return {
    sensors: `${root}/sensors`,
    deviceStateWildcard: `${root}/device/+/state`,
    alarm: `${root}/alarm`,
    deviceState: (deviceId: string) => `${root}/device/${deviceId}/state`,
    deviceSet: (deviceId: string) => `${root}/device/${deviceId}/set`,
  };
}

/** Tách id thiết bị ra khỏi topic `smarthome/device/light-1/state`. */
export function parseDeviceIdFromStateTopic(topic: string): string | null {
  const segments = topic.split('/');
  if (segments.length < 2) return null;

  const stateIndex = segments.lastIndexOf('state');
  if (stateIndex < 1) return null;

  const deviceId = segments[stateIndex - 1];
  return deviceId ? deviceId : null;
}
