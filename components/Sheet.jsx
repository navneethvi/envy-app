import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, PAGE } from '../lib/tokens';
import Glass from './Glass';

// Bottom sheet shell: dimmed backdrop (tap to close), grab handle, optional title row.
export default function Sheet({ visible, onClose, title, subtitle, children }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={st.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <Glass fallbackColor="rgba(26,26,34,0.72)" style={[st.sheet, PAGE, { paddingBottom: insets.bottom + 18 }]}>
          <View style={st.handle} />
          {title ? (
            <View style={st.head}>
              <View style={{ flex: 1 }}>
                <Text style={st.title} numberOfLines={2}>{title}</Text>
                {subtitle ? <Text style={st.subtitle}>{subtitle}</Text> : null}
              </View>
              <Pressable onPress={onClose} hitSlop={10} style={st.close} accessibilityLabel="Close">
                <Ionicons name="close" size={18} color={C.ink2} />
              </Pressable>
            </View>
          ) : null}
          {children}
        </Glass>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 34, borderTopRightRadius: 34, borderBottomWidth: 0, paddingTop: 10, paddingHorizontal: 18, maxHeight: '88%' },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: C.ink4, alignSelf: 'center', marginBottom: 14 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  title: { color: C.ink, fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { color: C.ink2, fontSize: 13, marginTop: 3 },
  close: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
});
