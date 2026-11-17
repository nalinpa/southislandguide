// The Account tab's tier rules. A guest gets the profile card and the Open Guide promo and
// nothing account-bound; a signed-in user also gets the Trips / Saved /
// Danger Zone cards. south-island's screen differs from rotorua-guide's on purpose: no
// top bar (the guide promo opens the page), SavedItemsCard instead of
// SavedSitesCard, and no Restore Purchases card (no commerce until 1.4).

// The guest's sign-in card on the open Duo is the engine's real AuthPanel, as in the Login
// tests; the engine bundle loads these, stubbed as other tests stub them.
jest.mock("moti", () => {
  const { View } = require("react-native");
  return { MotiView: View, AnimatePresence: ({ children }: any) => children };
});
// Saved Places in the pane lists its cards, so the list renders its rows.
jest.mock("@shopify/flash-list", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    FlashList: ({ data = [], renderItem, keyExtractor, ListEmptyComponent, numColumns, contentContainerStyle }: any) =>
      React.createElement(
        View,
        { testID: "saved-list", numColumns, contentContainerStyle },
        data.length === 0
          ? ListEmptyComponent
          : data.map((item: any, index: number) => React.createElement(View, { key: keyExtractor(item) }, renderItem({ item, index }))),
      ),
  };
});
// Swipe to remove wants native gestures; the action is what these tests press.
jest.mock("react-native-gesture-handler/ReanimatedSwipeable", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: React.forwardRef(({ children, renderRightActions }: any, _ref: any) =>
      React.createElement(View, null, children, renderRightActions()),
    ),
  };
});
jest.mock("react-native-maps", () => {
  const { View } = require("react-native");
  return { __esModule: true, default: View, Marker: View, Circle: View, Polyline: View };
});
jest.mock("react-native-svg", () => {
  const { View } = require("react-native");
  return { __esModule: true, default: View, Svg: View, Path: View, Circle: View, G: View, Text: View, Defs: View, RadialGradient: View, Stop: View, Rect: View };
});
jest.mock("expo-haptics", () => ({ impactAsync: jest.fn(), ImpactFeedbackStyle: {} }));
jest.mock("@/lib/uiKit", () => {
  const kit = require("@/test/uiKitMock");
  const { createAuthPanel } = require("@blacksands/components");
  const { formTokens } = require("@/lib/ui/tokens");
  return { ...kit, AuthPanel: createAuthPanel(formTokens, kit) };
});
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("@/lib/firebase", () => ({ auth: {} }));
jest.mock("firebase/firestore", () => ({ doc: jest.fn(), getDoc: jest.fn(), setDoc: jest.fn(), serverTimestamp: jest.fn() }));
jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

// Each of these is its own component; here they only need to be present or absent.
const stubCard = (label: string) => () => {
  const React = require("react");
  const { Text } = require("react-native");
  return React.createElement(Text, null, label);
};
jest.mock("@/components/account/UserInfoCard", () => ({ UserInfoCard: stubCard("User Info Card") }));
jest.mock("@/components/account/ItinerariesCard", () => ({ ItinerariesCard: stubCard("Itineraries Card") }));
// The real card (its "View All Saved Places" link is what the pane tests press) with a marker
// beside it for the order tests.
jest.mock("@/components/account/SavedItemsCard", () => {
  const React = require("react");
  const { Text } = require("react-native");
  const { SavedItemsCard } = jest.requireActual("@/components/account/SavedItemsCard");
  return {
    SavedItemsCard: (props: any) =>
      React.createElement(React.Fragment, null, React.createElement(Text, null, "Saved Items Card"), React.createElement(SavedItemsCard, props)),
  };
});
const mockSavedSites = { savedSiteIds: new Set<string>(), toggleSavedSite: jest.fn() };
jest.mock("@/lib/hooks/useSavedSites", () => ({ useSavedSites: () => mockSavedSites }));
// The trip's places, for the Saved Places pane: no trips here.
jest.mock("@/lib/hooks/useItineraries", () => ({ useItineraries: () => ({ itineraries: [] }) }));
const mockBag = { locations: [] as any[], loading: false, err: null as string | null };
jest.mock("@/lib/hooksBag", () => ({
  useAllLocations: () => mockBag,
  hooksBag: {
    useLocations: () => mockBag,
    useUserLocation: () => ({ loc: null }),
    useSortedRows: (locations: any[]) => locations.map((l) => ({ location: l, distanceMeters: null })),
  },
}));
// Stateful, so a test can leave its delete dialog open across a fold.
jest.mock("@/components/account/DangerZoneCard", () => ({
  DangerZoneCard: () => {
    const React = require("react");
    const { Text, TouchableOpacity } = require("react-native");
    const [open, setOpen] = React.useState(false);
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(Text, null, "Danger Zone Card"),
      React.createElement(TouchableOpacity, { onPress: () => setOpen(true), accessibilityRole: "button" }, React.createElement(Text, null, "Delete Account")),
      open ? React.createElement(Text, null, "Delete dialog") : null,
    );
  },
}));

