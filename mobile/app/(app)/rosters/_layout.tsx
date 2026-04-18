import { Stack } from "expo-router";
export default function RostersStack() {
  return <Stack><Stack.Screen name="index" options={{ title: "Rosters" }} /><Stack.Screen name="[id]" options={{ title: "Roster" }} /></Stack>;
}
