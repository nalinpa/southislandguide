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

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
}));

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import AccountScreen from "@/app/(app)/(tabs)/account";

const AUTHED_ONLY = ["Itineraries Card", "Saved Items Card", "Danger Zone Card"];

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.status = "authed";
  mockSession.uid = "uid-1";
  mockTrips.itineraries = [];
  mockTrips.loading = false;
  mockSavedSites.savedSiteIds = new Set();
  mockSavedSites.loading = false;
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

  // account.tsx:62,67 render itineraries.length / savedSiteIds.size without checking the hooks'
  // loading flags, so both counts read "0" until the requests land. rotorua-guide leaves them
  // blank while loading. Parked until the user agrees to port the fix.
  test.todo("leaves a count blank while it is still loading, rather than showing a wrong zero (account.tsx:62,67)");
});
