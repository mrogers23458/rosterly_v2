import type { Session, User } from "@supabase/supabase-js";
import { makeRedirectUri } from "expo-auth-session";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";

// Required for OAuth on web target
WebBrowser.maybeCompleteAuthSession();

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
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
    session,
    user: session?.user ?? null,
    loading,
    configured: supabaseConfigured,

    signIn: async (email, password) => {
      const c = getSupabase();
      if (!c) return { error: "Supabase is not configured." };
      const { error } = await c.auth.signInWithPassword({ email, password });
      return { error: error?.message };
    },

    signUp: async (email, password) => {
      const c = getSupabase();
      if (!c) return { error: "Supabase is not configured." };
      const redirectTo = makeRedirectUri();
      const { data, error } = await c.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) return { error: error.message };
      return { needsConfirmation: !data.session };
    },

    signInWithGoogle: async () => {
      const c = getSupabase();
      if (!c) return { error: "Supabase is not configured." };
      try {
        // Supabase doesn't reliably accept non-HTTPS schemes (exp://) in its
        // redirect URL validator. Instead we relay through the web app:
        //   rosterlylineups.com/auth/mobile-callback
        // which is already in Supabase's allowed list. That page immediately
        // forwards the auth code back to the mobile app via the `target` param.
        const targetUrl = Linking.createURL(""); // exp://10.0.0.38:8081 in Expo Go
        const redirectTo =
          `https://rosterlylineups.com/auth/mobile-callback` +
          `?target=${encodeURIComponent(targetUrl)}`;
        console.log("[Google OAuth] relay redirectTo =", redirectTo);
        console.log("[Google OAuth] target (deep-link) =", targetUrl);

        const { data, error } = await c.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo, skipBrowserRedirect: true },
        });
        if (error) return { error: error.message };
        if (!data.url) return { error: "No OAuth URL returned." };

        // Open Safari. After Google auth:
        //   Supabase → rosterlylineups.com/auth/mobile-callback?code=…&target=exp://…
        //   Relay page → exp://10.0.0.38:8081?code=…
        //   iOS opens Expo Go → Linking listener in _layout.tsx exchanges the code
        await Linking.openURL(data.url);
        return {};
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Google sign-in failed." };
      }
    },

    signOut: async () => {
      const c = getSupabase();
      if (c) await c.auth.signOut();
    },
  }), [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
