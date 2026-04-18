import { StyleSheet, Text, View } from "react-native";

interface Props {
  emoji?: string;
  title: string;
  subtitle?: string;
}

export function EmptyState({ emoji = "📋", title, subtitle }: Props) {
  return (
    <View style={s.wrap}>
      <Text style={s.emoji}>{emoji}</Text>
      <Text style={s.title}>{title}</Text>
      {subtitle && <Text style={s.sub}>{subtitle}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap:  { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, marginTop: 40 },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "700", color: "#111", textAlign: "center", marginBottom: 6 },
  sub:   { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 20 },
});
