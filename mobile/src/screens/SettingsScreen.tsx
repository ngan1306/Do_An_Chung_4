/** Man hinh Settings: cau hinh server, chu de, nguong canh bao, dang xuat. */
import React, { useState } from 'react';
import { Alert as RnAlert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useHome } from '../state/HomeContext';
import type { ConnectionMode } from '../types';

export function SettingsScreen() {
  const { config, connect, disconnect, status, statusDetail, theme, toggleTheme, thresholds, saveThresholds, logout, isAuthenticated } = useHome();
  const [host, setHost] = useState(config.host);
  const [port, setPort] = useState(config.port);
  const [username, setUsername] = useState(config.username);
  const [password, setPassword] = useState(config.password);
  const [tempHigh, setTempHigh] = useState(String(thresholds.tempHigh));
  const [tempLow, setTempLow] = useState(String(thresholds.tempLow));

  const doConnect = (m: ConnectionMode) => {
    disconnect();
    connect({ host, port, username, password }, m);
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.section}>Server</Text>
      <TextInput style={styles.input} value={host} onChangeText={setHost} placeholder="IP server (vd 192.168.1.10)" autoCapitalize="none" />
      <TextInput style={styles.input} value={port} onChangeText={setPort} placeholder="Cổng (3000)" keyboardType="numeric" />
      <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Tài khoản" autoCapitalize="none" />
      <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Mật khẩu" secureTextEntry />
      <View style={styles.rowBtns}>
        <TouchableOpacity style={styles.btnLive} onPress={() => doConnect('live')}>
          <Text style={styles.btnText}>Kết nối live</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnDemo} onPress={() => doConnect('demo')}>
          <Text style={styles.btnText}>Chế độ demo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnDisc} onPress={disconnect}>
          <Text style={styles.btnText}>Ngắt</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.status}>Trạng thái: {status} — {statusDetail}</Text>

      <Text style={styles.section}>Chủ đề</Text>
      <View style={styles.row}>
        <Text>Chế độ tối</Text>
        <Switch value={theme === 'dark'} onValueChange={toggleTheme} />
      </View>

      <Text style={styles.section}>Ngưỡng cảnh báo</Text>
      <View style={styles.row}>
        <Text>Nhiệt độ cao (°C)</Text>
        <TextInput style={styles.smallInput} value={tempHigh} onChangeText={setTempHigh} keyboardType="numeric" />
      </View>
      <View style={styles.row}>
        <Text>Nhiệt độ thấp (°C)</Text>
        <TextInput style={styles.smallInput} value={tempLow} onChangeText={setTempLow} keyboardType="numeric" />
      </View>
      <TouchableOpacity
        style={styles.btnLive}
        onPress={() => {
          const hi = Number(tempHigh), lo = Number(tempLow);
          if (Number.isNaN(hi) || Number.isNaN(lo) || hi <= lo) {
            RnAlert.alert('Lỗi', 'Ngưỡng cao phải lớn hơn ngưỡng thấp');
            return;
          }
          saveThresholds({ tempHigh: hi, tempLow: lo });
        }}>
        <Text style={styles.btnText}>Lưu ngưỡng</Text>
      </TouchableOpacity>

      <Text style={styles.section}>Tài khoản</Text>
      <TouchableOpacity style={styles.btnDisc} onPress={logout} disabled={!isAuthenticated}>
        <Text style={styles.btnText}>{isAuthenticated ? 'Đăng xuất' : 'Chưa đăng nhập'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 8 },
  section: { fontSize: 15, fontWeight: 'bold', marginTop: 10, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, backgroundColor: '#fff' },
  smallInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 6, width: 80, textAlign: 'center', backgroundColor: '#fff' },
  rowBtns: { flexDirection: 'row', gap: 8 },
  btnLive: { backgroundColor: '#1e3c72', padding: 10, borderRadius: 8, flex: 1, alignItems: 'center' },
  btnDemo: { backgroundColor: '#2e7d32', padding: 10, borderRadius: 8, flex: 1, alignItems: 'center' },
  btnDisc: { backgroundColor: '#c62828', padding: 10, borderRadius: 8, flex: 1, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  status: { color: '#666', fontSize: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
});
