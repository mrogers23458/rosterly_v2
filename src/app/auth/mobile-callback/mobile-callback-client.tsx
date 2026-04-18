"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Mobile OAuth relay page.
 *
 * Flow:
 *  1. Mobile app sets redirectTo =
 *       https://rosterlylineups.com/auth/mobile-callback?target=exp%3A%2F%2F…
 *  2. After Google auth Supabase redirects here (already in allowed list).
 *     PKCE flow  → query params  ?code=…&state=…
 *     Implicit   → hash fragment #access_token=…&refresh_token=…
 *  3. This page merges both into query params on the target deep-link URL
 *     (iOS strips hash fragments from custom-scheme URLs, so we must convert).
 *  4. iOS receives exp://10.0.0.38:8081?code=…  → opens Expo Go
 *     _layout.tsx Linking listener → exchangeCodeForSession / setSession
 */
export default function MobileCallbackClient() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const target = searchParams.get("target");

    const allowedSchemes = ["exp://", "exps://", "rosterly://"];
    if (!target || !allowedSchemes.some((s) => target.startsWith(s))) {
      // No valid mobile target — user already authenticated on web; go to dashboard.
      window.location.replace("/dashboard");
      return;
    }

    // Collect every Supabase param from the query string (skip our "target" key)
    const forward = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (key !== "target") forward.set(key, value);
    });

    // Supabase implicit flow delivers tokens in the URL hash (#access_token=…).
    // iOS strips hash fragments from custom-scheme deep links, so convert them
    // to regular query params before forwarding.
    const hash = window.location.hash ?? "";
    if (hash) {
      const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
      hashParams.forEach((value, key) => {
        if (!forward.has(key)) forward.set(key, value);
      });
    }

    const qs = forward.toString();
    const deepLink = `${target}${qs ? `?${qs}` : ""}`;
    console.log("[mobile-callback] target:", target, "params:", qs.substring(0, 60));
    window.location.replace(deepLink);
  }, [searchParams]);

  return (
    <div style={container}>
      <div style={spinner} />
      <p style={text}>Signing you in…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const container: React.CSSProperties = {
  minHeight: "100vh", display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center",
  backgroundColor: "#1e3a5f", gap: 16,
};
const spinner: React.CSSProperties = {
  width: 40, height: 40,
  border: "4px solid rgba(255,255,255,0.2)",
  borderTop: "4px solid #fff",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};
const text: React.CSSProperties = {
  color: "rgba(255,255,255,0.7)", fontSize: 16, margin: 0,
};
