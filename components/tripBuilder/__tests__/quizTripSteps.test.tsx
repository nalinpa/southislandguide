// The quiz's last screens (stages 5 and 6 of docs/plans/app-trip-builder.md): the waiting screen and the trip
// cards, where a tap picks the trip the screen then saves. The words and each card's contents are the website's (the page half of
// kiwiguide-site public/plan/quiz.js: waitScreen, and its `choice` screen with routeLine and endLabel); the
// photos are picked by the copied tripPhotos. The trips here are made up, so nothing is built.

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));
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

import React from "react";
import { AccessibilityInfo } from "react-native";
import { fireEvent, render, within } from "@testing-library/react-native";

import data from "@/assets/data/builder-data.json";
import { ChoiceStep, WaitStep, tripCardPhotos } from "@/components/tripBuilder/QuizSteps";
import { areaName } from "@/lib/areas";
import { blankQuiz, type QuizState } from "@/lib/tripBuilder/quizFlow";
import type { QuizStop, QuizTrip } from "@/lib/tripBuilder/quizTrips";
import { tokens } from "@/lib/ui/tokens";

const stop = (siteId: string, over: Partial<QuizStop> = {}): QuizStop => ({
  siteId,
  siteName: siteId,
  slotIndex: 2,
  durationSlots: 2,
  timeLabel: "9:00 AM",
  durationLabel: "1 hour",
  thumb: `https://img/${siteId}.webp`,
  fallback: null,
  category: ["Scenic"],
  activities: [],
  ...over,
});
const day = (town: string, ...items: QuizStop[]): QuizTrip["days"][number] => ({ town, block: town, items });

// Four days from Queenstown and back: one of the app's suggested trips, and one built for the answers.
const CHECKED: QuizTrip = {
  kind: "suggested",
  key: "queenstown-and-wanaka-in-four-days",
  label: "Queenstown and Wānaka in Four Days",
  start: "queenstown",
  end: "queenstown",
  days: [day("queenstown", stop("a")), day("wanaka", stop("b")), day("wanaka", stop("c")), day("queenstown", stop("d"))],
  missing: [],
};
const BUILT: QuizTrip = {
  kind: "built",
  key: "built-queenstown-4-loop",
  label: "South Island in 4 Days",
  start: "queenstown",
  end: "queenstown",
  days: [day("queenstown", stop("a")), day("te-anau", stop("b"), stop("e")), day("milford-sound", stop("f")), day("queenstown", stop("g"))],
  missing: [],
};
const LOOP: QuizState = { ...blankQuiz(), start: "queenstown", end: "queenstown", band: "weekend", days: 4 };

const onAnswer = jest.fn();
const onAgain = jest.fn();
const cards = (over: Partial<QuizState> = {}, trips: QuizTrip[] = [CHECKED, BUILT], saving: string | null = null) =>
  render(<ChoiceStep state={{ ...LOOP, ...over }} trips={trips} onAnswer={onAnswer} saving={saving} onAgain={onAgain} />);
// The card a trip's name is on.
const cardOf = (view: any, label: string) => {
  for (let n = view.getByText(label); n; n = n.parent) if (n.props?.testID === "trip-card") return n;
  throw new Error("not on a trip card");
};
const focus = AccessibilityInfo.sendAccessibilityEvent as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("while the trips are built", () => {
  it("says the website's waiting words, and sends a screen reader to them", async () => {
    const view = await render(<WaitStep />);

    expect(view.getByText("One moment")).toBeTruthy();
    expect(view.getByRole("header").props.children).toBe("Picking the places that fit you…");
    expect(focus.mock.calls[0][0].props.children).toBe("Picking the places that fit you…");
  });

  // The website's waitScreen for a load that failed; its Try again would build the same answers the same way.
  it("says the website's words when building them failed, with Start again", async () => {
    const onAgain = jest.fn();
    const view = await render(<WaitStep failed onAgain={onAgain} />);

    expect(view.getByRole("header").props.children).toBe("Something went wrong");
    expect(view.getByText("The trips would not load.")).toBeTruthy();
    expect(view.queryByText("One moment")).toBeNull();
    expect(focus.mock.calls[0][0].props.children).toBe("Something went wrong");

    await fireEvent.press(view.getByText("Start again"));
    expect(onAgain).toHaveBeenCalledTimes(1);
  });
});

