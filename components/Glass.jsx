import { Platform, View, StyleSheet } from 'react-native';
import { GlassView, isLiquidGlassAvailable, isGlassEffectAPIAvailable } from 'expo-glass-effect';

// Real Liquid Glass needs iOS 26+. Everywhere else we imitate it: a translucent
// fill, a bright top edge, and (on web) a live backdrop blur.
let NATIVE_GLASS = false;
try {
  NATIVE_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
} catch {
  NATIVE_GLASS = false;
}

const WEB = Platform.OS === 'web';

// Static "frosted" surface for content cards. No live blur — there can be a hundred
// of these in a list, and Liquid Glass belongs on the controls floating above them.
export const frost = {
  backgroundColor: 'rgba(255,255,255,0.06)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.09)',
  ...(WEB ? { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)' } : null),
};

// Live glass for chrome: tab bar, buttons, chips, search, sheets, sticky month pills.
//   interactive   — native press shimmer (iOS 26)
//   fallbackColor — fill used where real glass isn't available
export default function Glass({ style, children, interactive, fallbackColor, ...rest }) {
  if (NATIVE_GLASS) {
    return (
      <GlassView glassEffectStyle="regular" colorScheme="dark" isInteractive={interactive} style={[st.clip, style]} {...rest}>
        {children}
      </GlassView>
    );
  }
  return (
    <View style={[st.clip, st.fallback, fallbackColor && { backgroundColor: fallbackColor }, style]} {...rest}>
      {children}
    </View>
  );
}

const st = StyleSheet.create({
  clip: { overflow: 'hidden' },
  fallback: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    ...Platform.select({
      web: {
        backgroundColor: 'rgba(120,120,140,0.16)',
        backdropFilter: 'blur(22px) saturate(180%)',
        WebkitBackdropFilter: 'blur(22px) saturate(180%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(255,255,255,0.06), 0 10px 30px rgba(0,0,0,0.32)',
      },
      // No blur available: lean on a more opaque fill so text stays readable.
      default: { backgroundColor: 'rgba(34,34,44,0.92)' },
    }),
  },
});
