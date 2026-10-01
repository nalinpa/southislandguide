// The community reviews list. south-island's screen is an older copy of rotorua-guide's, from
// before rotorua fixed its title, its report/block feedback, its guest path and its offline
// behaviour. Those fixes are what the screen should do, so each gap is a todo naming the
// line — see the bottom of this file. Everything else is pinned as it works today.

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

jest.mock("@shopify/flash-list", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    FlashList: ({ data, renderItem, keyExtractor, ListHeaderComponent, ListEmptyComponent }: any) =>
      React.createElement(
        View,
        null,
        ListHeaderComponent,
        data.length === 0
          ? ListEmptyComponent
          : data.map((item: any, index: number) =>
              React.createElement(View, { key: keyExtractor(item) }, renderItem({ item, index })),
            ),
      ),
  };
});

const mockSession = { status: "authed", uid: "uid-1" } as any;
jest.mock("@/lib/providers/SessionProvider", () => ({ useSession: () => ({ session: mockSession }) }));

const mockReport = { mutate: jest.fn() };
const mockBlock = { mutate: jest.fn() };
const mockBag = {
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

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.status = "authed";
  mockSession.uid = "uid-1";
  mockParams.siteId = "site-1";
  mockParams.siteName = undefined;
  mockBag.reviews = [makeReview()];
  mockBag.loading = false;
  mockBag.err = null;
  mockBag.blockedUids = [];
  mockBag.avgRating = 4.26;
  mockBag.ratingCount = 12;
  mockRouter.canGoBack = jest.fn(() => true);
});

describe("the header", () => {
  it("uses the name the caller passed", async () => {
    mockParams.siteName = "Sumner Beach";
    const view = await render(<SiteReviewsPage />);
    expect(view.getByText("Sumner Beach")).toBeTruthy();
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
});

// Bugs found 2026-09-30. Each is fixed in rotorua-guide's copy of this screen; parked until
// the user agrees to port the fix.
describe("parked bugs", () => {
  // reviews.tsx:47 — `siteName?.trim() || "Location"`. The detail screen opens this route
  // without a siteName (sites/[siteId]/index.tsx:188), so every reviews screen is titled
  // "Location". rotorua falls back to hooksBag.useLocation(id)'s name, then "Reviews".
  test.todo("titles the screen with the place's own name when no siteName param is passed (reviews.tsx:47)");

  // reviews.tsx:31-32 — report.mutate / block.mutate are fire-and-forget: no confirmation on
  // success, and a failure looks exactly like success. rotorua alerts "Report Received" /
  // "User Blocked", and "Couldn't Send Report" / "Couldn't Block User" on error.
  test.todo("confirms a report, and says so when it fails (reviews.tsx:31)");
  test.todo("confirms a block naming the author, and says so when it fails (reviews.tsx:32)");

  // reviews.tsx:26-33 — no onGuestBlocked is passed, and ReviewOptionsMenu calls
  // onGuestBlocked?.() for a signed-out viewer, so a guest's tap on the menu does nothing.
  test.todo("sends a guest who taps report/block to sign in (reviews.tsx:26, no onGuestBlocked)");

  // reviews.tsx:80 — `if (err)` replaces the list with the error card even when reviews are
  // cached, so a background refetch failing offline hides reviews already on screen.
  test.todo("keeps showing cached reviews when a background refetch fails (reviews.tsx:80)");

  // Known, parked: tab screen reused across places, so the FlashList keeps its scroll
  // position. Fix is keying the body on the site id, as sites/[siteId]/index.tsx does.
  test.todo("opens each place's reviews scrolled to the top (known bug: list keeps scroll position between places)");
});
