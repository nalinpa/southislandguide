# Login redesign: version C, with a new engine sign-in component

Written 2026-10-25. The owner picked mockup **C · Teal panel** from [South Island Login Mockups](https://claude.ai/artifact/Dw381fPU53mx6wmubYxtfv) (private to the owner).

## Why

With Apple and Google sign-in out of the first release, the login screen has too much empty space: the title at the top, one "Sign in with email" button at the bottom, and a long stretch of photo between. The email card that button opens is the engine's `AuthCard`, a white box with a mint Sign In / Sign Up switch, a title, a subtitle, uppercase labels and two grey links. It reads as a different app from the page around it ("different fonts and colours… too much going on"). And with one way to sign in, the extra tap to open the card does nothing useful.

## Goals

- The email form shows straight away: no "Sign in with email" step.
- One look on the whole screen: the photo with the title and tagline on top, fading into the app's deep teal (`accentWarm`, the colour of the app's top bars), and the form on the teal: white square boxes with a light shadow, the orange Sign in button, two small white links, the guest link at the bottom.
- Fewer things to read: no title or subtitle over the form, no mode switch; Create an account and Forgot password are links.
- **Engine first** (owner): the form is a new component in `@blacksands/components`, not South Island's own copy, so any app can use it later.

## Non-goals

- No change to `AuthCard` or to any other app. Rotorua, Auckland, Cones, Eats and Rings keep the card exactly as it is until one of them chooses the new component.
- No change to the sign-in logic: `lib/hooks/useAuthForm.ts` (sign in, create account, reset, errors, notices, `canSubmit`) is reused as it is.
- No Apple or Google buttons (not in the first release; launch plan E2).
- Not the design sweep: the rest of the app is untouched (memory: the sweep is after launch).

## What is decided

| | Decision |
|---|---|
| Look | Mockup C (owner, 2026-10-25) |
| Where the form lives | A new engine component; the owner suggested "login2 or something". Proposed name **`AuthPanel`**, next to `AuthCard` (rename freely) |
| Other apps | Unchanged; `AuthCard` stays as it is |
| Modes | Sign in, create account and reset, as `AuthCard` and `useAuthForm` have them |

## The engine component: `AuthPanel`

In `enginev1/components/src/AuthPanel.tsx`, built like `AuthCard` (`createAuthPanel(tokens, ui)`, exported from `createComponents` and `index.ts`). It draws only the form, with no box around it: the app puts it on whatever ground it likes.

Props: the same data and handlers as `AuthCard` (`mode`, `email`, `password`, `confirm`, `busy`, `err`, `notice`, `canSubmit`, `onChangeMode`, `onChangeEmail`, `onChangePassword`, `onChangeConfirm`, `onSubmit`, `labels`), plus:

- `tone: "light" | "dark"`, default `"light"`. Dark is for a form on a dark ground: white links, muted white labels.
- `colors?`: overrides for `label`, `link`, `guest`, `error` and `notice` text, for an app whose palette the tokens don't cover. The engine's `ColorTokens` have no on-dark colours, so South Island passes its own (`onDarkMuted` for labels, `highlightOnDark` for notices).
- `radius?`: the corner radius of the boxes and the button, default `tokens.radius.md`. South Island passes 0.
- `onGuest?`: if given, a "Continue as guest" link at the bottom, in `colors.guest` if given.
- No `title` or `subtitle` (the screen has its own).

By mode:
- **Sign in:** Email, Password, the submit button ("Sign in"), then "Create an account" and "Forgot password?" in one row.
- **Create account:** Email, Password, Confirm password (with the same mismatch line as `AuthCard`), "Create account", then "I have an account".
- **Reset:** Email, "Send reset link", then "Back to sign in".
- **Error or notice:** one line of text above the button (not a pill).
- **Busy:** the fields are read-only and the button dims with a spinner.

The submit button is the panel's own, coloured from `tokens.button.primary` and `tokens.tap.primary` tall, because the kit's `AppButton` has a fixed corner radius. Fields keep `AuthCard`'s keyboard behaviour: next and done keys, email keyboard, secure entry, focus moving to the next field.

Tests (in the engine's `test/`, as its other components have): each mode shows the right fields, button text and links; tapping a link calls `onChangeMode` with the right mode; submit calls `onSubmit` and is disabled when `canSubmit` is false or `busy`; an error and a notice show above the button; the guest link shows only with `onGuest`; `tone` and `radius` reach the styles. `AuthCard`'s tests stay as they are.

## The South Island screen

`app/(auth)/login.tsx`, keeping the photo, the `KeyboardAvoidingView` and `ScrollView`, and the redirect when signed in:

- The photo fills the top part with the title and tagline, and its fade runs into solid `accentWarm` under the form, as in the mockup.
- `AuthPanel` with `tone="dark"`, `radius={0}`, South Island's colours, `onGuest={handleGuestEntry}`, fed from `useAuthForm` as `AuthCard` is today.
- The `emailOpen` state, the "Sign in with email" button and its fade go.
- When the keyboard opens, the content scrolls so the boxes and the button stay above it.
- On an iPhone SE (375×667) the photo part shrinks so the whole form fits without scrolling: the App Review check that rejected Rotorua.

Tests (`app/(auth)/__tests__`): the form shows on arrival with no extra tap; signing in, creating an account and resetting reach `useAuthForm`; guest entry still navigates to Explore; the screen renders at 375×667 without the button falling off the bottom.

## Releasing it

1. Push the components repo's two local commits first (`071e104`, the 0.6.7 timeline change already published, and `d93b47b`, notes), so the release builds on what GitHub has.
2. `AuthPanel` with its tests, then the engine's `npm test`, `typecheck` and `build`. Version 0.7.0 (a new component).
3. Publish 0.7.0 to the GitHub package registry (`npm.pkg.github.com`): **the owner's go first**. It needs the owner's GitHub package token in the environment, as earlier engine releases did.
4. South Island moves to `^0.7.0`. It is JavaScript only, so the build on the phone still runs it: check the fingerprint still matches before publishing an update.
5. The screen change and its tests, then the full suite and typecheck, then an update to the `preview` branch for the phone check, with the iPhone SE size in the simulator or on a small phone.

## My calls (check these)

- The name `AuthPanel`.
- No title or subtitle over the form ("Welcome back" goes): the screen's title does that job.
- Error and notice as a line of text, not `AuthCard`'s pills.
- The panel draws its own submit button rather than the kit's `AppButton`, for the square corners.
- `labels` gains keys for the new links ("Create an account", "I have an account").

## Left to the builder

- Spacing and sizes, within the mockup: the mockup is the reference, not pixel truth.
- The exact on-dark colours for the error line (readable on `accentWarm` at 4.5:1).
- How the photo part shrinks on small screens (a fixed share of the height is fine).
