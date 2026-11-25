import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { query } from './db/database.service';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_HASH_BYTES = 64;

export interface AuthUser {
  id: number;
  displayName: string;
  email: string;
}

interface UserRow {
  id: number;
  display_name: string;
  email: string;
  password_salt: string;
  password_hash: string;
}

interface SessionRow extends AuthUser {
  display_name: string;
}

interface QueryResult<T> {
  recordset: T[];
}

type SessionResult =
  | { status: 'valid'; user: AuthUser }
  | { status: 'invalid' }
  | { status: 'unavailable' };

function digestToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function derivePasswordHash(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, PASSWORD_HASH_BYTES, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

function toAuthUser(row: Pick<UserRow, 'id' | 'display_name' | 'email'>): AuthUser {
  return { id: row.id, displayName: row.display_name, email: row.email };
}

async function createSession(user: AuthUser): Promise<{ token: string; expiresAt: Date } | null> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const result = await query(
    `INSERT INTO dbo.auth_sessions (user_id, token_hash, expires_at)
     VALUES (@userId, @tokenHash, @expiresAt)`,
    { userId: user.id, tokenHash: digestToken(token), expiresAt },
  );
  return result ? { token, expiresAt } : null;
}

export async function registerUser(
  displayName: string,
  email: string,
  password: string,
): Promise<{ status: 'created'; user: AuthUser; token: string } | { status: 'exists' | 'unavailable' }> {
  const existing = await query<QueryResult<{ id: number }>>(
    'SELECT TOP (1) id FROM dbo.auth_users WHERE email = @email',
    { email },
  );
  if (!existing) return { status: 'unavailable' };
  if (existing.recordset.length > 0) return { status: 'exists' };

  const salt = randomBytes(16).toString('hex');
  const passwordHash = (await derivePasswordHash(password, salt)).toString('hex');
  const inserted = await query<QueryResult<UserRow>>(
    `INSERT INTO dbo.auth_users (display_name, email, password_salt, password_hash)
     OUTPUT INSERTED.id, INSERTED.display_name, INSERTED.email,
            INSERTED.password_salt, INSERTED.password_hash
     VALUES (@displayName, @email, @salt, @passwordHash)`,
    { displayName, email, salt, passwordHash },
  );
  const row = inserted?.recordset[0];
  if (!row) return { status: 'unavailable' };

  const user = toAuthUser(row);
  const session = await createSession(user);
  if (!session) return { status: 'unavailable' };
  return { status: 'created', user, token: session.token };
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{ status: 'authenticated'; user: AuthUser; token: string } | { status: 'invalid' | 'unavailable' }> {
  const result = await query<QueryResult<UserRow>>(
    `SELECT TOP (1) id, display_name, email, password_salt, password_hash
     FROM dbo.auth_users WHERE email = @email`,
    { email },
  );
  if (!result) return { status: 'unavailable' };
  const row = result.recordset[0];
  if (!row) return { status: 'invalid' };

  const actualHash = await derivePasswordHash(password, row.password_salt);
  const storedHash = Buffer.from(row.password_hash, 'hex');
  if (storedHash.length !== actualHash.length || !timingSafeEqual(storedHash, actualHash)) {
    return { status: 'invalid' };
  }

  const user = toAuthUser(row);
  const session = await createSession(user);
  if (!session) return { status: 'unavailable' };
  return { status: 'authenticated', user, token: session.token };
}

export async function getUserForToken(token: string): Promise<SessionResult> {
  const result = await query<QueryResult<SessionRow>>(
    `SELECT TOP (1) u.id, u.display_name, u.email
     FROM dbo.auth_sessions AS s
     INNER JOIN dbo.auth_users AS u ON u.id = s.user_id
     WHERE s.token_hash = @tokenHash AND s.expires_at > SYSUTCDATETIME()`,
    { tokenHash: digestToken(token) },
  );
  if (!result) return { status: 'unavailable' };
  const row = result.recordset[0];
  return row ? { status: 'valid', user: toAuthUser(row) } : { status: 'invalid' };
}

export async function deleteSession(token: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM dbo.auth_sessions WHERE token_hash = @tokenHash',
    { tokenHash: digestToken(token) },
  );
  return result !== null;
}

export const AUTH_SESSION_TTL_MS = SESSION_TTL_MS;
