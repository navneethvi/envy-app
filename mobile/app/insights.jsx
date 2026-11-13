import { useCallback, useMemo, useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useBookings } from '../lib/bookings';
import { useTheme } from '../lib/theme';
import { usePrivacy } from '../lib/privacy';
import { C, F, PAGE } from '../lib/tokens';
import {
  summarize, yearsOf, inYear, byMonth, byYear, monthGrid, byWeekday, seatStats, monthStreaks,
  paceProjection, formatMinutes, MONTH_SHORT,
} from '../lib/analytics';
import Loader from '../components/Loader';
import TopBar from '../components/TopBar';
import ListSheet from '../components/ListSheet';
import { Columns, Heatmap } from '../components/Charts';
import { Chip, EmptyState } from '../components/Screen';
import { frost } from '../components/Glass';
import Backdrop from '../components/Backdrop';

function Card({ title, note, right, children }) {
  return (
    <View style={st.card}>
      {title ? (
        <View style={st.cardHead}>
          <View style={{ flex: 1 }}>
            <Text style={st.cardTitle}>{title}</Text>
            {note ? <Text style={st.cardNote}>{note}</Text> : null}
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

// "+36% vs 2025" — plain ink: more bookings isn't good or bad, it's just more.
function Delta({ cur, prev, prevLabel }) {
  if (!prev) return null;
  const pct = Math.round(((cur - prev) / prev) * 100);
  return (
    <View style={st.delta}>
      <Ionicons name={pct === 0 ? 'remove' : pct > 0 ? 'arrow-up' : 'arrow-down'} size={11} color={C.ink2} />
      <Text style={st.deltaText}>{Math.abs(pct)}% vs {prevLabel}</Text>
    </View>
  );
}

function Tile({ label, value, children }) {
  return (
    <View style={st.tile}>
      <Text style={st.tileLabel}>{label}</Text>
      <Text style={st.tileValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {children}
    </View>
  );
}

function Fact({ icon, label, value, sub, onPress }) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [st.fact, pressed && { opacity: 0.6 }]}>
      <View style={[st.factIcon, { backgroundColor: theme.faint }]}>
        <Ionicons name={icon} size={16} color={theme.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.factLabel}>{label}</Text>
        <Text style={st.factValue} numberOfLines={1}>{value}</Text>
        {sub ? <Text style={st.factSub} numberOfLines={1}>{sub}</Text> : null}
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={15} color={C.ink4} /> : null}
    </Pressable>
  );
}

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { hidden, money, moneyCompact } = usePrivacy();
  const { visits, loading, reload } = useBookings();

  const [year, setYear] = useState(null);            // null = all time
  const [metric, setMetric] = useState('count');     // 'count' | 'spend'
  const [sheet, setSheet] = useState(null);          // { title, items }
  const [refreshing, setRefreshing] = useState(false);

  const years = useMemo(() => yearsOf(visits), [visits]);
  const scope = useMemo(() => (year == null ? visits : inYear(visits, year)), [visits, year]);
  const s = useMemo(() => summarize(scope), [scope]);
  const prev = useMemo(() => (year == null ? null : summarize(inYear(visits, year - 1))), [visits, year]);
  const timeline = useMemo(() => (year == null ? byYear(visits) : byMonth(visits, year)), [visits, year]);
  const grid = useMemo(() => monthGrid(visits), [visits]);
  const week = useMemo(() => byWeekday(scope), [scope]);
  const seats = useMemo(() => seatStats(scope), [scope]);
  const streaks = useMemo(() => monthStreaks(visits), [visits]);
  const pace = useMemo(() => (year == null ? null : paceProjection(visits, year)), [visits, year]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    reload().finally(() => setRefreshing(false));
  }, [reload]);

  if (loading) return <View style={st.center}><Backdrop /><Loader label="Crunching numbers" /></View>;

  const scopeName = year == null ? 'all time' : `${year}`;
  const open = (title, items) => setSheet({ title, items });
  const topTheatre = s?.theatres[0];

  return (
    <View style={st.root}>
      <Backdrop />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[PAGE, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 110 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      >
        <TopBar title="Insights" />
        {!visits.length ? <EmptyState /> : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
              <Chip label="All time" active={year == null} onPress={() => setYear(null)} />
              {years.map(y => <Chip key={y} label={`${y}`} active={year === y} onPress={() => setYear(y)} />)}
            </ScrollView>

            {!s ? null : (
              <View style={st.stack}>
                {/* ── Headline tiles ── */}
                <View style={st.tiles}>
                  <Tile label="Bookings" value={s.bookings}>
                    <Delta cur={s.bookings} prev={prev?.bookings} prevLabel={year - 1} />
                  </Tile>
                  <Tile label="Spent" value={money(s.total)}>
                    {!hidden && <Delta cur={s.total} prev={prev?.total} prevLabel={year - 1} />}
                  </Tile>
                  <Tile label="Per booking" value={money(s.avg)}>
                    {!hidden && <Delta cur={s.avg} prev={prev?.avg} prevLabel={year - 1} />}
                  </Tile>
                </View>

                {/* ── Timeline ── */}
                <Card
                  title={`${metric === 'count' ? 'Bookings' : 'Spend'} by ${year == null ? 'year' : 'month'}`}
                  note={pace && metric === 'count' ? `On pace for about ${pace} bookings in ${year}` : 'Tap a bar to see its bookings'}
                  right={
                    <View style={st.toggle}>
                      {[['count', 'Bookings'], ['spend', 'Spend']].map(([k, t]) => (
                        <Pressable key={k} onPress={() => setMetric(k)} style={[st.toggleBtn, metric === k && { backgroundColor: C.ink }]}>
                          <Text style={[st.toggleText, metric === k && { color: C.bg }]}>{t}</Text>
                        </Pressable>
                      ))}
                    </View>
                  }
                >
                  <Columns
                    data={timeline}
                    field={metric}
                    format={metric === 'spend' ? moneyCompact : v => `${v}`}
                    onSelect={d => open(d.name, d.items)}
                  />
                </Card>

                {/* ── Heatmap (all-time only) ── */}
                {year == null && grid && grid.rows.length > 1 && (
                  <Card title="Every month, at a glance" note={s.busiest ? `Busiest: ${s.busiest.label} with ${s.busiest.items.length} bookings` : null}>
                    <Heatmap grid={grid} onSelect={(y, m, items) => open(`${MONTH_SHORT[m]} ${y}`, items)} />
                  </Card>
                )}

                {/* ── Theatres ── */}
                {s.theatres.length > 0 && (
                  <Card title="Where you watch" note={`${s.theatres.length} ${s.theatres.length === 1 ? 'theatre' : 'theatres'} · ${scopeName}`}>
                    {s.theatres.slice(0, 6).map((t, i) => (
                      <Pressable key={t.key} onPress={() => open(t.key, t.items)} style={({ pressed }) => [st.rank, i > 0 && st.rankLine, pressed && { opacity: 0.6 }]}>
                        <View style={st.rankTop}>
                          <Text style={st.rankName} numberOfLines={1}>{t.key}</Text>
                          <Text style={st.rankValue}>{t.visits}</Text>
                          <Ionicons name="chevron-forward" size={14} color={C.ink4} />
                        </View>
                        <View style={st.track}>
                          <View style={[st.fill, { width: `${(t.visits / topTheatre.visits) * 100}%`, backgroundColor: theme.accent }]} />
                        </View>
                        <Text style={st.rankSub}>{t.films} {t.films === 1 ? 'film' : 'films'} · {money(t.spend)}</Text>
                      </Pressable>
                    ))}
                  </Card>
                )}

                {/* ── Weekday ── */}
                {week && (
                  <Card title="Which day you go" note={`Mostly ${week.topDay}s · ${week.weekendPct}% on weekends`}>
                    <Columns data={week.buckets} onSelect={d => open(`${dayjs().day(d.key).format('dddd')}s`, d.items)} height={84} />
                  </Card>
                )}

                {/* ── Seats ── */}
                {seats && (
                  <Card title="Seats" note={`${seats.totalSeats} seats booked · ${scopeName}`}>
                    <View style={st.minis}>
                      {seats.perSeat != null && <Mini value={money(seats.perSeat)} label="per seat" />}
                      <Mini value={seats.avgSeats.toFixed(1)} label="seats a booking" />
                      <Mini value={`${seats.soloPct}%`} label="solo trips" />
                    </View>
                  </Card>
                )}

                {/* ── Repeats ── */}
                {s.repeats.length > 0 && (
                  <Card title="Booked more than once" note="Rewatches, or tickets for a second show">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }} style={{ marginHorizontal: -16 }}>
                      <View style={{ width: 4 }} />
                      {s.repeats.slice(0, 12).map(r => (
                        <Pressable key={r.key} onPress={() => open(r.title, r.items)} style={({ pressed }) => [st.repeat, pressed && { opacity: 0.7 }]}>
                          {r.posterUrl
                            ? <Image source={{ uri: r.posterUrl }} style={st.repeatPoster} />
                            : <View style={[st.repeatPoster, st.posterEmpty]}><Ionicons name="film-outline" size={24} color={C.ink4} /></View>}
                          <View style={[st.times, { backgroundColor: theme.accent }]}>
                            <Text style={st.timesText}>×{r.count}</Text>
                          </View>
                          <Text style={st.repeatTitle} numberOfLines={2}>{r.title}</Text>
                        </Pressable>
                      ))}
                      <View style={{ width: 4 }} />
                    </ScrollView>
                  </Card>
                )}

                {/* ── Records ── */}
                <Card title="For the record">
                  <Fact icon="hourglass-outline" label="Time in the dark" value={formatMinutes(s.minutes)}
                    sub={s.knownRuntime < s.bookings ? `from the ${s.knownRuntime} of ${s.bookings} bookings with a known runtime` : `across ${s.bookings} bookings`} />
                  <Fact icon="pricetag-outline" label="Priciest booking" value={`${money(s.priciest.amount)} · ${s.priciest.title}`}
                    sub={dayjs(s.priciest.date).format('D MMM YYYY')} onPress={() => open('Priciest booking', [s.priciest])} />
                  {seats?.biggestGroup && seats.biggestGroup.seatN > 2 && (
                    <Fact icon="people-outline" label="Biggest group" value={`${seats.biggestGroup.seatN} seats · ${seats.biggestGroup.title}`}
                      sub={dayjs(seats.biggestGroup.date).format('D MMM YYYY')} onPress={() => open('Biggest group', [seats.biggestGroup])} />
                  )}
                  {year == null && streaks && (
                    <Fact icon="flame-outline" label="Longest streak" value={`${streaks.longest} months in a row`}
                      sub={`${streaks.current ? `currently on ${streaks.current}` : 'no streak running'} · longest break ${streaks.longestGap} months`} />
                  )}
                  <Fact icon="flag-outline" label={year == null ? 'First booking' : `First of ${year}`} value={s.first.title}
                    sub={dayjs(s.first.date).format('D MMM YYYY')} onPress={() => open(year == null ? 'First booking' : `First of ${year}`, [s.first])} />
                </Card>
              </View>
            )}
          </>
        )}
      </ScrollView>
      <ListSheet data={sheet} onClose={() => setSheet(null)} />
    </View>
  );
}

