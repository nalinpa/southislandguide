// The picked trip (stage 5 of docs/plans/app-trip-builder.md): the app's own trip view, read-only, under the
// website's words for it (the page half of kiwiguide-site public/plan/quiz.js, its `reveal` screen). The day
// rows and the open day are the real ones (TripOverview and GuestDayView); a stop is a stand-in that says
// what it was handed. Nothing is saved from here yet (stage 6).

jest.mock("@/lib/uiKit", () => {
  const base = require("@/test/uiKitMock");
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  return {
    ...base,
    components: {
      ...base.components,
      TimelineBlock: ({ item, holdToDrag, readOnly, icon, onEdit, onDrop }: any) =>
        React.createElement(
          TouchableOpacity,
          { testID: "stop-" + item.siteId, onPress: () => onEdit(item), accessibilityHint: String(holdToDrag), accessibilityLabel: String(readOnly), accessibilityValue: { text: String(onDrop(item.id, 99)) } },
          React.createElement(Text, null, "Stop: " + item.siteName),
          React.createElement(View, { testID: "icon-" + item.siteId, icon }),
        ),
      TransitBlock: () => null,
    },
  };
});
jest.mock("@/components/itinerary/DriveBlock", () => ({ DriveBlock: () => null }));
jest.mock("expo-image", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Image = (props: any) => React.createElement(View, props);
  Image.prefetch = () => Promise.resolve(true);
  return { Image };
});
jest.mock("expo-linear-gradient", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { LinearGradient: (p: any) => React.createElement(View, p) };
});
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
const mockRouter = { push: jest.fn() };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
}));
// The app's places: the live list, as the trip view reads it everywhere.
let mockLookup: any;
jest.mock("@/lib/hooks/usePlaceLookup", () => ({ usePlaceLookup: () => mockLookup }));

import React from "react";
import { AccessibilityInfo } from "react-native";
import { fireEvent, render, within } from "@testing-library/react-native";

import data from "@/assets/data/builder-data.json";
import { CATEGORY_CONFIG } from "@/components/map/SiteMarker";
import { TripReveal } from "@/components/tripBuilder/TripReveal";
import { blankQuiz, type QuizState } from "@/lib/tripBuilder/quizFlow";
import type { QuizStop, QuizTrip } from "@/lib/tripBuilder/quizTrips";
import { tokens } from "@/lib/ui/tokens";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const site = require("@/lib/tripBuilder/quizLogic");

const TODAY = new Date(2026, 10, 27);
// Every question answered: three days from Queenstown and back in January, hot pools and wine asked for.
const DONE: QuizState = {
  ...blankQuiz(),
  start: "queenstown",
  end: "queenstown",
  band: "weekend",
  days: 3,
  season: "summer",
  month: { month: 0, year: 2027 },
  pace: "some",
  drive: 240,
  who: "couple",
  age: "30-44",
  vibes: ["nature"],
  into: ["Scenic"],
  food: true,
  activities: ["hot-pools", "wine"],
  pick: "built-queenstown-3-loop",
};

// A stop at one of the builder's real places, with what the quiz adds to it (quizTrips).
const places: Record<string, any> = data.places;
const stop = (siteId: string, slotIndex: number): QuizStop => ({
  siteId,
  siteName: places[siteId].name,
  slotIndex,
  durationSlots: 2,
  timeLabel: "",
  durationLabel: "",
  thumb: places[siteId].thumb,
  fallback: places[siteId].fallback,
  category: places[siteId].category,
  activities: places[siteId].activities,
});
// Queenstown, then Wānaka, then a long drive to Tekapo. No wine on the way.
const TRIP: QuizTrip = {
  kind: "built",
  key: "built-queenstown-3-loop",
  label: "South Island in 3 Days",
  start: "queenstown",
  end: "queenstown",
  days: [
    { town: "queenstown", block: "a", driveMinutes: 20, items: [stop("deer-park-heights", 2), stop("onsen-hot-pools", 6)] },
    { town: "wanaka", block: "b", driveMinutes: 70, items: [stop("mount-iron-track", 4), stop("big-fig-wanaka", 8)] },
    { town: "tekapo", block: "c", driveMinutes: 270, overLimit: true, items: [stop("tekapo-springs", 12)] },
  ],
  missing: ["wine"],
};
const IDS = TRIP.days.flatMap((d) => d.items.map((i) => i.siteId));
// The app's list with the places named in it, as the api gives them.
const lookupOf = (ids: string[]) => {
  const list = ids.map((id) => ({ id, name: places[id].name, area: places[id].area, lat: places[id].lat, lng: places[id].lng, category: places[id].category }));
  const byId = new Map(list.map((p) => [p.id, p]));
  return { places: (id: string) => byId.get(id), list, ready: list.length > 0, count: list.length, err: "", refresh: jest.fn() };
};

