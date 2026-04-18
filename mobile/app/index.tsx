import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
  const { session, loading } = useAuth();
  if (loading) return <View style={s.c}><ActivityIndicator size="large" /></View>;
  if (session) return <Redirect href="/(app)" />;
  return <Redirect href="/(auth)/login" />;
}

const s = StyleSheet.create({ c: { flex: 1, alignItems: "center", justifyContent: "center" } });
