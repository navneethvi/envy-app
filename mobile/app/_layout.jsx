import { useEffect } from 'react';
import { Tabs } from 'expo-router/js-tabs';
import { StatusBar } from 'expo-status-bar';
import { useFonts, BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from '../lib/theme';
import { BookingsProvider } from '../lib/bookings';
import { PrivacyProvider } from '../lib/privacy';
import { C } from '../lib/tokens';
import TabBar from '../components/TabBar';
import PasscodeGate from '../components/PasscodeGate';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ BebasNeue_400Regular });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <PrivacyProvider>
      <BookingsProvider>
        <StatusBar style="light" />
        <Tabs
          tabBar={props => <TabBar {...props} />}
          screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}
        >
          <Tabs.Screen name="index" options={{ title: 'History' }} />
          <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
        </Tabs>
        <PasscodeGate />
      </BookingsProvider>
      </PrivacyProvider>
    </ThemeProvider>
  );
}
