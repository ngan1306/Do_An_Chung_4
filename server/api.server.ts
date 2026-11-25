/**
 * API Server (Express) - luu doc du lieu SmartHome tu/voi SQL Server.
 *   POST /api/telemetry          : luu 1 mau du lieu cam bien
 *   GET  /api/telemetry?limit=50 : doc lich su cam bien
 *   GET  /api/devices            : trang thai thiet bi
 *   PUT  /api/devices/:id        : cap nhat trang thai thiet bi
 *   GET  /api/schedules          : danh sach hen gio
 *   POST /api/schedules          : them hen gio
 *   DELETE /api/schedules/:id    : xoa hen gio
 *   PUT  /api/schedules/:id      : bat/tat hen gio
 *   GET  /api/settings           : chu de + nguong canh bao
 *   PUT  /api/settings           : luu chu de + nguong canh bao
 * Chay: npx tsx server/api.server.ts   (hoac bien ra JS bang tsc)
 */
import express from 'express';
import cors from 'cors';
import { query } from './db/database.service';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  const result = await query<{ recordset: { database_name: string }[] }>(
    'SELECT DB_NAME() AS database_name',
  );
  if (!result) return res.status(503).json({ success: false, database: 'disconnected' });
  res.json({ success: true, database: result.recordset[0]?.database_name });
});

/* ---- Telemetry ---- */
app.post('/api/telemetry', async (req, res) => {
  const { temperature = 0, humidity = 0, smoke = 0, motion = false } = req.body || {};
  const result = await query(
    `INSERT INTO dbo.telemetry_history (temperature, humidity, smoke, motion)
     OUTPUT INSERTED.* VALUES (@temperature, @humidity, @smoke, @motion)`,
    { temperature, humidity, smoke, motion },
  );
  if (!result) return res.status(503).json({ success: false, error: 'DB chua san sang' });
  res.json({ success: true, row: result.recordset[0] });
});

app.get('/api/telemetry', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  const result = await query(
    `SELECT TOP (@limit) id, temperature, humidity, smoke, motion,
            CAST(received_at AS DATETIMEOFFSET) AT TIME ZONE 'SE Asia Standard Time' AS received_at
     FROM dbo.telemetry_history ORDER BY id DESC`,
    { limit },
  );
  if (!result) return res.status(503).json({ success: false, error: 'DB chua san sang' });
  res.json(result.recordset.reverse());
});

/* ---- Devices ---- */
app.get('/api/devices', async (_req, res) => {
  const result = await query('SELECT device_id, state, updated_at FROM dbo.device_state ORDER BY device_id');
  if (!result) return res.status(503).json({ success: false, error: 'DB chua san sang' });
  res.json(result.recordset);
});

app.put('/api/devices/:id', async (req, res) => {
  const { state = 'OFF' } = req.body || {};
  const result = await query(
    `MERGE dbo.device_state AS target
     USING (VALUES (@id, @state)) AS src (device_id, state)
     ON target.device_id = src.device_id
     WHEN MATCHED THEN UPDATE SET state = src.state, updated_at = SYSUTCDATETIME()
     WHEN NOT MATCHED THEN INSERT (device_id, state) VALUES (src.device_id, src.state)
     OUTPUT 'ok' AS done;`,
    { id: req.params.id, state },
  );
  if (!result) return res.status(503).json({ success: false, error: 'DB chua san sang' });
  res.json({ success: true, deviceId: req.params.id, state });
});

/* ---- Schedules ---- */
app.get('/api/schedules', async (_req, res) => {
  const result = await query('SELECT * FROM dbo.schedules ORDER BY time');
  if (!result) return res.status(503).json({ success: false, error: 'DB chua san sang' });
  res.json(
    result.recordset.map((row: any) => ({
      id: row.id,
      deviceId: row.device_id,
      time: row.time,
      action: row.action,
      weekdays: String(row.weekdays).split(',').map(Number),
      enabled: Boolean(row.enabled),
    })),
  );
});

app.post('/api/schedules', async (req, res) => {
  const { id, deviceId, time, action = 'ON', weekdays = [0, 1, 2, 3, 4, 5, 6], enabled = true } = req.body || {};
  if (!id || !deviceId || !time) return res.status(400).json({ success: false, error: 'Thiếu id/deviceId/time' });
  const result = await query(
    `INSERT INTO dbo.schedules (id, device_id, time, action, weekdays, enabled)
     VALUES (@id, @deviceId, @time, @action, @weekdays, @enabled)`,
    { id, deviceId, time, action, weekdays: weekdays.join(','), enabled },
  );
  if (!result) return res.status(503).json({ success: false, error: 'DB chua san sang' });
  res.json({ success: true });
});

app.put('/api/schedules/:id', async (req, res) => {
  const { deviceId, time, action = 'ON', weekdays = [0, 1, 2, 3, 4, 5, 6], enabled = true } = req.body || {};
  const result = await query(
    `UPDATE dbo.schedules
     SET device_id = @deviceId, time = @time, action = @action,
         weekdays = @weekdays, enabled = @enabled
     WHERE id = @id`,
    { id: req.params.id, deviceId, time, action, weekdays: weekdays.join(','), enabled: !!enabled },
  );
  if (!result) return res.status(503).json({ success: false, error: 'DB chua san sang' });
  res.json({ success: true });
});

app.delete('/api/schedules/:id', async (req, res) => {
  const result = await query('DELETE FROM dbo.schedules WHERE id = @id', { id: req.params.id });
  if (!result) return res.status(503).json({ success: false, error: 'DB chua san sang' });
  res.json({ success: true });
});

/* ---- Settings ---- */
app.get('/api/settings', async (_req, res) => {
  const result = await query('SELECT theme, temperature_high, humidity_high, smoke_high FROM dbo.settings WHERE id = 1');
  if (!result) return res.status(503).json({ success: false, error: 'DB chua san sang' });
  if (result.recordset.length === 0) {
    return res.json({ theme: 'dark', temperatureHigh: 35, humidityHigh: 80, smokeHigh: 300 });
  }
  const row = result.recordset[0];
  res.json({
    theme: row.theme,
    temperatureHigh: row.temperature_high,
    humidityHigh: row.humidity_high,
    smokeHigh: row.smoke_high,
  });
});

app.put('/api/settings', async (req, res) => {
  const { theme = 'dark', temperatureHigh = 35, humidityHigh = 80, smokeHigh = 300 } = req.body || {};
  const result = await query(
    `UPDATE dbo.settings SET theme = @theme, temperature_high = @tempHigh,
            humidity_high = @humHigh, smoke_high = @smokeHigh WHERE id = 1`,
    { theme, tempHigh: temperatureHigh, humHigh: humidityHigh, smokeHigh: smokeHigh },
  );
  if (!result) return res.status(503).json({ success: false, error: 'DB chua san sang' });
  res.json({ success: true });
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => console.log(`🚀 API server (SQL Server) chay tai http://localhost:${PORT}`));
