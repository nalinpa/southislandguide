jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) }));
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("@/components/auth/SignInForm", () => ({ SignInForm: () => null }));
jest.mock("@/lib/hooks/useAuthForm", () => ({ useAuthForm: () => ({}) }));

import React from "react";
import { render } from "@testing-library/react-native";

import { ProfileSide } from "@/components/account/ProfileSide";

describe("ProfileSide", () => {
  it("shows the guide card when signed in and nothing for Saved Places or Photo credits yet", async () => {
    const view = await render(<ProfileSide authed picked={null} onClose={jest.fn()} />);
    expect(view.getByText("Open Guide")).toBeTruthy();

    await view.rerender(<ProfileSide authed picked="saved" onClose={jest.fn()} />);
    expect(view.queryByText("Open Guide")).toBeNull();
    await view.rerender(<ProfileSide authed picked="credits" onClose={jest.fn()} />);
    expect(view.queryByTestId("profile-right")).toBeNull();
  });

  it("shows the sign-in card for a guest", async () => {
    const view = await render(<ProfileSide authed={false} picked={null} onClose={jest.fn()} />);
    expect(view.getByText("Sign In for More")).toBeTruthy();
    expect(view.queryByText("Open Guide")).toBeNull();
  });
});
