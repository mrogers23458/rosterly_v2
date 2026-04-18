import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

export interface ActionItem {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  actions: ActionItem[];
}

export function ActionSheet({ visible, onClose, title, actions }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <View style={s.container}>
          {title && (
            <View style={s.titleRow}>
              <Text style={s.title}>{title}</Text>
            </View>
          )}
          {actions.map((a, i) => (
            <Pressable
              key={i}
              style={({ pressed }) => [
                s.item,
                i < actions.length - 1 && s.border,
                pressed && { backgroundColor: "#f3f4f6" },
                a.disabled && { opacity: 0.4 },
              ]}
              onPress={() => { if (!a.disabled) { a.onPress(); onClose(); } }}
            >
              <Text style={[s.itemTxt, a.destructive && s.destructive]}>{a.label}</Text>
            </Pressable>
          ))}
          <Pressable
            style={({ pressed }) => [s.cancel, pressed && { opacity: 0.7 }]}
            onPress={onClose}
          >
            <Text style={s.cancelTxt}>Cancel</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop:    { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end", padding: 8, paddingBottom: 16 },
  container:   { backgroundColor: "#fff", borderRadius: 14, overflow: "hidden" },
  titleRow:    { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e5e7eb" },
  title:       { fontSize: 13, color: "#6b7280", textAlign: "center" },
  item:        { paddingVertical: 16, paddingHorizontal: 16 },
  border:      { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e5e7eb" },
  itemTxt:     { fontSize: 17, color: "#111", textAlign: "center" },
  destructive: { color: "#ef4444" },
  cancel: {
    backgroundColor: "#fff", borderRadius: 14, marginTop: 8,
    paddingVertical: 16, paddingHorizontal: 16,
  },
  cancelTxt:   { fontSize: 17, fontWeight: "600", color: "#2563eb", textAlign: "center" },
});
