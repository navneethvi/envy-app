import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useBookings } from '../lib/bookings';
import { C, PAGE } from '../lib/tokens';
import Backdrop from './Backdrop';

// Full-screen lock shown over the app whenever the backend rejects our passcode.
export default function PasscodeGate() {
  const { theme } = useTheme();
  const { locked, unlock } = useBookings();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);

  if (!locked) return null;

  const submit = async () => {
    if (!code.trim() || busy) return;
    setBusy(true);
    setProblem(null);
    const err = await unlock(code);
    setBusy(false);
    if (err) setProblem(err);
    else setCode('');
  };

  return (
    <View style={st.cover}>
      <Backdrop />
      <View style={[PAGE, st.body]}>
        <View style={[st.icon, { backgroundColor: theme.faint }]}>
          <Ionicons name="lock-closed-outline" size={30} color={theme.accent} />
        </View>
        <Text style={st.title}>Enter passcode</Text>
        <Text style={st.sub}>Your booking history is private. This device will remember the passcode.</Text>
        <TextInput
          value={code}
          onChangeText={t => { setCode(t); setProblem(null); }}
          onSubmitEditing={submit}
          placeholder="Passcode"
          placeholderTextColor={C.ink3}
          secureTextEntry
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          style={[st.input, problem && { borderColor: C.bad }]}
        />
        {problem ? <Text style={st.problem}>{problem}</Text> : null}
        <Pressable
          onPress={submit}
          disabled={busy || !code.trim()}
          style={({ pressed }) => [
            st.cta, { backgroundColor: theme.accent },
            (busy || !code.trim()) && { opacity: 0.5 }, pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={st.ctaText}>{busy ? 'Checking…' : 'Unlock'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFillObject, zIndex: 100, backgroundColor: C.bg, justifyContent: 'center' },
  body: { alignItems: 'center', paddingHorizontal: 34 },
  icon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { color: C.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
  sub: { color: C.ink2, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  input: {
    alignSelf: 'stretch', marginTop: 24, height: 50, borderRadius: 14, paddingHorizontal: 16,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    color: C.ink, fontSize: 16, textAlign: 'center',
  },
  problem: { color: C.bad, fontSize: 13, fontWeight: '600', marginTop: 10, textAlign: 'center' },
  cta: { alignSelf: 'stretch', marginTop: 16, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: C.onAccent, fontSize: 15, fontWeight: '800' },
});
