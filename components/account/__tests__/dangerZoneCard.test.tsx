// The Delete Account row's text must be able to shrink inside its column, or on the Duo's
// narrower right column the description ran past the edge and lost "This cannot be".
jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));
jest.mock("expo-router", () => ({ router: { replace: jest.fn() } }));
jest.mock("@/lib/firebase", () => ({ auth: { currentUser: null } }));
jest.mock("@/lib/services/userService", () => ({ userService: { deleteAccount: jest.fn() } }));
jest.mock("@/lib/providers/SessionProvider", () => ({ useSession: () => ({ disableGuest: jest.fn() }) }));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: (props: any) => require("react").createElement(require("react-native").View, props),
}));

import React from "react";
import { StyleSheet } from "react-native";
import { render } from "@testing-library/react-native";

import { DangerZoneCard } from "@/components/account/DangerZoneCard";

it("lets the description's column and text shrink to the row", async () => {
  const view = await render(<DangerZoneCard />);
  const text = view.getByText(/Permanently delete your account/);
  const col = StyleSheet.flatten(text.parent!.props.style);
  expect(col).toMatchObject({ flex: 1, minWidth: 0 });
  expect(StyleSheet.flatten(text.props.style).flexShrink).toBe(1);
});
