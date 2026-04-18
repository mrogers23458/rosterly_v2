import { useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Pressable, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginScreen() {
  const { signIn, signUp, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);

  if (!configured) {
    return (
      <View style={s.pad}>
        <Text style={s.title}>Configuration needed</Text>
        <Text style={s.body}>
          Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to a .env file in the mobile folder, then restart Expo.
        </Text>
      </View>
    );
  }

  async function submit() {
    if (!email.trim() || !password) { Alert.alert("Missing fields", "Enter email and password."); return; }
    setBusy(true);
    const fn = mode === "signin" ? signIn : signUp;
    const { error } = await fn(email.trim(), password);
    setBusy(false);
    if (error) Alert.alert(mode === "signin" ? "Sign in failed" : "Sign up failed", error);
    else if (mode === "signup") Alert.alert("Check your email", "Confirm your address before signing in.");
  }

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.pad}>
        <Text style={s.logo}>Rosterly</Text>
        <Text style={s.sub}>Sign in with the same account as the web app.</Text>
        <TextInput style={s.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={s.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
        <Pressable style={[s.btn, busy && s.btnOff]} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>{mode === "signin" ? "Sign in" : "Create account"}</Text>}
        </Pressable>
        <Pressable style={s.switch} onPress={() => setMode(mode === "signin" ? "signup" : "signin")}>
          <Text style={s.switchTxt}>{mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  pad: { flex: 1, padding: 24, justifyContent: "center", maxWidth: 420, width: "100%", alignSelf: "center" },
  logo: { fontSize: 28, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  sub: { fontSize: 15, color: "#666", marginBottom: 28, textAlign: "center" },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 12 },
  body: { fontSize: 15, color: "#444", lineHeight: 22 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 12, backgroundColor: "#fff" },
  btn: { backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  btnOff: { opacity: 0.7 },
  btnTxt: { color: "#fff", fontSize: 16, fontWeight: "600" },
  switch: { marginTop: 20, alignItems: "center" },
  switchTxt: { color: "#2563eb", fontSize: 15 },
});
