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

const AuthContext = createContext<AuthState>({
  session: null,
  signedIn: false,
  recovering: false,
  loading: true,
  finishRecovery: () => {},
  signOut: async () => ({ error: null }),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
