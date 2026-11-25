/** Man hinh Rooms: dieu khien thiet bi theo tung phong. */
import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useHome } from '../state/HomeContext';

export function RoomsScreen() {
  const { deviceStates, toggleDevice, pendingDeviceIds, isConnected } = useHome();
  const rooms = [...new Set(Object.values(deviceStates).map((d) => d.room))];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {rooms.map((room) => (
        <View key={room} style={styles.room}>
          <Text style={styles.roomTitle}>{room}</Text>
          {Object.values(deviceStates)
            .filter((d) => d.room === room)
            .map((d) => (
              <View key={d.id} style={styles.deviceRow}>
                <Text style={styles.deviceName}>
                  {d.kind === 'light' ? '💡' : d.kind === 'fan' ? '🌀' : '💧'} {d.name}
                </Text>
                <Switch
                  value={d.state === 'ON'}
                  disabled={!isConnected || pendingDeviceIds.includes(d.id)}
                  onValueChange={() => toggleDevice(d.id)}
                />
              </View>
            ))}
        </View>
      ))}
      {!isConnected && <Text style={styles.hint}>⚠️ Cần kết nối server để điều khiển (tab Cài đặt)</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 14 },
  room: { backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 2 },
  roomTitle: { fontSize: 15, fontWeight: 'bold', color: '#1e3c72', marginBottom: 8 },
  deviceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  deviceName: { fontSize: 15 },
  hint: { color: '#f57c00' },
});
