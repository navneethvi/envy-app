import { ScrollView, View, Text } from 'react-native';
import Sheet from './Sheet';
import TicketCard from './TicketCard';
import { C } from '../lib/tokens';
import { formatMoney } from '../lib/analytics';

// "Show me the bookings behind this number" — used by every chart and ranking.
// `data` is { title, items } or null.
export default function ListSheet({ data, onClose }) {
  const items = data?.items || [];
  const total = items.reduce((a, v) => a + v.amount, 0);
  return (
    <Sheet
      visible={!!data}
      onClose={onClose}
      title={data?.title}
      subtitle={`${items.length} ${items.length === 1 ? 'booking' : 'bookings'} · ${formatMoney(total)}`}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 6 }}>
        {items.length === 0
          ? <Text style={{ color: C.ink3, fontSize: 14, paddingVertical: 20 }}>No bookings here.</Text>
          : items.map(v => <TicketCard key={v.id} item={v} showYear />)}
      </ScrollView>
    </Sheet>
  );
}
