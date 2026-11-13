import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import Sheet from './Sheet';
import { useTheme } from '../lib/theme';
import { useBookings } from '../lib/bookings';
import { C } from '../lib/tokens';
import { timeAgo } from '../lib/analytics';

function Action({ icon, label, hint, onPress, disabled, danger }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [st.action, (pressed || disabled) && { opacity: 0.5 }]}>
      <Ionicons name={icon} size={18} color={danger ? C.bad : C.ink} />
      <View style={{ flex: 1 }}>
        <Text style={[st.actionLabel, danger && { color: C.bad }]}>{label}</Text>
        {hint ? <Text style={st.actionHint}>{hint}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={15} color={C.ink4} />
    </Pressable>
  );
}

// Gmail connection + scrape controls + accent theme.
export default function SettingsSheet({ visible, onClose }) {
  const { theme, themeKey, setThemeKey, themes } = useTheme();
  const { gmail, syncing, sync, connect, disconnect } = useBookings();
  const connected = !!gmail?.connected;
  const run = fn => () => { onClose(); fn(); };

  return (
    <Sheet visible={visible} onClose={onClose} title="Settings">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={st.group}>Gmail</Text>
        <View style={st.card}>
          <View style={st.account}>
            <View style={[st.dot, { backgroundColor: connected ? theme.accent : C.ink4 }]} />
            <View style={{ flex: 1 }}>
              <Text style={st.accountTitle} numberOfLines={1}>
                {connected ? (gmail.email || 'Connected') : gmail?.expired ? 'Access expired' : 'Not connected'}
              </Text>
              <Text style={st.actionHint}>
                {connected
                  ? `Read-only · connected ${dayjs(gmail.connectedAt).format('D MMM YYYY')}${gmail.lastSyncAt ? ` · synced ${timeAgo(gmail.lastSyncAt)}` : ''}`
                  : 'The app only ever reads BookMyShow emails.'}
              </Text>
            </View>
          </View>
          {connected ? (
            <>
              <Action icon="sync" label="Sync new emails" hint="Checks for bookings and refunds since last time" onPress={run(() => sync())} disabled={syncing} />
              <Action icon="refresh-circle-outline" label="Rescan everything" hint="Re-reads every BookMyShow email — slower" onPress={run(() => sync({ full: true }))} disabled={syncing} />
              <Action icon="log-out-outline" label="Disconnect Gmail" hint="Saved bookings stay in the app" onPress={run(disconnect)} danger />
            </>
          ) : (
            <Action icon="logo-google" label={gmail?.expired ? 'Reconnect Gmail' : 'Connect Gmail'} hint="Opens Google sign-in in your browser" onPress={run(connect)} />
          )}
        </View>

        <Text style={st.group}>Accent</Text>
        <View style={[st.card, st.themes]}>
          {themes.map(t => {
            const active = t.key === themeKey;
            return (
              <Pressable key={t.key} style={st.themeCell} onPress={() => setThemeKey(t.key)}>
                <View style={[st.swatch, { backgroundColor: t.accent, borderColor: active ? C.ink : 'transparent' }]}>
                  {active && <Ionicons name="checkmark" size={18} color={C.onAccent} />}
                </View>
                <Text style={[st.themeName, active && { color: C.ink }]} numberOfLines={1}>{t.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Sheet>
  );
}

const st = StyleSheet.create({
  group: { color: C.ink3, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, marginTop: 6 },
  card: { backgroundColor: C.raised, borderRadius: 22, paddingHorizontal: 14, marginBottom: 16 },
  account: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  accountTitle: { color: C.ink, fontSize: 15, fontWeight: '700' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderTopWidth: 1, borderTopColor: C.line },
  actionLabel: { color: C.ink, fontSize: 14.5, fontWeight: '600' },
  actionHint: { color: C.ink3, fontSize: 12, marginTop: 2, lineHeight: 16 },
  themes: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 14, rowGap: 14 },
  themeCell: { width: '33.33%', alignItems: 'center', gap: 6 },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  themeName: { color: C.ink3, fontSize: 11.5, fontWeight: '600' },
});
