"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Handles both Supabase auth flows that land on /auth/confirm:
 *
 * 1. PKCE / token_hash flow (newer):
 *    /auth/confirm?token_hash=XXX&type=invite&next=/accept-invite
 *    → verifyOtp({ token_hash, type })
 *
 * 2. Implicit flow (older, tokens in URL hash):
 *    /auth/confirm#access_token=...&refresh_token=...&type=invite
 *    → setSession({ access_token, refresh_token })
 *    (The InviteHashHandler in the root layout also handles this globally.)
 */
export default function AuthConfirmPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = createClient();

    // ── Case 1: token_hash in query string (PKCE / OTP flow) ──────────────────
    const token_hash = searchParams.get("token_hash");
    const type       = searchParams.get("type") as EmailOtpType | null;
    const next       = searchParams.get("next") ?? "/dashboard";

    if (token_hash && type) {
      supabase.auth
        .verifyOtp({ token_hash, type })
        .then(({ error }) => {
          if (error) {
            console.error("verifyOtp error:", error);
            router.replace("/login?error=invite_invalid");
          } else {
            router.replace(type === "invite" ? "/accept-invite" : next);
          }
        });
      return;
    }

    // ── Case 2: tokens in URL hash (implicit flow) ─────────────────────────────
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    if (hash) {
      const hp           = new URLSearchParams(hash);
      const accessToken  = hp.get("access_token");
      const refreshToken = hp.get("refresh_token");
      const hashType     = hp.get("type");

      if (accessToken && refreshToken) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        supabase.auth
          .setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ error }) => {
            if (error) {
              router.replace("/login?error=invite_invalid");
            } else {
              router.replace(hashType === "invite" ? "/accept-invite" : "/dashboard");
            }
          });
        return;
      }
    }

    // Nothing to process — redirect to login.
    router.replace("/login?error=invite_invalid");
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  );
}
