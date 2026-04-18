import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

/**
 * Handles email-based auth links (invite, magic-link, password reset, signup confirm).
 * Supabase sends these as: GET /auth/confirm?token_hash=XXX&type=invite&next=/accept-invite
 *
 * This is separate from /auth/callback which handles OAuth PKCE code exchange.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type       = searchParams.get("type") as EmailOtpType | null;
  const next       = searchParams.get("next") ?? "/dashboard";

  if (token_hash && type) {
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);

    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Fallback: invalid or expired token
  return NextResponse.redirect(`${origin}/login?error=invite_invalid`);
}
