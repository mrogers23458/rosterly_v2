/** Supabase “publishable” / anon key — supports current and legacy env names. */
export function getSupabasePublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}
