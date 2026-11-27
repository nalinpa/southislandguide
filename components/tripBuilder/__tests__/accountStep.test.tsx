// The quiz's account step (stage 6 of docs/plans/app-trip-builder.md): the website's words over it (the page half
// of kiwiguide-site public/plan/quiz.js, its `account` screen) and the app's own sign-in under them, the engine's
// real AuthPanel as on the login screen. The form's own rules are the login screen's tests (and useAuthForm's);
// here, that the quiz has it opened on Create, with no guest link, and its words follow the form's way.
// Moving on once signed in is the screen's (app/__tests__/buildTrip.test.tsx).

// The engine bundle loads moti and FlashList for its other components; stubbed as the login screen's tests stub them.
jest.mock("moti", () => {
  const { View } = require("react-native");
  return { MotiView: View, AnimatePresence: ({ children }: any) => children };
});
jest.mock("@shopify/flash-list", () => {
  const { View } = require("react-native");
  return { FlashList: View };
});
jest.mock("react-native-maps", () => {
  const { View } = require("react-native");
  return { __esModule: true, default: View, Marker: View, Circle: View, Polyline: View };
});
jest.mock("react-native-svg", () => {
  const { View } = require("react-native");
  return { __esModule: true, default: View, Svg: View, Path: View, Circle: View, G: View, Text: View, Defs: View, RadialGradient: View, Stop: View, Rect: View };
});
jest.mock("expo-haptics", () => ({ impactAsync: jest.fn(), ImpactFeedbackStyle: {} }));
jest.mock("@/lib/uiKit", () => {
  const kit = require("@/test/uiKitMock");
  const { createAuthPanel } = require("@blacksands/components");
  const { formTokens } = require("@/lib/ui/tokens");
  return { ...kit, AuthPanel: createAuthPanel(formTokens, kit) };
});
jest.mock("@/components/auth/SocialSignInButtons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { SocialSignInButtons: () => React.createElement(Text, null, "Social Sign In") };
});
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("@/lib/firebase", () => ({ auth: {} }));
jest.mock("firebase/firestore", () => ({ doc: jest.fn(), getDoc: jest.fn(), setDoc: jest.fn(), serverTimestamp: jest.fn() }));
const mockSaveEmailOptIn = jest.fn();
jest.mock("@/lib/hooks/useEmailOptIn", () => ({
  ...jest.requireActual("@/lib/hooks/useEmailOptIn"),
  saveEmailOptIn: (...args: any[]) => mockSaveEmailOptIn(...args),
}));
jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));
const mockSession = { status: "guest" };
jest.mock("@/lib/providers/SessionProvider", () => ({ useSession: () => ({ session: mockSession }) }));

import React from "react";
import { AccessibilityInfo } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";

import { AccountStep } from "@/components/tripBuilder/AccountStep";
import { EMAIL_OPT_IN_LABEL } from "@/lib/hooks/useEmailOptIn";
import { tappable, unnamed } from "@/test/a11y";

const focus = AccessibilityInfo.sendAccessibilityEvent as jest.Mock;
// What each heading said when the screen reader was sent to it (a heading kept on screen changes its words later).
let sent: string[] = [];
const heading = (view: any) => view.getByRole("header").props.children;

