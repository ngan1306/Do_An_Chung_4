/** Man hinh Hen gio: them/xoa/bat-tat lich hen gio. */
import { useState } from 'react';
import { useHome } from '../state/HomeContext';
import { DEVICES } from '../config/homeLayout';
import { WEEKDAY_LABELS } from '../config/constants';
import { formatScheduleSummary } from '../utils/format';

export function SchedulesScreen() {
  const { schedules, addSchedule, removeSchedule, toggleSchedule, pushToast } = useHome();
  const [deviceId, setDeviceId] = useState(DEVICES[0]?.id ?? '');
  const [time, setTime] = useState('07:00');
  const [action, setAction] = useState<'ON' | 'OFF'>('ON');
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const submit = () => {
    const error = addSchedule({ deviceId, time, action, weekdays, enabled: true });
    if (error) {
      pushToast(error, 'warning');
      return;
    }
    pushToast('Đã thêm hẹn giờ', 'info');
  };

  return (
    <div className="screen">
      <section className="card">
        <h3>Tạo hẹn giờ</h3>
        <div style={{ height: 10 }} />
        <label className="field">
          <span>Thiết bị</span>
          <select value={deviceId} onChange={(event) => setDeviceId(event.target.value)}>
            {DEVICES.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name} ({device.id})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Giờ (HH:mm)</span>
          <input value={time} onChange={(event) => setTime(event.target.value)} placeholder="07:30" />
        </label>
        <div className="weekday-row">
          {WEEKDAY_LABELS.map((label, index) => (
            <button
              key={label}
              type="button"
              className={`weekday-btn ${weekdays.includes(index) ? 'active' : ''}`}
              onClick={() =>
                setWeekdays((current) =>
                  current.includes(index) ? current.filter((day) => day !== index) : [...current, index],
                )
              }
            >
              {label}
            </button>
          ))}
        </div>
        <div className="action-row">
          <button
            type="button"
            className={`tab-btn ${action === 'ON' ? 'active' : ''}`}
            onClick={() => setAction('ON')}
          >
            Bật
          </button>
          <button
            type="button"
            className={`tab-btn ${action === 'OFF' ? 'active' : ''}`}
            onClick={() => setAction('OFF')}
          >
            Tắt
          </button>
          <button type="button" className="cta-btn" onClick={submit}>
            + Thêm
          </button>
        </div>
      </section>

      <section className="card">
        <h3>Danh sách hẹn giờ ({schedules.length})</h3>
        {schedules.length === 0 && <p className="muted">Chưa có lịch nào.</p>}
        <ul className="schedule-list">
          {schedules.map((schedule) => (
            <li key={schedule.id} className="schedule-item">
              <div>
                <strong>{formatScheduleSummary(schedule)}</strong>
                <p className="muted">
                  {schedule.action === 'ON' ? 'Bật' : 'Tắt'} · {schedule.deviceId}
                </p>
              </div>
              <div className="schedule-actions">
                <button type="button" onClick={() => toggleSchedule(schedule.id)}>
                  {schedule.enabled ? 'Tạm dừng' : 'Bật lại'}
                </button>
                <button type="button" className="danger-btn" onClick={() => removeSchedule(schedule.id)}>
                  Xoá
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
