# Fix: Restyle the Error Boundary to match the design system

## File to change

`app/_layout.tsx`

## Problem

The `ErrorBoundary` component (lines 56–70) uses raw `<Text>`, `<Button>`, and hardcoded styles with no connection to the app's design tokens. When the app crashes, users see a screen that looks like a completely different product — white background, system-default Button, no icon, no brand colours.

## Constraint

The `ErrorBoundary` renders when `RootLayout` crashes, so `AppProviders` (and with them any context-dependent components) may not be available. You must use only:
- `tokens` from `@/lib/ui/tokens` (a plain object, no context needed)
- React Native primitives (`View`, `Text`, `TouchableOpacity`, `StyleSheet`)
- `lucide-react-native` icons

Do **not** import or use `AppText`, `AppButton`, or any component from `@/lib/uiKit` in the error boundary.

## Current code (for reference)

`app/_layout.tsx` lines 1–11 (imports):
```tsx
import "@/lib/polyfills/buffer";
import React, { useEffect } from "react";
import { View, StyleSheet, Text, Button } from "react-native";
import { Stack, useNavigationContainerRef, ErrorBoundaryProps } from "expo-router";
import { isRunningInExpoGo } from "expo";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Sentry from "@sentry/react-native";

import { AppProviders } from "@/lib/providers/AppProviders";
import { OfflineBanner } from "@/lib/uiKit";
```

Lines 56–88 (the error boundary and its styles):
```tsx
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <View style={styles.errorBoundaryContainer}>
      <Text style={styles.errorTitle}>App Crashed</Text>
      <Text style={styles.errorMessage}>
        {error.message || "An unexpected error occurred."}
      </Text>
      <Button title="Restart App" onPress={retry} />
    </View>
  );
}

const styles = StyleSheet.create({
  flexStyle: { flex: 1 },
  errorBoundaryContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    marginBottom: 24,
  },
});
```

## What to do

### 1. Update the imports on line 3

Change:
```tsx
import { View, StyleSheet, Text, Button } from "react-native";
```
To:
```tsx
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
```
(Remove `Button`, add `TouchableOpacity`.)

### 2. Add two new imports

After line 8 (`import * as Sentry from "@sentry/react-native";`), add:
```tsx
import { AlertTriangle } from "lucide-react-native";
import { tokens } from "@/lib/ui/tokens";
```

### 3. Replace the `ErrorBoundary` render (lines 61–69)

```tsx
  return (
    <View style={styles.errorBoundaryContainer}>
      <View style={styles.errorIconWrap}>
        <AlertTriangle size={32} color={tokens.colors.danger} strokeWidth={2} />
      </View>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>
        {error.message || "An unexpected error occurred."}
      </Text>
      <TouchableOpacity
        style={styles.errorRetryBtn}
        onPress={retry}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <Text style={styles.errorRetryBtnText}>Restart App</Text>
      </TouchableOpacity>
    </View>
  );
```

### 4. Replace the error boundary styles (lines 74–87)

Keep `flexStyle` as-is. Replace the four error-related styles with:

```tsx
  errorBoundaryContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: tokens.colors.bgBase,
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.dangerDim,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: tokens.colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 15,
    color: tokens.colors.text2,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 28,
    paddingHorizontal: 12,
  },
  errorRetryBtn: {
    backgroundColor: tokens.colors.highlight,
    borderRadius: tokens.radius.md,
    paddingVertical: 15,
    paddingHorizontal: 32,
  },
  errorRetryBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },
```

## Design reference

The icon-wrap pattern (round-cornered square, tinted background, danger icon) matches `components/account/DangerZoneCard.tsx` lines 77–79. The button style (highlight bg, white text, 15pt bold, `borderRadius: tokens.radius.md`) matches every primary CTA in the app.

## Validation

- Run `npx tsc --noEmit` — no type errors.
- Run `npm test` — all tests pass (the error boundary has no dedicated tests).
- Do not touch any file other than `app/_layout.tsx`.