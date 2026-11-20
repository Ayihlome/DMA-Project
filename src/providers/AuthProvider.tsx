import type { AuthError, Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

export type AuthState = {
  session: Session | null;
  signedIn: boolean;
  // True after a password-reset code is verified: Supabase has signed the user in,
  // but they stay on the reset screen until the new password is saved
  recovering: boolean;
  loading: boolean;
  finishRecovery: () => void;
  signOut: () => Promise<{ error: AuthError | null }>;
};

/**
 * Testing only: `EXPO_PUBLIC_SKIP_AUTH` in .env skips sign-in with a made-up test owner.
 *
 *   EXPO_PUBLIC_SKIP_AUTH=1      the same test shop every time; its data stays on this device
 *   EXPO_PUBLIC_SKIP_AUTH=fresh  a brand-new shop on every reload, straight to onboarding
 *
 * Supabase never sees a real account, so backup, the profile and telemetry quietly fail;
 * the shop itself works. Ignored outside development, so a release build always signs in.
 * Remove the line (and restart Expo) to sign in normally again.
 */
const SKIP_AUTH = typeof __DEV__ !== 'undefined' && __DEV__ ? process.env.EXPO_PUBLIC_SKIP_AUTH : undefined

/** Same id every run for "1", so the test shop's data is still there after a reload. */
const SAME_TEST_OWNER = '00000000-0000-4000-8000-000000007e57'

function testSession(): Session {
  const id = SKIP_AUTH === 'fresh' ? crypto.randomUUID() : SAME_TEST_OWNER;
  const now = new Date().toISOString();
  return {
    access_token: 'test',
    refresh_token: 'test',
    token_type: 'bearer',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    user: {
      id,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'test@stockevo.local',
      email_confirmed_at: now,
      app_metadata: {},
      user_metadata: {},
      created_at: now,
    },
  };
}

const AuthContext = createContext<AuthState>({
  session: null,
  signedIn: false,
  recovering: false,
  loading: true,
  finishRecovery: () => {},
  signOut: async () => ({ error: null }),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => (SKIP_AUTH ? testSession() : null));
  const [recovering, setRecovering] = useState(false);
  const [loading, setLoading] = useState(!SKIP_AUTH);

  useEffect(() => {
    // Testing without sign-in: the test owner is already set, nothing to restore or listen for
    if (SKIP_AUTH) return;
    // Restore the session saved on this device, if any
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Sign in, sign out, email verified and token refreshes all land here
    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      else if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setRecovering(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    session,
    signedIn: !!session && !recovering,
    recovering,
    loading,
    finishRecovery: () => setRecovering(false),
    // A test owner has no account to sign out of; "fresh" starts a new shop on the next reload instead
    signOut: SKIP_AUTH ? async () => ({ error: null }) : () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
