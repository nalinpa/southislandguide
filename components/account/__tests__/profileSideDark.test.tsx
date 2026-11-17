// The right pane in dark. Tests read a paired colour as its light side (test/lightColors.js);
// here the dark side is read instead, before the colours are first loaded.
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) }));
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
// Signed in is all this reads: no form to load.
jest.mock("@/components/auth/SignInForm", () => ({ SignInForm: () => null }));
jest.mock("@/lib/hooks/useAuthForm", () => ({ useAuthForm: () => ({}) }));

import React from "react";
import { render } from "@testing-library/react-native";

describe("ProfileSide in dark", () => {
  it("lays the dark wash over the photo and keeps the guide card's dark teal", async () => {
    Object.defineProperty(require("react-native"), "DynamicColorIOS", {
      configurable: true,
      value: ({ dark }: { dark: string }) => dark,
    });
    require("@blacksands/ui").__setWide(true, { width: 669, height: 951 });
    const { ProfileSide } = require("@/components/account/ProfileSide");

    const view = await render(<ProfileSide authed picked={null} onClose={jest.fn()} />);

    expect(view.getByTestId("profile-wash")).toHaveStyle({ backgroundColor: "rgba(3,18,20,0.62)" });
    expect(view.getByTestId("profile-card")).toHaveStyle({ backgroundColor: "#0B4B52" });
  });
});
