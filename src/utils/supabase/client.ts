import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

export const createClient = () =>
  createBrowserClient(getSupabaseUrl()!, getSupabasePublishableKey()!, {
    cookieOptions: {
      maxAge: 60 * 60 * 24 * 7, // 7 days — survive browser restarts
    },
  });
