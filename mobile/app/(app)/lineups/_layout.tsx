import { Stack } from "expo-router";
export default function LineupsStack() {
  return <Stack><Stack.Screen name="index" options={{ title: "Lineups" }} /><Stack.Screen name="[id]" options={{ title: "Lineup" }} /></Stack>;
}
