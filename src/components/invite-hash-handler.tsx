"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

/**
 * Mounted in the root layout. Runs on every page but only acts when
 * Supabase redirects here with implicit-flow tokens in the URL hash
 * (e.g. landing page after clicking an invite email link).
 *
 * Handles: #access_token=...&refresh_token=...&type=invite
 */
export function InviteHashHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash.slice(1); // strip leading "#"
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const accessToken  = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type         = params.get("type");

    if (!accessToken || !refreshToken) return;

    // Clear the hash from the URL immediately so it isn't bookmarked / shared.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    const supabase = createClient();

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          console.error("InviteHashHandler setSession error:", error);
          router.replace("/login?error=invite_invalid");
          return;
        }
        // For invite links always go to accept-invite;
        // for other types (recovery, magiclink) go to dashboard.
        router.replace(type === "invite" ? "/accept-invite" : "/dashboard");
      });
  }, [router]);

  return null; // renders nothing
}
