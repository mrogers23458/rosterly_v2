import type { Session, User } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";

type AuthContextValue = {
  session: Session | null; user: User | null; loading: boolean; configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const client = getSupabase();

  useEffect(() => {
    if (!client) { setLoading(false); return; }
    let cancelled = false;
    client.auth.getSession().then(({ data: { session: s } }) => {
      if (!cancelled) { setSession(s); setLoading(false); }
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, [client]);

  const value = useMemo<AuthContextValue>(() => ({
    session, user: session?.user ?? null, loading, configured: supabaseConfigured,
    signIn: async (email, password) => {
      const c = getSupabase();
      if (!c) return { error: "Supabase is not configured." };
      const { error } = await c.auth.signInWithPassword({ email, password });
      return { error: error?.message };
    },
    signUp: async (email, password) => {
      const c = getSupabase();
      if (!c) return { error: "Supabase is not configured." };
      const { error } = await c.auth.signUp({ email, password });
      return { error: error?.message };
    },
    signOut: async () => { const c = getSupabase(); if (c) await c.auth.signOut(); },
  }), [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
