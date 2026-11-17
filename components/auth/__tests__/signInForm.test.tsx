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
const mockSession = { status: "guest" } as any;
jest.mock("@/lib/providers/SessionProvider", () => ({ useSession: () => ({ session: mockSession }) }));

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

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
});
