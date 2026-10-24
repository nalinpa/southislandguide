// The Account tab's tier rules. A guest gets the profile card and the Open Guide promo and
// nothing account-bound; a signed-in user also gets the stats row and the Trips / Saved /
// Danger Zone cards. south-island's screen differs from rotorua-guide's on purpose: no
// top bar (the guide promo opens the page), SavedItemsCard instead of
// SavedSitesCard, and no Restore Purchases card (no commerce until 1.4).

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

// Each of these is its own component; here they only need to be present or absent.
const stubCard = (label: string) => () => {
  const React = require("react");
  const { Text } = require("react-native");
  return React.createElement(Text, null, label);
};
jest.mock("@/components/account/UserInfoCard", () => ({ UserInfoCard: stubCard("User Info Card") }));
jest.mock("@/components/account/ItinerariesCard", () => ({ ItinerariesCard: stubCard("Itineraries Card") }));
jest.mock("@/components/account/SavedItemsCard", () => ({ SavedItemsCard: stubCard("Saved Items Card") }));
jest.mock("@/components/account/DangerZoneCard", () => ({ DangerZoneCard: stubCard("Danger Zone Card") }));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

const mockSession = { status: "authed", uid: "uid-1" } as any;
jest.mock("@/lib/providers/SessionProvider", () => ({ useSession: () => ({ session: mockSession }) }));

const mockTrips = { itineraries: [] as any[], loading: false };
jest.mock("@/lib/hooks/useItineraries", () => ({ useItineraries: () => mockTrips }));

const mockSavedSites = { savedSiteIds: new Set<string>(), loading: false };
jest.mock("@/lib/hooks/useSavedSites", () => ({ useSavedSites: () => mockSavedSites }));

// The opening tour (lib/tour), run again from here.
const mockStartTour = jest.fn();
jest.mock("@/lib/tour/TourContext", () => ({ useTour: () => ({ start: mockStartTour }) }));
let mockAudience: string | null = "paid";
jest.mock("@/lib/tour/TourAutoStart", () => ({ useTourAudience: () => mockAudience }));

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
  // LightStatusBar uses it to own the status bar while its screen is in front. Here the
  // screen is always "focused".
  useFocusEffect: (effect: () => void) => require("react").useEffect(effect, []),
}));

import React from "react";
import { fireEvent, render, within } from "@testing-library/react-native";

import AccountScreen from "@/app/(app)/(tabs)/account";
import { tokens } from "@/lib/ui/tokens";

const AUTHED_ONLY = ["Itineraries Card", "Saved Items Card", "Danger Zone Card"];

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.status = "authed";
  mockSession.uid = "uid-1";
  mockTrips.itineraries = [];
  mockTrips.loading = false;
  mockSavedSites.savedSiteIds = new Set();
  mockSavedSites.loading = false;
  mockAudience = "paid";
});

it("waits for the session rather than guessing the tier", async () => {
  mockSession.status = "loading";
  const view = await render(<AccountScreen />);

  expect(view.getByText("Loading session...")).toBeTruthy();
  expect(view.queryByText("User Info Card")).toBeNull();
  expect(view.queryByText("Danger Zone Card")).toBeNull();
});

it("never offers Restore Purchases in 1.0", async () => {
  const view = await render(<AccountScreen />);
  expect(view.queryByText(/Restore/)).toBeNull();
});

describe("guest", () => {
  beforeEach(() => {
    mockSession.status = "guest";
    mockSession.uid = undefined;
  });

  it("gets the profile card and the guide promo, and nothing account-bound", async () => {
    const view = await render(<AccountScreen />);

    expect(view.getByText("User Info Card")).toBeTruthy();
    expect(view.getByText("Open Guide")).toBeTruthy();
    for (const card of AUTHED_ONLY) expect(view.queryByText(card)).toBeNull();
  });

  it("has no stats row to fill", async () => {
    const view = await render(<AccountScreen />);

    expect(view.queryByText("Saved")).toBeNull();
    expect(view.queryByText("Trips")).toBeNull();
  });

  it("can still reach the guide, which isn't auth-gated", async () => {
    const view = await render(<AccountScreen />);

    await fireEvent.press(view.getByText("Open Guide"));

    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/(tabs)/guide");
  });

  // White label, so the button is the full-strength highlight: white on the lighter
  // on-dark orange is only 1.7:1.
  it("makes opening the guide the highlighted action, with a white label", async () => {
    const view = await render(<AccountScreen />);

    expect(view.getByRole("button", { name: "Open Guide" })).toHaveStyle({
      backgroundColor: tokens.colors.highlight,
    });
    expect(view.getByText("Open Guide")).toHaveStyle({ color: "#FFFFFF" });
  });
});

