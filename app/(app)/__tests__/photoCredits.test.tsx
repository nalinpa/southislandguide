// Photo credits, from the Account tab. The image libraries' licences require the
// photographer to be named; the place page names them over its photo, and this page names
// them for every photo, including where a credit won't fit (list rows, map cards, the
// featured card, the trip view's town squares).

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockBag = { locations: [] as any[], loading: false, err: null as string | null };
jest.mock("@/lib/hooksBag", () => ({
  hooksBag: {
    useLocations: () => ({ locations: mockBag.locations, loading: mockBag.loading, err: mockBag.err }),
  },
}));

// The town photos ship with the app; here, one with a credit.
jest.mock("@/lib/areaPhotos", () => ({
  AREA_PHOTOS: {},
  AREA_PHOTO_CREDITS: { "te-anau": "Great South" },
}));

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
  // TopBar's LightStatusBar needs this; the page is always focused here.
  useFocusEffect: (effect: () => void) => require("react").useEffect(effect, []),
}));

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import PhotoCreditsPage from "@/app/(app)/photo-credits";

const place = (id: string, name: string, over: Record<string, unknown> = {}) => ({
  id,
  name,
  description: "",
  category: ["Scenic"],
  active: true,
  area: "queenstown",
  lat: -45.03,
  lng: 168.66,
  imageUrl: `https://example.test/${id}.webp`,
  imageCredit: "Miles Holden",
  ...over,
});

const lines = (view: any): string[] => view.getAllByTestId("credit-row").map((r: any) => r.props.accessibilityLabel);

beforeEach(() => {
  jest.clearAllMocks();
  mockBag.locations = [];
  mockBag.loading = false;
  mockBag.err = null;
});

it("names the photographer of each place's photo, by place name, with its town", async () => {
  mockBag.locations = [
    place("skyline", "Skyline Queenstown"),
    place("bluff", "Stirling Point", { area: "invercargill", imageCredit: "Susan Miller Photography" }),
  ];
  const view = await render(<PhotoCreditsPage />);

  expect(lines(view)).toEqual([
    "Skyline Queenstown, Queenstown: photo by Miles Holden",
    "Stirling Point, Invercargill: photo by Susan Miller Photography",
    "Te Anau, town photo: photo by Great South",
  ]);
  expect(view.getByText("Photo: Susan Miller Photography")).toBeTruthy();
});

it("leaves out places with no credit, and a credit with no photo of the place's own", async () => {
  mockBag.locations = [
    place("a", "Arrowtown Walk", { imageCredit: undefined }),
    place("b", "Bob's Peak", { imageCredit: "   " }),
    place("c", "Coronet Peak", { imageUrl: null, imageThumbnailUrl: null }),
    place("d", "Deer Park Heights"),
  ];
  const view = await render(<PhotoCreditsPage />);

  expect(lines(view)).toEqual([
    "Deer Park Heights, Queenstown: photo by Miles Holden",
    "Te Anau, town photo: photo by Great South",
  ]);
});

it("goes back from its back button", async () => {
  const view = await render(<PhotoCreditsPage />);

  await fireEvent.press(view.getByLabelText("Back"));

  expect(mockRouter.back).toHaveBeenCalled();
});

it("waits for the places", async () => {
  mockBag.loading = true;
  const view = await render(<PhotoCreditsPage />);

  expect(view.getByText("Loading photo credits...")).toBeTruthy();
});
