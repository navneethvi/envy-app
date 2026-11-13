import { View, Text, Image, Pressable, ScrollView, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import Sheet from './Sheet';
import { useTheme } from '../lib/theme';
import { C, F } from '../lib/tokens';
import { formatMinutes } from '../lib/analytics';
import { usePrivacy } from '../lib/privacy';

function Field({ label, value, wide }) {
  if (!value) return null;
  return (
    <View style={[st.field, wide && { width: '100%' }]}>
      <Text style={st.fieldLabel}>{label}</Text>
      <Text style={st.fieldValue} selectable>{value}</Text>
    </View>
  );
}

// Everything the email told us about one booking.
export default function BookingSheet({ item, timesBooked = 1, onClose }) {
  const { theme } = useTheme();
  const { money } = usePrivacy();
  if (!item) return <Sheet visible={false} onClose={onClose} />;
  const d = dayjs(item.date);
  const tags = [item.format, item.language, item.runtime ? formatMinutes(item.runtime) : ''].filter(Boolean);

  return (
    <Sheet visible onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={st.top}>
          {item.posterUrl
            ? <Image source={{ uri: item.posterUrl }} style={st.poster} />
            : <View style={[st.poster, st.posterEmpty]}><Ionicons name="film-outline" size={34} color={C.ink4} /></View>}
          <View style={{ flex: 1 }}>
            {item.cancelled && (
              <View style={st.refundPill}><Text style={st.refundText}>REFUNDED · NOT COUNTED</Text></View>
            )}
            <Text style={st.title}>{item.title}</Text>
            {tags.length > 0 && <Text style={st.tags}>{tags.join('  ·  ')}</Text>}
            <Text style={[st.amount, { color: theme.accent }]}>{money(item.amount)}</Text>
            {item.perSeat != null && item.seatN > 1 && (
              <Text style={st.perSeat}>{money(item.perSeat)} per seat</Text>
            )}
          </View>
        </View>

        <View style={st.grid}>
          <Field label="Date" value={d.format('dddd, D MMMM YYYY')} wide />
          <Field label="Theatre" value={item.theatre || 'Unknown'} />
          <Field label="Screen" value={item.screen} />
          <Field label="Seats" value={item.seatN ? `${item.seatN}` : ''} />
          <Field label="Booking ID" value={item.bookingId} />
          {timesBooked > 1 && <Field label="You booked this film" value={`${timesBooked} times`} wide />}
          <Field label="Venue as written in the email" value={item.venue} wide />
        </View>

        {item.emailId ? (
          <Pressable
            style={({ pressed }) => [st.mailBtn, pressed && { opacity: 0.7 }]}
            onPress={() => Linking.openURL(`https://mail.google.com/mail/u/0/#all/${item.emailId}`)}
          >
            <Ionicons name="mail-outline" size={16} color={C.ink} />
            <Text style={st.mailText}>Open the BookMyShow email</Text>
            <Ionicons name="open-outline" size={14} color={C.ink3} />
          </Pressable>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  poster: { width: 110, height: 165, borderRadius: 16, backgroundColor: C.raised },
  posterEmpty: { alignItems: 'center', justifyContent: 'center' },
  refundPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,176,103,0.14)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginBottom: 8 },
  refundText: { color: C.warn, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  title: { color: C.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.5, lineHeight: 27 },
  tags: { color: C.ink2, fontSize: 12.5, fontWeight: '600', marginTop: 8 },
  amount: { fontFamily: F.display, fontSize: 40, letterSpacing: 1, marginTop: 10 },
  perSeat: { color: C.ink3, fontSize: 12, fontWeight: '600', marginTop: -2 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 20, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6 },
  field: { width: '50%', paddingVertical: 10, paddingRight: 10 },
  fieldLabel: { color: C.ink3, fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  fieldValue: { color: C.ink, fontSize: 14.5, fontWeight: '600', marginTop: 3 },

  mailBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.raised, borderRadius: 24, paddingVertical: 14, marginTop: 14 },
  mailText: { color: C.ink, fontSize: 14, fontWeight: '700' },
});