beforeEach(() => {
  jest.clearAllMocks();
  sent = [];
  focus.mockImplementation((node: any) => void sent.push(node.props.children));
  (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({ user: { uid: "new-user" } });
  mockSaveEmailOptIn.mockResolvedValue(undefined);
});

// The website's lead on Create ("It'll be waiting in the Kiwi Guide app when you sign in.") isn't so in the app: its
// own line says what happens (2026-11-27).
it("opens on Create, as the website's does, under its words, and the app's own line", async () => {
  const view = await render(<AccountStep />);

  expect(view.getByText("Last step")).toBeTruthy();
  expect(heading(view)).toBe("Create your free account and we'll build your trip");
  expect(view.getByText("Your trip will be saved to your account.")).toBeTruthy();
  expect(view.queryByText(/waiting in the Kiwi Guide app/)).toBeNull();
  expect(sent).toEqual(["Create your free account and we'll build your trip"]);
  // the app's own form, on Create: Apple and Google, the email and two passwords, the unticked email box
  expect(view.getByText("Social Sign In")).toBeTruthy();
  expect(view.getByLabelText("Email")).toBeTruthy();
  expect(view.getByLabelText("Confirm password")).toBeTruthy();
  expect(view.getByRole("checkbox", { name: EMAIL_OPT_IN_LABEL }).props.accessibilityState.checked).toBe(false);
  expect(view.getByRole("button", { name: "Create account" })).toBeTruthy();
});

// Trips require an account: the login screen's "Continue as guest" isn't offered.
it("has no way on as a guest", async () => {
  const view = await render(<AccountStep />);

  expect(view.queryByText(/guest/i)).toBeNull();
  await fireEvent.press(view.getByText("I have an account"));
  expect(view.queryByText(/guest/i)).toBeNull();
});

it("takes the website's words for signing in and for a forgotten password, a screen reader sent to each", async () => {
  const view = await render(<AccountStep />);

  await fireEvent.press(view.getByText("I have an account"));
  expect(heading(view)).toBe("Sign in and we'll build your trip");
  expect(view.getByText("Use your Kiwi Guide account.")).toBeTruthy();
  expect(view.getByRole("button", { name: "Sign in" })).toBeTruthy();

  await fireEvent.press(view.getByText("Forgot password?"));
  expect(heading(view)).toBe("Reset your password");
  expect(view.getByText("We will email you a link to choose a new password.")).toBeTruthy();
  expect(view.getByRole("button", { name: "Send reset link" })).toBeTruthy();

  expect(sent).toEqual(["Create your free account and we'll build your trip", "Sign in and we'll build your trip", "Reset your password"]);
});

// The api turned their sign-in down as a trip was saved (the screen signs them out): back here on Sign in with their
// email in and the website's line for it (quiz.js 961–964, account.js 244), not on an empty Create.
it("opens on Sign in with their email in and the website's line, after the sign-in ran out", async () => {
  const view = await render(<AccountStep again={{ email: "kia@ora.nz" }} />);

  expect(heading(view)).toBe("Sign in and we'll build your trip");
  expect(view.getByText("Use your Kiwi Guide account.")).toBeTruthy();
  expect(view.getByLabelText("Email").props.value).toBe("kia@ora.nz");
  expect(view.getByText("Please sign in again to save your trip.")).toBeTruthy();
  expect(view.getByRole("button", { name: "Sign in" })).toBeTruthy();
  expect(view.queryByLabelText("Confirm password")).toBeNull();
});

// The app's own sign-up, as the login screen makes it: the account, then the email box's answer recorded.
it("creates the account with what was typed, and records the email box", async () => {
  const view = await render(<AccountStep />);

  await fireEvent.press(view.getByRole("checkbox", { name: EMAIL_OPT_IN_LABEL }));
  await fireEvent.changeText(view.getByLabelText("Email"), "new@ora.nz");
  await fireEvent.changeText(view.getByLabelText("Password"), "hunter22");
  await fireEvent.changeText(view.getByLabelText("Confirm password"), "hunter22");
  await fireEvent.press(view.getByRole("button", { name: "Create account" }));

  await waitFor(() => expect(createUserWithEmailAndPassword).toHaveBeenCalledWith({}, "new@ora.nz", "hunter22"));
  await waitFor(() => expect(mockSaveEmailOptIn).toHaveBeenCalledWith("new-user", true));
});

// VoiceOver (stage 8): every part of the form a finger can tap, on each of its three ways, has a role and a name
// (test/a11y.ts; the kit's own buttons are stand-ins here whose role is fixed, pinned in the kit's own tests).
it("names everything that can be tapped, on Create, Sign in and Reset", async () => {
  const view = await render(<AccountStep />);
  const sweep = () => {
    expect(tappable(view.root as never).length).toBeGreaterThan(0);
    expect(unnamed(view.root as never)).toEqual([]);
  };

  sweep();
  await fireEvent.press(view.getByText("I have an account"));
  sweep();
  await fireEvent.press(view.getByText("Forgot password?"));
  sweep();
});
