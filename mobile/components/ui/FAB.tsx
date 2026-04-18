import { Pressable, StyleSheet, Text } from "react-native";

const BRAND = "#2563eb";

interface Props {
  onPress: () => void;
  icon?: string;
  label?: string;
}

export function FAB({ onPress, icon = "+", label }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [s.fab, pressed && { opacity: 0.85 }]}
      onPress={onPress}
    >
      <Text style={s.icon}>{icon}</Text>
      {label && <Text style={s.label}>{label}</Text>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  fab: {
    position: "absolute", bottom: 24, right: 20,
    backgroundColor: BRAND,
    borderRadius: 28,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14,
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  icon:  { color: "#fff", fontSize: 22, fontWeight: "700", lineHeight: 22 },
  label: { color: "#fff", fontSize: 15, fontWeight: "600", marginLeft: 8 },
});
