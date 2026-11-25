/** Man hinh Dashboard: hien thi cam bien + canh bao moi nhat. */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useHome } from '../state/HomeContext';

export function DashboardScreen() {
  const {
    telemetry, lastUpdatedAt, statusDetail, alerts, dismissAlert,
    deviceStates, toggleDevice, isConnected,
  } = useHome();

  const tempColor =
    telemetry && telemetry.temperature > 38 ? '#d32f2f' : telemetry && telemetry.temperature > 32 ? '#f57c00' : '#1e3c72';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.detail}>{statusDetail}</Text>
      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Nhiệt độ</Text>
          <Text style={[styles.cardValue, { color: tempColor }]}>
            {telemetry ? `${telemetry.temperature}°C` : '--'}
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Độ ẩm</Text>
          <Text style={styles.cardValue}>{telemetry ? `${telemetry.humidity}%` : '--'}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Lửa</Text>
          <Text style={[styles.cardValue, { color: telemetry?.fire ? '#d32f2f' : '#2e7d32' }]}>
            {telemetry ? (telemetry.fire ? '⚠️ CÓ' : 'Bình thường') : '--'}
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Chuyển động</Text>
          <Text style={[styles.cardValue, { color: telemetry?.motion ? '#f57c00' : '#2e7d32' }]}>
            {telemetry ? (telemetry.motion ? 'CÓ' : 'Không') : '--'}
          </Text>
        </View>
      </View>
      {lastUpdatedAt && (
        <Text style={styles.updated}>Cập nhật lúc {new Date(lastUpdatedAt).toLocaleTimeString()}</Text>
      )}

      <Text style={styles.section}>Thiết bị</Text>
      <View style={styles.devices}>
        {Object.values(deviceStates).map((d) => (
          <TouchableOpacity
            key={d.id}
            style={[styles.deviceBtn, d.state === 'ON' && styles.deviceOn]}
            onPress={() => toggleDevice(d.id)}
            disabled={!isConnected}>
            <Text style={d.state === 'ON' ? styles.deviceTextOn : styles.deviceText}>
              {d.name} · {d.state}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.section}>Cảnh báo ({alerts.length})</Text>
      {alerts.length === 0 && <Text style={styles.muted}>Chưa có cảnh báo</Text>}
      {alerts.slice(0, 10).map((a) => (
        <TouchableOpacity key={a.id} onPress={() => dismissAlert(a.id)} style={[styles.alert, styles[a.level]]}>
          <Text style={styles.alertTitle}>{a.title}</Text>
          {!!a.body && <Text style={styles.alertBody}>{a.body}</Text>}
          <Text style={styles.alertTime}>{new Date(a.at).toLocaleTimeString()}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 10 },
  detail: { color: '#666', marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, minWidth: '46%', flex: 1,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardLabel: { color: '#888', fontSize: 12 },
  cardValue: { fontSize: 22, fontWeight: 'bold', marginTop: 4, color: '#1e3c72' },
  updated: { color: '#999', fontSize: 11 },
  section: { fontSize: 15, fontWeight: 'bold', marginTop: 12, color: '#333' },
  devices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  deviceBtn: {
    padding: 10, borderRadius: 8, backgroundColor: '#eee', minWidth: '48%',
  },
  deviceOn: { backgroundColor: '#1e3c72' },
  deviceText: { color: '#333', textAlign: 'center' },
  deviceTextOn: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  alert: { padding: 12, borderRadius: 8, backgroundColor: '#fff3e0', marginBottom: 6 },
  info: { backgroundColor: '#e3f2fd' },
  warning: { backgroundColor: '#fff3e0' },
  danger: { backgroundColor: '#ffebee' },
  alertTitle: { fontWeight: 'bold' },
  alertBody: { color: '#555', marginTop: 2 },
  alertTime: { color: '#999', fontSize: 10, marginTop: 4 },
  muted: { color: '#999' },
});
