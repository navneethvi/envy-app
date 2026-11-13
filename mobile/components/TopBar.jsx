import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useBookings } from '../lib/bookings';
import { C } from '../lib/tokens';
import SettingsSheet from './SettingsSheet';
import Glass, { frost } from './Glass';

function Spinning({ active, children }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) { v.setValue(0); return undefined; }
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [active, v]);
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return <Animated.View style={{ transform: [{ rotate }] }}>{children}</Animated.View>;
}

// Screen title, the sync button, settings — and the result of the last sync underneath.
export default function TopBar({ title }) {
  const { theme } = useTheme();
  const { gmail, syncing, sync, connect, notice, clearNotice } = useBookings();
  const [settings, setSettings] = useState(false);
  const connected = !!gmail?.connected;

  return (
    <View style={st.wrap}>
      <View style={st.row}>
        <Text style={st.title} numberOfLines={1}>{title}</Text>
        <Glass interactive style={st.capsule}>
        <Pressable
          onPress={connected ? () => sync() : connect}
          disabled={syncing}
          style={({ pressed }) => [st.sync, pressed && { opacity: 0.6 }]}
        >
          <Spinning active={syncing}>
            <Ionicons name={connected ? 'sync' : 'logo-google'} size={15} color={theme.accent} />
          </Spinning>
          <Text style={[st.syncText, { color: theme.accent }]}>
            {syncing ? 'Syncing…' : connected ? 'Sync' : gmail?.expired ? 'Reconnect' : 'Connect Gmail'}
          </Text>
        </Pressable>
        </Glass>
        <Glass interactive style={st.capsule}>
          <Pressable onPress={() => setSettings(true)} hitSlop={8} style={({ pressed }) => [st.iconBtn, pressed && { opacity: 0.6 }]} accessibilityLabel="Settings">
            <Ionicons name="options-outline" size={18} color={C.ink} />
          </Pressable>
        </Glass>
      </View>

      {syncing ? (
        <View style={st.notice}>
          <Text style={st.noticeText}>Reading your BookMyShow emails from Gmail…</Text>
        </View>
      ) : notice ? (
        <Pressable style={st.notice} onPress={clearNotice}>
          <Ionicons name={notice.ok ? 'checkmark-circle' : 'alert-circle'} size={16} color={notice.ok ? theme.accent : C.bad} />
          <Text style={[st.noticeText, !notice.ok && { color: C.bad }]}>{notice.text}</Text>
          <Ionicons name="close" size={14} color={C.ink3} />
        </Pressable>
      ) : null}

      <SettingsSheet visible={settings} onClose={() => setSettings(false)} />
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18 },
  wrap: { marginBottom: 18 },
  title: { flex: 1, color: C.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.9 },
  capsule: { borderRadius: 20 },
  sync: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38 },
  syncText: { fontSize: 13, fontWeight: '800' },
  iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, ...frost, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  noticeText: { flex: 1, color: C.ink2, fontSize: 12.5, lineHeight: 17 },
});
