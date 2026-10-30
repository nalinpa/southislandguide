// The community reviews list. south-island's screen is an older copy of rotorua-guide's.
// Report/block feedback and the guest path are ported: both mutations used to fire and
// forget, so a failure looked exactly like success. So is the title, which was "Location"
// for every place. So are the last two: cached reviews stay on screen when a background
// refetch fails, and each place gets a fresh list (the route is a reused tab screen).

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

// Counts list mounts: a real FlashList's scroll position lives in the instance, so "a new
// instance per place" is what stops it carrying over.
const mockListMounts = { count: 0 };
jest.mock("@shopify/flash-list", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    FlashList: ({ data, renderItem, keyExtractor, ListHeaderComponent, ListEmptyComponent }: any) => {
      React.useEffect(() => {
        mockListMounts.count += 1;
      }, []);
      return React.createElement(
        View,
        null,
        ListHeaderComponent,
        data.length === 0
          ? ListEmptyComponent
          : data.map((item: any, index: number) =>
              React.createElement(View, { key: keyExtractor(item) }, renderItem({ item, index })),
            ),
      );
    },
  };
});

const mockSession = { status: "authed", uid: "uid-1" } as any;
jest.mock("@/lib/providers/SessionProvider", () => ({ useSession: () => ({ session: mockSession }) }));

const mockReport = { mutate: jest.fn() };
const mockBlock = { mutate: jest.fn() };
const mockBag = {
  site: null as any,
  reviews: [] as any[],
  loading: false,
  err: null as string | null,
  refresh: jest.fn(),
  blockedUids: [] as string[],
  avgRating: 4.26 as number | null,
  ratingCount: 12,
};
jest.mock("@/lib/hooksBag", () => ({
  hooksBag: {
    useLocation: () => ({ location: mockBag.site }),
    usePublicReviews: () => ({
      loading: mockBag.loading,
      err: mockBag.err,
      reviews: mockBag.reviews,
      refresh: mockBag.refresh,
    }),
    useLocationReviewsSummary: () => ({ avgRating: mockBag.avgRating, ratingCount: mockBag.ratingCount }),
    useBlockedUsers: () => ({ data: mockBag.blockedUids }),
    useReportContent: () => mockReport,
    useBlockUser: () => mockBlock,
  },
}));

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
const mockParams = { siteId: "site-1", siteName: undefined as string | undefined };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => mockParams,
  Stack: { Screen: () => null },
}));

import React from "react";
import { Alert } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import SiteReviewsPage from "@/app/(app)/(tabs)/sites/[siteId]/reviews";

const makeReview = (over: Record<string, unknown> = {}) => ({
  id: "r1",
  userId: "author-1",
  userName: "Aroha",
  rating: 5,
  text: "Worth the early start.",
  reviewCreatedAt: "2026-09-01T00:00:00.000Z",
  ...over,
});

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockListMounts.count = 0;
  mockReport.mutate.mockReset();
  mockBlock.mutate.mockReset();
  mockSession.status = "authed";
  mockSession.uid = "uid-1";
  mockParams.siteId = "site-1";
  mockParams.siteName = undefined;
  mockBag.site = { id: "site-1", name: "Hagley Park" };
  mockBag.reviews = [makeReview()];
  mockBag.loading = false;
  mockBag.err = null;
  mockBag.blockedUids = [];
  mockBag.avgRating = 4.26;
  mockBag.ratingCount = 12;
  mockRouter.canGoBack = jest.fn(() => true);
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

afterEach(() => alertSpy.mockRestore());

describe("the header", () => {
  it("uses the name the caller passed", async () => {
    mockParams.siteName = "Sumner Beach";
    const view = await render(<SiteReviewsPage />);
    expect(view.getByText("Sumner Beach")).toBeTruthy();
  });

  it("falls back to the place's own name, not a placeholder", async () => {
    const view = await render(<SiteReviewsPage />);

    expect(view.getByText("Hagley Park")).toBeTruthy();
    expect(view.queryByText("Location")).toBeNull();
  });

  it("falls back to a generic title only when the place is unknown too", async () => {
    mockBag.site = null;
    const view = await render(<SiteReviewsPage />);
    expect(view.getByText("Reviews")).toBeTruthy();
  });

  it("rounds the average to one decimal", async () => {
    const view = await render(<SiteReviewsPage />);
    expect(view.getByText("Average 4.3")).toBeTruthy();
  });
});

