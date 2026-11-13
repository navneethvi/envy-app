import { memo } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useTheme } from '../lib/theme';
import { C, F } from '../lib/tokens';
import { formatMoney } from '../lib/analytics';
import { frost } from './Glass';

const STUB_W = 92;

// One booking, drawn as a frosted ticket: details on the left, a tear-off price stub on the right.
function TicketCard({ item, onPress, showYear }) {
  const { theme } = useTheme();
  const d = dayjs(item.date);
  const place = [item.theatre || 'Unknown theatre', item.screen].filter(Boolean).join(' · ');

  return (
    <Pressable
      onPress={onPress ? () => onPress(item) : undefined}
      disabled={!onPress}
      style={({ pressed }) => [st.card, pressed && st.pressed, item.cancelled && st.cancelled]}
    >
      {item.posterUrl
        ? <Image source={{ uri: item.posterUrl }} style={st.poster} />
        : <View style={[st.poster, st.posterEmpty]}><Ionicons name="film-outline" size={20} color={C.ink4} /></View>}

      <View style={st.body}>
        <Text style={[st.title, item.cancelled && st.struck]} numberOfLines={2}>{item.title}</Text>
        <Text style={st.place} numberOfLines={1}>{place}</Text>
        <View style={st.metaRow}>
          <Text style={st.date}>{d.format(showYear ? 'ddd, D MMM YYYY' : 'ddd, D MMM')}</Text>
          {item.format ? (
            <View style={[st.badge, { borderColor: theme.mid }]}>
              <Text style={[st.badgeText, { color: theme.accent }]}>{item.format}</Text>
            </View>
          ) : null}
          {item.language ? (
            <View style={[st.badge, { borderColor: C.ink4 }]}>
              <Text style={st.badgeText}>{item.language.slice(0, 3).toUpperCase()}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* perforation */}
      <View style={st.perf}>
        {Array.from({ length: 9 }).map((_, i) => <View key={i} style={st.perfDot} />)}
      </View>

      <View style={st.stub}>
        <Text style={[st.amount, item.cancelled && st.struck]} numberOfLines={1} adjustsFontSizeToFit>
          {formatMoney(item.amount)}
        </Text>
        {item.cancelled
          ? <Text style={[st.stubLabel, { color: C.warn }]}>REFUNDED</Text>
          : item.seatN > 0
            ? <Text style={st.stubLabel}>{item.seatN} {item.seatN === 1 ? 'SEAT' : 'SEATS'}</Text>
            : null}
      </View>

    </Pressable>
  );
}

export default memo(TicketCard);

const st = StyleSheet.create({
  card: { ...frost, flexDirection: 'row', alignItems: 'stretch', borderRadius: 20, overflow: 'hidden', minHeight: 98 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
  cancelled: { opacity: 0.55 },

  poster: { width: 56, height: 84, borderRadius: 11, margin: 9, marginRight: 12, backgroundColor: C.raised },
  posterEmpty: { alignItems: 'center', justifyContent: 'center' },

  body: { flex: 1, justifyContent: 'center', paddingVertical: 12, paddingRight: 10 },
  title: { color: C.ink, fontSize: 15.5, fontWeight: '700', lineHeight: 20, letterSpacing: -0.2 },
  struck: { textDecorationLine: 'line-through' },
  place: { color: C.ink2, fontSize: 12.5, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 7 },
  date: { color: C.ink3, fontSize: 12, fontWeight: '600' },
  badge: { borderWidth: 1, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { color: C.ink2, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.6 },

  perf: { width: 2, justifyContent: 'space-between', paddingVertical: 4 },
  perfDot: { width: 2, height: 4, borderRadius: 1, backgroundColor: C.ink4 },

  stub: { width: STUB_W, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  amount: { color: C.ink, fontFamily: F.display, fontSize: 25, letterSpacing: 0.5 },
  stubLabel: { color: C.ink3, fontSize: 9.5, fontWeight: '800', letterSpacing: 1.2, marginTop: 2 },

});
