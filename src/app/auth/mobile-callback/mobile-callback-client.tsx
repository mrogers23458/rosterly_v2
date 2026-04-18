"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Mobile OAuth relay page.
 *
 * Flow:
 *  1. Mobile app sets redirectTo = https://rosterlylineups.com/auth/mobile-callback
 *       ?target=exp%3A%2F%2F10.0.0.38%3A8081   (Expo Go)
 *       ?target=rosterly%3A%2F%2F               (production standalone)
 *  2. After Google auth, Supabase redirects here with ?code=…&state=… appended.
 *  3. This page immediately forwards ALL Supabase params to the mobile app's
 *     deep-link URL (target), which iOS intercepts and opens Expo Go / the app.
 *  4. The app's Linking listener calls supabase.auth.exchangeCodeForSession(url).
 */
export default function MobileCallbackClient() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const target = searchParams.get("target");

    // Build a params string with every Supabase param except "target"
    const forward = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (key !== "target") forward.set(key, value);
    });

    // Also grab any hash fragment (implicit flow: #access_token=…)
    const hash = typeof window !== "undefined" ? window.location.hash : "";

    const allowedSchemes = ["exp://", "exps://", "rosterly://"];
    const isAllowed = target && allowedSchemes.some((s) => target.startsWith(s));

    if (isAllowed) {
      const qs = forward.toString();
      const deepLink = `${target}${qs ? `?${qs}` : ""}${hash}`;
      console.log("[mobile-callback] redirecting to:", deepLink);
      window.location.replace(deepLink);
    } else {
      // No valid target → the user already has a web session; send to dashboard.
      window.location.replace("/dashboard");
    }
  }, [searchParams]);

  return (
    <div style={container}>
      <div style={spinner} />
      <p style={text}>Signing you in…</p>

      {/* Keyframe animation injected inline */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const container: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#1e3a5f",
  gap: 16,
};
const spinner: React.CSSProperties = {
  width: 40,
  height: 40,
  border: "4px solid rgba(255,255,255,0.2)",
  borderTop: "4px solid #fff",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};
const text: React.CSSProperties = {
  color: "rgba(255,255,255,0.7)",
  fontSize: 16,
  margin: 0,
};
