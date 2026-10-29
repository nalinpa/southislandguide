import "dotenv/config";
import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Kiwi Guide",
  slug: "southislandguide",
  scheme: "southislandguide",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",

  // Over-the-air JS updates. The fingerprint policy hashes the native project, so an
  // update is only delivered to binaries with identical native code — a JS update can
  // never land on a build missing a native module it needs. Native changes still need
  // a new store build. `eas fingerprint:compare` explains a mismatch.
  runtimeVersion: { policy: "fingerprint" },
  updates: {
    url: "https://u.expo.dev/4fb3f7fc-4db1-4080-ba67-c9614b4b9aa1",
  },

  ios: {
    bundleIdentifier: "app.blacksands.southislandguide",
    supportsTablet: false,
    usesAppleSignIn: true,
    // Env override exists so CI can point at a secret file instead of the repo copy.
    googleServicesFile: process.env.GOOGLE_SERVICES_FILE ?? "./GoogleService-Info.plist",
    infoPlist: {
      NSLocationWhenInUseUsageDescription: "Kiwi Guide uses your location to show where you are on the map and how far away places are.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },

  android: {
    package: "app.blacksands.southislandguide",
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#03262B",
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
        photosPermission: "Kiwi Guide accesses your photos so you can build a share card.",
        cameraPermission: "Kiwi Guide uses your camera so you can take a photo for your share card.",
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
        // The icon's tile colour: the mark's white snow disappears on mint.
        backgroundColor: "#03262B",
      },
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission: "Kiwi Guide uses your location to show where you are on the map and how far away places are.",
      },
    ],
    [
      "@sentry/react-native/expo",
      {
        url: "https://sentry.io/",
        project: "kiwi-guide",
        organization: "patel-td",
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
