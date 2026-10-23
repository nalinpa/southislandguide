jest.mock("@/lib/api", () => ({ client: { auth: { deleteAccount: jest.fn() } } }));
jest.mock("@/lib/firebase", () => ({ auth: { signOut: jest.fn(), currentUser: { uid: "user-1" } } }));
jest.mock("@/lib/providers/AppProviders", () => {
  const mockClear = jest.fn();
  return { queryClient: { removeQueries: jest.fn(), getMutationCache: () => ({ clear: mockClear }), mockClear } };
});
jest.mock("@/lib/hooksBag", () => ({ hooksBag: { useDraftsStore: { setState: jest.fn() } } }));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

import * as Sentry from "@sentry/react-native";
import { client } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { hooksBag } from "@/lib/hooksBag";
import { queryClient } from "@/lib/providers/AppProviders";
import { userService } from "@/lib/services/userService";

const mockDeleteAccount = client.auth.deleteAccount as jest.Mock;
const mockSignOut = auth.signOut as jest.Mock;
const mockRemoveQueries = queryClient.removeQueries as jest.Mock;
const mockClearMutations = (queryClient as any).mockClear as jest.Mock;
const mockSetDrafts = hooksBag.useDraftsStore.setState as jest.Mock;

describe("userService.deleteAccount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteAccount.mockReset();
    mockSignOut.mockReset();
  });

  it("delegates to the API client's deleteAccount", async () => {
    mockDeleteAccount.mockResolvedValue(null);

    await userService.deleteAccount();

    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
  });

  it("signs out locally after a successful server-side deletion", async () => {
    mockDeleteAccount.mockResolvedValue(null);

    await userService.deleteAccount();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it("propagates errors from the API call", async () => {
    mockDeleteAccount.mockRejectedValue(new Error("server error"));

    await expect(userService.deleteAccount()).rejects.toThrow("server error");
  });

  it("does not sign out locally when the server-side deletion fails", async () => {
    mockDeleteAccount.mockRejectedValue(new Error("server error"));

    await expect(userService.deleteAccount()).rejects.toThrow("server error");
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  // The delete screen says these are permanently deleted, and the cache keeps them on the
  // phone for two weeks. Drafts are kept by place, so the next account here would find them.
  it("removes the user's cached queries, queued writes and review drafts after a delete", async () => {
    mockDeleteAccount.mockResolvedValue(null);

    await userService.deleteAccount();

    const { predicate } = mockRemoveQueries.mock.calls[0][0];
    expect(predicate({ queryKey: ["southislandguide", "itineraries", "user-1"] })).toBe(true);
    expect(predicate({ queryKey: ["savedSites", "user-1"] })).toBe(true);
    expect(predicate({ queryKey: ["southislandguide", "locations"] })).toBe(false);
    expect(mockClearMutations).toHaveBeenCalledTimes(1);
    expect(mockSetDrafts).toHaveBeenCalledWith({ drafts: {} });
    // Signed out first, so no screen refetches the deleted account's data in between.
    expect(mockSignOut.mock.invocationCallOrder[0]).toBeLessThan(mockRemoveQueries.mock.invocationCallOrder[0]);
  });

  it("clears nothing when the server delete fails", async () => {
    mockDeleteAccount.mockRejectedValue(new Error("server error"));

    await expect(userService.deleteAccount()).rejects.toThrow("server error");
    expect(mockRemoveQueries).not.toHaveBeenCalled();
    expect(mockClearMutations).not.toHaveBeenCalled();
    expect(mockSetDrafts).not.toHaveBeenCalled();
  });

  // The account is already gone, so "Couldn't delete your account" would be wrong.
  it("still resolves when sign-out fails after the account is gone", async () => {
    mockDeleteAccount.mockResolvedValue(null);
    mockSignOut.mockRejectedValue(new Error("sign-out failed"));

    await expect(userService.deleteAccount()).resolves.toBeUndefined();
    expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error));
  });
});
