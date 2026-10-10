<<<<<<< HEAD
import type { Session } from '@supabase/supabase-js';
=======
import type { AuthError, Session } from '@supabase/supabase-js';
>>>>>>> 6a1fec879188c19453b4e565b38575b56248725e
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

<<<<<<< HEAD
// false = the sign-in/register forms just let you into the app (no Supabase account check).
// Set to true to use real Supabase accounts again (needs "Confirm email" off, or SMTP set up for codes).
export const REAL_AUTH = false;

type AuthState = {
  signedIn: boolean;
  session: Session | null;
  loading: boolean;
  enterApp: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  signedIn: false,
  session: null,
  loading: true,
  enterApp: () => {},
  signOut: async () => {},
=======
export type AuthState = {
  session: Session | null;
  // True after a password-reset code is verified: Supabase has signed the user in,
  // but they stay on the reset screen until the new password is saved
  recovering: boolean;
  loading: boolean;
  finishRecovery: () => void;
  signOut: () => Promise<{ error: AuthError | null }>;
};

const AuthContext = createContext<AuthState>({
  session: null,
  recovering: false,
  loading: true,
  finishRecovery: () => {},
  signOut: async () => ({ error: null }),
>>>>>>> 6a1fec879188c19453b4e565b38575b56248725e
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
<<<<<<< HEAD
  const [loading, setLoading] = useState(REAL_AUTH);
  const [demoSignedIn, setDemoSignedIn] = useState(false);

  useEffect(() => {
    if (!REAL_AUTH) return;

=======
  const [recovering, setRecovering] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore the session saved on this device, if any
>>>>>>> 6a1fec879188c19453b4e565b38575b56248725e
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

<<<<<<< HEAD
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
=======
    // Sign in, sign out, email verified and token refreshes all land here
    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      else if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setRecovering(false);
>>>>>>> 6a1fec879188c19453b4e565b38575b56248725e
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
<<<<<<< HEAD
    signedIn: REAL_AUTH ? !!session : demoSignedIn,
    session,
    loading,
    enterApp: () => setDemoSignedIn(true),
    signOut: async () => {
      if (REAL_AUTH) await supabase.auth.signOut();
      else setDemoSignedIn(false);
    },
=======
    session,
    recovering,
    loading,
    finishRecovery: () => setRecovering(false),
    signOut: () => supabase.auth.signOut(),
>>>>>>> 6a1fec879188c19453b4e565b38575b56248725e
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
