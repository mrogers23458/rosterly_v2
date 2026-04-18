import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={s.container}>
        <View style={s.logoCircle}>
          <Text style={s.logoEmoji}>⚾</Text>
        </View>
        <Text style={s.logoText}>Rosterly</Text>
        <Text style={s.tagline}>Rosterly · Mobile</Text>
        <ActivityIndicator size="large" color="rgba(255,255,255,0.6)" style={s.spinner} />
      </View>
    );
  }

  if (session) return <Redirect href="/(app)" />;
  return <Redirect href="/(auth)/login" />;
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1e3a5f",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoEmoji: { fontSize: 40 },
  logoText: {
    fontSize: 38,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 15,
    color: "rgba(255,255,255,0.55)",
    marginTop: 4,
    fontWeight: "600",
  },
  spinner: { marginTop: 48 },
});
