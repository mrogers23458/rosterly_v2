import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

interface Props extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
}

export function FormField({ label, error, hint, style, ...props }: Props) {
  return (
    <View style={s.wrap}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, error && s.inputError, style]}
        placeholderTextColor="#9ca3af"
        {...props}
      />
      {error  && <Text style={s.error}>{error}</Text>}
      {!error && hint && <Text style={s.hint}>{hint}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap:       { marginBottom: 14 },
  label:      { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 4 },
  input: {
    borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16,
    backgroundColor: "#f9fafb", color: "#111",
  },
  inputError: { borderColor: "#ef4444" },
  error:      { fontSize: 12, color: "#ef4444", marginTop: 3 },
  hint:       { fontSize: 12, color: "#6b7280", marginTop: 3 },
});
