jest.mock("@/lib/api", () => ({ client: { auth: { deleteAccount: jest.fn() } } }));
jest.mock("@/lib/firebase", () => ({ auth: { signOut: jest.fn(), currentUser: { uid: "user-1", reload: jest.fn() } } }));
jest.mock("@/lib/providers/AppProviders", () => {
  const mockClear = jest.fn();
  return { queryClient: { removeQueries: jest.fn(), getMutationCache: () => ({ clear: mockClear }), mockClear } };
});
jest.mock("@/lib/hooksBag", () => ({ hooksBag: { useDraftsStore: { setState: jest.fn() } } }));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
// The trip quiz's answers kept on the phone (lib/tripBuilder/quizStorage, which has its own tests).
const mockClearQuiz = jest.fn(() => Promise.resolve());
jest.mock("@/lib/tripBuilder/quizStorage", () => ({ clearQuiz: () => mockClearQuiz() }));

import * as Sentry from "@sentry/react-native";
import { client } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { hooksBag } from "@/lib/hooksBag";
import { queryClient } from "@/lib/providers/AppProviders";
import { clearLocalUserData, userService } from "@/lib/services/userService";

const mockDeleteAccount = client.auth.deleteAccount as jest.Mock;
const mockSignOut = auth.signOut as jest.Mock;
const mockRemoveQueries = queryClient.removeQueries as jest.Mock;
const mockClearMutations = (queryClient as any).mockClear as jest.Mock;
const mockSetDrafts = hooksBag.useDraftsStore.setState as jest.Mock;
const mockReload = (auth.currentUser as any).reload as jest.Mock;

describe("userService.deleteAccount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteAccount.mockReset();
    mockSignOut.mockReset();
    mockReload.mockReset();
    mockReload.mockResolvedValue(undefined);
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

  // A retry after a delete that timed out once the server had finished: the account is gone.
  it.each(["auth/user-not-found", "auth/user-token-expired"])(
    "finishes the delete when the call fails but Firebase answers %s",
    async (code) => {
      mockDeleteAccount.mockRejectedValue(new Error("identity toolkit delete 400"));
      mockReload.mockRejectedValue(Object.assign(new Error("gone"), { code }));

      await userService.deleteAccount();

      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockRemoveQueries).toHaveBeenCalledTimes(1);
      expect(mockSetDrafts).toHaveBeenCalledWith({ drafts: {} });
    },
  );

  it("still fails when the account exists or Firebase can't be reached", async () => {
    mockDeleteAccount.mockRejectedValue(new Error("server error"));
    mockReload.mockRejectedValueOnce(Object.assign(new Error("offline"), { code: "auth/network-request-failed" }));

    await expect(userService.deleteAccount()).rejects.toThrow("server error");
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});

// Every sign-out ends here (the Account tab's, the trip quiz's when the api turned its sign-in down, and a deleted
// account's). The trip quiz's answers go with the rest: the next person on the phone, or this one as a guest, starts
// it afresh (owner, 2026-11-28: "the trip builder doesnt really reset").
describe("clearLocalUserData", () => {
  beforeEach(() => jest.clearAllMocks());

  // Handed back, so a caller can wait for it (the trip quiz saves its answers back once it is done).
  it("clears the trip quiz kept on the phone, with the account's cache, writes and drafts", async () => {
    await clearLocalUserData("user-1");

    expect(mockClearQuiz).toHaveBeenCalledTimes(1);
    expect(mockRemoveQueries).toHaveBeenCalledTimes(1);
    expect(mockClearMutations).toHaveBeenCalledTimes(1);
    expect(mockSetDrafts).toHaveBeenCalledWith({ drafts: {} });
  });

  it("is done only once the quiz is cleared", async () => {
    let cleared: () => void = () => {};
    mockClearQuiz.mockImplementationOnce(() => new Promise<void>((resolve) => (cleared = resolve)));
    let done = false;
    const all = clearLocalUserData("user-1").then(() => (done = true));
    await Promise.resolve();
    expect(done).toBe(false);

    cleared();
    await all;
    expect(done).toBe(true);
  });

  it("clears it after a deleted account too", async () => {
    mockDeleteAccount.mockResolvedValue(null);

    await userService.deleteAccount();

    expect(mockClearQuiz).toHaveBeenCalledTimes(1);
  });
});
