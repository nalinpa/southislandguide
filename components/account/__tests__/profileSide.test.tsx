jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }) }));
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("@/components/auth/SignInForm", () => ({ SignInForm: () => null }));
jest.mock("@/lib/hooks/useAuthForm", () => ({ useAuthForm: () => ({}) }));
jest.mock("@/lib/hooks/useSavedSites", () => ({ useSavedSites: () => ({ savedSiteIds: new Set(["a", "b"]) }) }));
// The two lists have their own tests; here the pane only has to hold them.
jest.mock("@/components/account/SavedPlacesList", () => ({
  SavedPlacesList: () => require("react").createElement(require("react-native").Text, null, "saved list"),
}));
jest.mock("@/components/account/PhotoCreditsList", () => ({
  PhotoCreditsList: () => require("react").createElement(require("react-native").Text, null, "credits list"),
}));

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { ProfileSide } from "@/components/account/ProfileSide";

describe("ProfileSide", () => {
  it("shows the guide card when signed in and nothing picked", async () => {
    const view = await render(<ProfileSide authed picked={null} onClose={jest.fn()} />);
    expect(view.getByText("Open Guide")).toBeTruthy();
    expect(view.queryByLabelText("Close")).toBeNull();
  });

  it("shows Saved Places with its count, or Photo Credits, in place of the card, and × closes", async () => {
    const onClose = jest.fn();
    const view = await render(<ProfileSide authed picked="saved" onClose={onClose} />);
    expect(view.queryByText("Open Guide")).toBeNull();
    expect(view.getByText("Saved Places")).toBeTruthy();
    expect(view.getByText("2")).toBeTruthy();
    expect(view.getByText("saved list")).toBeTruthy();

    await view.rerender(<ProfileSide authed picked="credits" onClose={onClose} />);
    expect(view.getByText("Photo Credits")).toBeTruthy();
    expect(view.queryByText("2")).toBeNull();
    expect(view.getByText("credits list")).toBeTruthy();

    await fireEvent.press(view.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows the sign-in card for a guest", async () => {
    const view = await render(<ProfileSide authed={false} picked={null} onClose={jest.fn()} />);
    expect(view.getByText("Sign In for More")).toBeTruthy();
    expect(view.queryByText("Open Guide")).toBeNull();
  });
});
