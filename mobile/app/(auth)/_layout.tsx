import { useRouter } from "expo-router";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthLayout() {
  const { session } = useAuth();
  const router = useRouter();

  // Redirect to the app as soon as a session is set — handles deep-link
  // OAuth callbacks that set the session while the login screen is visible.
  useEffect(() => {
    if (session) router.replace("/(app)");
  }, [session]);

  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="login" options={{ title: "Sign in" }} />
    </Stack>
  );
}
