// The Account tab's tier rules. A guest gets the profile card and the Open Guide promo and
// nothing account-bound; a signed-in user also gets the Trips / Saved /
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

// Has its own tests (useEmailOptIn.test.tsx); here the switch only has to reflect and set it.
const mockEmailOptIn = { optedIn: false, loading: false, setOptedIn: jest.fn() };
jest.mock("@/lib/hooks/useEmailOptIn", () => ({ useEmailOptIn: () => mockEmailOptIn }));

// The map for no signal: the hook has its own tests (useOfflineMap.test.tsx), and the size
// is a fixed number here so the words don't change when the real set's size goes in.
const mockOfflineMap = {
  saved: false,
  progress: null as { done: number; total: number } | null,
  error: null as "no-signal" | "stopped" | null,
  save: jest.fn(),
  stop: jest.fn(),
  remove: jest.fn(),
};
jest.mock("@/lib/hooks/useOfflineMap", () => ({ useOfflineMap: () => mockOfflineMap }));
jest.mock("@/lib/offlineMap", () => ({ OFFLINE_MAP_ABOUT_MB: 60 }));
const mockNet = { type: "wifi" };
jest.mock("@react-native-community/netinfo", () => ({ useNetInfo: () => mockNet }));

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
import { Alert, Linking } from "react-native";
import { fireEvent, render, waitFor, within } from "@testing-library/react-native";

import AccountScreen from "@/app/(app)/(tabs)/account";
import { tokens } from "@/lib/ui/tokens";

const AUTHED_ONLY = ["Itineraries Card", "Saved Items Card", "Danger Zone Card"];

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.status = "authed";
  mockSession.uid = "uid-1";
  mockEmailOptIn.optedIn = false;
  mockEmailOptIn.loading = false;
  mockAudience = "paid";
  mockOfflineMap.saved = false;
  mockOfflineMap.progress = null;
  mockOfflineMap.error = null;
  mockNet.type = "wifi";
});

describe("email for feedback and news", () => {
  it("shows the answer from sign-up and changes it", async () => {
    const view = await render(<AccountScreen />);
    const toggle = view.getByLabelText("Email me about feedback and news");
    expect(toggle.props.value).toBe(false);

    await fireEvent(toggle, "valueChange", true);

    expect(mockEmailOptIn.setOptedIn).toHaveBeenCalledWith(true);
  });

  it("shows yes when they said yes", async () => {
    mockEmailOptIn.optedIn = true;
    const view = await render(<AccountScreen />);

    expect(view.getByLabelText("Email me about feedback and news").props.value).toBe(true);
  });

  it("isn't offered to a guest, who has no email to send to", async () => {
    mockSession.status = "guest";
    const view = await render(<AccountScreen />);

    expect(view.queryByLabelText("Email me about feedback and news")).toBeNull();
  });
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

  // Owner, 2026-11-11: "1 trip, 3 saved" said nothing the cards below don't.
  it("has no stats row", async () => {
    const view = await render(<AccountScreen />);

    expect(view.queryByText("Saved")).toBeNull();
    expect(view.queryByText("Trip")).toBeNull();
    expect(view.queryByText("Trips")).toBeNull();
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

  it("links the guide for a signed-in user too", async () => {
    const view = await render(<AccountScreen />);

    await fireEvent.press(view.getByText("Open Guide"));

    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/(tabs)/guide");
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

// App Review asks for a privacy policy (5.1.1(i)) and a way to reach the developer (1.2),
// and checks them without signing in.
describe("Privacy policy, terms and contact", () => {
  let openUrlSpy: jest.SpyInstance;
  let alertSpy: jest.SpyInstance;
  beforeEach(() => {
    openUrlSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
    alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });
  afterEach(() => {
    openUrlSpy.mockRestore();
    alertSpy.mockRestore();
  });

  const LINKS: [string, string][] = [
    ["Privacy policy", "https://blacksands.app/kiwi-guide#privacy"],
    ["Terms of use", "https://blacksands.app/kiwi-guide#terms"],
    ["Contact us", "mailto:info@blacksandsdigital.nz?subject=Kiwi%20Guide"],
  ];

  for (const status of ["authed", "guest"]) {
    it.each(LINKS)(`opens %s for a ${status === "authed" ? "signed-in user" : "guest"}`, async (label, url) => {
      mockSession.status = status;
      const view = await render(<AccountScreen />);

      await fireEvent.press(view.getByRole("button", { name: label }));

      expect(openUrlSpy).toHaveBeenCalledWith(url);
    });
  }

  it("says where to write when Mail can't open", async () => {
    openUrlSpy.mockRejectedValue(new Error("no mail account"));
    const view = await render(<AccountScreen />);

    await fireEvent.press(view.getByRole("button", { name: "Contact us" }));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Couldn't Open", "Email us at info@blacksandsdigital.nz"));
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

// The map saved for no signal (docs/plans/offline-map.md). Everyone, guests too: the gaps in
// mobile coverage are the same for them.
describe("Map for no signal", () => {
  beforeEach(() => {
    mockSession.status = "guest";
    mockSession.uid = undefined;
  });

  it("offers a guest the map for no signal", async () => {
    const view = await render(<AccountScreen />);

    expect(view.getByText("Map for no signal")).toBeTruthy();
    expect(view.getByRole("button", { name: "Save map for no signal" })).toBeTruthy();
  });

  it("asks first on mobile data", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockNet.type = "cellular";
    const view = await render(<AccountScreen />);

    await fireEvent.press(view.getByRole("button", { name: "Save map for no signal" }));

    expect(alertSpy).toHaveBeenCalledWith("Not on Wi-Fi", "Saving the map uses about 60 MB of data.", expect.any(Array));
    expect(mockOfflineMap.save).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("saves straight away on Wi-Fi", async () => {
    const view = await render(<AccountScreen />);

    await fireEvent.press(view.getByRole("button", { name: "Save map for no signal" }));

    expect(mockOfflineMap.save).toHaveBeenCalled();
  });

  // Owner, 2026-11-11: the row's percentage alone wasn't clear.
  it("opens a card that shows the save, and closing it doesn't stop the save", async () => {
    const view = await render(<AccountScreen />);
    await fireEvent.press(view.getByRole("button", { name: "Save map for no signal" }));
    expect(view.getByRole("progressbar").props.accessibilityValue).toEqual({ min: 0, max: 100, now: 0 });

    mockOfflineMap.progress = { done: 21, total: 84 };
    await view.rerender(<AccountScreen />);
    expect(view.getByRole("progressbar").props.accessibilityValue.now).toBe(25);

    await fireEvent.press(view.getByRole("button", { name: "Close" }));
    expect(view.queryByRole("progressbar")).toBeNull();
    expect(mockOfflineMap.stop).not.toHaveBeenCalled();
    expect(view.getByText("Saving the map… 25%")).toBeTruthy();
  });

  it("says when the map is saved", async () => {
    const view = await render(<AccountScreen />);
    await fireEvent.press(view.getByRole("button", { name: "Save map for no signal" }));

    mockOfflineMap.saved = true;
    await view.rerender(<AccountScreen />);
    expect(view.getByText("Map saved")).toBeTruthy();

    await fireEvent.press(view.getByRole("button", { name: "Done" }));
    expect(view.queryByText("Map saved")).toBeNull();
  });
});
