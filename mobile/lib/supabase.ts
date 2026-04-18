import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";

const SecureStoreAdapter = {
  getItem: (key: string) =>
    Platform.OS === "web" ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) =>
    Platform.OS === "web" ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value),
  removeItem: (key: string) =>
    Platform.OS === "web" ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key),
};

const url = getSupabaseUrl();
const key = getSupabaseAnonKey();

export const supabaseConfigured = Boolean(url && key);

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!url || !key) return null;
  if (!_client) {
    _client = createClient(url, key, {
      auth: {
        storage: SecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        // Force PKCE so the callback uses ?code= (query string) instead of
        // #access_token= (hash fragment). Hash fragments are stripped by iOS
        // when opening app via custom URL scheme deep links.
        flowType: "pkce",
      },
    });
  }
  return _client;
}
