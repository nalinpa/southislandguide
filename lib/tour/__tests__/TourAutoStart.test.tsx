// When the opening tour starts by itself (docs/plans/opening-tour.md, "When it starts"):
// once, the first time someone is on the main tabs, signed in or guest, after the location
// prompt is answered. And who it is for: guest, free (no unlock) or paid.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const mockSession = { session: { status: "authed", uid: "uid-1" } as any };
jest.mock("@/lib/providers/SessionProvider", () => ({ useSession: () => mockSession }));

const mockEntitlement = { entitledProductIds: new Set<string>(), loading: false };
jest.mock("@/lib/hooks/useEntitlementGate", () => ({ useEntitlementGate: () => mockEntitlement }));

let mockSegments: string[] = [];
jest.mock("expo-router", () => ({ useSegments: () => mockSegments }));

let mockPermission = "granted";
jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: mockPermission })),
}));

const mockStart = jest.fn();
let mockActive = false;
jest.mock("@/lib/tour/TourContext", () => ({ useTour: () => ({ start: mockStart, active: mockActive }) }));

const mockRequestReview = jest.fn();
jest.mock("@/lib/hooksBag", () => ({
  hooksBag: { useReviewPrompt: () => ({ requestReview: mockRequestReview }) },
}));

import React from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, render } from "@testing-library/react-native";

import { TourAutoStart, TOUR_SEEN_KEY } from "@/lib/tour/TourAutoStart";
import { FULL_GUIDE_PRODUCT_ID } from "@/lib/constants/commerce";

const TABS = ["(app)", "(tabs)", "sites"];

let appStateListener: (state: string) => void = () => {};
beforeEach(async () => {
  await AsyncStorage.clear();
  mockStart.mockClear();
  mockRequestReview.mockClear();
  mockActive = false;
  mockSession.session = { status: "authed", uid: "uid-1" };
  mockEntitlement.entitledProductIds = new Set([FULL_GUIDE_PRODUCT_ID]);
  mockEntitlement.loading = false;
  mockSegments = TABS;
  mockPermission = "granted";
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener: any) => {
    appStateListener = listener;
    return { remove: jest.fn() } as any;
  });
});

afterEach(() => jest.restoreAllMocks());

// Lets the stored flag and the permission check come back.
const settle = () => act(async () => {});

describe("TourAutoStart", () => {
  it("starts once everything has settled, and marks itself seen", async () => {
    await render(<TourAutoStart />);
    await settle();

    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(mockStart).toHaveBeenCalledWith("paid");
    expect(await AsyncStorage.getItem(TOUR_SEEN_KEY)).toBe("1");
  });

  it("doesn't start while the session is loading", async () => {
    mockSession.session = { status: "loading" };
    await render(<TourAutoStart />);
    await settle();

    expect(mockStart).not.toHaveBeenCalled();
  });

  it("doesn't start on the login screen", async () => {
    mockSession.session = { status: "loggedOut" };
    mockSegments = ["(auth)", "login"];
    await render(<TourAutoStart />);
    await settle();

    expect(mockStart).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(TOUR_SEEN_KEY)).toBeNull();
  });

  it("waits for the main tabs", async () => {
    mockSegments = ["(app)", "saved-sites"];
    const view = await render(<TourAutoStart />);
    await settle();
    expect(mockStart).not.toHaveBeenCalled();

    mockSegments = TABS;
    await view.rerender(<TourAutoStart />);
    await settle();
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  // The system's location alert comes up as Explore opens; the tour waits until it has
  // been answered, which brings the app back to active.
  it("waits for the location prompt to be answered", async () => {
    mockPermission = "undetermined";
    await render(<TourAutoStart />);
    await settle();
    expect(mockStart).not.toHaveBeenCalled();

    mockPermission = "denied";
    await act(async () => appStateListener("active"));
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it("never starts again once seen", async () => {
    await AsyncStorage.setItem(TOUR_SEEN_KEY, "1");
    await render(<TourAutoStart />);
    await settle();

    expect(mockStart).not.toHaveBeenCalled();
  });

  it("starts only once in a session, however often it re-renders", async () => {
    const view = await render(<TourAutoStart />);
    await settle();
    await view.rerender(<TourAutoStart />);
    await act(async () => appStateListener("active"));

    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  describe("who it is for", () => {
    it("a guest", async () => {
      mockSession.session = { status: "guest" };
      mockEntitlement.entitledProductIds = new Set();
      await render(<TourAutoStart />);
      await settle();

      expect(mockStart).toHaveBeenCalledWith("guest");
    });

    it("someone signed in without the unlock", async () => {
      mockEntitlement.entitledProductIds = new Set();
      await render(<TourAutoStart />);
      await settle();

      expect(mockStart).toHaveBeenCalledWith("free");
    });

    it("waits for the unlock to be checked before choosing", async () => {
      mockEntitlement.loading = true;
      const view = await render(<TourAutoStart />);
      await settle();
      expect(mockStart).not.toHaveBeenCalled();

      mockEntitlement.loading = false;
      await view.rerender(<TourAutoStart />);
      await settle();
      expect(mockStart).toHaveBeenCalledWith("paid");
    });
  });

  describe("asking for a rating", () => {
    afterEach(() => jest.useRealTimers());

    it("asks for a rating a second after the first tour ends, finished or skipped", async () => {
      const view = await render(<TourAutoStart />);
      await settle();
      jest.useFakeTimers();
      mockActive = true;
      await view.rerender(<TourAutoStart />);
      mockActive = false;
      await view.rerender(<TourAutoStart />);

      await act(async () => {
        jest.advanceTimersByTime(999);
      });
      expect(mockRequestReview).not.toHaveBeenCalled();
      await act(async () => {
        jest.advanceTimersByTime(1);
      });
      expect(mockRequestReview).toHaveBeenCalledTimes(1);
    });

    it("doesn't ask when the tour is replayed from Profile", async () => {
      await act(async () => {
        await AsyncStorage.setItem(TOUR_SEEN_KEY, "1");
      });
      const view = await render(<TourAutoStart />);
      await settle();
      jest.useFakeTimers();
      mockActive = true;
      await view.rerender(<TourAutoStart />);
      mockActive = false;
      await view.rerender(<TourAutoStart />);

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
      expect(mockRequestReview).not.toHaveBeenCalled();
    });

    it("doesn't ask a returning user", async () => {
      await act(async () => {
        await AsyncStorage.setItem(TOUR_SEEN_KEY, "1");
      });
      await render(<TourAutoStart />);
      await settle();
      jest.useFakeTimers();

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
      expect(mockStart).not.toHaveBeenCalled();
      expect(mockRequestReview).not.toHaveBeenCalled();
    });

    it("doesn't ask if the app leaves the screen before the second is up", async () => {
      const view = await render(<TourAutoStart />);
      await settle();
      jest.useFakeTimers();
      mockActive = true;
      await view.rerender(<TourAutoStart />);
      mockActive = false;
      await view.rerender(<TourAutoStart />);
      await view.unmount();

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
      expect(mockRequestReview).not.toHaveBeenCalled();
    });
  });
});
