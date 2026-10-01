import "dotenv/config";
import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "South Island Guide",
  slug: "southislandguide",
  scheme: "southislandguide",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",

  ios: {
    bundleIdentifier: "app.blacksands.southislandguide",
    supportsTablet: false,
    usesAppleSignIn: true,
    // Env override exists so CI can point at a secret file instead of the repo copy.
    googleServicesFile: process.env.GOOGLE_SERVICES_FILE ?? "./GoogleService-Info.plist",
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
    "expo-apple-authentication",
    "expo-sharing",
    [
      "expo-image-picker",
      {
        photosPermission: "South Island Guide accesses your photos so you can build a share card.",
        cameraPermission: "South Island Guide uses your camera so you can take a photo for your share card.",
        microphonePermission: false,
      },
    ],
    [
      "@react-native-google-signin/google-signin",
      {
        iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        // Plugin default is 100pt, and the art only fills part of its 1024px
        // canvas — at the default the icon renders far too small on device.
        imageWidth: 300,
        resizeMode: "contain",
        backgroundColor: "#D3ECE5",
      },
    ],
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
    google: {
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
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
