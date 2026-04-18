import { StyleSheet, Text, View } from "react-native";

type Variant = "blue" | "green" | "yellow" | "red" | "gray";

interface Props {
  label: string;
  variant?: Variant;
}

const COLORS: Record<Variant, { bg: string; text: string }> = {
  blue:   { bg: "#dbeafe", text: "#1d4ed8" },
  green:  { bg: "#dcfce7", text: "#166534" },
  yellow: { bg: "#fef9c3", text: "#854d0e" },
  red:    { bg: "#fee2e2", text: "#991b1b" },
  gray:   { bg: "#f3f4f6", text: "#374151" },
};

export function Badge({ label, variant = "gray" }: Props) {
  const c = COLORS[variant];
  return (
    <View style={[s.badge, { backgroundColor: c.bg }]}>
      <Text style={[s.txt, { color: c.text }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  txt:   { fontSize: 11, fontWeight: "700", letterSpacing: 0.3, textTransform: "uppercase" },
});
