// The login screen's job is wiring: it owns no auth logic of its own. useAuthForm has its
// own unit tests (lib/hooks/__tests__/useAuthForm.test.ts), so this file keeps the real hook
// and mocks only firebase — that way a field wired to the wrong setter fails here, without
// re-asserting the hook's rules. Email is the only sign-in method in 1.0, so the form shows
// straight away (owner, 2026-10-25; docs/plans/login-redesign.md).
//
// The form is the engine's real AuthPanel, not a stand-in: the engine's own tests check its
// logic without drawing it, so this is where it is checked on screen.

// The engine bundle loads moti and FlashList for its other components; stubbed as other
// tests stub them.
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
  return { __esModule: true, default: View, Svg: View, Path: View, Circle: View, G: View, Text: View };
});
jest.mock("expo-haptics", () => ({ impactAsync: jest.fn(), ImpactFeedbackStyle: {} }));

// The kit's AppText and Stack are the stand-ins' (the real kit loads the animation library,
// which can't run here); AuthPanel itself is the engine's.
jest.mock("@/lib/uiKit", () => {
  const kit = require("@/test/uiKitMock");
  const { createAuthPanel } = require("@blacksands/components");
  const { formTokens } = require("@/lib/ui/tokens");
  return { ...kit, AuthPanel: createAuthPanel(formTokens, kit) };
});

jest.mock("@/components/auth/SocialSignInButtons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  // 1.0 ships email-only, so the screen must not render this. The mock is the tripwire:
  // if the buttons come back, "Social Sign In" appears and the render test fails.
  return { SocialSignInButtons: () => React.createElement(Text, null, "Social Sign In") };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

jest.mock("@/lib/firebase", () => ({ auth: {} }));
jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

const mockSession = { status: "loggedOut" } as any;
const mockEnableGuest = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/providers/SessionProvider", () => ({
  useSession: () => ({ session: mockSession, enableGuest: mockEnableGuest }),
}));

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
  Stack: { Screen: () => null },
}));

import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";

import * as Sentry from "@sentry/react-native";

import LoginScreen from "@/app/(auth)/login";
import { tokens } from "@/lib/ui/tokens";

const mockSignIn = signInWithEmailAndPassword as jest.Mock;
const mockSignUp = createUserWithEmailAndPassword as jest.Mock;
const mockResetEmail = sendPasswordResetEmail as jest.Mock;

const fill = async (view: any, fields: Record<string, string>) => {
  for (const [label, value] of Object.entries(fields)) await fireEvent.changeText(view.getByLabelText(label), value);
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.status = "loggedOut";
  mockSignIn.mockResolvedValue({});
  mockSignUp.mockResolvedValue({});
  mockResetEmail.mockResolvedValue(undefined);
});

