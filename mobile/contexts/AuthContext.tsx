import type { Session, User } from "@supabase/supabase-js";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";

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

// ── Shared helper — used by both signInWithGoogle and the Linking listener ──
export async function createSessionFromUrl(url: string): Promise<string | undefined> {
  const c = getSupabase();
  if (!c) return "Supabase not configured";

  console.log("[createSessionFromUrl] url:", url);
  const { params, errorCode } = QueryParams.getQueryParams(url);
  console.log("[createSessionFromUrl] params keys:", Object.keys(params));

  if (errorCode) return errorCode;

  const { access_token, refresh_token, code } = params;

  if (access_token && refresh_token) {
    const { error } = await c.auth.setSession({ access_token, refresh_token });
    if (error) return error.message;
    console.log("[createSessionFromUrl] ✓ session set via tokens");
    return undefined;
  }

  if (code) {
    const { error } = await c.auth.exchangeCodeForSession(code);
    if (error) return error.message;
    console.log("[createSessionFromUrl] ✓ session set via PKCE code");
    return undefined;
  }

  return undefined; // No tokens yet (e.g. bare exp:// URL on startup)
}

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

  // Official Supabase React Native pattern: handle deep-links (email confirm,
  // magic links, and the OAuth callback that fires when iOS opens the app
  // directly via exp:// rather than returning to ASWebAuthenticationSession).
  const url = Linking.useLinkingURL();
  useEffect(() => {
    if (url) createSessionFromUrl(url);
  }, [url]);

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

    /**
     * Official Supabase React Native OAuth flow.
     *
     * In a production standalone build:
     *   - openAuthSessionAsync intercepts rosterly:// and returns type:"success"
     *   - We exchange the code/tokens here.
     *
     * In Expo Go:
     *   - ASWebAuthenticationSession fires error 1 because iOS routes exp://
     *     directly to Expo Go (the scheme is already "owned" by Expo Go).
     *   - openAuthSessionAsync returns type:"cancel" — this is expected, not
     *     a real error.
     *   - When iOS opens Expo Go via the exp:// deep link, useLinkingURL()
     *     above fires and createSessionFromUrl() handles the auth.
     */
    signInWithGoogle: async () => {
      const c = getSupabase();
      if (!c) return { error: "Supabase is not configured." };
      try {
        const redirectTo = makeRedirectUri();
        console.log("[Google OAuth] redirectTo =", redirectTo);

        const { data, error } = await c.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo, skipBrowserRedirect: true },
        });
        if (error) return { error: error.message };
        if (!data.url) return { error: "No OAuth URL returned." };

        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        console.log("[Google OAuth] result.type =", result.type);

        if (result.type === "success" && result.url) {
          // Production standalone: ASWebAuthenticationSession intercepted the
          // rosterly:// callback properly — handle it directly.
          const err = await createSessionFromUrl(result.url);
          if (err) return { error: err };
        }
        // type:"cancel" in Expo Go is expected — useLinkingURL() handles it.
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
