import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AnimatedSplash from '@/components/AnimatedSplash';
import AuthSkeleton from '@/screens/Auth/AuthSkeleton';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { StoreProvider } from '@/storeProvider';
import { useStoreOptional } from '@/store';
import { useAppFonts } from '@/theme/fonts';
import { colors as brand, fonts } from '@/theme/tokens';

// Pages opened on top of the tabs get a header with a back button
const pageHeader = {
  headerShown: true,
  headerStyle: { backgroundColor: brand.surface },
  headerTintColor: brand.ink,
  headerTitleStyle: { color: brand.ink, fontFamily: fonts.bold, fontSize: 17 },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal' as const,
};
/**
 * Cross-fade for the sign-in / create-account pair. 220ms: long enough to read
 * as a transition, short enough that the pill still feels instant.
 */
const authSwap = { animation: 'fade', animationDuration: 220 } as const;

SplashScreen.preventAutoHideAsync();


export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Sits above the navigator so the splash also covers the gap where RootNavigator
 * renders nothing while the saved session is being read. It is inside
 * AuthProvider because "ready" means that read has finished.
 */
function Root() {
  const { loading } = useAuth();
  const [fontsLoaded, fontError] = useAppFonts();
  const [splashDone, setSplashDone] = useState(false);

  return (
    <>
      <StoreGate />
      {!splashDone && (
        <AnimatedSplash
          isReady={!loading && (fontsLoaded || !!fontError)}
          onFinish={() => setSplashDone(true)}
          background={brand.brand}
          ink={brand.ink}
        />
      )}
    </>
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
    <StoreProvider ownerId={session?.user?.id ?? null} fallback={<AuthSkeleton />}>
      <RootNavigator />
    </StoreProvider>
  );
}

function RootNavigator() {
  const { signedIn, loading } = useAuth();
  const store = useStoreOptional();

  // Keep the splash up until we know whether a saved session exists
  if (loading) return null;

  // Onboarding has not run on this account yet. Signed out there is no store,
  // and the guard below already covers that case.
  const needsOnboarding = !!store && store.state.onboardedAt == null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={signedIn}>
          {/* Nested so onboarding is the only reachable screen until it is
              finished or skipped; a denied navigation lands on it because it is
              then the first screen in the stack. */}
          <Stack.Protected guard={needsOnboarding}>
            <Stack.Screen name="onboarding" />
          </Stack.Protected>
          <Stack.Protected guard={!needsOnboarding}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="products/index" options={{ ...pageHeader, title: 'Products' }} />
            <Stack.Screen name="products/[id]" options={pageHeader} />
            <Stack.Screen name="count-stock" options={{ ...pageHeader, title: 'Count stock' }} />
          </Stack.Protected>
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          {/* Both routes render the same swipeable pager (AuthPager), so
              moving between Sign in and Create account happens inside it, not
              here. The fade only covers arriving from elsewhere — e.g. Verify's
              "Register again" — which router.replace would otherwise swap in
              with no transition at all. */}
          <Stack.Screen name="sign-in" options={authSwap} />
          <Stack.Screen name="register" options={authSwap} />
          {/* The rest are steps forward in a flow, so they keep the platform
              push. */}
          <Stack.Screen name="verify" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="reset-password" />
        </Stack.Protected>
        {/* Outside both guards: reachable from the consent checkbox before
            sign-up and from Profile afterwards */}
        <Stack.Screen name="privacy" options={{ ...pageHeader, title: 'Privacy' }} />
      </Stack>
    </>
  );
}
