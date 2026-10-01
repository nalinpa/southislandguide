// The token the shared api client attaches. south-island's getToken is the plain version:
// rotorua-guide also waits on auth.authStateReady() and force-refreshes a failed token,
// because an unauthenticated locations request there comes back as premium teasers.
// south-island 1.0 has no premium content, so neither applies yet (see TASKS.md, 1.4).
jest.mock("@/lib/firebase", () => ({ auth: { currentUser: null } }));

import { auth } from "@/lib/firebase";
import { getToken } from "@/lib/api/auth";

type MockAuth = { currentUser: { getIdToken: jest.Mock } | null };
const mockAuth = auth as unknown as MockAuth;

describe("getToken", () => {
  afterEach(() => {
    mockAuth.currentUser = null;
  });

  it("returns null when there is no signed-in user", async () => {
    await expect(getToken()).resolves.toBeNull();
  });

  it("returns the current user's id token", async () => {
    const getIdToken = jest.fn().mockResolvedValue("tok123");
    mockAuth.currentUser = { getIdToken };

    await expect(getToken()).resolves.toBe("tok123");
    expect(getIdToken).toHaveBeenCalledTimes(1);
  });

  it("lets a token failure reach the client rather than inventing a token", async () => {
    mockAuth.currentUser = { getIdToken: jest.fn().mockRejectedValue(new Error("network")) };

    await expect(getToken()).rejects.toThrow("network");
  });
});
