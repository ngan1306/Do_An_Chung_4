import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authApi from '../services/authApi';
import type { AuthUser } from '../services/authApi';

export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<string | null>;
  register: (displayName: string, email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let active = true;
    void authApi.getCurrentSession().then((result) => {
      if (!active) return;
      if (result.success && result.user) {
        setUser(result.user);
        setStatus('authenticated');
      } else {
        setStatus('unauthenticated');
      }
    });
    return () => { active = false; };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    user,
    login: async (email, password) => {
      const result = await authApi.login(email, password);
      if (!result.success || !result.user) return result.error ?? 'Đăng nhập không thành công';
      setUser(result.user);
      setStatus('authenticated');
      return null;
    },
    register: async (displayName, email, password) => {
      const result = await authApi.register(displayName, email, password);
      if (!result.success || !result.user) return result.error ?? 'Đăng ký không thành công';
      setUser(result.user);
      setStatus('authenticated');
      return null;
    },
    logout: async () => {
      await authApi.logout();
      setUser(null);
      setStatus('unauthenticated');
    },
  }), [status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth phải được dùng bên trong AuthProvider');
  return value;
}
