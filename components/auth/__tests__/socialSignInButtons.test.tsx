// The two provider buttons. What matters: each press reaches its own lib/auth entry point,
// a user-cancelled sheet is not an error, a real failure is reported through onError, and
// the two buttons can't both be driven at once (they shared one busy flag once, which lit
// up Google's spinner during an Apple sign-in).

jest.mock("@/lib/uiKit", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { AppText: ({ children }: any) => React.createElement(Text, null, children) };
});

jest.mock("react-native-svg", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { __esModule: true, default: (p: any) => React.createElement(View, p), Path: () => null };
});

// The real native button is a platform view with no press of its own under jest.
jest.mock("expo-apple-authentication", () => {
  const React = require("react");
  const { Text, TouchableOpacity } = require("react-native");
  return {
    AppleAuthenticationButtonType: { SIGN_IN: 0 },
    AppleAuthenticationButtonStyle: { BLACK: 0 },
    AppleAuthenticationButton: ({ onPress, style }: any) =>
      React.createElement(
        TouchableOpacity,
        { onPress, style, accessibilityRole: "button" },
        React.createElement(Text, null, "Sign in with Apple"),
      ),
  };
});

const mockAppleSignIn = jest.fn();
const mockGoogleSignIn = jest.fn();
jest.mock("@/lib/auth/appleSignIn", () => ({
  signInWithApple: () => mockAppleSignIn(),
  getAppleSignInErrorMessage: () => "Apple couldn't sign you in.",
}));
jest.mock("@/lib/auth/googleSignIn", () => ({
  signInWithGoogle: () => mockGoogleSignIn(),
  getGoogleSignInErrorMessage: () => "Google couldn't sign you in.",
}));

import React from "react";
import { Platform } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { SocialSignInButtons } from "@/components/auth/SocialSignInButtons";

const onError = jest.fn();
const onBusyChange = jest.fn();

const renderButtons = () => render(<SocialSignInButtons onError={onError} onBusyChange={onBusyChange} />);

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = "ios";
  mockAppleSignIn.mockResolvedValue(undefined);
  mockGoogleSignIn.mockResolvedValue({ signedIn: true });
});

describe("availability", () => {
  it("offers both providers on iOS", async () => {
    const view = await renderButtons();
    expect(view.getByText("Sign in with Apple")).toBeTruthy();
    expect(view.getByText("Sign in with Google")).toBeTruthy();
  });

  it("renders nothing off iOS, where neither provider is registered yet", async () => {
    Platform.OS = "android";
    const view = await renderButtons();
    expect(view.queryByText("Sign in with Apple")).toBeNull();
    expect(view.queryByText("Sign in with Google")).toBeNull();
  });
});

describe("Apple", () => {
  it("runs the Apple credential exchange", async () => {
    const view = await renderButtons();

    await fireEvent.press(view.getByText("Sign in with Apple"));

    await waitFor(() => expect(mockAppleSignIn).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith(null);
  });

  it("treats a dismissed Apple sheet as a non-event", async () => {
    mockAppleSignIn.mockRejectedValue({ code: "ERR_REQUEST_CANCELED" });
    const view = await renderButtons();

    await fireEvent.press(view.getByText("Sign in with Apple"));

    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false));
    expect(onError).not.toHaveBeenCalledWith("Apple couldn't sign you in.");
  });

  it("reports a real Apple failure and frees the buttons again", async () => {
    mockAppleSignIn.mockRejectedValue(new Error("aud mismatch"));
    const view = await renderButtons();

    await fireEvent.press(view.getByText("Sign in with Apple"));

    await waitFor(() => expect(onError).toHaveBeenCalledWith("Apple couldn't sign you in."));
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
  });

  it("stays busy after a successful Apple sign-in, until the session moves the screen on", async () => {
    const view = await renderButtons();

    await fireEvent.press(view.getByText("Sign in with Apple"));

    await waitFor(() => expect(onBusyChange).toHaveBeenCalledWith(true));
    expect(onBusyChange).not.toHaveBeenCalledWith(false);
  });
});

describe("Google", () => {
  it("runs the Google sign-in", async () => {
    const view = await renderButtons();

    await fireEvent.press(view.getByText("Sign in with Google"));

    await waitFor(() => expect(mockGoogleSignIn).toHaveBeenCalledTimes(1));
  });

  it("frees the buttons when Google reports the user didn't complete it", async () => {
    mockGoogleSignIn.mockResolvedValue({ signedIn: false });
    const view = await renderButtons();

    await fireEvent.press(view.getByText("Sign in with Google"));

    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false));
    expect(onError).not.toHaveBeenCalledWith("Google couldn't sign you in.");
  });

  it("reports a Google failure", async () => {
    mockGoogleSignIn.mockRejectedValue(new Error("DEVELOPER_ERROR"));
    const view = await renderButtons();

    await fireEvent.press(view.getByText("Sign in with Google"));

    await waitFor(() => expect(onError).toHaveBeenCalledWith("Google couldn't sign you in."));
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
  });

  it("swaps the Google label for a spinner only while Google itself is signing in", async () => {
    let finish: (value: unknown) => void = () => {};
    mockGoogleSignIn.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const view = await renderButtons();

    await fireEvent.press(view.getByText("Sign in with Google"));

    expect(view.queryByText("Sign in with Google")).toBeNull();
    finish({ signedIn: true });
  });
});

describe("one provider at a time", () => {
  it("ignores a Google press while Apple's sheet is open", async () => {
    let finishApple: () => void = () => {};
    mockAppleSignIn.mockReturnValue(new Promise<void>((resolve) => (finishApple = resolve)));
    const view = await renderButtons();

    await fireEvent.press(view.getByText("Sign in with Apple"));
    await fireEvent.press(view.getByText("Sign in with Google"));

    expect(mockGoogleSignIn).not.toHaveBeenCalled();
    finishApple();
  });

  it("ignores an Apple press while Google's sheet is open", async () => {
    let finishGoogle: (value: unknown) => void = () => {};
    mockGoogleSignIn.mockReturnValue(new Promise((resolve) => (finishGoogle = resolve)));
    const view = await renderButtons();

    await fireEvent.press(view.getByText("Sign in with Google"));
    await fireEvent.press(view.getByText("Sign in with Apple"));

    expect(mockAppleSignIn).not.toHaveBeenCalled();
    finishGoogle({ signedIn: true });
  });
});
