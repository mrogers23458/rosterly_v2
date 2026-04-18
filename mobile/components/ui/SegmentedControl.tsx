import { Pressable, StyleSheet, Text, View } from "react-native";

interface Option {
  label: string;
  value: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
}

export function SegmentedControl({ options, value, onChange }: Props) {
  return (
    <View style={s.wrap}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            style={[s.seg, active && s.active]}
            onPress={() => onChange(o.value)}
          >
            <Text style={[s.txt, active && s.activeTxt]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap:      { flexDirection: "row", backgroundColor: "#f3f4f6", borderRadius: 10, padding: 3, marginBottom: 14 },
  seg:       { flex: 1, paddingVertical: 7, alignItems: "center", borderRadius: 8 },
  active:    { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  txt:       { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  activeTxt: { color: "#111", fontWeight: "600" },
});
