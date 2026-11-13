import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useTheme } from '../lib/theme';
import { F } from '../lib/tokens';
import { formatMoney, formatMinutes, timeAgo } from '../lib/analytics';

const INK = 'rgba(11,11,15,0.92)';
const INK_DIM = 'rgba(11,11,15,0.6)';

// Counts up to `target` once, then follows it.
function useCountUp(target, ms = 900) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf;
    const from = n;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return n;
}

function Stat({ value, label }) {
  return (
    <View style={st.stat}>
      <Text style={st.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={st.statLabel}>{label}</Text>
    </View>
  );
}

// The all-time summary, as a golden ticket in the active accent.
export default function Hero({ stats, lastSyncAt }) {
  const { theme } = useTheme();
  const total = useCountUp(stats.total);

  return (
    <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.card}>
      <Ionicons name="ticket" size={150} color="rgba(11,11,15,0.07)" style={st.watermark} />

      <View style={st.top}>
        <Text style={st.kicker}>ALL-TIME SPEND ON BOOKMYSHOW</Text>
        <Text style={st.total} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(total)}</Text>
        <Text style={st.sub}>about {formatMoney(stats.avg)} a booking</Text>
      </View>

      <View style={st.tear}>
        {Array.from({ length: 26 }).map((_, i) => <View key={i} style={st.tearDot} />)}
      </View>

      <View style={st.stats}>
        <Stat value={stats.bookings} label="BOOKINGS" />
        <View style={st.rule} />
        <Stat value={stats.films} label="FILMS" />
        <View style={st.rule} />
        <Stat value={formatMinutes(stats.minutes)} label="IN THE DARK" />
      </View>

      <View style={st.foot}>
        <Text style={st.footText}>
          {dayjs(stats.first.date).format('MMM YYYY')} — {dayjs(stats.last.date).format('MMM YYYY')}
        </Text>
        {lastSyncAt ? <Text style={st.footText}>SYNCED {timeAgo(lastSyncAt).toUpperCase()}</Text> : null}
      </View>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  card: { borderRadius: 30, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.38)' },
  watermark: { position: 'absolute', right: -26, top: -22, transform: [{ rotate: '-18deg' }] },
  top: {},
  kicker: { color: INK_DIM, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.6 },
  total: { color: INK, fontFamily: F.display, fontSize: 68, lineHeight: 72, letterSpacing: 1, marginTop: 4 },
  sub: { color: INK_DIM, fontSize: 13, fontWeight: '600', marginTop: -2 },

  tear: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 16, height: 10 },
  tearDot: { width: 5, height: 2, borderRadius: 1, backgroundColor: 'rgba(11,11,15,0.28)' },

  stats: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1 },
  statValue: { color: INK, fontFamily: F.display, fontSize: 30, letterSpacing: 0.5 },
  statLabel: { color: INK_DIM, fontSize: 9.5, fontWeight: '800', letterSpacing: 1.3 },
  rule: { width: 1, height: 30, backgroundColor: 'rgba(11,11,15,0.16)', marginHorizontal: 14 },

  foot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  footText: { color: INK_DIM, fontSize: 10, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
});
