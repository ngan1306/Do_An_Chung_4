/** Man hinh Ket noi - form broker + trang thai, giong mockup. */
import { useEffect, useState } from 'react';
import { useHome } from '../state/HomeContext';
import { DEVICES } from '../config/homeLayout';
import { Switch } from '../components/Switch';

export function SettingsScreen() {
  const { config, connect, disconnect, status, statusDetail, theme, toggleTheme, deviceStates, toggleDevice } = useHome();

  const [host, setHost] = useState(config.host);
  const [port, setPort] = useState(String(config.port));
  const [username, setUsername] = useState(config.username);
  const [password, setPassword] = useState(config.password);
  const [path, setPath] = useState(config.path);
  const [topicPrefix, setTopicPrefix] = useState(config.topicPrefix);
  const [useTls, setUseTls] = useState(config.useTls);

  useEffect(() => {
    setHost(config.host);
    setPort(String(config.port));
    setUsername(config.username);
    setPassword(config.password);
    setPath(config.path);
    setTopicPrefix(config.topicPrefix);
    setUseTls(config.useTls);
  }, [config]);

  const doConnect = () => {
    disconnect();
    connect(
      {
        ...config,
        host: host.trim(),
        port: Number(port) || config.port,
        username: username.trim(),
        password,
        path: path.trim() || '/mqtt',
        topicPrefix: topicPrefix.trim() || 'smarthome',
        useTls,
      },
      'broker',
    );
  };

  return (
    <div className="screen">
      <div className="card">
        <div className="field">
          <span>Địa chỉ IP broker</span>
          <input value={host} onChange={(event) => setHost(event.target.value)} placeholder="192.168.1.10" />
        </div>
        <div className="field">
          <span>Cổng WebSocket</span>
          <input value={port} onChange={(event) => setPort(event.target.value)} placeholder="9001" />
        </div>
        <div className="field">
          <span>Đường dẫn WebSocket</span>
          <input value={path} onChange={(event) => setPath(event.target.value)} placeholder="/mqtt hoặc /ws" />
        </div>
        <div className="field">
          <span>Tiền tố topic MQTT</span>
          <input value={topicPrefix} onChange={(event) => setTopicPrefix(event.target.value)} placeholder="smarthome" />
        </div>
        <div className="field">
          <span>Tên đăng nhập</span>
          <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Để trống nếu broker không cần đăng nhập" />
        </div>
        <div className="field">
          <span>Mật khẩu</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        <div className="onboard-row">
          <span className="card-title">Kết nối bảo mật (WSS/TLS)</span>
          <Switch checked={useTls} onChange={() => setUseTls((value) => !value)} />
        </div>
        <button type="button" className="cta-btn" onClick={doConnect} disabled={status === 'connecting'}>
          {status === 'connecting' ? 'Đang kết nối…' : 'Kết nối'}
        </button>
        {status === 'connected' && (
          <button type="button" className="ghost-btn" onClick={disconnect}>
            Ngắt kết nối
          </button>
        )}
      </div>

      <p className={status === 'connected' ? 'link-btn' : 'muted'}>
        ● Trạng thái: {statusDetail || status}
      </p>

      <div className="card">
        <div className="onboard-row">
          <span className="card-title">Chủ đề tối</span>
          <Switch checked={theme === 'dark'} onChange={toggleTheme} />
        </div>
      </div>

      <div className="card">
        <span className="card-title">Thiết bị nhanh</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
          {DEVICES.slice(0, 3).map((device) => (
            <div key={device.id} className="onboard-row">
              <span>{device.name}</span>
              <Switch
                checked={deviceStates[device.id] === 'ON'}
                onChange={() => toggleDevice(device.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
