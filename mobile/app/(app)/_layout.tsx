import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import Colors from "@/constants/Colors";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";
import { useColorScheme } from "@/components/useColorScheme";
import { useAuth } from "@/contexts/AuthContext";

function Icon({ name, color }: { name: React.ComponentProps<typeof FontAwesome>["name"]; color: string }) {
  return <FontAwesome size={22} style={{ marginBottom: -2 }} name={name} color={color} />;
}

export default function AppLayout() {
  const cs = useColorScheme();
  const { session, loading } = useAuth();
  if (loading) return <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><ActivityIndicator size="large" /></View>;
  if (!session) return <Redirect href="/(auth)/login" />;
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: Colors[cs ?? "light"].tint, headerShown: useClientOnlyValue(false, true) }}>
      <Tabs.Screen name="index"   options={{ title: "Home",    tabBarIcon: ({ color }) => <Icon name="home"     color={color} /> }} />
      <Tabs.Screen name="teams"   options={{ title: "Teams",   headerShown: false, tabBarIcon: ({ color }) => <Icon name="users"    color={color} /> }} />
      <Tabs.Screen name="rosters" options={{ title: "Rosters", headerShown: false, tabBarIcon: ({ color }) => <Icon name="list-alt" color={color} /> }} />
      <Tabs.Screen name="lineups" options={{ title: "Lineups", headerShown: false, tabBarIcon: ({ color }) => <Icon name="table"    color={color} /> }} />
      <Tabs.Screen name="players" options={{ title: "Players", tabBarIcon: ({ color }) => <Icon name="user"     color={color} /> }} />
      <Tabs.Screen name="events"  options={{ title: "Events",  headerShown: false, tabBarIcon: ({ color }) => <Icon name="calendar" color={color} /> }} />
    </Tabs>
  );
}
