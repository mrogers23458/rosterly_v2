import { Stack } from "expo-router";
export default function TeamsStack() {
  return <Stack><Stack.Screen name="index" options={{ title: "Teams" }} /><Stack.Screen name="[id]" options={{ title: "Team" }} /></Stack>;
}