describe("loading, failure and emptiness", () => {
  it("waits while the reviews load", async () => {
    mockBag.loading = true;
    const view = await render(<SiteReviewsPage />);
    expect(view.getByText("Loading reviews...")).toBeTruthy();
  });

  it("offers both a retry and a way out when nothing could be loaded", async () => {
    mockBag.err = "offline";
    mockBag.reviews = [];
    const view = await render(<SiteReviewsPage />);

    expect(view.getByText("Couldn't load reviews")).toBeTruthy();
    await fireEvent.press(view.getByText("Try Again"));
    expect(mockBag.refresh).toHaveBeenCalled();
    await fireEvent.press(view.getByText("Go Back"));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it("shows an empty state, with a retry, when there are no reviews", async () => {
    mockBag.reviews = [];
    const view = await render(<SiteReviewsPage />);

    expect(view.getByText("No reviews yet")).toBeTruthy();
    await fireEvent.press(view.getByText("Retry"));
    expect(mockBag.refresh).toHaveBeenCalled();
  });

  // The engine's default body asks for a review "after you've checked in": no check-in here.
  it("asks for the first review without mentioning check-in", async () => {
    mockBag.reviews = [];
    const view = await render(<SiteReviewsPage />);

    expect(view.getByText("Be the first to review this place.")).toBeTruthy();
  });

  it("lists each review's author, text and rating", async () => {
    const view = await render(<SiteReviewsPage />);

    expect(view.getByText("Aroha")).toBeTruthy();
    expect(view.getByText("Worth the early start.")).toBeTruthy();
    expect(view.getByText("Rated 5")).toBeTruthy();
  });
});

describe("going back", () => {
  it("pops the stack when there is one", async () => {
    const view = await render(<SiteReviewsPage />);

    await fireEvent.press(view.getByText("Back"));

    expect(mockRouter.back).toHaveBeenCalled();
  });

  it("goes to the place itself when this was opened cold from a link", async () => {
    mockRouter.canGoBack = jest.fn(() => false);
    const view = await render(<SiteReviewsPage />);

    await fireEvent.press(view.getByText("Back"));

    expect(mockRouter.replace).toHaveBeenCalledWith("/(app)/(tabs)/sites/site-1");
  });
});

describe("blocked authors", () => {
  it("hides a blocked author's reviews", async () => {
    mockBag.reviews = [makeReview(), makeReview({ id: "r2", userId: "author-2", userName: "Rangi" })];
    mockBag.blockedUids = ["author-2"];
    const view = await render(<SiteReviewsPage />);

    expect(view.getByText("Aroha")).toBeTruthy();
    expect(view.queryByText("Rangi")).toBeNull();
  });
});

describe("reporting and blocking", () => {
  it("reports the review against its author", async () => {
    const view = await render(<SiteReviewsPage />);

    await fireEvent.press(view.getByText("Report Aroha"));

    expect(mockReport.mutate.mock.calls[0][0]).toEqual({ reviewId: "r1", authorId: "author-1" });
  });

  it("blocks the review's author", async () => {
    const view = await render(<SiteReviewsPage />);

    await fireEvent.press(view.getByText("Block Aroha"));

    expect(mockBlock.mutate.mock.calls[0][0]).toEqual({ blockedUid: "author-1" });
  });

  it("confirms a successful report", async () => {
    mockReport.mutate.mockImplementation((_args, opts) => opts.onSuccess());
    const view = await render(<SiteReviewsPage />);

    await fireEvent.press(view.getByText("Report Aroha"));

    expect(alertSpy).toHaveBeenCalledWith("Report Received", expect.any(String));
  });

  it("says so when a report fails, instead of looking like success", async () => {
    mockReport.mutate.mockImplementation((_args, opts) => opts.onError(new Error("permission-denied")));
    const view = await render(<SiteReviewsPage />);

    await fireEvent.press(view.getByText("Report Aroha"));

    expect(alertSpy).toHaveBeenCalledWith("Couldn't Send Report", expect.stringContaining("went wrong"));
  });

  it("confirms a block, naming the author", async () => {
    mockBlock.mutate.mockImplementation((_args, opts) => opts.onSuccess());
    const view = await render(<SiteReviewsPage />);

    await fireEvent.press(view.getByText("Block Aroha"));

    expect(alertSpy).toHaveBeenCalledWith("User Blocked", "You won't see reviews from Aroha any more.");
  });

  it("says so when a block fails", async () => {
    mockBlock.mutate.mockImplementation((_args, opts) => opts.onError(new Error("permission-denied")));
    const view = await render(<SiteReviewsPage />);

    await fireEvent.press(view.getByText("Block Aroha"));

    expect(alertSpy).toHaveBeenCalledWith("Couldn't Block User", expect.stringContaining("went wrong"));
  });

  it("sends a guest who taps report or block to sign in", async () => {
    mockSession.status = "guest";
    mockSession.uid = undefined;
    const view = await render(<SiteReviewsPage />);

    await fireEvent.press(view.getByText("Guest blocked Aroha"));

    expect(alertSpy).toHaveBeenCalledWith("Sign In Required", "Sign in to report content or block a user.", [
      expect.objectContaining({ text: "Cancel" }),
      expect.objectContaining({ text: "Sign In" }),
    ]);
    alertSpy.mock.calls[0][2][1].onPress();
    expect(mockRouter.push).toHaveBeenCalledWith("/(auth)/login");
    expect(mockReport.mutate).not.toHaveBeenCalled();
    expect(mockBlock.mutate).not.toHaveBeenCalled();
  });
});

// Bugs found 2026-09-30, fixed 2026-10-09 by porting rotorua-guide's copy of this screen.
describe("bugs ported from rotorua-guide's fixes", () => {
  it("keeps showing cached reviews when a background refetch fails", async () => {
    mockBag.err = "offline";
    const view = await render(<SiteReviewsPage />);

    expect(view.queryByText("Couldn't load reviews")).toBeNull();
    expect(view.getByText("Worth the early start.")).toBeTruthy();
  });

  it("still shows the error when there is nothing cached to fall back on", async () => {
    mockBag.err = "offline";
    mockBag.reviews = [];
    const view = await render(<SiteReviewsPage />);

    expect(view.getByText("Couldn't load reviews")).toBeTruthy();
  });

  // The route is a tab screen, reused across places, so without a key the list (and its
  // scroll position) survived the move to another place's reviews.
  it("gives each place a fresh list, so the scroll position doesn't carry over", async () => {
    const view = await render(<SiteReviewsPage />);
    expect(mockListMounts.count).toBe(1);

    mockParams.siteId = "site-2";
    await view.rerender(<SiteReviewsPage />);

    expect(mockListMounts.count).toBe(2);
  });
});