function Mini({ value, label }) {
  return (
    <View style={st.mini}>
      <Text style={st.miniValue}>{value}</Text>
      <Text style={st.miniLabel}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  chips: { gap: 8, paddingHorizontal: 16 },
  stack: { paddingHorizontal: 16, gap: 12, marginTop: 16 },

  tiles: { flexDirection: 'row', gap: 10 },
  tile: { ...frost, flex: 1, borderRadius: 22, padding: 14, minHeight: 96 },
  tileLabel: { color: C.ink3, fontSize: 11.5, fontWeight: '700' },
  tileValue: { color: C.ink, fontFamily: F.display, fontSize: 32, letterSpacing: 0.5, marginTop: 4 },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  deltaText: { color: C.ink2, fontSize: 10.5, fontWeight: '700' },

  card: { ...frost, borderRadius: 26, padding: 16 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  cardTitle: { color: C.ink, fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  cardNote: { color: C.ink3, fontSize: 12.5, marginTop: 3 },

  toggle: { flexDirection: 'row', backgroundColor: C.raised, borderRadius: 16, padding: 3 },
  toggleBtn: { paddingHorizontal: 11, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  toggleText: { color: C.ink2, fontSize: 11.5, fontWeight: '800' },

  rank: { paddingVertical: 11 },
  rankLine: { borderTopWidth: 1, borderTopColor: C.line },
  rankTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rankName: { flex: 1, color: C.ink, fontSize: 14.5, fontWeight: '700' },
  rankValue: { color: C.ink, fontFamily: F.display, fontSize: 20, letterSpacing: 0.5 },
  track: { height: 6, borderRadius: 3, backgroundColor: C.raised, marginTop: 8, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, minWidth: 6 },
  rankSub: { color: C.ink3, fontSize: 12, marginTop: 6 },

  minis: { flexDirection: 'row', gap: 10 },
  mini: { flex: 1, backgroundColor: C.raised, borderRadius: 18, padding: 12 },
  miniValue: { color: C.ink, fontFamily: F.display, fontSize: 26, letterSpacing: 0.5 },
  miniLabel: { color: C.ink3, fontSize: 11.5, fontWeight: '600', marginTop: 1 },

  repeat: { width: 92 },
  repeatPoster: { width: 92, height: 138, borderRadius: 14, backgroundColor: C.raised },
  posterEmpty: { alignItems: 'center', justifyContent: 'center' },
  times: { position: 'absolute', top: 6, right: 6, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  timesText: { color: C.onAccent, fontSize: 12, fontWeight: '900' },
  repeatTitle: { color: C.ink2, fontSize: 12, fontWeight: '600', marginTop: 6, lineHeight: 15 },

  fact: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  factIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  factLabel: { color: C.ink3, fontSize: 11.5, fontWeight: '700' },
  factValue: { color: C.ink, fontSize: 14.5, fontWeight: '700', marginTop: 1 },
  factSub: { color: C.ink3, fontSize: 12, marginTop: 1 },
});
