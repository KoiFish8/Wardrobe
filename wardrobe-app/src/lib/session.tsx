/**
 * Session + dependency context. With Supabase env vars present this is real
 * email/password auth; without them the app runs in local demo mode so the
 * whole core loop (scan → generate → gaps) works offline.
 */
import type { Session } from '@supabase/supabase-js';
import { Redirect } from 'expo-router';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabaseConfigured } from './config';
import { LocalBackend } from './backend/local';
import { SupabaseBackend } from './backend/supabase';
import type { WardrobeBackend } from './backend/types';
import { DemoPaymentProvider } from './payments/demo';
import { StripePaymentProvider } from './payments/stripe';
import type { PaymentProvider } from './payments/types';
import { supabase } from './supabaseClient';

const DEMO_SESSION_KEY = 'demo.session.v1';

export interface AppUser {
  id: string;
  email: string | null;
  isDemo: boolean;
}

interface SessionContextValue {
  user: AppUser | null;
  loading: boolean;
  backend: WardrobeBackend | null;
  payments: PaymentProvider | null;
  supabaseConfigured: boolean;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  enterDemo(): Promise<void>;
  signOut(): Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function restore() {
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (active && data.session) {
          setUser(sessionToUser(data.session));
          setLoading(false);
          return;
        }
      }
      const demo = await AsyncStorage.getItem(DEMO_SESSION_KEY);
      if (active) {
        if (demo) setUser({ id: 'demo-user', email: null, isDemo: true });
        setLoading(false);
      }
    }

    restore();

    const sub = supabase?.auth.onAuthStateChange((_event, session) => {
      if (session) setUser(sessionToUser(session));
      else setUser((prev) => (prev?.isDemo ? prev : null));
    });

    return () => {
      active = false;
      sub?.data.subscription.unsubscribe();
    };
  }, []);

  const { backend, payments } = useMemo(() => {
    if (!user) return { backend: null, payments: null };
    if (!user.isDemo && supabase) {
      const b = new SupabaseBackend(supabase, user.id);
      return { backend: b as WardrobeBackend, payments: new StripePaymentProvider(supabase, user.id) as PaymentProvider };
    }
    const local = new LocalBackend();
    return { backend: local as WardrobeBackend, payments: new DemoPaymentProvider(local) as PaymentProvider };
  }, [user]);

  const value: SessionContextValue = {
    user,
    loading,
    backend,
    payments,
    supabaseConfigured,
    async signIn(email, password) {
      if (!supabase) throw new Error('Supabase is not configured — use demo mode.');
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signUp(email, password) {
      if (!supabase) throw new Error('Supabase is not configured — use demo mode.');
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    },
    async enterDemo() {
      await AsyncStorage.setItem(DEMO_SESSION_KEY, '1');
      setUser({ id: 'demo-user', email: null, isDemo: true });
    },
    async signOut() {
      if (user?.isDemo) {
        await AsyncStorage.removeItem(DEMO_SESSION_KEY);
      } else if (supabase) {
        await supabase.auth.signOut();
      }
      setUser(null);
    },
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

function sessionToUser(session: Session): AppUser {
  return { id: session.user.id, email: session.user.email ?? null, isDemo: false };
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}

/**
 * Guard for screens outside the (tabs) group (scan, garment, outfit): waits
 * out the async session restore on cold loads instead of crashing, and
 * redirects signed-out users to login.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();
  if (loading) return null;
  if (!user) return <Redirect href="/login" />;
  return <>{children}</>;
}

/** Backend is guaranteed inside the signed-in (tabs) group. */
export function useBackend(): WardrobeBackend {
  const { backend } = useSession();
  if (!backend) throw new Error('No backend — user is signed out');
  return backend;
}

export function usePayments(): PaymentProvider {
  const { payments } = useSession();
  if (!payments) throw new Error('No payment provider — user is signed out');
  return payments;
}
