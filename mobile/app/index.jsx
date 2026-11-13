import { useCallback, useMemo, useState } from 'react';
import { View, Text, SectionList, ScrollView, TextInput, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useBookings } from '../lib/bookings';
import { useTheme } from '../lib/theme';
import { C, F, PAGE } from '../lib/tokens';
import { groupByMonth, summarize, yearsOf, formatMoney } from '../lib/analytics';
import Loader from '../components/Loader';
import TopBar from '../components/TopBar';
import Hero from '../components/Hero';
import TicketCard from '../components/TicketCard';
import BookingSheet from '../components/BookingSheet';
import { Chip, EmptyState } from '../components/Screen';
import Glass from '../components/Glass';
import Backdrop from '../components/Backdrop';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { items, visits, gmail, loading, reload } = useBookings();

  const [query, setQuery] = useState('');
  const [year, setYear] = useState(null);          // null = every year
  const [showRefunded, setShowRefunded] = useState(false);
  const [selected, setSelected] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const stats = useMemo(() => summarize(visits), [visits]);
  const years = useMemo(() => yearsOf(items), [items]);
  const refundedCount = items.length - visits.length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(v =>
      (showRefunded ? true : !v.cancelled) &&
      (year == null || dayjs(v.date).year() === year) &&
      (!q || `${v.rawTitle} ${v.venue} ${v.bookingId}`.toLowerCase().includes(q))
    );
  }, [items, query, year, showRefunded]);
  const sections = useMemo(() => groupByMonth(filtered), [filtered]);
  const live = filtered.filter(v => !v.cancelled);
  const isFiltered = !!query.trim() || year != null;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    reload().finally(() => setRefreshing(false));
  }, [reload]);

  const timesBooked = selected ? visits.filter(v => v.title === selected.title).length : 1;

  if (loading) return <View style={st.center}><Backdrop /><Loader label="Loading bookings" /></View>;

  const header = (
    <View>
      <TopBar title="History" />
      {!stats ? <EmptyState /> : (
        <>
          <View style={{ paddingHorizontal: 16 }}>
            <Hero stats={stats} lastSyncAt={gmail?.lastSyncAt} />
          </View>

          <Glass style={st.search}>
            <Ionicons name="search" size={16} color={C.ink3} />
            <TextInput
              style={st.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search a film, theatre or booking ID"
              placeholderTextColor={C.ink3}
              selectionColor={theme.accent}
              autoCorrect={false}
              returnKeyType="search"
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={17} color={C.ink3} />
              </Pressable>
            ) : null}
          </Glass>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips} keyboardShouldPersistTaps="handled">
            <Chip label="All years" active={year == null} onPress={() => setYear(null)} />
            {years.map(y => <Chip key={y} label={`${y}`} active={year === y} onPress={() => setYear(year === y ? null : y)} />)}
            {refundedCount > 0 && (
              <Chip label={`Refunded · ${refundedCount}`} icon="return-up-back" active={showRefunded} onPress={() => setShowRefunded(v => !v)} />
            )}
          </ScrollView>

          {isFiltered && (
            <Text style={st.resultLine}>
              {live.length} {live.length === 1 ? 'booking' : 'bookings'} · {formatMoney(live.reduce((a, v) => a + v.amount, 0))}
            </Text>
          )}
        </>
      )}
    </View>
  );

  return (
    <View style={st.root}>
      <Backdrop />
      <SectionList
        sections={stats ? sections : []}
        keyExtractor={v => v.id}
        ListHeaderComponent={header}
        renderSectionHeader={({ section }) => (
          <View style={st.monthHead}>
            <Glass style={st.monthPill}><Text style={st.month}>{section.title}</Text></Glass>
            <Glass style={st.monthPill}>
              <Text style={st.monthMeta}>
                {section.count ? `${section.count} · ${formatMoney(section.total)}` : 'refunded'}
              </Text>
            </Glass>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={st.item}><TicketCard item={item} onPress={setSelected} /></View>
        )}
        ListEmptyComponent={stats ? (
          <View style={st.noMatch}>
            <Ionicons name="search" size={26} color={C.ink4} />
            <Text style={st.noMatchText}>Nothing matches{query.trim() ? ` “${query.trim()}”` : ''}{year != null ? ` in ${year}` : ''}.</Text>
          </View>
        ) : null}
        stickySectionHeadersEnabled
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={12}
        style={{ backgroundColor: 'transparent' }}
        contentContainerStyle={[PAGE, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 110 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      />
      <BookingSheet item={selected} timesBooked={timesBooked} onClose={() => setSelected(null)} />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },

  search: { flexDirection: 'row', alignItems: 'center', gap: 9, marginHorizontal: 16, marginTop: 20, height: 48, paddingHorizontal: 16, borderRadius: 24 },
  searchInput: { flex: 1, color: C.ink, fontSize: 15, height: '100%', outlineStyle: 'none' },
  chips: { gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  resultLine: { color: C.ink2, fontSize: 13, fontWeight: '600', paddingHorizontal: 18, marginTop: 10 },

  monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, pointerEvents: 'none' },
  monthPill: { height: 34, paddingHorizontal: 14, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  month: { color: C.ink, fontFamily: F.display, fontSize: 19, letterSpacing: 1.4 },
  monthMeta: { color: C.ink2, fontSize: 12.5, fontWeight: '700' },
  item: { paddingHorizontal: 16, marginBottom: 10 },

  noMatch: { alignItems: 'center', gap: 10, paddingTop: 44, paddingHorizontal: 30 },
  noMatchText: { color: C.ink3, fontSize: 14, textAlign: 'center' },
});
