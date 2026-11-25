import { useState, type FormEvent } from 'react';
import { useAuth } from '../state/AuthContext';

export function AuthScreen() {
  const { login, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    const message = isRegistering
      ? await register(displayName.trim(), email.trim(), password)
      : await login(email.trim(), password);
    setBusy(false);
    if (message) setError(message);
  };

  return (
    <div className="stage">
      <div className="phone auth-phone">
        <header className="phone-header">
          <p className="eyebrow">Chung cư thông minh</p>
          <h1>{isRegistering ? 'Tạo tài khoản' : 'Đăng nhập'}</h1>
        </header>
        <main className="phone-body auth-body">
          <div className="card auth-card">
            <p className="muted auth-description">
              {isRegistering ? 'Đăng ký để bắt đầu quản lý nhà thông minh.' : 'Đăng nhập để mở bảng điều khiển của bạn.'}
            </p>
            <form onSubmit={submit}>
              {isRegistering && (
                <label className="field">
                  <span>Họ tên</span>
                  <input
                    autoComplete="name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </label>
              )}
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  maxLength={254}
                  required
                />
              </label>
              <label className="field">
                <span>Mật khẩu</span>
                <input
                  type="password"
                  autoComplete={isRegistering ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  maxLength={128}
                  required
                />
                {isRegistering && <small className="muted">Dùng ít nhất 8 ký tự.</small>}
              </label>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button className="cta-btn" type="submit" disabled={busy}>
                {busy ? 'Đang xử lý…' : isRegistering ? 'Đăng ký' : 'Đăng nhập'}
              </button>
            </form>
            <p className="auth-switch">
              {isRegistering ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
              <button
                type="button"
                onClick={() => { setIsRegistering((current) => !current); setError(''); }}
              >
                {isRegistering ? 'Đăng nhập' : 'Đăng ký'}
              </button>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