describe("signed in", () => {
  it("shows every account card", async () => {
    const view = await render(<AccountScreen />);

    expect(view.getByText("User Info Card")).toBeTruthy();
    for (const card of AUTHED_ONLY) expect(view.getByText(card)).toBeTruthy();
  });

  it("counts the trips and saved places", async () => {
    mockTrips.itineraries = [{ id: "t1" }, { id: "t2" }];
    mockSavedSites.savedSiteIds = new Set(["s1", "s2", "s3"]);
    const view = await render(<AccountScreen />);

    expect(view.getByText("2")).toBeTruthy();
    expect(view.getByText("Trips")).toBeTruthy();
    expect(view.getByText("3")).toBeTruthy();
    expect(view.getByText("Saved")).toBeTruthy();
  });

  // The hero used to scroll with the page, which slid the Open Guide button up behind
  // the clock. Only the sheet scrolls now.
  it("keeps the guide button fixed above the part that scrolls", async () => {
    const view = await render(<AccountScreen />);
    const scrolling = within(view.getByTestId("home-scroll"));

    expect(scrolling.queryByText("Open Guide")).toBeNull();
    expect(scrolling.getByText("User Info Card")).toBeTruthy();
    expect(view.getByText("Open Guide")).toBeTruthy();
  });

  it("shows the counts in the highlight colour", async () => {
    mockTrips.itineraries = [{ id: "t1" }, { id: "t2" }];
    const view = await render(<AccountScreen />);

    expect(view.getByText("2")).toHaveStyle({ color: tokens.colors.highlight });
  });

  it("uses the singular label for one trip", async () => {
    mockTrips.itineraries = [{ id: "t1" }];
    const view = await render(<AccountScreen />);

    expect(view.getByText("Trip")).toBeTruthy();
  });

  it("links the guide for a signed-in user too", async () => {
    const view = await render(<AccountScreen />);

    await fireEvent.press(view.getByText("Open Guide"));

    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/(tabs)/guide");
  });

  it("shows a dash instead of a wrong zero while counts are loading", async () => {
    mockTrips.loading = true;
    mockSavedSites.loading = true;
    const view = await render(<AccountScreen />);

    expect(view.getAllByText("–")).toHaveLength(2);
    expect(view.queryByText("0")).toBeNull();
  });
});

// The opening tour, from its first step, for whoever is looking.
// Where the photographers the image licences require are named, for the photos too small
// to carry a credit of their own.
describe("Photo credits", () => {
  it("opens the photo credits for a signed-in user", async () => {
    const view = await render(<AccountScreen />);

    await fireEvent.press(view.getByRole("button", { name: "Photo credits" }));

    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/photo-credits");
  });

  it("opens them for a guest too", async () => {
    mockSession.status = "guest";
    mockSession.uid = undefined;
    const view = await render(<AccountScreen />);

    await fireEvent.press(view.getByRole("button", { name: "Photo credits" }));

    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/photo-credits");
  });
});

describe("Show me around", () => {
  it("runs the tour again for a signed-in user", async () => {
    const view = await render(<AccountScreen />);

    await fireEvent.press(view.getByRole("button", { name: "Show me around" }));

    expect(mockStartTour).toHaveBeenCalledWith("paid");
  });

  it("runs the guest's tour for a guest", async () => {
    mockSession.status = "guest";
    mockSession.uid = undefined;
    mockAudience = "guest";
    const view = await render(<AccountScreen />);

    await fireEvent.press(view.getByRole("button", { name: "Show me around" }));

    expect(mockStartTour).toHaveBeenCalledWith("guest");
  });

  it("isn't offered until it's known who the tour is for", async () => {
    mockAudience = null;
    const view = await render(<AccountScreen />);

    expect(view.queryByText("Show me around")).toBeNull();
  });
});