const onDay = jest.fn();
const onAgain = jest.fn();
const show = (over: Partial<React.ComponentProps<typeof TripReveal>> = {}) =>
  render(<TripReveal state={DONE} trip={TRIP} today={TODAY} day={null} onDay={onDay} onAgain={onAgain} {...over} />);
const stops = (view: any) => view.queryAllByTestId(/^stop-/).map((n: any) => n.props.testID.slice(5));
// The row of a day, by its number.
const row = (view: any, n: number) => within(view.getByTestId(`day-row-day_${n}`));
const LONG_DRIVE = "Long drive. About 4 h 30 of driving. Over your 4 h limit.";

beforeEach(() => {
  jest.clearAllMocks();
  mockLookup = lookupOf(IDS);
});

describe("over the trip", () => {
  it("names the trip under Your trip, and sends a screen reader to its name", async () => {
    const view = await show();

    expect(view.getByText("Your trip")).toBeTruthy();
    expect(view.getByRole("header").props.children).toBe("South Island in 3 Days");
    const focus = AccessibilityInfo.sendAccessibilityEvent as jest.Mock;
    expect(focus.mock.calls[0][0].props.children).toBe("South Island in 3 Days");
  });

  it("says where it goes from and to, how long it is and when", async () => {
    const view = await show();

    expect(view.getByText("From Queenstown and back")).toBeTruthy();
    expect(view.getByText("3 days · January 2027.")).toBeTruthy();
  });

  it("names both ends of a trip that finishes somewhere else", async () => {
    const view = await show({ state: { ...DONE, end: "christchurch" }, trip: { ...TRIP, end: "christchurch" } });

    expect(view.getByText("From Queenstown to Christchurch")).toBeTruthy();
  });

  it("names the season alone when no month was picked, and no time at all when the season isn't known", async () => {
    const season = await show({ state: { ...DONE, month: null } });
    expect(season.getByText("3 days · Summer.")).toBeTruthy();

    const unsure = await show({ state: { ...DONE, season: "unsure", month: null } });
    expect(unsure.getByText("3 days.")).toBeTruthy();
  });

  it("says what the trip was built for, in the website's words", async () => {
    const view = await show();

    expect(site.summaryLine(TRIP, DONE)).toBe("Built for you: some walking, up to 4 hours of driving a day, nature, food tips, hot pools, wine.");
    expect(view.getByText(site.summaryLine(TRIP, DONE))).toBeTruthy();
  });

  it("says a hand-checked trip is one", async () => {
    const view = await show({ trip: { ...TRIP, kind: "suggested" } });

    expect(view.getByText(/^Hand-checked trip: some walking, /)).toBeTruthy();
  });

  it("says which activities asked for aren't on this route", async () => {
    const view = await show();
    expect(view.getByText("Nothing for wine on this route.")).toBeTruthy();

    const two = await show({ trip: { ...TRIP, missing: ["kayaking", "hot-pools", "wine"] } });
    expect(two.getByText("Nothing for kayaking, hot pools or wine on this route.")).toBeTruthy();
  });

  it("says nothing of that when every activity is on it", async () => {
    const view = await show({ trip: { ...TRIP, missing: [] } });

    expect(view.queryByText(/^Nothing for/)).toBeNull();
  });
});

