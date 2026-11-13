import { useEffect, useRef } from 'react';
import { Animated, Easing, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../lib/theme';

// ── A single spinning film reel ──────────────────────────────────────
function Reel({ d, rot, accent }) {
  const holeD = d * 0.17;
  const r = d * 0.27;            // radius of the spoke-hole ring
  const border = Math.max(2, d * 0.07);
  return (
    <Animated.View
      style={{
        width: d, height: d, borderRadius: d / 2,
        borderWidth: border, borderColor: '#3a3a42',
        backgroundColor: '#202028',
        alignItems: 'center', justifyContent: 'center',
        transform: [{ rotate: rot }],
      }}
    >
      {/* hub */}
      <View style={{ width: d * 0.22, height: d * 0.22, borderRadius: d, backgroundColor: accent }} />
      {/* spoke holes */}
      {[0, 1, 2, 3, 4].map(i => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: holeD, height: holeD, borderRadius: holeD / 2,
            backgroundColor: '#0a0a0e',
            transform: [{ rotate: `${i * 72}deg` }, { translateY: -r }],
          }}
        />
      ))}
    </Animated.View>
  );
}

// ── Vintage projector loader ─────────────────────────────────────────
// Two reels spin, the lamp flickers, and a theme-tinted beam shoots from
// the lens — like an old theatre projector running. Pure Animated +
// expo-linear-gradient, native-driven, no extra dependencies.
export default function Loader({ size = 88, label }) {
  const { theme } = useTheme();
  const [from, to] = theme.gradient;

  const spin = useRef(new Animated.Value(0)).current;
  const spinSlow = useRef(new Animated.Value(0)).current;
  const flick = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const a = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
    );
    const b = Animated.loop(
      Animated.timing(spinSlow, { toValue: 1, duration: 1300, easing: Easing.linear, useNativeDriver: true })
    );
    // Irregular lamp flicker.
    const step = (v, d) => Animated.timing(flick, { toValue: v, duration: d, easing: Easing.linear, useNativeDriver: true });
    const f = Animated.loop(Animated.sequence([
      step(1, 90), step(0.45, 60), step(0.9, 70), step(0.6, 50),
      step(1, 110), step(0.5, 70), step(0.95, 80), step(0.75, 90),
    ]));
    a.start(); b.start(); f.start();
    return () => { a.stop(); b.stop(); f.stop(); };
  }, []);

  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rotSlow = spinSlow.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const beamOpacity = flick.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.34] });
  const lensGlow = flick.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  // Geometry (all relative to `size`).
  const W = size * 2.1, H = size * 1.55;
  const bodyW = size * 0.92, bodyH = size * 0.56;
  const bodyLeft = size * 0.16, bodyTop = H - bodyH - size * 0.22;
  const bigReel = size * 0.6, smallReel = size * 0.44;
  const lensW = size * 0.14, lensH = size * 0.34;
  const lensLeft = bodyLeft + bodyW - 2;
  const lensTop = bodyTop + bodyH / 2 - lensH / 2;
  const beamLen = size * 0.8, beamHalf = size * 0.4;
  const beamLeft = lensLeft + lensW - 1;
  const beamTop = bodyTop + bodyH / 2 - beamHalf;

  return (
    <View style={styles.wrap}>
      <View style={{ width: W, height: H }}>
        {/* light beam — triangle widening toward the "screen" */}
        <Animated.View
          style={{
            position: 'absolute', left: beamLeft, top: beamTop,
            width: 0, height: 0,
            borderTopWidth: beamHalf, borderBottomWidth: beamHalf,
            borderRightWidth: beamLen,
            borderTopColor: 'transparent', borderBottomColor: 'transparent',
            borderRightColor: to,
            opacity: beamOpacity,
            // a right-border triangle points apex-left (at the lens) with its
            // wide base at the screen — exactly a projector beam.
          }}
        />

        {/* projector body */}
        <LinearGradient
          colors={['#2c2c34', '#16161c']}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={{
            position: 'absolute', left: bodyLeft, top: bodyTop,
            width: bodyW, height: bodyH, borderRadius: size * 0.1,
            borderWidth: 1, borderColor: '#3a3a42',
          }}
        >
          {/* vent lines */}
          <View style={{ marginTop: bodyH * 0.22, marginLeft: bodyW * 0.12, gap: size * 0.05 }}>
            {[0, 1, 2].map(i => (
              <View key={i} style={{ width: bodyW * 0.4, height: 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)' }} />
            ))}
          </View>
        </LinearGradient>

        {/* lens barrel */}
        <Animated.View style={{ position: 'absolute', left: lensLeft, top: lensTop, opacity: lensGlow }}>
          <View style={{ width: lensW, height: lensH, borderRadius: size * 0.04, backgroundColor: '#3a3a42' }} />
          <View style={{
            position: 'absolute', right: -size * 0.04, top: lensH * 0.18,
            width: size * 0.07, height: lensH * 0.64, borderRadius: size * 0.04,
            backgroundColor: from,
          }} />
        </Animated.View>

        {/* reels on top */}
        <View style={{ position: 'absolute', left: bodyLeft + bodyW - bigReel * 0.92, top: bodyTop - bigReel * 0.62 }}>
          <Reel d={bigReel} rot={rot} accent={theme.accent} />
        </View>
        <View style={{ position: 'absolute', left: bodyLeft + bodyW * 0.04, top: bodyTop - smallReel * 0.55 }}>
          <Reel d={smallReel} rot={rotSlow} accent={theme.accent} />
        </View>

        {/* stand */}
        <View style={{ position: 'absolute', left: bodyLeft + bodyW * 0.42, top: bodyTop + bodyH - 1, width: size * 0.08, height: size * 0.18, backgroundColor: '#2c2c34' }} />
        <View style={{ position: 'absolute', left: bodyLeft + bodyW * 0.24, top: H - size * 0.16, width: size * 0.46, height: size * 0.07, borderRadius: size * 0.04, backgroundColor: '#3a3a42' }} />
      </View>

      {label ? <Text style={[styles.label, { color: theme.dim }]}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: 14 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
});
