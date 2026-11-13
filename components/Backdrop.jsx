import { Platform, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { rgba } from '../constants/themes';
import { useTheme } from '../lib/theme';
import { C } from '../lib/tokens';

// Fixed ambient colour behind every screen — glass needs something to refract.
// Two soft washes in the theme's gradient; on web, blurred orbs add depth.
export default function Backdrop() {
  const { theme } = useTheme();
  const [a, b] = theme.gradient;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: C.bg, overflow: 'hidden' }]}>
      <LinearGradient
        colors={[rgba(a, 0.26), rgba(a, 0.06), 'rgba(0,0,0,0)']}
        locations={[0, 0.3, 0.6]}
        start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0)', rgba(b, 0.07), rgba(b, 0.22)]}
        locations={[0.4, 0.72, 1]}
        start={{ x: 0.2, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {Platform.OS === 'web' && (
        <>
          <View style={[st.orb, { top: -90, right: -110, width: 320, height: 320, backgroundColor: rgba(a, 0.34) }]} />
          <View style={[st.orb, { top: '42%', left: -150, width: 300, height: 300, backgroundColor: rgba(b, 0.22) }]} />
          <View style={[st.orb, { bottom: -120, right: -80, width: 340, height: 340, backgroundColor: rgba(a, 0.2) }]} />
        </>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  orb: { position: 'absolute', borderRadius: 999, filter: 'blur(70px)' },
});
