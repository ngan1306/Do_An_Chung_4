/** Man hinh Dieu khien - card thiet bi + switch giong mockup. */
import { useState } from 'react';
import { useHome } from '../state/HomeContext';
import { ROOMS, devicesOfRoom } from '../config/homeLayout';
import { Switch } from '../components/Switch';

export function RoomsScreen() {
  const { deviceStates, pendingDeviceIds, toggleDevice, isConnected, config } = useHome();
  const [roomId, setRoomId] = useState(ROOMS[0]?.id ?? '');
  const devices = devicesOfRoom(roomId);
  const room = ROOMS.find((item) => item.id === roomId);

  return (
    <div className="screen">
      <div className="segment">
        {ROOMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`segment-btn ${item.id === roomId ? 'active' : ''}`}
            onClick={() => setRoomId(item.id)}
          >
            {item.name}
          </button>
        ))}
      </div>

      {devices.map((device) => {
        const state = deviceStates[device.id] ?? 'UNKNOWN';
        const busy = pendingDeviceIds.includes(device.id);
        const on = state === 'ON';
        return (
          <div key={device.id} className="device-card">
            <div>
              <div className="name">{device.name}</div>
              <div className={`state-label ${on ? '' : 'off'}`}>
                {busy ? 'Đang gửi lệnh…' : on ? 'Đang bật' : 'Đang tắt'}
              </div>
            </div>
            <Switch checked={on} disabled={!isConnected || busy} onChange={() => toggleDevice(device.id)} />
          </div>
        );
      })}

      <p className="muted">
        Lệnh gửi qua topic {config.topicPrefix}/{room?.id}/control/…
      </p>
    </div>
  );
}
