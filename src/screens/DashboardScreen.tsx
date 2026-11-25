/** Man hinh Giam sat - giong mockup: pill trang thai, segment phong, metric, sparkline, thiet bi dang bat. */
import { useState } from 'react';
import { useHome } from '../state/HomeContext';
import { ROOMS, devicesOfRoom } from '../config/homeLayout';
import { Sparkline } from '../components/Sparkline';
import { formatClock, formatDecimal } from '../utils/format';

export function DashboardScreen() {
  const { telemetry, lastUpdatedAt, history, deviceStates, status, mode, config, databaseStatus, databaseName } = useHome();
  const [selectedRoomId, setSelectedRoomId] = useState(ROOMS[0]?.id ?? '');
  const room = ROOMS.find((item) => item.id === selectedRoomId) ?? ROOMS[0];
  const devices = room ? devicesOfRoom(room.id) : [];
  const onDevices = devices.filter((device) => deviceStates[device.id] === 'ON');
  const detail = status === 'connected'
    ? `Đã kết nối · ${config.host}:${config.port}`
    : 'Chưa kết nối broker';

  return (
    <div className="screen">
      <div className="connection-statuses" aria-live="polite">
        <span className={`status-pill ${status === 'connected' ? '' : 'offline'}`}>
          <span className="dot" />
          {detail}
        </span>
        <span className={`status-pill ${databaseStatus === 'offline' ? 'offline' : ''}`}>
          <span className="dot" />
          {databaseStatus === 'connected'
            ? `SQL đã kết nối${databaseName ? ` · ${databaseName}` : ''}`
            : databaseStatus === 'checking' ? 'Đang kiểm tra SQL…' : 'SQL chưa kết nối'}
        </span>
      </div>

      <div className="segment">
        {ROOMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`segment-btn ${item.id === room?.id ? 'active' : ''}`}
            aria-pressed={item.id === room?.id}
            onClick={() => setSelectedRoomId(item.id)}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="metric-grid">
        <div className="metric-card">
          <span className="metric-label">Nhiệt độ</span>
          <span className="metric-value">
            {telemetry ? formatDecimal(telemetry.temperature) : '--'}
            <span className="unit">°C</span>
          </span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Độ ẩm</span>
          <span className="metric-value">
            {telemetry ? telemetry.humidity : '--'}
            <span className="unit">%</span>
          </span>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="card-title">Nhiệt độ gần đây</span>
          <span className="muted">
            {lastUpdatedAt ? `Cập nhật ${formatClock(lastUpdatedAt)}` : 'Chưa có'}
          </span>
        </div>
        {history.length < 2 ? (
          <p className="chart-empty">
            {history.length === 0 ? 'SQL đã kết nối nhưng chưa có dữ liệu cảm biến.' : 'Cần thêm mẫu cảm biến để vẽ biểu đồ.'}
          </p>
        ) : <Sparkline values={history.map((point) => point.temperature)} />}
      </div>

      <div className="card">
        <div className="onboard-row">
          <div>
            <span className="muted">Thiết bị đang bật</span>
            <div className="count">{onDevices.length} / {devices.length}</div>
          </div>
          <span className="names">
            {onDevices.length > 0 ? onDevices.map((device) => device.name).join(', ') : 'Không có thiết bị nào bật'}
          </span>
        </div>
      </div>

      {telemetry?.motion && (
        <div className="card">
          <span className="card-title">🚶 Phát hiện chuyển động</span>
        </div>
      )}
      {mode === 'demo' && <p className="muted">Đang chạy chế độ demo — không cần broker thật.</p>}
    </div>
  );
}
