/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: {
    name: "Rosterly",
    slug: "rosterly-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "rosterly",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "app.rosterly.mobile",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "app.rosterly.mobile",
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: ["expo-router", "expo-secure-store"],
    experiments: { typedRoutes: true },
    extra: {
      supabaseUrl:
        process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
      supabaseAnonKey:
        process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
        "",
    },
  },
};
