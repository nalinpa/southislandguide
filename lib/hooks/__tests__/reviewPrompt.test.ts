// lib/hooksBag.ts hands the shared hooks an adapter for the store's review sheet
// (expo-store-review), and exports the useReviewPrompt that uses it. Checked against
// the real hooksBag module: createHooks is stood in for so the config it is given can
// be read, and the adapter in it is called through to a stand-in expo-store-review.

// Built inside the mock: lib/hooksBag.ts calls createHooks as it loads, before anything
// declared in this file exists.
jest.mock("@blacksands/hooks", () => {
  const hooks = {
    useLocations: jest.fn(() => ({ locations: [] })),
    useUserLocation: jest.fn(() => ({ status: "granted", request: jest.fn() })),
    useReviewPrompt: jest.fn(),
  };
  return { createHooks: jest.fn(() => hooks) };
});
jest.mock("@/lib/api", () => ({ client: {} }));
jest.mock("expo-location", () => ({}));
jest.mock("@react-native-community/netinfo", () => ({}));
jest.mock("@react-native-async-storage/async-storage", () => ({}));
jest.mock("@tanstack/react-query", () => ({ useQueryClient: jest.fn() }));
jest.mock("expo-store-review", () => ({
  isAvailableAsync: jest.fn(),
  requestReview: jest.fn(),
}));

import * as StoreReview from "expo-store-review";
import { createHooks } from "@blacksands/hooks";
import * as hooksBagModule from "@/lib/hooksBag";

const mockIsAvailable = StoreReview.isAvailableAsync as jest.Mock;
const mockRequestReview = StoreReview.requestReview as jest.Mock;
const mockCreateHooks = createHooks as unknown as jest.Mock;

// The config lib/hooksBag.ts gave createHooks when it loaded, and what it got back.
const config = () => mockCreateHooks.mock.calls[0][1];
const sharedHooks = () => mockCreateHooks.mock.results[0].value;

describe("the store review adapter in hooksBag", () => {
  beforeEach(() => {
    mockIsAvailable.mockReset();
    mockRequestReview.mockReset();
  });

  it("is given to the shared hooks", () => {
    expect(config().storeReview).toEqual({ isAvailable: expect.any(Function), requestReview: expect.any(Function) });
  });

  it("asks the store whether its review sheet is available", async () => {
    mockIsAvailable.mockResolvedValue(true);

    await expect(config().storeReview.isAvailable()).resolves.toBe(true);
    expect(mockIsAvailable).toHaveBeenCalledTimes(1);
  });

  it("asks the store to show its review sheet", async () => {
    mockRequestReview.mockResolvedValue(undefined);

    await config().storeReview.requestReview();

    expect(mockRequestReview).toHaveBeenCalledTimes(1);
  });

  it("exports the shared hooks' useReviewPrompt", () => {
    expect(hooksBagModule.useReviewPrompt).toBe(sharedHooks().useReviewPrompt);
  });
});
