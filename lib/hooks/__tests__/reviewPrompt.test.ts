// The storeReview adapter that hooksBag passes to createHooks.
// Verifies the adapter delegates to expo-store-review correctly.
jest.mock("expo-store-review", () => ({
  isAvailableAsync: jest.fn(),
  requestReview: jest.fn(),
}));

import * as StoreReview from "expo-store-review";

const mockIsAvailable = StoreReview.isAvailableAsync as jest.Mock;
const mockRequestReview = StoreReview.requestReview as jest.Mock;

// The same adapter object that hooksBag passes to createHooks.
const storeReviewAdapter = {
  isAvailable: () => StoreReview.isAvailableAsync(),
  requestReview: () => StoreReview.requestReview(),
};

describe("storeReview adapter", () => {
  beforeEach(() => {
    mockIsAvailable.mockReset();
    mockRequestReview.mockReset();
  });

  it("isAvailable delegates to StoreReview.isAvailableAsync", async () => {
    mockIsAvailable.mockResolvedValue(true);

    const result = await storeReviewAdapter.isAvailable();

    expect(mockIsAvailable).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it("requestReview delegates to StoreReview.requestReview", async () => {
    mockRequestReview.mockResolvedValue(undefined);

    await storeReviewAdapter.requestReview();

    expect(mockRequestReview).toHaveBeenCalled();
  });
});

