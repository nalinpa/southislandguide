// Sign-out leaves nothing of the account behind. A trip write queued offline would otherwise
// send with the next account's token once there's signal, and land in that account; the
// account's trips and saved places would stay in the saved cache for two weeks.
jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));
jest.mock("@/lib/api", () => ({ client: { auth: { deleteAccount: jest.fn() } } }));
jest.mock("@/lib/firebase", () => ({ auth: { signOut: jest.fn(), currentUser: { uid: "user-a", email: "a@example.com" } } }));
jest.mock("@/lib/providers/AppProviders", () => {
  const mockClear = jest.fn();
  return { queryClient: { removeQueries: jest.fn(), getMutationCache: () => ({ clear: mockClear }), mockClear } };
});
jest.mock("@/lib/hooksBag", () => ({ hooksBag: { useDraftsStore: { setState: jest.fn() } } }));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

const mockDisableGuest = jest.fn();
jest.mock("@/lib/providers/SessionProvider", () => ({
  useSession: () => ({ session: { status: "authed", uid: "user-a" }, disableGuest: mockDisableGuest }),
}));

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
}));

import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { auth } from "@/lib/firebase";
import { queryClient } from "@/lib/providers/AppProviders";
import { UserInfoCard } from "@/components/account/UserInfoCard";

const mockSignOut = auth.signOut as jest.Mock;
const mockRemoveQueries = queryClient.removeQueries as jest.Mock;
const mockClearMutations = (queryClient as any).mockClear as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockSignOut.mockReset().mockResolvedValue(undefined);
});

it("clears the account's queued writes and cached data on sign-out", async () => {
  const view = await render(<UserInfoCard />);

  await fireEvent.press(view.getByText("Sign Out"));

  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/(auth)/login"));
  expect(mockClearMutations).toHaveBeenCalledTimes(1);
  const { predicate } = mockRemoveQueries.mock.calls[0][0];
  expect(predicate({ queryKey: ["southislandguide", "itineraries", "user-a"] })).toBe(true);
  expect(predicate({ queryKey: ["southislandguide", "locations"] })).toBe(false);
  // Signed out first, so no screen refetches the account's data back into the cache.
  expect(mockSignOut.mock.invocationCallOrder[0]).toBeLessThan(mockClearMutations.mock.invocationCallOrder[0]);
});

it("keeps everything when sign-out fails", async () => {
  mockSignOut.mockRejectedValue(new Error("offline"));
  const view = await render(<UserInfoCard />);

  await fireEvent.press(view.getByText("Sign Out"));

  await waitFor(() => expect(view.getByText("Failed to log out. Please try again.")).toBeTruthy());
  expect(mockClearMutations).not.toHaveBeenCalled();
  expect(mockRemoveQueries).not.toHaveBeenCalled();
});