// The status bar has no output to look at; a marker stands in for the light one.
jest.mock("@/components/layout/LightStatusBar", () => ({
  LightStatusBar: () => require("react").createElement(require("react-native").View, { testID: "light-status-bar" }),
}));

let mockInsetTop = 44;
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: mockInsetTop, bottom: 34, left: 0, right: 0 }),
  SafeAreaView: (props: any) => require("react").createElement(require("react-native").View, props),
}));

const mockSession = { status: "authed", uid: "uid-1" } as any;
// A real hook (it holds state), as on a device: a component with no hooks at all on its first
// render never trips React's hook-count check, so the loading -> signed-in test needs this.
jest.mock("@/lib/providers/SessionProvider", () => ({
  useSession: () => {
    require("react").useState(0);
    return { session: mockSession };
  },
}));

// Has its own tests (useEmailOptIn.test.tsx); here the switch only has to reflect and set it.
const mockEmailOptIn = { optedIn: false, loading: false, setOptedIn: jest.fn() };
jest.mock("@/lib/hooks/useEmailOptIn", () => ({
  ...jest.requireActual("@/lib/hooks/useEmailOptIn"),
  useEmailOptIn: () => mockEmailOptIn,
}));

// The map for no signal: the hook has its own tests (useOfflineMap.test.tsx), and the size
// is a fixed number here so the words don't change when the real set's size goes in.
const mockOfflineMap = {
  level: null as "standard" | "detailed" | null,
  progress: null as { phase: "saving" | "unpacking"; done: number; total: number } | null,
  error: null as "no-signal" | "stopped" | null,
  save: jest.fn(),
  stop: jest.fn(),
  remove: jest.fn(),
};
jest.mock("@/lib/hooks/useOfflineMap", () => ({ useOfflineMap: () => mockOfflineMap }));
jest.mock("@/lib/offlineMap", () => ({ OFFLINE_MAP_SIZES_MB: { standard: 60, detailed: 200 } }));
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
import { Alert, Linking, StyleSheet } from "react-native";
import { fireEvent, render, waitFor, within } from "@testing-library/react-native";

import AccountScreen from "@/app/(app)/(tabs)/account";
import { tokens, photoWash } from "@/lib/ui/tokens";
import { signInWithEmailAndPassword } from "firebase/auth";

const AUTHED_ONLY = ["Itineraries Card", "Saved Items Card", "Danger Zone Card"];

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.status = "authed";
  mockSession.uid = "uid-1";
  mockInsetTop = 44;
  mockEmailOptIn.optedIn = false;
  mockEmailOptIn.loading = false;
  mockAudience = "paid";
  mockOfflineMap.level = null;
  mockOfflineMap.progress = null;
  mockOfflineMap.error = null;
  mockNet.type = "wifi";
  mockSavedSites.savedSiteIds = new Set();
  mockBag.locations = [];
  mockBag.loading = false;
  mockBag.err = null;
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

