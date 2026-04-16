"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    // No setLoading(false) — page navigates away on success.
    // On error, Supabase redirects to /login?error=auth which resets state.
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full"
      disabled={loading}
      onClick={handleGoogleSignIn}
    >
      {/* Google "G" logo SVG */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        className="h-4 w-4 shrink-0"
        aria-hidden="true"
      >
        <path
          fill="#4285F4"
          d="M47.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h13.1c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.3 7.4-10.6 7.4-17.2z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.9-6c-2.1 1.4-4.8 2.3-8 2.3-6.2 0-11.4-4.2-13.3-9.8H2.5v6.2C6.5 42.9 14.7 48 24 48z"
        />
        <path
          fill="#FBBC05"
          d="M10.7 28.7c-.5-1.4-.7-2.9-.7-4.5s.2-3.1.7-4.5v-6.2H2.5C.9 16.8 0 20.3 0 24s.9 7.2 2.5 10.5l8.2-5.8z"
        />
        <path
          fill="#EA4335"
          d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.8-6.8C35.9 2.4 30.5 0 24 0 14.7 0 6.5 5.1 2.5 13.5l8.2 5.8C12.6 13.7 17.8 9.5 24 9.5z"
        />
      </svg>
      {loading ? "Redirecting…" : "Continue with Google"}
    </Button>
  );
}
