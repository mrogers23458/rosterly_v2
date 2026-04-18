import { Stack } from "expo-router";
export default function EventsStack() {
  return <Stack><Stack.Screen name="index" options={{ title: "Events" }} /><Stack.Screen name="[id]" options={{ title: "Event" }} /></Stack>;
}
