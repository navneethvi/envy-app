import { View, Text, Pressable, StyleSheet } from 'react-native';
import { rgba } from '../constants/themes';
import { useTheme } from '../lib/theme';
import { C } from '../lib/tokens';
import { MONTH_INITIAL } from '../lib/analytics';

// Column chart. One series in the accent; only the tallest column is labelled —
// tap any column to see the bookings behind it.
// data: [{ key, label, name, items, [field]: number }]
export function Columns({ data, field = 'count', format = v => `${v}`, onSelect, height = 112 }) {
  const { theme } = useTheme();
  const max = Math.max(1, ...data.map(d => d[field]));
  const peak = data.findIndex(d => d[field] === max);
  return (
    <View>
      <View style={[st.cols, { height: height + 18 }]}>
        {data.map((d, i) => {
          const v = d[field];
          const h = v > 0 ? Math.max(4, (v / max) * height) : 0;
          return (
            <Pressable
              key={d.key}
              style={({ pressed }) => [st.col, pressed && { opacity: 0.55 }]}
              disabled={!v || !onSelect}
              onPress={() => onSelect(d)}
              accessibilityLabel={`${d.name}: ${format(v)}`}
            >
              {i === peak && v > 0 ? <Text style={st.peak} numberOfLines={1}>{format(v)}</Text> : null}
              <View style={[st.bar, { height: h, backgroundColor: theme.accent }]} />
            </Pressable>
          );
        })}
      </View>
      <View style={st.baseline} />
      <View style={st.labels}>
        {data.map(d => <Text key={d.key} style={st.label} numberOfLines={1}>{d.label}</Text>)}
      </View>
    </View>
  );
}

// Year × month grid. One hue, darker = fewer, brighter = more.
export function Heatmap({ grid, onSelect }) {
  const { theme } = useTheme();
  const shade = n => (n ? rgba(theme.accent, 0.2 + 0.8 * (n / grid.max)) : 'rgba(255,255,255,0.045)');
  return (
    <View>
      <View style={st.hmRow}>
        <View style={st.hmYear} />
        {MONTH_INITIAL.map((m, i) => <Text key={i} style={st.hmHead}>{m}</Text>)}
      </View>
      {grid.rows.map(r => (
        <View key={r.year} style={st.hmRow}>
          <Text style={[st.hmYear, st.hmYearText]}>{r.year}</Text>
          {r.cells.map((c, i) => (
            <Pressable
              key={i}
              disabled={!c.count}
              onPress={() => onSelect(r.year, i, c.items)}
              style={({ pressed }) => [st.hmCell, { backgroundColor: shade(c.count) }, pressed && { opacity: 0.6 }]}
              accessibilityLabel={`${r.year} month ${i + 1}: ${c.count} bookings`}
            />
          ))}
        </View>
      ))}
      <View style={st.hmLegend}>
        <Text style={st.hmLegendText}>0</Text>
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <View key={t} style={[st.hmKey, { backgroundColor: t ? rgba(theme.accent, 0.2 + 0.8 * t) : 'rgba(255,255,255,0.045)' }]} />
        ))}
        <Text style={st.hmLegendText}>{grid.max} a month</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  cols: { flexDirection: 'row', alignItems: 'flex-end' },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { width: '62%', maxWidth: 24, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  peak: { color: C.ink, fontSize: 11, fontWeight: '800', marginBottom: 4, minWidth: 60, textAlign: 'center' },
  baseline: { height: 1, backgroundColor: C.ink4 },
  labels: { flexDirection: 'row', marginTop: 7 },
  label: { flex: 1, textAlign: 'center', color: C.ink3, fontSize: 10.5, fontWeight: '700' },

  hmRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 3 },
  hmYear: { width: 38 },
  hmYearText: { color: C.ink3, fontSize: 11, fontWeight: '700' },
  hmHead: { flex: 1, textAlign: 'center', color: C.ink3, fontSize: 10, fontWeight: '700', marginBottom: 2 },
  hmCell: { flex: 1, aspectRatio: 1, borderRadius: 5 },
  hmLegend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 10 },
  hmKey: { width: 12, height: 12, borderRadius: 3 },
  hmLegendText: { color: C.ink3, fontSize: 10.5, fontWeight: '600', marginHorizontal: 3 },
});