it("goes from loading to the signed-in page without a hooks-order crash", async () => {
  mockSession.status = "loading";
  const view = await render(<AccountScreen />);
  mockSession.status = "authed";
  await view.rerender(<AccountScreen />);

  expect(view.getByText("Open Guide")).toBeTruthy();
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

  // Owner, 2026-11-11: offer both, the smaller less detailed map and the bigger sharper one.
  it("asks which map, with each one's size", async () => {
    const view = await render(<AccountScreen />);
    await fireEvent.press(view.getByRole("button", { name: "Save map for no signal" }));

    expect(view.getByText("About 60 MB. Roads, towns and tracks. Blurry close in.")).toBeTruthy();
    expect(view.getByText("About 200 MB. Sharp close in, for walks and back roads.")).toBeTruthy();
    expect(mockOfflineMap.save).not.toHaveBeenCalled();

    await fireEvent.press(view.getByRole("button", { name: "Detailed map" }));
    expect(mockOfflineMap.save).toHaveBeenCalledWith("detailed");
  });

  it("wide: the map choice is a centred 400 dialog", async () => {
    require("@blacksands/ui").__setWide(true, { width: 669, height: 951 });
    const view = await render(<AccountScreen />);
    await fireEvent.press(view.getByRole("button", { name: "Save map for no signal" }));

    let width: unknown;
    for (let n: any = view.getByText("Which map?"); n && width === undefined; n = n.parent) {
      width = (StyleSheet.flatten(n.props?.style) as any)?.width;
    }
    expect(width).toBe(400);
  });

  it("asks first on mobile data, with the size of the map chosen", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockNet.type = "cellular";
    const view = await render(<AccountScreen />);

    await fireEvent.press(view.getByRole("button", { name: "Save map for no signal" }));
    await fireEvent.press(view.getByRole("button", { name: "Standard map" }));

    expect(alertSpy).toHaveBeenCalledWith("Not on Wi-Fi", "Saving the map uses about 60 MB of data.", expect.any(Array));
    expect(mockOfflineMap.save).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("saves straight away on Wi-Fi", async () => {
    const view = await render(<AccountScreen />);

    await fireEvent.press(view.getByRole("button", { name: "Save map for no signal" }));
    await fireEvent.press(view.getByRole("button", { name: "Standard map" }));

    expect(mockOfflineMap.save).toHaveBeenCalledWith("standard");
  });

  // Owner, 2026-11-11: the row's percentage alone wasn't clear.
  it("opens a card that shows the save, and closing it doesn't stop the save", async () => {
    const view = await render(<AccountScreen />);
    await fireEvent.press(view.getByRole("button", { name: "Save map for no signal" }));
    await fireEvent.press(view.getByRole("button", { name: "Standard map" }));
    expect(view.getByRole("progressbar").props.accessibilityValue).toEqual({ min: 0, max: 100, now: 0 });

    mockOfflineMap.progress = { phase: "saving", done: 21, total: 84 };
    await view.rerender(<AccountScreen />);
    expect(view.getByRole("progressbar").props.accessibilityValue.now).toBe(25);
    // Owner, 2026-11-11: "could the download be done while the app is closed?"
    expect(view.getAllByText("It keeps going if you leave the app. Don't swipe it away.").length).toBeGreaterThan(0);

    await fireEvent.press(view.getByRole("button", { name: "Close" }));
    expect(view.queryByRole("progressbar")).toBeNull();
    expect(mockOfflineMap.stop).not.toHaveBeenCalled();
    expect(view.getByText("Saving the map… 25%")).toBeTruthy();
  });

  it("says when it's unpacking, which needs the app open", async () => {
    mockOfflineMap.progress = { phase: "unpacking", done: 1, total: 4 };
    const view = await render(<AccountScreen />);

    expect(view.getByText("Unpacking the map…")).toBeTruthy();
    expect(view.getByText("Keep the app open until it's done.")).toBeTruthy();
  });

  it("says when the map is saved", async () => {
    const view = await render(<AccountScreen />);
    await fireEvent.press(view.getByRole("button", { name: "Save map for no signal" }));
    await fireEvent.press(view.getByRole("button", { name: "Standard map" }));

    mockOfflineMap.level = "standard";
    await view.rerender(<AccountScreen />);
    expect(view.getByText("Map saved")).toBeTruthy();

    await fireEvent.press(view.getByRole("button", { name: "Done" }));
    expect(view.queryByText("Map saved")).toBeNull();
  });

  describe("with the standard map saved", () => {
    beforeEach(() => {
      mockOfflineMap.level = "standard";
    });

    it("offers the detailed map, by how much more it is, beside Remove", async () => {
      const view = await render(<AccountScreen />);

      expect(view.getByRole("button", { name: "Remove" })).toBeTruthy();
      await fireEvent.press(view.getByRole("button", { name: "Get the detailed map (about 140 MB more)" }));

      expect(mockOfflineMap.save).toHaveBeenCalledWith("detailed");
      // Still saving, not "Map saved" for the standard one already there.
      expect(view.queryByText("Map saved")).toBeNull();
      expect(view.getByRole("progressbar")).toBeTruthy();
    });

    it("on mobile data, quotes only the extra", async () => {
      const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      mockNet.type = "cellular";
      const view = await render(<AccountScreen />);

      await fireEvent.press(view.getByRole("button", { name: /Get the detailed map/ }));

      expect(alertSpy).toHaveBeenCalledWith("Not on Wi-Fi", "Saving the map uses about 140 MB of data.", expect.any(Array));
      alertSpy.mockRestore();
    });
  });

  it("with the detailed map saved, only Remove is offered", async () => {
    mockOfflineMap.level = "detailed";
    const view = await render(<AccountScreen />);

    expect(view.getByText("Map saved for no signal")).toBeTruthy();
    expect(view.queryByRole("button", { name: /Get the detailed map/ })).toBeNull();
    expect(view.getByRole("button", { name: "Remove" })).toBeTruthy();
  });
});

// The open Duo (docs/plans/duo-131.md, "Profile"): the rows in a left column, a photo card on
// the right with the guide link on it, or for a guest the sign-in form.
describe("wide", () => {
  const UPRIGHT = { width: 669, height: 951 };
  const SIDEWAYS = { width: 951, height: 669 };
  const wideView = async (size = UPRIGHT) => {
    require("@blacksands/ui").__setWide(true, size);
    const view = await render(<AccountScreen />);
    return { view, left: within(view.getByTestId("profile-left")), right: within(view.getByTestId("profile-right")) };
  };
  const SIGNED_IN_ORDER = [
    "User Info Card",
    "Show me around",
    "Map for no signal",
    "Itineraries Card",
    "Saved Items Card",
    "Email me about feedback and news",
    "Photo credits",
    "Privacy policy",
    "Terms of use",
    "Contact us",
    "Danger Zone Card",
  ];

  it("wide signed in: left is who, Show me around, Map, My Trip, Saved Places, email switch, Photo credits and legal, Account, in that order, with no guide card", async () => {
    const { view, left } = await wideView();

    // Only the left column's own text, in tree order.
    const leftTree = JSON.stringify(view.toJSON()).split('"profile-right"')[0];
    const at = SIGNED_IN_ORDER.map((m) => leftTree.indexOf(m));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect(at).toEqual([...at].sort((x, y) => x - y));
    expect(left.queryByText("Open Guide")).toBeNull();
    expect(left.queryByText(/Your guide to the/)).toBeNull();
  });

  it("wide signed in: right is the photo with the wash and the guide card centred on it; Open Guide opens the guide", async () => {
    const { view, left, right } = await wideView();

    expect(right.getByTestId("profile-photo").props.source).toEqual([require("@/assets/guide-road.webp")]);
    expect(right.getByTestId("profile-wash")).toHaveStyle({ backgroundColor: photoWash });
    expect(right.getByTestId("profile-card")).toHaveStyle({ maxWidth: 350, padding: 24, borderRadius: 20, backgroundColor: tokens.colors.accentWarm });
    expect(right.getByText(/Your guide to the/)).toHaveStyle({ fontSize: 28, lineHeight: 33, fontWeight: "800" });
    expect(right.getByRole("button", { name: "Open Guide" })).toHaveStyle({ height: 52, backgroundColor: tokens.colors.highlight });
    expect(view.queryByTestId("light-status-bar")).toBeNull();
    expect(left.queryByText("Open Guide")).toBeNull();

    await fireEvent.press(right.getByText("Open Guide"));

    expect(mockRouter.push).toHaveBeenCalledWith("/(app)/(tabs)/guide");
  });

  it("wide: the first row and the right pane's card start 56 down upright, 32 sideways with no status-bar inset", async () => {
    const tops = async (size: typeof UPRIGHT) => {
      const { view } = await wideView(size);
      return [
        view.getByTestId("home-scroll").props.contentContainerStyle.paddingTop,
        StyleSheet.flatten(view.getByTestId("profile-photo").parent!.props.style).marginTop,
      ];
    };
    expect(await tops(UPRIGHT)).toEqual([56, 56]);
    mockInsetTop = 0;
    expect(await tops(SIDEWAYS)).toEqual([32, 32]);
  });

  describe("guest", () => {
    beforeEach(() => {
      mockSession.status = "guest";
      mockSession.uid = undefined;
    });

    it("wide guest: left starts with the guide card and its button is white; right is the sign-in card on the Login photo", async () => {
      const { view, left, right } = await wideView();
      const leftTree = JSON.stringify(view.toJSON()).split('"profile-right"')[0];

      for (const [a, b] of [["Open Guide", "User Info Card"], ["User Info Card", "Show me around"], ["Show me around", "Map for no signal"], ["Map for no signal", "Photo credits"]]) {
        expect(leftTree.indexOf(a)).toBeGreaterThanOrEqual(0);
        expect(leftTree.indexOf(a)).toBeLessThan(leftTree.indexOf(b));
      }
      expect(left.getByRole("button", { name: "Open Guide" })).toHaveStyle({ backgroundColor: "#FFFFFF", height: 52 });
      expect(left.getByText("Open Guide")).toHaveStyle({ color: "#063F45" });
      expect(left.getByText(/Your guide to the/)).toHaveStyle({ fontSize: 28, lineHeight: 33 });
      expect(right.getByTestId("profile-photo").props.source).toEqual([require("@/assets/login.webp")]);
      expect(right.getByTestId("profile-wash")).toHaveStyle({ backgroundColor: photoWash });
      expect(right.queryByText("Open Guide")).toBeNull();
      expect(left.queryByText("Saved Items Card")).toBeNull();
    });

    it("wide guest: the card holds \"Sign In for More\", its line, and the form with Create an account as an outline button, and no \"Continue as guest\" link", async () => {
      const { right } = await wideView();

      expect(right.getByTestId("profile-card")).toHaveStyle({ maxWidth: 380, borderRadius: 20, backgroundColor: tokens.colors.page });
      expect(right.getByText("Sign In for More")).toHaveStyle({ fontSize: 22, lineHeight: 27, fontWeight: "700" });
      expect(right.getByText("Sign in to save places, plan trips and leave reviews.")).toHaveStyle({ fontSize: 16, lineHeight: 22, color: tokens.colors.text2 });
      expect(right.getByLabelText("Email")).toBeTruthy();
      expect(right.getByLabelText("Password")).toBeTruthy();
      expect(right.getByRole("button", { name: "Create an account" })).toHaveStyle({ borderWidth: 1.5, height: 52 });
      expect(right.queryByText("Continue as guest")).toBeNull();
    });

    it("wide guest: a failed sign-in shows its error in the card", async () => {
      (signInWithEmailAndPassword as jest.Mock).mockRejectedValue(new Error("Incorrect password"));
      const { right } = await wideView();

      await fireEvent.changeText(right.getByLabelText("Email"), "kia@ora.nz");
      await fireEvent.changeText(right.getByLabelText("Password"), "wrong");
      await fireEvent.press(right.getByRole("button", { name: "Sign in" }));

      await waitFor(() => expect(right.getByText("Incorrect password")).toBeTruthy());
    });

    it("wide: after sign-in the layout becomes the signed-in one", async () => {
      const { view } = await wideView();
      expect(view.getByText("Sign In for More")).toBeTruthy();

      mockSession.status = "authed";
      mockSession.uid = "uid-1";
      await view.rerender(<AccountScreen />);

      expect(view.queryByText("Sign In for More")).toBeNull();
      expect(within(view.getByTestId("profile-right")).getByText("Open Guide")).toBeTruthy();
      expect(within(view.getByTestId("profile-left")).getByText("Saved Items Card")).toBeTruthy();
      expect(within(view.getByTestId("profile-left")).queryByText("Open Guide")).toBeNull();
    });

    it("wide sideways guest: create-account mode scrolls inside the card", async () => {
      const { view, right } = await wideView(SIDEWAYS);
      const scroll = right.getByTestId("profile-card-scroll");

      await fireEvent.press(right.getByText("Create an account"));

      // The card is held to the photo's height and its content scrolls inside it, with taps
      // still reaching the fields while the keyboard is up.
      expect(right.getByTestId("profile-card")).toHaveStyle({ maxHeight: "100%" });
      expect(scroll.props.keyboardShouldPersistTaps).toBe("handled");
      expect(within(scroll).getByLabelText("Confirm password")).toBeTruthy();
      expect(within(scroll).getByRole("checkbox")).toBeTruthy();
      expect(view.getByTestId("home-scroll")).not.toBe(scroll);
    });
  });

  it("wide: the left column has the fade at its foot; dark uses the dark wash", async () => {
    const { view } = await wideView();
    const fade = view.getByTestId("profile-fade");

    expect(fade).toHaveStyle({ position: "absolute", bottom: 0, height: 40 });
    expect(within(view.getByTestId("profile-left")).getByTestId("profile-fade")).toBe(fade);
    expect(fade.props.colors).toEqual([0x00ffffff, 0xffffffff]); // the page colour, clear to solid (processed)
    // The dark wash is read in profileSideDark.test.tsx, where the colours load in dark.
  });

  it("keeps state across the breakpoint: the offline map card and the delete dialog stay mounted through a fold", async () => {
    mockSession.status = "authed";
    const view = await render(<AccountScreen />);
    await fireEvent.press(view.getByRole("button", { name: "Save map for no signal" }));
    await fireEvent.press(view.getByRole("button", { name: "Delete Account" }));
    expect(view.getByText("Which map?")).toBeTruthy();
    expect(view.getByText("Delete dialog")).toBeTruthy();

    require("@blacksands/ui").__setWide(true, UPRIGHT);
    await view.rerender(<AccountScreen />);
    expect(view.getByText("Which map?")).toBeTruthy();
    expect(view.getByText("Delete dialog")).toBeTruthy();

    require("@blacksands/ui").__setWide(false);
    await view.rerender(<AccountScreen />);
    expect(view.getByText("Which map?")).toBeTruthy();
    expect(view.getByText("Delete dialog")).toBeTruthy();
  });

  it("phone: unchanged, and the guide button is orange", async () => {
    mockSession.status = "guest";
    const view = await render(<AccountScreen />);

    expect(view.getByRole("button", { name: "Open Guide" })).toHaveStyle({ backgroundColor: tokens.colors.highlight });
    expect(view.queryByTestId("profile-right")).toBeNull();
    expect(view.queryByTestId("profile-fade")).toBeNull();
    expect(view.queryByText("Sign In for More")).toBeNull();
  });

  it("the left column is the 40 of 40/60, with the hairline between", async () => {
    const { view } = await wideView();

    expect(view.getByTestId("profile-left")).toHaveStyle({ flex: 40 });
    expect(view.getByTestId("profile-right")).toHaveStyle({ flex: 60 });
    expect(view.getByTestId("profile-hairline")).toHaveStyle({ width: 1 });
  });

  it("phone: one column, the guide fixed above the scroll, the light status bar", async () => {
    const view = await render(<AccountScreen />);

    expect(within(view.getByTestId("home-scroll")).queryByText("Open Guide")).toBeNull();
    expect(view.getByTestId("light-status-bar")).toBeTruthy();
    expect(view.getByTestId("profile-hairline", { includeHiddenElements: true })).toHaveStyle({ display: "none" });
  });

  it("phone: the groups run hero, who, Show me around, Map, My Trip, Saved Places, email switch, Account, Photo credits, legal", async () => {
    const view = await render(<AccountScreen />);
    const tree = JSON.stringify(view.toJSON());
    const marks = ["Open Guide", "User Info Card", "Show me around", "Map for no signal", "Itineraries Card", "Saved Items Card", "Email me about feedback and news", "Danger Zone Card", "Photo credits", "Privacy policy", "Terms of use", "Contact us"];
    const at = marks.map((m) => tree.indexOf(m));

    expect(at.every((i) => i >= 0)).toBe(true);
    expect(at).toEqual([...at].sort((x, y) => x - y));
  });

  it("folding keeps the open map choice", async () => {
    mockSession.status = "guest";
    const view = await render(<AccountScreen />);
    await fireEvent.press(view.getByRole("button", { name: "Save map for no signal" }));
    require("@blacksands/ui").__setWide(true, UPRIGHT);
    await view.rerender(<AccountScreen />);

    expect(view.getByText("Which map?")).toBeTruthy();
  });

  // Saved Places and Photo credits take the right pane over (docs/plans/duo-131.md, "Right,
  // Saved Places or Photo credits"); on a phone both rows go to their own screens.
  describe("Saved Places and Photo credits in the pane", () => {
    const site = (id: string, name: string, category = "Water") => ({ id, name, description: "", category: [category], active: true, area: "queenstown" });
    const fiveSaved = () => {
      mockBag.locations = [site("s1", "Sumner Beach"), site("s2", "Riccarton Bush", "Nature"), site("s3", "Riverside Market", "Food"), site("s4", "Tunnel Beach"), site("s5", "Cave Stream", "Nature")];
      mockSavedSites.savedSiteIds = new Set(["s1", "s2", "s3", "s4", "s5"]);
    };
    const viewAll = (view: any) => view.getByRole("button", { name: "View All Saved Places" });

    it("wide: View All Saved Places opens the pane and does not navigate; the row takes the fill", async () => {
      fiveSaved();
      const { view, right } = await wideView();
      expect(viewAll(view)).not.toHaveStyle({ backgroundColor: tokens.colors.selFill });
      expect(viewAll(view)).toHaveProp("accessibilityState", { selected: false });

      await fireEvent.press(viewAll(view));

      expect(mockRouter.push).not.toHaveBeenCalled();
      expect(right.getByText("Riverside Market")).toBeTruthy();
      expect(right.queryByText("Open Guide")).toBeNull();
      expect(viewAll(view)).toHaveStyle({ backgroundColor: tokens.colors.selFill, borderRadius: 12 });
      expect(viewAll(view)).toHaveProp("accessibilityState", { selected: true });
    });

    it("wide: Photo credits opens the pane; the row takes the fill", async () => {
      mockBag.locations = [{ ...site("c1", "Coronet Peak"), imageUrl: "https://example.test/c1.webp", imageCredit: "Miles Holden" }];
      const { view, right } = await wideView();
      const row = () => view.getByRole("button", { name: "Photo credits" });
      expect(row()).not.toHaveStyle({ backgroundColor: tokens.colors.selFill });
      expect(row()).toHaveProp("accessibilityState", { selected: false });

      await fireEvent.press(row());

      expect(mockRouter.push).not.toHaveBeenCalled();
      expect(right.getByText("Photo Credits")).toBeTruthy();
      expect(right.getByText("Photo: Miles Holden")).toBeTruthy();
      expect(right.queryByText("Open Guide")).toBeNull();
      expect(row()).toHaveStyle({ backgroundColor: tokens.colors.selFill, borderRadius: 12 });
      expect(row()).toHaveProp("accessibilityState", { selected: true });
    });

    it("phone: the Photo credits and View All rows carry no selected state (the touchable fills the other keys with undefined)", async () => {
      fiveSaved();
      const view = await render(<AccountScreen />);
      expect(view.getByRole("button", { name: "Photo credits" }).props.accessibilityState?.selected).toBeUndefined();
      expect(viewAll(view).props.accessibilityState?.selected).toBeUndefined();
    });

    it("wide: the pane has its title, the count for Saved Places, and an × that brings the guide card back", async () => {
      fiveSaved();
      const { view, right } = await wideView();
      await fireEvent.press(viewAll(view));

      expect(right.getByText("Saved Places")).toHaveStyle({ fontSize: 26, lineHeight: 31, fontWeight: "700" });
      expect(right.getByText("5")).toHaveStyle({ fontSize: 15, fontWeight: "600", color: tokens.colors.textMuted });
      expect(right.getByRole("button", { name: "Close" })).toHaveStyle({ width: 44, height: 44 });

      await fireEvent.press(right.getByRole("button", { name: "Close" }));

      expect(right.getByText("Open Guide")).toBeTruthy();
      expect(right.queryByText("Saved Places")).toBeNull();
      expect(viewAll(view)).not.toHaveStyle({ backgroundColor: tokens.colors.selFill });
    });

    it("wide: Saved Places is one column with 190 photos upright, two columns with 130 photos sideways, with its category strip and swipe to remove", async () => {
      fiveSaved();
      const upright = await wideView();
      await fireEvent.press(viewAll(upright.view));

      expect(upright.right.getByTestId("saved-list").props.numColumns).toBe(1);
      expect(upright.right.getAllByTestId("list-photo")[0]).toHaveStyle({ height: 190 });
      expect(upright.right.getAllByRole("tab").length).toBeGreaterThan(1);
      await fireEvent.press(upright.right.getAllByText("Remove")[0]);
      expect(mockSavedSites.toggleSavedSite).toHaveBeenCalledWith({ siteId: "s1", isSaving: false });
      await upright.view.unmount();

      const sideways = await wideView(SIDEWAYS);
      await fireEvent.press(viewAll(sideways.view));

      expect(sideways.right.getByTestId("saved-list").props.numColumns).toBe(2);
      expect(sideways.right.getAllByTestId("list-photo")[0]).toHaveStyle({ height: 130 });
    });

    it("wide: Saved Places with nothing saved shows its empty state in the pane", async () => {
      fiveSaved();
      const { view, right } = await wideView();
      await fireEvent.press(viewAll(view));

      mockSavedSites.savedSiteIds = new Set();
      await view.rerender(<AccountScreen />);

      expect(right.getByText("No saved places yet")).toBeTruthy();
      expect(right.getByText("Tap the heart on any place to save it here.")).toBeTruthy();
      expect(right.queryByText("5")).toBeNull();
    });

    it("wide: tapping a saved place opens the place screen", async () => {
      fiveSaved();
      const { view, right } = await wideView();
      await fireEvent.press(viewAll(view));

      await fireEvent.press(right.getByText("Riverside Market"));

      expect(mockRouter.push).toHaveBeenCalledWith("/(app)/(tabs)/sites/s3");
    });

    it("wide guest: Photo credits opens the pane over the sign-in card, and × brings the card back; there is no Saved Places row", async () => {
      mockSession.status = "guest";
      mockSession.uid = undefined;
      const { view, right } = await wideView();
      expect(view.queryByRole("button", { name: "View All Saved Places" })).toBeNull();

      await fireEvent.press(view.getByRole("button", { name: "Photo credits" }));

      expect(right.getByText("Photo Credits")).toBeTruthy();
      expect(right.queryByText("Sign In for More")).toBeNull();

      await fireEvent.press(right.getByRole("button", { name: "Close" }));

      expect(right.getByText("Sign In for More")).toBeTruthy();
    });

    it("wide: a guest is never shown Saved Places, even if it was open when they signed out", async () => {
      fiveSaved();
      const { view } = await wideView();
      await fireEvent.press(viewAll(view));

      mockSession.status = "guest";
      mockSession.uid = undefined;
      await view.rerender(<AccountScreen />);

      expect(view.queryByText("Riverside Market")).toBeNull();
      expect(within(view.getByTestId("profile-right")).getByText("Sign In for More")).toBeTruthy();
    });

    it("keeps state across the breakpoint: an open pane folds to the plain Profile with nothing navigated", async () => {
      fiveSaved();
      const { view } = await wideView();
      await fireEvent.press(viewAll(view));
      expect(within(view.getByTestId("profile-right")).getByText("Riverside Market")).toBeTruthy();

      require("@blacksands/ui").__setWide(false);
      await view.rerender(<AccountScreen />);

      expect(view.queryByTestId("profile-right")).toBeNull();
      expect(view.queryByTestId("saved-list")).toBeNull();
      expect(view.getByText("Open Guide")).toBeTruthy();
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it("phone: both rows navigate to their screens as now", async () => {
      fiveSaved();
      const view = await render(<AccountScreen />);

      await fireEvent.press(viewAll(view));
      expect(mockRouter.push).toHaveBeenLastCalledWith("/(app)/saved-sites");
      await fireEvent.press(view.getByRole("button", { name: "Photo credits" }));
      expect(mockRouter.push).toHaveBeenLastCalledWith("/(app)/photo-credits");
      expect(view.queryByTestId("profile-right")).toBeNull();
    });
  });
});