describe("Which one sounds like you?", () => {
  it("says how many trips fit, from where and for how long, over the website's question", async () => {
    const view = await cards();

    expect(view.getByText("2 trips fit Queenstown and back · 4 days")).toBeTruthy();
    expect(view.getByRole("header").props.children).toBe("Which one sounds like you?");
  });

  it("names both ends of a trip that finishes somewhere else", async () => {
    const view = await cards({ start: "christchurch", end: "queenstown", days: 10 }, [CHECKED, BUILT, { ...BUILT, key: "third" }]);

    expect(view.getByText("3 trips fit Christchurch to Queenstown · 10 days")).toBeTruthy();
  });

  it("has a card for each trip, in the builder's order: the hand-checked ones first", async () => {
    const view = await cards();

    expect(view.getAllByTestId("trip-card").map((c: any) => within(c).getByText(/Days$/).props.children)).toEqual([
      "Queenstown and Wānaka in Four Days",
      "South Island in 4 Days",
    ]);
  });

  it("says on each card whether it was built for them or is a hand-checked trip", async () => {
    const view = await cards();

    expect(within(cardOf(view, CHECKED.label)).getByText("Hand-checked trip")).toBeTruthy();
    expect(within(cardOf(view, BUILT.label)).getByText("Built for you")).toBeTruthy();
    // The hand-checked one stands out in the app's amber, as in the website's yellow; the other is a quiet grey.
    expect(view.getByText("Hand-checked trip")).toHaveStyle({ backgroundColor: tokens.colors.highlightOnDark });
    expect(view.getByText("Built for you")).toHaveStyle({ backgroundColor: tokens.colors.line });
  });

  // The website's routeLine: the start town, then the town each day ends in, a town said once while the trip stays in it.
  it("lists the towns each trip goes through, a town named once while the trip stays in it", async () => {
    const view = await cards();

    expect(within(cardOf(view, CHECKED.label)).getByText("Queenstown, Wānaka, Queenstown")).toBeTruthy();
    expect(within(cardOf(view, BUILT.label)).getByText("Queenstown, Te Anau, Milford Sound, Queenstown")).toBeTruthy();
  });

  it("cuts a long list of towns off at a whole town, with an ellipsis", async () => {
    const towns = ["queenstown", "wanaka", "haast", "fox-glacier", "franz-josef", "hokitika", "greymouth", "punakaiki", "westport", "murchison", "nelson", "picton", "kaikoura", "christchurch"];
    const view = await cards({ end: "christchurch", days: 14 }, [CHECKED, { ...BUILT, end: "christchurch", days: towns.map((t) => day(t, stop(t))) }]);

    expect(
      within(cardOf(view, BUILT.label)).getByText("Queenstown, Wānaka, Haast, Fox Glacier, Franz Josef, Hokitika, Greymouth, Punakaiki, Westport, Murchison…"),
    ).toBeTruthy();
  });

  it("says how long each trip is and how it ends", async () => {
    const view = await cards({}, [CHECKED, { ...BUILT, end: "christchurch", days: BUILT.days.slice(0, 3) }]);

    expect(within(cardOf(view, CHECKED.label)).getByText("4 days · Loop · back in Queenstown")).toBeTruthy();
    expect(within(cardOf(view, BUILT.label)).getByText("3 days · Ends in Christchurch")).toBeTruthy();
  });

  // The copied tripPhotos: a place from day 2 on that isn't somewhere to eat or stay, and not one an earlier card has.
  it("puts a photo of one of its own places on each card, never the same one twice", async () => {
    const view = await cards();
    const photo = (label: string) => within(cardOf(view, label)).getByTestId("trip-photo").props.source;

    expect(photo(CHECKED.label)).toEqual({ uri: "https://img/b.webp" });
    expect(photo(BUILT.label)).toEqual({ uri: "https://img/e.webp" });
  });

  // A place with no photo of its own has its kind's stand-in, which is one of the website's own files.
  it("loads a kind's stand-in photo from the website, and leaves a card with no photo at all without one", async () => {
    const standIn = { ...BUILT, key: "stand-in", label: "Stand-in in 1 Days", days: [day("queenstown", stop("x", { thumb: null, fallback: "categories/Food" }))] };
    const bare = { ...BUILT, key: "bare", label: "Bare in 1 Days", days: [day("queenstown", stop("y", { thumb: null }))] };
    const view = await cards({}, [standIn, bare]);

    expect(tripCardPhotos([standIn, bare])).toEqual(["https://kiwiguide.app/img/places/categories/Food.webp", ""]);
    expect(within(cardOf(view, standIn.label)).getByTestId("trip-photo").props.source).toEqual({
      uri: "https://kiwiguide.app/img/places/categories/Food.webp",
    });
    expect(within(cardOf(view, bare.label)).queryByTestId("trip-photo")).toBeNull();
    expect(within(cardOf(view, bare.label)).getByText("Built for you")).toBeTruthy();
  });

  it("hands back the trip that was tapped", async () => {
    const view = await cards();

    await fireEvent.press(view.getByText(BUILT.label));

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith({ step: "choice", value: "built-queenstown-4-loop" });
  });

  // A tap saves the trip (the screen's): while it does, that card says so and nothing more can be picked.
  it("shows the card being saved as busy, and holds every card till it is done", async () => {
    const view = await cards({}, [CHECKED, BUILT], BUILT.key);

    expect(within(cardOf(view, BUILT.label)).getByTestId("trip-saving")).toBeTruthy();
    expect(within(cardOf(view, CHECKED.label)).queryByTestId("trip-saving")).toBeNull();
    expect(cardOf(view, BUILT.label).props.accessibilityState).toEqual({ selected: false, busy: true, disabled: true });
    expect(cardOf(view, CHECKED.label).props.accessibilityState).toEqual({ selected: false, disabled: true });
    await fireEvent.press(view.getByText(BUILT.label));
    await fireEvent.press(view.getByText(CHECKED.label));
    expect(onAnswer).not.toHaveBeenCalled();
    // and Start again waits too
    expect(view.getByText("Start again")).toBeTruthy();
    await fireEvent.press(view.getByText("Start again"));
    expect(onAgain).not.toHaveBeenCalled();
  });

  // Under the cards, quiet: the quiz's way back to its first question once the trips are in.
  it("has Start again at its foot", async () => {
    const view = await cards();

    await fireEvent.press(view.getByText("Start again"));

    expect(onAgain).toHaveBeenCalledTimes(1);
  });

  // One sentence, with commas where the card has its dots (as a day's row in the trip view is read out).
  it("reads each card to a screen reader as one button, saying everything on it", async () => {
    const view = await cards();

    // a card each, and Start again
    expect(view.getAllByRole("button")).toHaveLength(3);
    expect(
      view.getByLabelText("Built for you. South Island in 4 Days. Queenstown, Te Anau, Milford Sound, Queenstown. 4 days, Loop, back in Queenstown"),
    ).toBeTruthy();
  });

  // Back from the trip: the one looked at is marked, as an answer given before is on every other question.
  it("marks the trip picked before, and no other", async () => {
    const view = await cards({ pick: BUILT.key });

    expect(cardOf(view, BUILT.label).props.accessibilityState).toEqual({ selected: true });
    expect(cardOf(view, BUILT.label)).toHaveStyle({ borderColor: tokens.colors.selected });
    expect(cardOf(view, CHECKED.label).props.accessibilityState).toEqual({ selected: false });
    expect(cardOf(view, CHECKED.label)).toHaveStyle({ borderColor: tokens.colors.line });
  });
});

// The cards name a trip's towns with the app's own names for them, which the trip view under them uses too. The
// website reads the names from the builder's data: the two must say the same.
it("names every town as the builder's data does", () => {
  for (const [id, town] of Object.entries(data.towns)) expect(areaName(id)).toBe(town.name);
});
