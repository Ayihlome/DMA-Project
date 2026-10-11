import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme/theme';
import { useCases } from '../backend/useCases/container';


// Pages opened on top of the tabs get a header with a back button
const pageHeader = {
  headerShown: true,
  headerStyle: { backgroundColor: colors.bgBase },
  headerTintColor: colors.primary,
  headerTitleStyle: { color: colors.textPrimary },
  headerShadowVisible: false,
};


export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { signedIn, loading } = useAuth();

  // Keep the splash up until we know whether a saved session exists
  if (loading) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="products/index" options={{ ...pageHeader, title: 'Products' }} />
          <Stack.Screen name="products/[id]" options={pageHeader} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="register" />
          <Stack.Screen name="verify" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="reset-password" />
        </Stack.Protected>
      </Stack>
      {signedIn && <AutoSync />}
      <AnimatedSplashOverlay />
    </>
  );
}

// Sends what is waiting in the sync queue to Supabase: when the owner signs in, when the app
// comes back to the front, and once a minute while it stays open.
function AutoSync() {
  useEffect(() => {
    const sync = (retryFailed = false) => {
      useCases.syncNow({ retryFailed }).catch(() => {});
    };
    sync(true); // on start, rows parked as failed get another go
    const timer = setInterval(() => sync(), 60_000);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => {
      clearInterval(timer);
      appState.remove();
    };
  }, []);

  return null;
}