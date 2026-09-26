import "dotenv/config";
import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "South Island Guide",
  slug: "southislandguide",
  scheme: "southislandguide",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,

  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#D3ECE5",
  },

  ios: {
    bundleIdentifier: "app.blacksands.southislandguide",
    supportsTablet: false,
    infoPlist: {
      NSLocationWhenInUseUsageDescription: "South Island Guide uses your location to verify your visits.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },

  android: {
    package: "app.blacksands.southislandguide",
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#D3ECE5",
    },
    permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],
  },

  plugins: [
    "expo-router",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission: "South Island Guide uses your location to verify your visits.",
      },
    ],
    [
      "@sentry/react-native/expo",
      {
        url: "https://sentry.io/",
        project: "southislandguide",
        organization: "REPLACE_ME_SENTRY_ORG",
      },
    ],
  ],

  extra: {
    eas: {
      projectId: "4fb3f7fc-4db1-4080-ba67-c9614b4b9aa1",
    },
    firebase: {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    },
  },
});
