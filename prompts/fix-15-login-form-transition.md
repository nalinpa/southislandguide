# Fix: Smooth the login screen's email form transition

## File to change

`app/(auth)/login.tsx`

## Problem

The login screen has a two-state UI: initially it shows "Sign in with email" and "Continue as Guest" buttons. Tapping "Sign in with email" replaces those buttons with the `AuthCard` form and a "Back" link. The transition is abrupt — the buttons disappear and the form appears in their place with no animation.

## Current code (for reference)

Line 46: `const [emailOpen, setEmailOpen] = useState(false);`

Lines 123–167 use a ternary: `{emailOpen ? (<View>...AuthCard...Back</View>) : (<View>...buttons...</View>)}`

## What to do

Wrap both states in an `Animated` crossfade using React Native's built-in `Animated` API.

### 1. Add imports

Add `Animated` to the react-native import:
```tsx
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
```

Add `useRef` to the React import:
```tsx
import React, { useEffect, useRef, useState } from "react";
```

### 2. Add animation values (after the `emailOpen` state on line 46)

```tsx
const fadeOut = useRef(new Animated.Value(1)).current;
const fadeIn = useRef(new Animated.Value(0)).current;

useEffect(() => {
  if (emailOpen) {
    Animated.parallel([
      Animated.timing(fadeOut, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(fadeIn, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  } else {
    Animated.parallel([
      Animated.timing(fadeOut, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(fadeIn, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  }
}, [emailOpen, fadeOut, fadeIn]);
```

### 3. Replace the ternary with both views stacked

Replace `{emailOpen ? (...) : (...)}` with both views rendered simultaneously, controlled by opacity:

```tsx
              <View style={styles.actionsStack}>
                <Animated.View style={[styles.actions, { opacity: fadeOut }]} pointerEvents={emailOpen ? "none" : "auto"}>
                  <Pressable onPress={() => setEmailOpen(true)} disabled={busy || emailOpen} accessibilityRole="button" accessibilityState={{ disabled: busy || emailOpen }} style={[styles.emailBtn, (busy || emailOpen) && styles.dimmed]}>
                    <Mail size={20} color="#FFFFFF" strokeWidth={2.25} />
                    <AppText style={styles.emailText}>Sign in with email</AppText>
                  </Pressable>
                  <Pressable onPress={handleGuestEntry} disabled={emailOpen} accessibilityRole="button" style={[styles.linkBtn, emailOpen && styles.dimmed]}>
                    <AppText style={styles.linkText}>Continue as Guest</AppText>
                  </Pressable>
                </Animated.View>
                <Animated.View style={[styles.emailForm, { opacity: fadeIn }]} pointerEvents={emailOpen ? "auto" : "none"}>
                  {/* AuthCard JSX — unchanged */}
                  {/* Back button JSX — unchanged */}
                </Animated.View>
              </View>
```

### 4. Add styles

```tsx
actionsStack: {},
emailForm: {
  ...StyleSheet.absoluteFillObject,
  gap: tokens.space.sm,
},
```

`absoluteFillObject` stacks the form on top of the buttons. `pointerEvents` ensures the invisible view doesn't block taps.

### Key decisions

- **`useNativeDriver: true`** — opacity runs on the native thread, smooth during keyboard transitions.
- **180ms** — matches iOS system animation speeds.
- **Both views always mounted** — AuthCard doesn't remount/lose focus when toggled.
- **`pointerEvents`** — critical so the invisible view doesn't intercept taps.

## Test impact

`renderWithEmailOpen` presses "Sign in with email" then interacts with the form. Both views are now always in the tree, so `getByText("Sign in with email")` still finds the text even after the form opens. If any test asserts `queryByText("Sign in with email")` is null after opening, update that assertion.

## Validation

- Run `npx tsc --noEmit` — no type errors.
- Run `npm test` — all tests pass.
- Do not touch any file other than `app/(auth)/login.tsx` (and its test if needed).