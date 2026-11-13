import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useBookings } from '../lib/bookings';
import { C } from '../lib/tokens';
import Glass from './Glass';

// Pill filter chip.
export function Chip({ label, active, onPress, icon }) {
  const { theme } = useTheme();
  return (
    <Glass interactive style={st.chipGlass}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [st.chip, active && { backgroundColor: theme.accent }, pressed && { opacity: 0.7 }]}
      >
        {icon ? <Ionicons name={icon} size={13} color={active ? C.onAccent : C.ink2} /> : null}
        <Text style={[st.chipText, active && { color: C.onAccent }]}>{label}</Text>
      </Pressable>
    </Glass>
  );
}

// What to show when there are no bookings at all: backend down, Gmail not connected, or nothing scraped yet.
export function EmptyState() {
  const { theme } = useTheme();
  const { error, gmail, reload, connect, sync, syncing } = useBookings();
  const connected = !!gmail?.connected;
  const cfg = error
    ? { icon: 'cloud-offline-outline', title: 'Backend not reachable', body: error, cta: 'Try again', run: reload }
    : !connected
      ? {
        icon: 'mail-outline', title: 'Connect your Gmail',
        body: 'BookMyShow forgets orders after about six months. Your inbox doesn\'t — Envy reads the booking emails (read-only) and rebuilds your full history.',
        cta: gmail?.expired ? 'Reconnect Gmail' : 'Connect Gmail', run: connect,
      }
      : { icon: 'ticket-outline', title: 'No bookings yet', body: 'Gmail is connected. Run a sync to pull in your BookMyShow history.', cta: syncing ? 'Syncing…' : 'Sync now', run: () => sync() };
  return (
    <View style={st.empty}>
      <View style={[st.emptyIcon, { backgroundColor: theme.faint }]}>
        <Ionicons name={cfg.icon} size={30} color={theme.accent} />
      </View>
      <Text style={st.emptyTitle}>{cfg.title}</Text>
      <Text style={st.emptyBody}>{cfg.body}</Text>
      <Pressable onPress={cfg.run} disabled={syncing} style={({ pressed }) => [st.cta, { backgroundColor: theme.accent }, pressed && { opacity: 0.8 }]}>
        <Text style={st.ctaText}>{cfg.cta}</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  chipGlass: { borderRadius: 19 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 36, paddingHorizontal: 15 },
  chipText: { color: C.ink2, fontSize: 13, fontWeight: '700' },

  empty: { alignItems: 'center', paddingHorizontal: 34, paddingTop: 56 },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyTitle: { color: C.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
  emptyBody: { color: C.ink2, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  cta: { marginTop: 22, height: 46, paddingHorizontal: 26, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: C.onAccent, fontSize: 15, fontWeight: '800' },
});
