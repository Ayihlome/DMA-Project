import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

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
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(REAL_AUTH);
  const [demoSignedIn, setDemoSignedIn] = useState(false);

  useEffect(() => {
    if (!REAL_AUTH) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    signedIn: REAL_AUTH ? !!session : demoSignedIn,
    session,
    loading,
    enterApp: () => setDemoSignedIn(true),
    signOut: async () => {
      if (REAL_AUTH) await supabase.auth.signOut();
      else setDemoSignedIn(false);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