describe("render", () => {
  it("names the app and shows the email form straight away, with guest entry", async () => {
    const view = await render(<LoginScreen />);
    expect(view.getByText("Kiwi Guide")).toBeTruthy();
    expect(view.getByText("Ultimate South Island trip planner")).toBeTruthy();
    expect(view.getByLabelText("Email")).toBeTruthy();
    expect(view.getByLabelText("Password")).toBeTruthy();
    expect(view.getByRole("button", { name: "Sign in" })).toBeTruthy();
    expect(view.getByText("Continue as guest")).toBeTruthy();
    // No step before the form, and no title over it.
    expect(view.queryByText("Sign in with email")).toBeNull();
    expect(view.queryByText("Welcome back")).toBeNull();
  });

  // Apple's servers reject this app's Sign in with Apple (see TASKS.md, Sign-in), and
  // Google can't be offered without it (App Store guideline 4.8).
  it("offers no Apple or Google sign-in", async () => {
    const view = await render(<LoginScreen />);
    expect(view.queryByText("Social Sign In")).toBeNull();
  });

  // The check that a build's crash reporting works: holding the title sends a test error.
  it("sends a test error to Sentry on a long press of the title, and only then", async () => {
    const view = await render(<LoginScreen />);
    expect(Sentry.captureException).not.toHaveBeenCalled();
    await fireEvent(view.getByText("Kiwi Guide"), "longPress");
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Sentry test from the login title" }),
    );
  });

  // White and larger, with a heavy shadow: in the on-dark orange it couldn't be read over
  // the cloud (owner, 2026-10-26). Smaller and lighter than the title, so it still reads as
  // its own line.
  it("sets the subtitle in white, large enough to read over the photo", async () => {
    const view = await render(<LoginScreen />);

    expect(view.getByText("Ultimate South Island trip planner")).toHaveStyle({
      color: "#FFFFFF",
      fontSize: 20,
    });
  });

  // Mockup C: square corners, and the full-strength highlight with a white label (white on
  // the lighter on-dark orange is only 1.7:1).
  it("makes signing in the highlighted action, square-cornered, with a white label", async () => {
    const view = await render(<LoginScreen />);

    expect(view.getByRole("button", { name: "Sign in" })).toHaveStyle({
      backgroundColor: tokens.colors.highlight,
      borderRadius: 0,
    });
    expect(view.getByText("Sign in")).toHaveStyle({ color: "#FFFFFF" });
  });

  // The form sits on the app's deep teal: muted white labels, white links, the guest link
  // in the on-dark highlight.
  it("sets the form's words for the teal panel", async () => {
    const view = await render(<LoginScreen />);

    expect(view.getByText("Email")).toHaveStyle({ color: tokens.colors.onDarkMuted });
    expect(view.getByText("Create an account")).toHaveStyle({ color: "#FFFFFF" });
    expect(view.getByText("Continue as guest")).toHaveStyle({ color: tokens.colors.highlightOnDark });
  });

  it("puts the form on the deep teal", async () => {
    const view = await render(<LoginScreen />);

    expect(view.getByTestId("login-panel")).toHaveStyle({ backgroundColor: tokens.colors.accentWarm });
  });

  it("keeps submit unavailable until there is something to submit", async () => {
    const view = await render(<LoginScreen />);
    await fireEvent.press(view.getByRole("button", { name: "Sign in" }));
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("holds the form while the session is still resolving", async () => {
    mockSession.status = "loading";
    const view = await render(<LoginScreen />);

    expect(view.getByLabelText("Email").props.editable).toBe(false);
  });
});

describe("email sign-in", () => {
  it("signs in with what was typed", async () => {
    const view = await render(<LoginScreen />);

    await fill(view, { Email: "kia@ora.nz", Password: "hunter2" });
    await fireEvent.press(view.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith({}, "kia@ora.nz", "hunter2"));
  });

  it("shows why a sign-in was rejected", async () => {
    mockSignIn.mockRejectedValue(new Error("Incorrect password"));
    const view = await render(<LoginScreen />);

    await fill(view, { Email: "kia@ora.nz", Password: "wrong" });
    await fireEvent.press(view.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(view.getByText("Incorrect password")).toBeTruthy());
  });

  it("words a Firebase rejection like auth/wrong-password for a person", async () => {
    mockSignIn.mockRejectedValue(
      Object.assign(new Error("Firebase: Error (auth/wrong-password)."), { code: "auth/wrong-password" }),
    );
    const view = await render(<LoginScreen />);

    await fill(view, { Email: "kia@ora.nz", Password: "wrong" });
    await fireEvent.press(view.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(view.getByText("Incorrect email or password.")).toBeTruthy());
    expect(view.queryByText(/Firebase/)).toBeNull();
  });
});

describe("email sign-up", () => {
  it("creates the account once the confirmation matches", async () => {
    const view = await render(<LoginScreen />);
    await fireEvent.press(view.getByText("Create an account"));

    await fill(view, { Email: "new@ora.nz", Password: "hunter22", "Confirm password": "hunter22" });
    await fireEvent.press(view.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(mockSignUp).toHaveBeenCalledWith({}, "new@ora.nz", "hunter22"));
  });

  it("won't submit a sign-up whose confirmation doesn't match, and says so", async () => {
    const view = await render(<LoginScreen />);
    await fireEvent.press(view.getByText("Create an account"));

    await fill(view, { Email: "new@ora.nz", Password: "hunter22", "Confirm password": "hunter33" });
    await fireEvent.press(view.getByRole("button", { name: "Create account" }));

    expect(mockSignUp).not.toHaveBeenCalled();
    expect(view.getByText("Passwords don't match")).toBeTruthy();
  });

  it("goes back to signing in", async () => {
    const view = await render(<LoginScreen />);
    await fireEvent.press(view.getByText("Create an account"));

    await fireEvent.press(view.getByText("I have an account"));

    expect(view.getByRole("button", { name: "Sign in" })).toBeTruthy();
    expect(view.queryByLabelText("Confirm password")).toBeNull();
  });
});

describe("password reset", () => {
  it("emails a reset link on email alone and says so", async () => {
    const view = await render(<LoginScreen />);
    await fireEvent.press(view.getByText("Forgot password?"));

    expect(view.queryByLabelText("Password")).toBeNull();
    await fill(view, { Email: "kia@ora.nz" });
    await fireEvent.press(view.getByRole("button", { name: "Send reset link" }));

    await waitFor(() => expect(mockResetEmail).toHaveBeenCalledWith({}, "kia@ora.nz"));
    expect(view.getByText("Check your email for a reset link.")).toBeTruthy();
  });
});

describe("guest entry", () => {
  it("makes a first-time visitor a guest and, once they are one, drops them onto the Explore tab", async () => {
    const view = await render(<LoginScreen />);

    await fireEvent.press(view.getByText("Continue as guest"));
    await waitFor(() => expect(mockEnableGuest).toHaveBeenCalled());

    mockSession.status = "guest";
    await view.rerender(<LoginScreen />);

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/(app)/(tabs)/sites"));
  });

  it("ignores guest entry while the session is unresolved", async () => {
    mockSession.status = "loading";
    const view = await render(<LoginScreen />);

    await fireEvent.press(view.getByText("Continue as guest"));

    expect(mockEnableGuest).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  // Bug found 2026-09-30, fixed 2026-10-01. "Sign In" on the Plans tab and "Sign In for More"
  // on the list push this route while the user is still a guest. login.tsx and
  // app/(auth)/_layout.tsx both used to redirect any guest to the map, so those buttons
  // silently did nothing. Neither redirects guests now (rotorua-guide's fix).
  it("lets a guest who came here to sign in stay on the screen", async () => {
    mockSession.status = "guest";
    const view = await render(<LoginScreen />);

    expect(view.getByRole("button", { name: "Sign in" })).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});

describe("already signed in", () => {
  it("leaves the login screen for the app instead of sitting on it", async () => {
    mockSession.status = "authed";
    mockSession.uid = "uid-1";
    await render(<LoginScreen />);

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/(app)/(tabs)/sites"));
  });
});
