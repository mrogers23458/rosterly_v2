import { useEffect, useRef } from "react";
import {
  Animated, Dimensions, Keyboard, KeyboardAvoidingView,
  Modal, Platform, Pressable, StyleSheet, Text, View,
} from "react-native";

const { height: SCREEN_H } = Dimensions.get("window");

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Height as fraction of screen height, default 0.6 */
  heightFraction?: number;
}

export function BottomSheet({ visible, onClose, title, children, heightFraction = 0.65 }: Props) {
  const anim = useRef(new Animated.Value(SCREEN_H)).current;
  const sheetH = SCREEN_H * heightFraction;

  useEffect(() => {
    if (visible) {
      Animated.spring(anim, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
    } else {
      Animated.timing(anim, { toValue: SCREEN_H, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.wrapper}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={s.backdrop} onPress={() => { Keyboard.dismiss(); onClose(); }} />
        <Animated.View style={[s.sheet, { height: sheetH, transform: [{ translateY: anim }] }]}>
          <View style={s.handle} />
          {title && <Text style={s.title}>{title}</Text>}
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrapper:  { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#d1d5db",
    alignSelf: "center", marginTop: 12, marginBottom: 4,
  },
  title: {
    fontSize: 17, fontWeight: "700", color: "#111",
    paddingHorizontal: 20, paddingBottom: 8, paddingTop: 4,
  },
});
