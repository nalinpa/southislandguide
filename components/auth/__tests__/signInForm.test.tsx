// The form shared by Login and the Profile's guest card. Login's own tests cover its wiring;
// here only what the caller chooses: the guest link and the Create an account look.
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
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("@/lib/firebase", () => ({ auth: {} }));
jest.mock("firebase/firestore", () => ({ doc: jest.fn(), getDoc: jest.fn(), setDoc: jest.fn(), serverTimestamp: jest.fn() }));
jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));
// The buttons' own tests are next door; here they are two handles on the callbacks the form
// gives them.
jest.mock("@/components/auth/SocialSignInButtons", () => {
  const { Text } = require("react-native");
  return {
    SocialSignInButtons: ({ onError, onBusyChange, disabled }: any) => (
      <>
        <Text onPress={() => onError("Apple sign-in failed.")}>Social fail</Text>
        <Text onPress={() => onBusyChange(true)}>Social sheet open</Text>
        <Text>{disabled ? "Social disabled" : "Social enabled"}</Text>
      </>
    ),
  };
});
const mockSession = { status: "guest" } as any;
jest.mock("@/lib/providers/SessionProvider", () => ({ useSession: () => ({ session: mockSession }) }));

import React from "react";
import { Platform } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";

import { SignInForm } from "@/components/auth/SignInForm";
import { useAuthForm } from "@/lib/hooks/useAuthForm";

const Form = (props: { wide?: boolean; onGuest?: () => void }) => <SignInForm form={useAuthForm("login")} {...props} />;

describe("SignInForm", () => {
  it("draws the guest link only when it is given one", async () => {
    const onGuest = jest.fn();
    const view = await render(<Form onGuest={onGuest} />);
    await fireEvent.press(view.getByText("Continue as guest"));
    expect(onGuest).toHaveBeenCalled();

    await view.rerender(<Form />);
    expect(view.queryByText("Continue as guest")).toBeNull();
  });

  it("draws Create an account as an outline button when wide, a link otherwise", async () => {
    const view = await render(<Form />);
    expect(view.getByRole("button", { name: "Create an account" })).not.toHaveStyle({ borderWidth: 1.5 });
    await view.rerender(<Form wide />);
    expect(view.getByRole("button", { name: "Create an account" })).toHaveStyle({ borderWidth: 1.5 });
  });

  it("holds the form while the session is still resolving", async () => {
    mockSession.status = "loading";
    const view = await render(<Form />);
    expect(view.getByLabelText("Email").props.editable).toBe(false);
    mockSession.status = "guest";
  });

  describe("Apple and Google", () => {
    afterEach(() => {
      Platform.OS = "ios";
    });

    it("shows Apple and Google above the email form on iOS, with an or divider", async () => {
      Platform.OS = "ios";
      const view = await render(<Form />);
      expect(view.getByText("Social fail")).toBeTruthy();
      expect(view.getByText("or")).toBeTruthy();
      const text = JSON.stringify(view.toJSON());
      expect(text.indexOf("Social fail")).toBeLessThan(text.indexOf("or"));
      expect(text.indexOf('"or"')).toBeLessThan(text.indexOf("Email"));
    });

    it("shows neither the buttons nor the divider off iOS", async () => {
      Platform.OS = "android";
      const view = await render(<Form />);
      expect(view.queryByText("Social fail")).toBeNull();
      expect(view.queryByText("or")).toBeNull();
    });

    it("shows neither the buttons nor the divider on password reset", async () => {
      const view = await render(<Form />);
      await fireEvent.press(view.getByText("Forgot password?"));
      expect(view.queryByLabelText("Password")).toBeNull();
      expect(view.queryByText("Social fail")).toBeNull();
      expect(view.queryByText("or")).toBeNull();
    });

    it("a sign-in error shows in the form, and clears when the email changes", async () => {
      const view = await render(<Form />);
      await fireEvent.press(view.getByText("Social fail"));
      expect(view.getByText("Apple sign-in failed.")).toBeTruthy();
      await fireEvent.changeText(view.getByLabelText("Email"), "a@b.co");
      expect(view.queryByText("Apple sign-in failed.")).toBeNull();
    });

    it("the email form is busy while a provider's sheet is open", async () => {
      const view = await render(<Form />);
      expect(view.getByLabelText("Email").props.editable).toBe(true);
      await fireEvent.press(view.getByText("Social sheet open"));
      expect(view.getByLabelText("Email").props.editable).toBe(false);
    });

    it("tells the buttons to hold while the email form is submitting", async () => {
      let release: (v?: unknown) => void = () => {};
      (require("firebase/auth").signInWithEmailAndPassword as jest.Mock).mockReturnValue(new Promise((r) => (release = r)));
      const view = await render(<Form />);
      expect(view.getByText("Social enabled")).toBeTruthy();
      await fireEvent.changeText(view.getByLabelText("Email"), "a@b.co");
      await fireEvent.changeText(view.getByLabelText("Password"), "pw");
      await fireEvent.press(view.getByRole("button", { name: "Sign in" }));
      expect(view.getByText("Social disabled")).toBeTruthy();
      await act(async () => release({}));
    });
  });
});
