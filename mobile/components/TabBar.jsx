import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { usePrivacy } from '../lib/privacy';
import { C } from '../lib/tokens';
import Glass from './Glass';

const ICONS = { index: 'ticket', insights: 'stats-chart' };

// Floating pill tab bar.
export default function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { hidden, toggle } = usePrivacy();
  return (
    <View style={[st.wrap, { bottom: Math.max(insets.bottom, 10) + 8 }]}>
      <Glass interactive style={st.pill}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const label = descriptors[route.key].options.title || route.name;
          const onPress = () => {
            const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              style={[st.tab, focused && { backgroundColor: theme.accent }]}
            >
              <Ionicons name={focused ? ICONS[route.name] : `${ICONS[route.name]}-outline`} size={17} color={focused ? C.onAccent : C.ink2} />
              <Text style={[st.label, { color: focused ? C.onAccent : C.ink2 }]}>{label}</Text>
            </Pressable>
          );
        })}
      </Glass>
      <Glass interactive style={st.eye}>
        <Pressable
          onPress={toggle}
          accessibilityRole="switch"
          accessibilityState={{ checked: hidden }}
          accessibilityLabel="Hide amounts"
          style={[st.eyeBtn, hidden && { backgroundColor: theme.accent }]}
        >
          <Ionicons name={hidden ? 'eye-off' : 'eye-outline'} size={19} color={hidden ? C.onAccent : C.ink2} />
        </Pressable>
      </Glass>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, pointerEvents: 'box-none' },
  pill: {
    flexDirection: 'row', gap: 4, padding: 5, borderRadius: 30,
  },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 20, height: 42, borderRadius: 21 },
  label: { fontSize: 13.5, fontWeight: '800' },
  eye: { padding: 5, borderRadius: 30 },
  eyeBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
