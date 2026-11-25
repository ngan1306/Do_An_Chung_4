export interface AuthUser {
  id: number;
  displayName: string;
  email: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
  status: number;
}

async function request(path: string, body?: unknown): Promise<AuthResponse> {
  try {
    const response = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({})) as Omit<AuthResponse, 'status'>;
    return { ...result, status: response.status };
  } catch {
    return { success: false, error: 'Không kết nối được máy chủ. Kiểm tra API và SQL Server.', status: 0 };
  }
}

export function getCurrentSession(): Promise<AuthResponse> {
  return request('/api/auth/session');
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return request('/api/auth/login', { email, password });
}

export function register(displayName: string, email: string, password: string): Promise<AuthResponse> {
  return request('/api/auth/register', { displayName, email, password });
}

export function logout(): Promise<AuthResponse> {
  return request('/api/auth/logout', {});
}