describe("the trip, in the app's own trip view", () => {
  it("has a row for each day, dated from the first day of the month picked", async () => {
    const view = await show();

    expect(view.getByText("Day 1 · Fri 1 Jan")).toBeTruthy();
    expect(view.getByText("Day 2 · Sat 2 Jan")).toBeTruthy();
    expect(view.getByText("Day 3 · Sun 3 Jan")).toBeTruthy();
  });

  it("says each day's town and how many places it has, worked out from its stops as for any trip", async () => {
    const view = await show();

    expect(row(view, 1).getByText("Queenstown")).toBeTruthy();
    expect(row(view, 1).getByText(/^2 places/)).toBeTruthy();
    expect(row(view, 2).getByText("Wānaka")).toBeTruthy();
    expect(row(view, 3).getByText("Tekapo")).toBeTruthy();
    expect(row(view, 3).getByText(/^1 place\b/)).toBeTruthy();
  });

  // The quiz's own heading says the name and when: the list's own name and dates row would say them twice.
  it("leaves the list's own name and dates row out", async () => {
    const view = await show();

    expect(view.getAllByText("South Island in 3 Days")).toHaveLength(1);
    expect(view.queryByText(/1 Jan . 3 Jan/)).toBeNull();
  });

  // A guest's suggested trip on the Trips tab is locked. This one is theirs to look at, signed in or not.
  it("shows the whole trip to anyone: no row is locked", async () => {
    const view = await show();

    expect(view.queryAllByLabelText(/locked/)).toHaveLength(0);
    expect(view.getByLabelText(/^Day 1, Friday 1 January, Queenstown, 2 places/)).toBeTruthy();
  });

  it("opens the day whose row is tapped", async () => {
    const view = await show();

    await fireEvent.press(view.getByText("Day 2 · Sat 2 Jan"));

    expect(onDay).toHaveBeenCalledWith(1);
  });

  // The builder's own count for the day, against the limit picked: the trip view doesn't know what was asked for.
  it("marks a day with more driving than was asked for, and only that day", async () => {
    const view = await show();

    expect(view.getAllByText(LONG_DRIVE)).toHaveLength(1);
    expect(row(view, 3).getByText(LONG_DRIVE)).toBeTruthy();
  });
});

