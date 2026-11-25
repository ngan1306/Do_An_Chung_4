/** Man hinh Schedules: tao/quan ly hen gio bat-tat thiet bi. */
import React, { useState } from 'react';
import { Alert as RnAlert, FlatList, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useHome } from '../state/HomeContext';

export function SchedulesScreen() {
  const { schedules, addSchedule, removeSchedule, toggleSchedule, deviceStates } = useHome();
  const [deviceId, setDeviceId] = useState(Object.keys(deviceStates)[0] ?? '');
  const [time, setTime] = useState('07:00');
  const [state, setState] = useState<'ON' | 'OFF'>('ON');

  const submit = () => {
    const id = addSchedule({ deviceId, time, state });
    if (id) RnAlert.alert('Đã thêm hẹn giờ', `${time} - ${deviceId} -> ${state}`);
    else RnAlert.alert('Lỗi', 'Giờ phải dạng HH:mm (vd 07:30)');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.section}>Tạo hẹn giờ</Text>
      <TextInput style={styles.input} value={deviceId} onChangeText={setDeviceId} placeholder="ID thiết bị (home/.../light1)" />
      <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="HH:mm" />
      <TouchableOpacity style={[styles.stateBtn, state === 'ON' && styles.stateOn]} onPress={() => setState(state === 'ON' ? 'OFF' : 'ON')}>
        <Text style={state === 'ON' ? styles.textOn : styles.textOff}>Lệnh: {state}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.addBtn} onPress={submit}>
        <Text style={styles.addText}>+ Thêm hẹn giờ</Text>
      </TouchableOpacity>

      <Text style={styles.section}>Danh sách ({schedules.length})</Text>
      <FlatList
        data={schedules}
        keyExtractor={(s) => s.id}
        ListEmptyComponent={<Text style={styles.muted}>Chưa có hẹn giờ nào</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.time}>{item.time}</Text>
              <Text style={styles.sub}>{item.deviceId} → {item.state}</Text>
            </View>
            <Switch value={item.enabled} onValueChange={() => toggleSchedule(item.id)} />
            <TouchableOpacity onPress={() => removeSchedule(item.id)} style={styles.delBtn}>
              <Text style={{ color: '#d32f2f' }}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  section: { fontSize: 15, fontWeight: 'bold', marginVertical: 10, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 8, backgroundColor: '#fff' },
  stateBtn: { padding: 10, borderRadius: 8, backgroundColor: '#eee', marginBottom: 8, alignItems: 'center' },
  stateOn: { backgroundColor: '#1e3c72' },
  textOn: { color: '#fff', fontWeight: 'bold' },
  textOff: { color: '#333' },
  addBtn: { backgroundColor: '#2e7d32', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  addText: { color: '#fff', fontWeight: 'bold' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 8, elevation: 1 },
  time: { fontSize: 17, fontWeight: 'bold' },
  sub: { color: '#777', fontSize: 12 },
  delBtn: { padding: 8 },
  muted: { color: '#999' },
});
