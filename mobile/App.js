/**
 * App - boc HomeProvider + man hinh chinh (4 tab + toast overlay).
 */
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { HomeProvider } from './src/providers/HomeProvider';
import { HomeContext, useHome } from './src/state/HomeContext';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { RoomsScreen } from './src/screens/RoomsScreen';
import { SchedulesScreen } from './src/screens/SchedulesScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

const TABS = [
  { key: 'dashboard', label: '📊 Tổng quan' },
  { key: 'rooms', label: '🏠 Phòng' },
  { key: 'schedules', label: '⏰ Hẹn giờ' },
  { key: 'settings', label: '⚙️ Cài đặt' },
];

const SCREENS = {
  dashboard: DashboardScreen,
  rooms: RoomsScreen,
  schedules: SchedulesScreen,
  settings: SettingsScreen,
};

function ToastOverlay() {
  const { toasts, dismissToast } = useHome();
  if (toasts.length === 0) return null;
  return (
    <View style={styles.toastWrap} pointerEvents="box-none">
      {toasts.map((t) => (
        <TouchableOpacity key={t.id} onPress={() => dismissToast(t.id)} style={styles.toast}>
          <Text style={styles.toastText}>{t.message}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Main() {
  const { activeTab, setActiveTab } = useHome();
  const Screen = SCREENS[activeTab] ?? DashboardScreen;
  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <Screen />
      </View>
      <View style={styles.tabbar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}>
            <Text style={activeTab === t.key ? styles.tabTextActive : styles.tabText}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ToastOverlay />
    </View>
  );
}

export default function App() {
  return (
    <HomeProvider>
      <StatusBar style="auto" />
      <Main />
    </HomeProvider>
  );
}

// HomeContext duoc xuat lai de test / hinh sach nao can dung truc tiep
export { HomeContext };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fa' },
  body: { flex: 1 },
  tabbar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
  },
  tab: { flex: 1, padding: 14, alignItems: 'center' },
  tabActive: { backgroundColor: '#eef1f7' },
  tabText: { color: '#777' },
  tabTextActive: { color: '#1e3c72', fontWeight: 'bold' },
  toastWrap: { position: 'absolute', bottom: 70, left: 16, right: 16, gap: 6 },
  toast: { backgroundColor: '#333', borderRadius: 8, padding: 10 },
  toastText: { color: '#fff' },
});