describe("an open day", () => {
  it("shows that day's stops in their order, under its number and town", async () => {
    const view = await show({ day: 0 });

    expect(within(view.getByTestId("day-heading")).getByText("Day 1")).toBeTruthy();
    expect(within(view.getByTestId("day-heading")).getByText("Queenstown")).toBeTruthy();
    expect(stops(view)).toEqual(["deer-park-heights", "onsen-hot-pools"]);
    expect(view.getByText("Stop: Onsen Hot Pools")).toBeTruthy();
    // the rows are gone while a day is open (the top row's Back brings them back)
    expect(view.queryByText("Day 2 · Sat 2 Jan")).toBeNull();
  });

  it("draws each stop with its kind's icon, as its map pin has", async () => {
    const view = await show({ day: 0 });

    expect(view.getByTestId("icon-deer-park-heights").props.icon).toBe(CATEGORY_CONFIG.Scenic.Icon);
    expect(view.getByTestId("icon-onsen-hot-pools").props.icon).toBe(CATEGORY_CONFIG.Water.Icon);
  });

  it("says a long drive under the day's heading", async () => {
    const long = await show({ day: 2 });
    expect(within(long.getByTestId("day-heading")).getByText(LONG_DRIVE)).toBeTruthy();

    const short = await show({ day: 0 });
    expect(short.queryByText(LONG_DRIVE)).toBeNull();
  });

  // Nothing to move, add or delete, and a tap doesn't leave the quiz for the place.
  it("is read-only: a stop can't be picked up, a drop settles where it was, and a tap goes nowhere", async () => {
    const view = await show({ day: 0 });
    const first = view.getByTestId("stop-deer-park-heights");

    expect(first.props.accessibilityLabel).toBe("true"); // readOnly
    expect(first.props.accessibilityHint).toBe("undefined"); // no hold to drag
    expect(first.props.accessibilityValue.text).toBe("2"); // a drop: back to its own slot
    await fireEvent.press(first);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});

describe("a place the app doesn't have", () => {
  // Switched off since the builder's data was made: it isn't in the app's list.
  beforeEach(() => {
    mockLookup = lookupOf(IDS.filter((id) => id !== "big-fig-wanaka" && id !== "onsen-hot-pools"));
  });

  it("is left off its day, and the rest of the trip stays", async () => {
    const view = await show();

    expect(row(view, 1).getByText(/^1 place\b/)).toBeTruthy();
    expect(row(view, 2).getByText(/^1 place\b/)).toBeTruthy();
    expect(row(view, 3).getByText("Tekapo")).toBeTruthy();

    const open = await show({ day: 1 });
    expect(stops(open)).toEqual(["mount-iron-track"]);
  });

  it("isn't named among the places for an activity either", async () => {
    const view = await show();

    expect(view.getByText("Hot pools: Tekapo Springs (Day 3)")).toBeTruthy();
    expect(view.queryByText(/Onsen/)).toBeNull();
  });
});

// A first run with no signal: the app's list is empty, and nothing can be said to be missing from it.
describe("before the app's places are in", () => {
  beforeEach(() => {
    mockLookup = lookupOf([]);
  });

  it("keeps every stop, and places each by the builder's own record of it", async () => {
    const view = await show();

    expect(row(view, 1).getByText("Queenstown")).toBeTruthy();
    expect(row(view, 1).getByText(/^2 places/)).toBeTruthy();
    expect(row(view, 2).getByText("Wānaka")).toBeTruthy();
    expect(row(view, 3).getByText("Tekapo")).toBeTruthy();

    const open = await show({ day: 1 });
    expect(stops(open)).toEqual(["mount-iron-track", "big-fig-wanaka"]);
  });
});

describe("under the trip", () => {
  it("says where each activity asked for is: its places and their days", async () => {
    const view = await show();

    expect(view.getByText("Hot pools: Onsen Hot Pools (Day 1), Tekapo Springs (Day 3)")).toBeTruthy();
    // wine isn't on the route: the line over the trip says so, and there is none here
    expect(view.queryByText(/^Wine:/)).toBeNull();
  });

  it("says the season's line, and none when the season isn't known", async () => {
    const view = await show();
    expect(view.getByText("Summer: book the popular stays and cruises early. It’s the busiest time of year.")).toBeTruthy();

    const unsure = await show({ state: { ...DONE, season: "unsure", month: null } });
    expect(unsure.queryByText(/^Summer:/)).toBeNull();
  });

  it("starts the quiz again from Start again", async () => {
    const view = await show();

    await fireEvent.press(view.getByText("Start again"));

    expect(onAgain).toHaveBeenCalledTimes(1);
  });

  // Stage 6 brings Save and the sign-in it needs. Until then the trip is only looked at.
  it("has nothing to save with or sign in to yet", async () => {
    const view = await show();

    expect(view.queryByText(/save/i)).toBeNull();
    expect(view.queryByText(/sign in/i)).toBeNull();
    expect(view.getAllByRole("button").map((b: any) => b.props.accessibilityLabel ?? "Start again")).toEqual([
      expect.stringMatching(/^Day 1, /),
      expect.stringMatching(/^Day 2, /),
      expect.stringMatching(/^Day 3, /),
      "Start again",
    ]);
  });

  it("puts the trip between the words about it and the notes, as the website does", async () => {
    const view = await show();
    const text = JSON.stringify(view.toJSON());
    const at = (words: string) => text.indexOf(words);

    expect(at("Your trip")).toBeLessThan(at("From Queenstown and back"));
    expect(at("From Queenstown and back")).toBeLessThan(at("Built for you: "));
    expect(at("Built for you: ")).toBeLessThan(at("Nothing for wine"));
    expect(at("Nothing for wine")).toBeLessThan(at("Fri 1 Jan"));
    expect(at("Sun 3 Jan")).toBeLessThan(at("Hot pools: "));
    expect(at("Hot pools: ")).toBeLessThan(at("Summer: book"));
    expect(at("Summer: book")).toBeLessThan(at("Start again"));
  });
});

it("draws the picked trip in the page's colours: the warning's for a long drive, a pale amber behind an activity's line", async () => {
  const view = await show();

  expect(view.getByText(LONG_DRIVE)).toHaveStyle({ color: tokens.colors.warning });
  expect(view.getByText(/^Hot pools: /)).toHaveStyle({ backgroundColor: tokens.colors.warningDim, color: tokens.colors.text });
});
