"use client";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

const BRAND      = "#2563eb";
const BRAND_DARK = "#1e3a5f";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signUp, signInWithGoogle, configured } = useAuth();
  const { session, user } = useAuth();
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [mode,        setMode]        = useState<"signin" | "signup">("signin");
  const [busy,        setBusy]        = useState(false);
  const [googleBusy,  setGoogleBusy]  = useState(false);
  const [emailSent,   setEmailSent]   = useState(false);

  // ── Active session detected ───────────────────────────────────────────────
  // Covers the case where OAuth set the session but navigation didn't fire,
  // or the user already has a stored session from a previous sign-in.
  if (session) {
    return (
      <View style={s.confirmContainer}>
        <View style={s.confirmIconWrap}>
          <Text style={s.confirmEmoji}>✅</Text>
        </View>
        <Text style={s.confirmTitle}>You're signed in</Text>
        <Text style={s.confirmBody}>
          Signed in as{"\n"}
          <Text style={s.confirmEmail}>{user?.email}</Text>
        </Text>
        <Pressable style={s.btn} onPress={() => router.replace("/(app)")}>
          <Text style={s.btnTxt}>Go to Dashboard</Text>
        </Pressable>
      </View>
    );
  }

  // ── Config guard ──────────────────────────────────────────────────────────
  if (!configured) {
    return (
      <View style={s.errorContainer}>
        <Text style={s.errorTitle}>Configuration needed</Text>
        <Text style={s.errorBody}>
          Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
          to a .env file in the mobile/ folder, then restart Expo.
        </Text>
      </View>
    );
  }

  // ── Email sent confirmation screen ────────────────────────────────────────
  if (emailSent) {
    return (
      <View style={s.confirmContainer}>
        <View style={s.confirmIconWrap}>
          <Text style={s.confirmEmoji}>📧</Text>
        </View>
        <Text style={s.confirmTitle}>Check your email</Text>
        <Text style={s.confirmBody}>
          We sent a confirmation link to{"\n"}
          <Text style={s.confirmEmail}>{email}</Text>
          {"\n\n"}Click the link in the email to activate your account, then come back here and sign in.
        </Text>
        <Pressable
          style={s.btn}
          onPress={() => { setEmailSent(false); setMode("signin"); }}
        >
          <Text style={s.btnTxt}>Back to sign in</Text>
        </Pressable>
      </View>
    );
  }

  // ── Handlers ─────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }
    setBusy(true);
    if (mode === "signin") {
      const { error } = await signIn(email.trim(), password);
      setBusy(false);
      if (error) Alert.alert("Sign in failed", error);
    } else {
      const { error, needsConfirmation } = await signUp(email.trim(), password);
      setBusy(false);
      if (error) {
        Alert.alert("Sign up failed", error);
      } else if (needsConfirmation) {
        setEmailSent(true);
      }
      // else: session auto-set by onAuthStateChange → navigated away automatically
    }
  }

  async function handleGoogle() {
    setGoogleBusy(true);
    const { error } = await signInWithGoogle();
    setGoogleBusy(false);
    if (error) Alert.alert("Google sign-in failed", error);
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Brand header */}
      <View style={s.header}>
        <View style={s.logoCircle}>
          <Text style={s.logoEmoji}>⚾</Text>
        </View>
        <Text style={s.logoText}>Rosterly</Text>
        <Text style={s.tagline}>Rosterly · Mobile</Text>
      </View>

      {/* Form card */}
      <View style={s.card}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={s.cardTitle}>
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </Text>

          {/* Google button */}
          <Pressable
            style={[s.googleBtn, googleBusy && s.dimmed]}
            onPress={handleGoogle}
            disabled={googleBusy}
          >
            {googleBusy ? (
              <ActivityIndicator color="#333" />
            ) : (
              <>
                <Text style={s.googleG}>G</Text>
                <Text style={s.googleTxt}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          {/* Divider */}
          <View style={s.divider}>
            <View style={s.divLine} />
            <Text style={s.divLabel}>or</Text>
            <View style={s.divLine} />
          </View>

          {/* Fields */}
          <TextInput
            style={s.input}
            placeholder="Email address"
            placeholderTextColor="#aaa"
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={s.input}
            placeholder="Password"
            placeholderTextColor="#aaa"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {/* Primary CTA */}
          <Pressable
            style={[s.btn, busy && s.dimmed]}
            onPress={handleSubmit}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnTxt}>
                {mode === "signin" ? "Sign in" : "Create account"}
              </Text>
            )}
          </Pressable>

          {/* Toggle */}
          <Pressable
            style={s.toggleRow}
            onPress={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            <Text style={s.toggleTxt}>
              {mode === "signin"
                ? "Don't have an account? "
                : "Already have an account? "}
              <Text style={s.toggleLink}>
                {mode === "signin" ? "Sign up" : "Sign in"}
              </Text>
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: BRAND_DARK },

  // ── Brand header ──
  header: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 48,
    paddingBottom: 12,
  },
  logoCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  logoEmoji:  { fontSize: 38 },
  logoText:   { fontSize: 34, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
  tagline:    { fontSize: 14, color: "rgba(255,255,255,0.6)", marginTop: 6 },

  // ── Form card ──
  card: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 0,
    maxHeight: "70%",
  },
  cardTitle: { fontSize: 22, fontWeight: "700", color: "#111", marginBottom: 20 },

  // ── Google ──
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: "#fff",
    marginBottom: 4,
  },
  googleG:   { fontSize: 18, fontWeight: "800", color: "#4285F4" },
  googleTxt: { fontSize: 16, fontWeight: "600", color: "#333" },

  // ── Divider ──
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 16 },
  divLine:  { flex: 1, height: 1, backgroundColor: "#ebebeb" },
  divLabel: { fontSize: 13, color: "#bbb" },

  // ── Inputs ──
  input: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    color: "#111",
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },

  // ── Buttons ──
  btn:    { backgroundColor: BRAND, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 4 },
  dimmed: { opacity: 0.55 },
  btnTxt: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // ── Toggle ──
  toggleRow: { marginTop: 20, marginBottom: 32, alignItems: "center" },
  toggleTxt:  { fontSize: 15, color: "#777" },
  toggleLink: { color: BRAND, fontWeight: "600" },

  // ── Email confirmation screen ──
  confirmContainer: {
    flex: 1,
    backgroundColor: BRAND_DARK,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  confirmIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(37,99,235,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  confirmEmoji: { fontSize: 44 },
  confirmTitle: { fontSize: 26, fontWeight: "800", color: "#fff", marginBottom: 14, textAlign: "center" },
  confirmBody:  { fontSize: 16, color: "rgba(255,255,255,0.7)", textAlign: "center", lineHeight: 26, marginBottom: 32 },
  confirmEmail: { color: "#fff", fontWeight: "700" },

  // ── Config error screen ──
  errorContainer: { flex: 1, backgroundColor: BRAND_DARK, padding: 32, justifyContent: "center" },
  errorTitle:     { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 12 },
  errorBody:      { fontSize: 15, color: "rgba(255,255,255,0.7)", lineHeight: 24 },
});
