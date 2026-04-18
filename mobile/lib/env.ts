import Constants from "expo-constants";

export function getSupabaseUrl(): string | undefined {
  const fromExtra = Constants.expoConfig?.extra?.supabaseUrl as string | undefined;
  return fromExtra ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
}

export function getSupabaseAnonKey(): string | undefined {
  const fromExtra = Constants.expoConfig?.extra?.supabaseAnonKey as string | undefined;
  return (
    fromExtra ??
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  );
}
