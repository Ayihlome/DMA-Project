import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { StoreProvider } from '@/store';
import { colors } from '@/theme/theme';

// Pages opened on top of the tabs get a header with a back button
const pageHeader = {
  headerShown: true,
  headerStyle: { backgroundColor: colors.bgBase },
  headerTintColor: colors.primary,
  headerTitleStyle: { color: colors.textPrimary },
  headerShadowVisible: false,
};
SplashScreen.preventAutoHideAsync();

function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgBase }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [dbReady, setDbReady] = useState(false);

  // Imported here rather than at the top of the file so that a missing native
  // module cannot stop the app booting. op-sqlite has no native code in Expo Go,
  // where a static import throws and takes this whole route down with it.
  // Nothing in the UI reads SQLite - screens go through src/store.tsx - so the
  // app is fully usable without it, and a dev build gets the real thing.
  useEffect(() => {
    import('../backend/data/local/db')
      .then((m) => m.runMigration())
      .catch((e) => console.warn('SQLite unavailable; continuing without it.', e))
      .finally(() => setDbReady(true));
  }, []);

  if (!dbReady) return <Loading />;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <StoreGate />
      </AuthProvider>
    </ThemeProvider>
  );
}

/**
 * Scopes the store to the signed-in account. Passing the owner id down lets the
 * store restore that owner's backup before seeding, and stops state left by a
 * previous account on this device being adopted by the next one.
 */
function StoreGate() {
  const { session } = useAuth();
  return (
    <StoreProvider ownerId={session?.user?.id ?? null} fallback={<Loading />}>
      <RootNavigator />
    </StoreProvider>
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
        {/* Outside both guards: reachable from the consent checkbox before
            sign-up and from Profile afterwards */}
        <Stack.Screen name="privacy" options={{ ...pageHeader, title: 'Privacy' }} />
      </Stack>
      <AnimatedSplashOverlay />
    </>
  );
}
