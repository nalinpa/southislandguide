// The login screen's job is wiring: it owns no auth logic of its own. useAuthForm has its
// own unit tests (lib/hooks/__tests__/useAuthForm.test.ts), so this file keeps the real hook
// and mocks only firebase — that way a field wired to the wrong setter fails here, without
// re-asserting the hook's rules. The email form starts closed behind "Sign in with email"
// (so the photo isn't covered), which is why the form tests open it first.

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

jest.mock("@/components/auth/SocialSignInButtons", () => {
  const React = require("react");
  const { Text, TouchableOpacity } = require("react-native");
  // Exposes the two callbacks the real component owns, so the screen's handling of a
  // social error and of social busy state can be driven from a test.
  return {
    SocialSignInButtons: ({ onError, onBusyChange }: any) =>
      React.createElement(
        TouchableOpacity,
        { onPress: () => { onBusyChange(true); onError("Apple sign-in failed."); }, accessibilityRole: "button" },
        React.createElement(Text, null, "Fail Social Sign In"),
      ),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

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

import LoginScreen from "@/app/(auth)/login";

const mockSignIn = signInWithEmailAndPassword as jest.Mock;
const mockSignUp = createUserWithEmailAndPassword as jest.Mock;
const mockResetEmail = sendPasswordResetEmail as jest.Mock;

const renderWithEmailOpen = async () => {
  const view = await render(<LoginScreen />);
  await fireEvent.press(view.getByText("Sign in with email"));
  return view;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.status = "loggedOut";
  mockSignIn.mockResolvedValue({});
  mockSignUp.mockResolvedValue({});
  mockResetEmail.mockResolvedValue(undefined);
});

describe("render", () => {
  it("names the app and offers social, email and guest entry, with the email form closed", async () => {
    const view = await render(<LoginScreen />);
    expect(view.getByText("South Island Guide")).toBeTruthy();
    expect(view.getByText("Ultimate South Island trip planner")).toBeTruthy();
    expect(view.getByText("Fail Social Sign In")).toBeTruthy();
    expect(view.getByText("Sign in with email")).toBeTruthy();
    expect(view.getByText("Continue as Guest")).toBeTruthy();
    expect(view.queryByText("Welcome back")).toBeNull();
  });

  it("opens the email form in place of the other options, and closes it again", async () => {
    const view = await renderWithEmailOpen();
    expect(view.getByText("Welcome back")).toBeTruthy();
    expect(view.queryByText("Fail Social Sign In")).toBeNull();

    await fireEvent.press(view.getByText("Other ways to sign in"));

    expect(view.queryByText("Welcome back")).toBeNull();
    expect(view.getByText("Fail Social Sign In")).toBeTruthy();
  });

  it("keeps submit unavailable until there is something to submit", async () => {
    const view = await renderWithEmailOpen();
    await fireEvent.press(view.getByText("Submit login"));
    expect(mockSignIn).not.toHaveBeenCalled();
  });
});

describe("email sign-in", () => {
  it("signs in with what was typed", async () => {
    const view = await renderWithEmailOpen();

    await fireEvent.changeText(view.getByPlaceholderText("Email"), "kia@ora.nz");
    await fireEvent.changeText(view.getByPlaceholderText("Password"), "hunter2");
    await fireEvent.press(view.getByText("Submit login"));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith({}, "kia@ora.nz", "hunter2"));
  });

  it("shows why a sign-in was rejected", async () => {
    mockSignIn.mockRejectedValue(new Error("Incorrect password"));
    const view = await renderWithEmailOpen();

    await fireEvent.changeText(view.getByPlaceholderText("Email"), "kia@ora.nz");
    await fireEvent.changeText(view.getByPlaceholderText("Password"), "wrong");
    await fireEvent.press(view.getByText("Submit login"));

    await waitFor(() => expect(view.getByText("Incorrect password")).toBeTruthy());
  });

  it("words a Firebase rejection like auth/wrong-password for a person", async () => {
    mockSignIn.mockRejectedValue(
      Object.assign(new Error("Firebase: Error (auth/wrong-password)."), { code: "auth/wrong-password" }),
    );
    const view = await renderWithEmailOpen();

    await fireEvent.changeText(view.getByPlaceholderText("Email"), "kia@ora.nz");
    await fireEvent.changeText(view.getByPlaceholderText("Password"), "wrong");
    await fireEvent.press(view.getByText("Submit login"));

    await waitFor(() => expect(view.getByText("Incorrect email or password.")).toBeTruthy());
    expect(view.queryByText(/Firebase/)).toBeNull();
  });
});

describe("email sign-up", () => {
  it("creates the account once the confirmation matches", async () => {
    const view = await renderWithEmailOpen();
    await fireEvent.press(view.getByText("Switch to signup"));

    await fireEvent.changeText(view.getByPlaceholderText("Email"), "new@ora.nz");
    await fireEvent.changeText(view.getByPlaceholderText("Password"), "hunter2");
    await fireEvent.changeText(view.getByPlaceholderText("Confirm"), "hunter2");
    await fireEvent.press(view.getByText("Submit signup"));

    await waitFor(() => expect(mockSignUp).toHaveBeenCalledWith({}, "new@ora.nz", "hunter2"));
  });

  it("won't submit a sign-up whose confirmation doesn't match", async () => {
    const view = await renderWithEmailOpen();
    await fireEvent.press(view.getByText("Switch to signup"));

    await fireEvent.changeText(view.getByPlaceholderText("Email"), "new@ora.nz");
    await fireEvent.changeText(view.getByPlaceholderText("Password"), "hunter2");
    await fireEvent.changeText(view.getByPlaceholderText("Confirm"), "hunter3");
    await fireEvent.press(view.getByText("Submit signup"));

    expect(mockSignUp).not.toHaveBeenCalled();
  });
});

describe("password reset", () => {
  it("emails a reset link on email alone and says so", async () => {
    const view = await renderWithEmailOpen();
    await fireEvent.press(view.getByText("Switch to reset"));

    await fireEvent.changeText(view.getByPlaceholderText("Email"), "kia@ora.nz");
    await fireEvent.press(view.getByText("Submit reset"));

    await waitFor(() => expect(mockResetEmail).toHaveBeenCalledWith({}, "kia@ora.nz"));
    expect(view.getByText("Check your email for a reset link.")).toBeTruthy();
  });
});

describe("social sign-in", () => {
  it("shows a social failure under the social buttons", async () => {
    const view = await render(<LoginScreen />);

    await fireEvent.press(view.getByText("Fail Social Sign In"));

    expect(view.getByText("Apple sign-in failed.")).toBeTruthy();
  });

  it("won't open the email form while a provider sheet is open", async () => {
    const view = await render(<LoginScreen />);

    await fireEvent.press(view.getByText("Fail Social Sign In"));
    await fireEvent.press(view.getByText("Sign in with email"));

    expect(view.queryByText("Welcome back")).toBeNull();
  });

  it("won't open the email form while the session is still resolving", async () => {
    mockSession.status = "loading";
    const view = await render(<LoginScreen />);

    await fireEvent.press(view.getByText("Sign in with email"));

    expect(view.queryByText("Welcome back")).toBeNull();
  });
});

describe("guest entry", () => {
  it("makes a first-time visitor a guest and, once they are one, drops them onto the map", async () => {
    const view = await render(<LoginScreen />);

    await fireEvent.press(view.getByText("Continue as Guest"));
    await waitFor(() => expect(mockEnableGuest).toHaveBeenCalled());

    mockSession.status = "guest";
    await view.rerender(<LoginScreen />);

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/(app)/(tabs)/map"));
  });

  it("ignores guest entry while the session is unresolved", async () => {
    mockSession.status = "loading";
    const view = await render(<LoginScreen />);

    await fireEvent.press(view.getByText("Continue as Guest"));

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

    expect(view.getByText("Sign in with email")).toBeTruthy();
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
