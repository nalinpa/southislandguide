// How many times the app has started, kept on the phone. Drives the review prompt on
// the fifth start-up (app/_layout.tsx). Runs the real hook against a stand-in store.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { renderHook, waitFor } from "@testing-library/react-native";

import { useAppOpenCount } from "@/lib/hooks/useAppOpenCount";

const KEY = "southislandguide:appOpenCount";

describe("useAppOpenCount", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  // So a caller can tell "not read yet" from a real count, and not act on a guess.
  it("is empty until the stored count has been read", async () => {
    let finishRead: (value: string | null) => void = () => {};
    // Once only: the store stand-in's own behaviour comes back for the next call.
    (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(
      () => new Promise((resolve) => (finishRead = resolve)),
    );

    const { result } = await renderHook(() => useAppOpenCount());
    expect(result.current).toBeNull();

    finishRead("2");
    await waitFor(() => expect(result.current).toBe(3));
  });

  it("counts the first start-up as 1, and stores it", async () => {
    const { result } = await renderHook(() => useAppOpenCount());

    await waitFor(() => expect(result.current).toBe(1));
    expect(await AsyncStorage.getItem(KEY)).toBe("1");
  });

  it("carries on from the stored count", async () => {
    await AsyncStorage.setItem(KEY, "4");

    const { result } = await renderHook(() => useAppOpenCount());

    await waitFor(() => expect(result.current).toBe(5));
    expect(await AsyncStorage.getItem(KEY)).toBe("5");
  });
});
