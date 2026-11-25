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
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { query } from './db/database.service';
import {
  AUTH_SESSION_TTL_MS,
  deleteSession,
  getUserForToken,
  loginUser,
  registerUser,
} from './auth.service';

const app = express();
app.use(cors());
app.use(express.json());

const SESSION_COOKIE = 'smarthome_session';

function readSessionToken(req: Request): string | null {
  const cookies = req.headers.cookie?.split(';') ?? [];
  const cookie = cookies.find((item) => item.trim().startsWith(`${SESSION_COOKIE}=`));
  return cookie ? cookie.trim().slice(SESSION_COOKIE.length + 1) || null : null;
}

function setSessionCookie(res: Response, token: string): void {
  const attributes = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/api',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(AUTH_SESSION_TTL_MS / 1000)}`,
  ];
  if (process.env.NODE_ENV === 'production') attributes.push('Secure');
  res.setHeader('Set-Cookie', attributes.join('; '));
}

function clearSessionCookie(res: Response): void {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/api; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
  );
}

async function requireAuthentication(req: Request, res: Response, next: NextFunction) {
  const token = readSessionToken(req);
  if (!token) return res.status(401).json({ success: false, error: 'Vui lòng đăng nhập' });

  const session = await getUserForToken(token);
  if (session.status === 'unavailable') {
    return res.status(503).json({ success: false, error: 'Không kiểm tra được phiên đăng nhập' });
  }
  if (session.status !== 'valid') {
    clearSessionCookie(res);
    return res.status(401).json({ success: false, error: 'Phiên đăng nhập đã hết hạn' });
  }

  res.locals.authUser = session.user;
  next();
}

// Health check and authentication endpoints are public; home data requires a valid account session.
app.use('/api', (req, res, next) => {
  const path = req.originalUrl.split('?')[0];
  if (path === '/api/health' || path.startsWith('/api/auth/')) return next();
  return requireAuthentication(req, res, next);
});

app.post('/api/auth/register', async (req, res) => {
  const displayName = typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (displayName.length < 2 || displayName.length > 80) {
    return res.status(400).json({ success: false, error: 'Tên hiển thị cần từ 2 đến 80 ký tự' });
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Email không hợp lệ' });
  }
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ success: false, error: 'Mật khẩu cần từ 8 đến 128 ký tự' });
  }

  const result = await registerUser(displayName, email, password);
  if (result.status === 'exists') {
    return res.status(409).json({ success: false, error: 'Email này đã được đăng ký' });
  }
  if (result.status !== 'created') {
    return res.status(503).json({ success: false, error: 'Không tạo được tài khoản. Kiểm tra database và chạy migration đăng nhập.' });
  }

  setSessionCookie(res, result.token);
  return res.status(201).json({ success: true, user: result.user });
});

app.post('/api/auth/login', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Nhập email và mật khẩu' });
  }

  const result = await loginUser(email, password);
  if (result.status === 'invalid') {
    return res.status(401).json({ success: false, error: 'Email hoặc mật khẩu không đúng' });
  }
  if (result.status !== 'authenticated') {
    return res.status(503).json({ success: false, error: 'Không đăng nhập được. Kiểm tra database và migration đăng nhập.' });
  }

  setSessionCookie(res, result.token);
  return res.json({ success: true, user: result.user });
});

app.get('/api/auth/session', requireAuthentication, (_req, res) => {
  res.json({ success: true, user: res.locals.authUser });
});

app.post('/api/auth/logout', async (req, res) => {
  const token = readSessionToken(req);
  if (token) await deleteSession(token);
  clearSessionCookie(res);
  res.json({ success: true });
});

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
