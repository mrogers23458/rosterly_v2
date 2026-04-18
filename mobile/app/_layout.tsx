import FontAwesome from "@expo/vector-icons/FontAwesome";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import { useColorScheme } from "@/components/useColorScheme";
import { AuthProvider } from "@/contexts/AuthContext";
import { getSupabase } from "@/lib/supabase";

export { ErrorBoundary } from "expo-router";
export const unstable_settings = { initialRouteName: "index" };
SplashScreen.preventAutoHideAsync();

/**
 * Exchange an OAuth callback URL (containing ?code= or #access_token=) for a
 * Supabase session. This fires when the OS opens the app via a deep link —
 * i.e. the fallback path when openAuthSessionAsync doesn't intercept the
 * redirect itself (common on Android).
 */
async function handleAuthUrl(url: string) {
  console.log("[handleAuthUrl] processing:", url);
  const supabase = getSupabase();
  if (!supabase) return;

  // Parse query string (all tokens end up here — relay converts hash to query)
  const queryPart = url.split("?")[1] ?? "";
  const qp = new URLSearchParams(queryPart);

  const code          = qp.get("code");
  const access_token  = qp.get("access_token");
  const refresh_token = qp.get("refresh_token");

  if (code) {
    // PKCE flow
    console.log("[handleAuthUrl] exchanging PKCE code…");
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.warn("[auth] exchangeCodeForSession:", error.message);
    else console.log("[handleAuthUrl] ✓ session set via PKCE");
    return;
  }

  if (access_token && refresh_token) {
    // Implicit flow (tokens forwarded as query params by the relay page)
    console.log("[handleAuthUrl] setting session via tokens…");
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) console.warn("[auth] setSession:", error.message);
    else console.log("[handleAuthUrl] ✓ session set via tokens");
    return;
  }

  // Also check hash fragment as a fallback (email confirm links, etc.)
  const hashPart = url.split("#")[1] ?? "";
  const hp = new URLSearchParams(hashPart);
  const hat = hp.get("access_token");
  const hrt = hp.get("refresh_token");
  if (hat && hrt) {
    const { error } = await supabase.auth.setSession({ access_token: hat, refresh_token: hrt });
    if (error) console.warn("[auth] setSession (hash):", error.message);
    else console.log("[handleAuthUrl] ✓ session set via hash tokens");
  }
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });
  useEffect(() => { if (error) throw error; }, [error]);
  useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);

  // Deep-link listener — catches OAuth/email-confirm callbacks on Android
  // and as a fallback on iOS when openAuthSessionAsync doesn't intercept.
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("[Linking] initial URL:", url);
        handleAuthUrl(url);
      }
    });
    const sub = Linking.addEventListener("url", ({ url }) => {
      console.log("[Linking] url event:", url);
      handleAuthUrl(url);
    });
    return () => sub.remove();
  }, []);

  if (!loaded) return null;
  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}
