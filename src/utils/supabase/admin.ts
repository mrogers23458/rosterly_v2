import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client that bypasses RLS.
 * Used for admin operations: inviteUserByEmail, accepting invitations, etc.
 * NEVER expose this client or SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to your .env.local and Vercel environment variables.",
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  });
}
