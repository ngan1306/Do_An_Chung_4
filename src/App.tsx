/** App - khung dien thoai + bottom nav 3 tab (Giam sat / Dieu khien / Ket noi) giong mockup. */
import type { ReactElement } from 'react';
import { HomeProvider } from './state/HomeProvider';
import { useHome, type AppTab } from './state/HomeContext';
import { AuthProvider, useAuth } from './state/AuthContext';
import { AuthScreen } from './screens/AuthScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { RoomsScreen } from './screens/RoomsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SchedulesScreen } from './screens/SchedulesScreen';
import { ToastOverlay } from './screens/ToastOverlay';
import { GridIcon, PowerIcon, WifiIcon } from './components/NavIcons';

const NAV: { key: AppTab; label: string; icon: () => ReactElement }[] = [
  { key: 'dashboard', label: 'Giám sát', icon: GridIcon },
  { key: 'rooms', label: 'Điều khiển', icon: PowerIcon },
  { key: 'settings', label: 'Kết nối', icon: WifiIcon },
];

const HEADERS: Record<AppTab, { eyebrow: string; title: string }> = {
  dashboard: { eyebrow: 'Chung cư thông minh', title: 'Giám sát' },
  rooms: { eyebrow: 'Phòng khách', title: 'Điều khiển' },
  schedules: { eyebrow: 'Tự động hoá', title: 'Hẹn giờ' },
  settings: { eyebrow: 'MQTT Broker', title: 'Kết nối' },
};

const SCREENS: Record<AppTab, () => ReactElement> = {
  dashboard: DashboardScreen,
  rooms: RoomsScreen,
  schedules: SchedulesScreen,
  settings: SettingsScreen,
};

function Main() {
  const { activeTab, setActiveTab } = useHome();
  const Screen = SCREENS[activeTab] ?? DashboardScreen;
  const header = HEADERS[activeTab];

  return (
    <div className="stage">
      <div className="phone">
        <header className="phone-header">
          <p className="eyebrow">{header.eyebrow}</p>
          <h1>{header.title}</h1>
        </header>
        <main className="phone-body">
          <Screen />
        </main>
        <nav className="bottom-nav">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
                onClick={() => setActiveTab(item.key)}
              >
                <Icon />
                {item.label}
              </button>
            );
          })}
        </nav>
        <ToastOverlay />
      </div>
    </div>
  );
}

function AppContent() {
  const { status } = useAuth();
  if (status === 'checking') {
    return (
      <div className="stage">
        <div className="phone auth-phone">
          <header className="phone-header">
            <p className="eyebrow">Chung cư thông minh</p>
            <h1>Đang kiểm tra phiên…</h1>
          </header>
        </div>
      </div>
    );
  }
  if (status === 'unauthenticated') return <AuthScreen />;

  return (
    <HomeProvider>
      <Main />
    </HomeProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
