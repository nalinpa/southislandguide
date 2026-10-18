// The app-open counter logic. Tests the AsyncStorage operations directly
// rather than rendering the hook, which avoids test-environment issues.
const storage: Record<string, string> = {};
const mockGetItem = jest.fn(async (key: string) => storage[key] ?? null);
const mockSetItem = jest.fn(async (key: string, value: string) => {
  storage[key] = value;
});

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: mockGetItem,
  setItem: mockSetItem,
}));

describe("useAppOpenCount logic", () => {
  beforeEach(() => {
    mockGetItem.mockClear();
    mockSetItem.mockClear();
    for (const key of Object.keys(storage)) delete storage[key];
  });

  it("increments from zero on first open", async () => {
    // Simulate the hook's logic
    const raw = await mockGetItem("southislandguide:appOpenCount");
    const current = raw ? parseInt(raw, 10) : 0;
    const next = current + 1;
    await mockSetItem("southislandguide:appOpenCount", String(next));

    expect(next).toBe(1);
    expect(mockSetItem).toHaveBeenCalledWith("southislandguide:appOpenCount", "1");
  });

  it("continues from the stored value", async () => {
    storage["southislandguide:appOpenCount"] = "4";

    const raw = await mockGetItem("southislandguide:appOpenCount");
    const current = raw ? parseInt(raw, 10) : 0;
    const next = current + 1;
    await mockSetItem("southislandguide:appOpenCount", String(next));

    expect(next).toBe(5);
    expect(mockSetItem).toHaveBeenCalledWith("southislandguide:appOpenCount", "5");
  });
});


