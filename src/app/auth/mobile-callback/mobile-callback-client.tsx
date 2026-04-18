"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Mobile OAuth relay.
 *
 * Supabase accepts this HTTPS URL (covered by rosterlylineups.com/**).
 * After Google auth it redirects here with the PKCE ?code= attached.
 * This page immediately forwards everything to the mobile app's deep-link
 * scheme so iOS can open Expo Go / the standalone app.
 *
 * URL shape Supabase sends:
 *   https://rosterlylineups.com/auth/mobile-callback
 *     ?target=exp%3A%2F%2F10.0.0.38%3A8081   ← our param
 *     &code=AUTHCODE                           ← Supabase PKCE code
 *     &state=XYZ                               ← Supabase state
 *
 * We redirect to:
 *   exp://10.0.0.38:8081?code=AUTHCODE&state=XYZ
 *
 * iOS sees exp:// → opens Expo Go → useLinkingURL() → createSessionFromUrl()
 */
export default function MobileCallbackClient() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const target = searchParams.get("target");
    console.log("[relay] target param:", target);

    const allowed = ["exp://", "exps://", "rosterly://"];
    if (!target || !allowed.some((s) => target.startsWith(s))) {
      console.log("[relay] no valid target, going to dashboard");
      window.location.replace("/dashboard");
      return;
    }

    // Gather every Supabase param (code, state, etc.) — skip our own "target"
    const forward = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (key !== "target") forward.set(key, value);
    });

    // Implicit-flow fallback: Supabase puts tokens in the URL hash.
    // Convert them to query params so iOS doesn't strip them.
    const hash = window.location.hash ?? "";
    if (hash) {
      new URLSearchParams(hash.replace(/^#/, "")).forEach((value, key) => {
        if (!forward.has(key)) forward.set(key, value);
      });
    }

    const qs = forward.toString();
    const deepLink = `${target}${qs ? `?${qs}` : ""}`;
    console.log("[relay] deep-link:", deepLink);

    // window.location.replace triggers the iOS URL scheme handler and opens
    // Expo Go (exp://) or the standalone app (rosterly://).
    window.location.replace(deepLink);
  }, [searchParams]);

  return (
    <div style={wrap}>
      <div style={ring} />
      <p style={label}>Signing you in…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const wrap: React.CSSProperties = {
  minHeight: "100vh", display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center",
  backgroundColor: "#1e3a5f", gap: 16,
};
const ring: React.CSSProperties = {
  width: 40, height: 40, borderRadius: "50%",
  border: "4px solid rgba(255,255,255,0.2)",
  borderTop: "4px solid #fff",
  animation: "spin 0.8s linear infinite",
};
const label: React.CSSProperties = {
  color: "rgba(255,255,255,0.7)", fontSize: 16, margin: 0,
};
