// The quiz's second half as the app draws it: how active, how much driving, who, how old, the vibe, the second
// photo break, the swipe cards and food. As with the first half (quizSteps.test.tsx), each shows the website's
// own lists and words (the copied quizLogic.js; the wording is the page half of kiwiguide-site
// public/plan/quiz.js) and hands back the pick in quizFlow's shape.

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));
// A photo is a plain view here; fetching one ahead is a spy.
const mockPrefetch = jest.fn((_urls: string[]) => Promise.resolve(true));
jest.mock("expo-image", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Image = (props: any) => React.createElement(View, props);
  Image.prefetch = (urls: string[]) => mockPrefetch(urls);
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
import { AccessibilityInfo, Animated } from "react-native";
import { act, fireEvent, render, within } from "@testing-library/react-native";

import data from "@/assets/data/builder-data.json";
import { AgeStep, Break2Step, DriveStep, FoodStep, IntoStep, PaceStep, VibeStep, WhoStep } from "@/components/tripBuilder/QuizSteps";
import { deckNudge } from "@/components/tripBuilder/SwipeDeck";
import { blankQuiz, type QuizState } from "@/lib/tripBuilder/quizFlow";
import { tokens } from "@/lib/ui/tokens";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const site = require("@/lib/tripBuilder/quizLogic");

const st = (over: Partial<QuizState> = {}): QuizState => ({ ...blankQuiz(), ...over });
// A week's loop from Queenstown, as far as the month.
const WEEK = st({ start: "queenstown", band: "week", days: 7, end: "queenstown", season: "summer", month: { month: 0, year: 2027 } });
// The button a line of text sits in.
const buttonOf = (node: any) => {
  for (let n = node; n; n = n.parent) if (n.props?.accessibilityRole === "button") return n;
  throw new Error("not in a button");
};
const picked = (view: any, label: string) => buttonOf(view.getByText(label)).props.accessibilityState;

const onAnswer = jest.fn();
// A swipe card's fly-off runs on the phone's animation thread. Here it lands at once and says it finished.
let timing: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  deckNudge.seen = false;
  timing = jest.spyOn(Animated, "timing").mockImplementation(((value: Animated.Value, config: { toValue: number }) => ({
    start: (done?: (result: { finished: boolean }) => void) => {
      value.setValue(config.toValue);
      done?.({ finished: true });
    },
    stop: jest.fn(),
  })) as never);
});
afterEach(() => timing.mockRestore());
// A card let go short of the point springs back; here that lands at once too.
let spring: jest.SpyInstance;
beforeEach(() => {
  spring = jest.spyOn(Animated, "spring").mockImplementation(((value: Animated.Value, config: { toValue: number }) => ({
    start: () => value.setValue(config.toValue),
    stop: jest.fn(),
  })) as never);
});
afterEach(() => spring.mockRestore());

describe("How active?", () => {
  it("shows the website's three paces, under what was said about when", async () => {
    const view = await render(<PaceStep state={WEEK} onAnswer={onAnswer} />);

    expect(view.getByText("Nice. Summer in January.")).toBeTruthy();
    expect(view.getByText("How active?")).toBeTruthy();
    expect(site.PACES).toHaveLength(3);
    for (const p of site.PACES) {
      expect(view.getByText(p.label)).toBeTruthy();
      expect(view.getByText(p.hint)).toBeTruthy();
    }
  });

  it("names the season alone when no month was picked, and says Noted when the season isn't known", async () => {
    const season = await render(<PaceStep state={{ ...WEEK, season: "winter", month: null }} onAnswer={onAnswer} />);
    expect(season.getByText("Nice. Winter.")).toBeTruthy();

    const unsure = await render(<PaceStep state={{ ...WEEK, season: "unsure", month: null }} onAnswer={onAnswer} />);
    expect(unsure.getByText("Noted.")).toBeTruthy();
  });

  it("reports the pace tapped, and marks the one picked before", async () => {
    const view = await render(<PaceStep state={{ ...WEEK, pace: "easy" }} onAnswer={onAnswer} />);

    expect(picked(view, "Easy")).toEqual({ selected: true });
    expect(picked(view, "Lots of walking")).toEqual({ selected: false });

    await fireEvent.press(view.getByText("Some walking"));
    expect(onAnswer).toHaveBeenCalledWith({ step: "pace", value: "some" });
  });
});

describe("How much driving?", () => {
  const paced = { ...WEEK, pace: "some" as const };

  it("shows the website's three limits, under the pace picked", async () => {
    const view = await render(<DriveStep state={paced} onAnswer={onAnswer} />);

    expect(view.getByText("Some walking")).toBeTruthy();
    expect(view.getByText("How much driving?")).toBeTruthy();
    expect(site.DRIVES).toHaveLength(3);
    for (const d of site.DRIVES) {
      expect(view.getByText(d.label)).toBeTruthy();
      expect(view.getByText(d.hint)).toBeTruthy();
    }
  });

  it("reports the limit tapped in minutes, and marks the one picked before", async () => {
    const view = await render(<DriveStep state={{ ...paced, drive: 360 }} onAnswer={onAnswer} />);

    expect(picked(view, "Happy to drive")).toEqual({ selected: true });
    expect(picked(view, "A little")).toEqual({ selected: false });

    await fireEvent.press(view.getByText("Some"));
    expect(onAnswer).toHaveBeenCalledWith({ step: "drive", value: 240 });
  });
});

describe("Who’s travelling?", () => {
  const driven = { ...WEEK, pace: "some" as const, drive: 240 as const };

  it("shows the website's four, under the driving picked", async () => {
    const view = await render(<WhoStep state={driven} onAnswer={onAnswer} />);

    expect(view.getByText("Up to 4 hours a day")).toBeTruthy();
    expect(view.getByText("Who’s travelling?")).toBeTruthy();
    expect(site.WHO).toHaveLength(4);
    for (const w of site.WHO) {
      expect(view.getByText(w.label)).toBeTruthy();
      expect(view.getByText(w.hint)).toBeTruthy();
    }
  });

  // Christchurch to Picton in two days: the driving isn't asked (it is Happy to drive), so the line over the
  // question is the pace, not a limit they never picked.
  it("has the pace over it when the driving wasn't asked, on a long way in few days", async () => {
    const far = st({ start: "christchurch", band: "weekend", days: 2, end: "picton", season: "unsure", pace: "easy", drive: 360 });
    expect(site.longDrive(far.start, far.end, far.days)).toBe(true);
    const view = await render(<WhoStep state={far} onAnswer={onAnswer} />);

    expect(view.getByText("Easy")).toBeTruthy();
    expect(view.queryByText("Up to 6 hours a day")).toBeNull();
  });

  it("reports who was tapped, and marks the one picked before", async () => {
    const view = await render(<WhoStep state={{ ...driven, who: "family" }} onAnswer={onAnswer} />);

    expect(picked(view, "Family")).toEqual({ selected: true });
    expect(picked(view, "Solo")).toEqual({ selected: false });

    await fireEvent.press(view.getByText("Couple"));
    expect(onAnswer).toHaveBeenCalledWith({ step: "who", value: "couple" });
  });
});

describe("How old are you?", () => {
  const withWho = { ...WEEK, pace: "some" as const, drive: 240 as const, who: "couple" };

  it("shows the website's four ages under who is travelling, and Skip", async () => {
    const view = await render(<AgeStep state={withWho} onAnswer={onAnswer} />);

    expect(view.getByText("Couple")).toBeTruthy();
    expect(view.getByText("How old are you?")).toBeTruthy();
    expect(site.AGES).toHaveLength(4);
    for (const a of site.AGES) expect(view.getByText(a.label)).toBeTruthy();
    expect(view.getByText("Skip")).toBeTruthy();
  });

  it("reports the age tapped, and marks the one picked before", async () => {
    const view = await render(<AgeStep state={{ ...withWho, age: "45-59" }} onAnswer={onAnswer} />);

    expect(picked(view, "45–59")).toEqual({ selected: true });
    expect(picked(view, "60+")).toEqual({ selected: false });

    await fireEvent.press(view.getByText("30–44"));
    expect(onAnswer).toHaveBeenCalledWith({ step: "age", value: "30-44" });
  });

  it("reports skip from Skip", async () => {
    const view = await render(<AgeStep state={withWho} onAnswer={onAnswer} />);

    await fireEvent.press(view.getByText("Skip"));

    expect(onAnswer).toHaveBeenCalledWith({ step: "age", value: "skip" });
  });
});

describe("What’s the vibe?", () => {
  const aged = { ...WEEK, pace: "some" as const, drive: 240 as const, who: "couple", age: "30-44" };

  it("shows the website's four vibes, each with a box to tick, and Skip while none is picked", async () => {
    const view = await render(<VibeStep state={aged} onAnswer={onAnswer} />);

    expect(view.getByText("What’s the vibe?")).toBeTruthy();
    expect(view.getByText("Pick as many as you like.")).toBeTruthy();
    expect(site.VIBES).toHaveLength(4);
    for (const v of site.VIBES) {
      expect(view.getByText(v.label)).toBeTruthy();
      expect(view.getByText(v.hint)).toBeTruthy();
      expect(picked(view, v.label)).toEqual({ selected: false });
      expect(within(buttonOf(view.getByText(v.label))).getByTestId("option-box")).toBeTruthy();
    }
    expect(view.getByText("Skip")).toBeTruthy();
    expect(view.queryByText("Next")).toBeNull();
  });

  it("ticks and unticks with a tap, which is not an answer, and offers Next once one is ticked", async () => {
    const view = await render(<VibeStep state={aged} onAnswer={onAnswer} />);

    await fireEvent.press(view.getByText("Nature"));
    expect(picked(view, "Nature")).toEqual({ selected: true });
    expect(buttonOf(view.getByText("Nature"))).toHaveStyle({ borderColor: tokens.colors.selected });
    expect(view.getByText("Next")).toBeTruthy();
    expect(view.queryByText("Skip")).toBeNull();

    await fireEvent.press(view.getByText("Nature"));
    expect(picked(view, "Nature")).toEqual({ selected: false });
    expect(view.getByText("Skip")).toBeTruthy();
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it("reports the vibes ticked on Next, in the website's order whatever order they were tapped in", async () => {
    const view = await render(<VibeStep state={aged} onAnswer={onAnswer} />);

    await fireEvent.press(view.getByText("Adventure"));
    await fireEvent.press(view.getByText("Relax"));
    await fireEvent.press(view.getByText("Next"));

    expect(onAnswer).toHaveBeenCalledWith({ step: "vibe", value: ["relax", "adventure"] });
  });

  it("reports none from Skip", async () => {
    const view = await render(<VibeStep state={aged} onAnswer={onAnswer} />);

    await fireEvent.press(view.getByText("Skip"));

    expect(onAnswer).toHaveBeenCalledWith({ step: "vibe", value: [] });
  });

  // The break after this question is a photo filling the screen, from the website. It is fetched as soon as it
  // is known which it will be, so the break opens on its photo and not on a dark screen.
  it("has the photo for the break fetched ahead: Lake Pukaki with none ticked, then the one for what is ticked", async () => {
    const view = await render(<VibeStep state={aged} onAnswer={onAnswer} />);
    expect(mockPrefetch).toHaveBeenLastCalledWith(["https://kiwiguide.app/img/photo-pukaki-1200.webp"]);

    await fireEvent.press(view.getByText("Relax"));
    expect(mockPrefetch).toHaveBeenLastCalledWith(["https://kiwiguide.app/img/photo-gore-bay-1200.webp"]);

    await fireEvent.press(view.getByText("Adventure"));
    expect(mockPrefetch).toHaveBeenLastCalledWith(["https://kiwiguide.app/img/photo-shotover-jet-1200.webp"]);
  });

  it("opens with the vibes ticked before", async () => {
    const view = await render(<VibeStep state={{ ...aged, vibes: ["sightseeing", "nature"] }} onAnswer={onAnswer} />);

    expect(picked(view, "Sightseeing")).toEqual({ selected: true });
    expect(picked(view, "Nature")).toEqual({ selected: true });
    expect(picked(view, "Relax")).toEqual({ selected: false });
    expect(view.getByText("Next")).toBeTruthy();
  });
});

describe("the second photo break", () => {
  const SITE = "https://kiwiguide.app";
  const vibed = (vibes: string[]) => ({ ...WEEK, pace: "some" as const, drive: 240 as const, who: "couple", age: "30-44", vibes });

  // The website's own four photos, the first whose vibe was ticked in its order (adventure, nature, relax,
  // sightseeing), else Lake Pukaki. All four are Creative Commons: the credit has to show.
  it.each([
    [["adventure", "relax"], "/img/photo-shotover-jet-1200.webp", "Photo: Shotover Jet, CC0, via Wikimedia Commons"],
    [["relax", "nature"], "/img/photo-diamond-lake-1200.webp", "Photo: Diamond Lake, public domain, via Wikimedia Commons"],
    [["relax"], "/img/photo-gore-bay-1200.webp", "Photo: Cathedral Cliffs, Gore Bay, Michal Klajban, CC BY-SA 4.0, resized"],
    [["sightseeing"], "/img/photo-pukaki-1200.webp", "Photo: Lake Pukaki, Francis Vallance (Heritage Warrior), CC BY 2.0, resized"],
    [[], "/img/photo-pukaki-1200.webp", "Photo: Lake Pukaki, Francis Vallance (Heritage Warrior), CC BY 2.0, resized"],
  ])("shows the website's photo for %j, from the website, with its credit", async (vibes, path, credit) => {
    const view = await render(<Break2Step state={vibed(vibes)} onAnswer={onAnswer} />);

    expect(site.breakLine(2, vibed(vibes))).toEqual(expect.objectContaining({ img: path, credit }));
    expect(view.getByTestId("break-photo").props.source).toEqual({ uri: SITE + path });
    expect(view.getByText(credit)).toBeTruthy();
  });

  it("says its line over the photo as the heading, on a dark fill for when the photo can't load", async () => {
    const view = await render(<Break2Step state={vibed(["nature"])} onAnswer={onAnswer} />);
    const line = view.getByText("Over 500 places on the island. Picking the ones that fit you.");

    expect(line.props.accessibilityRole).toBe("header");
    expect(view.getByTestId("photo-break")).toHaveStyle({ backgroundColor: tokens.colors.scrim });
  });

  // The swipe cards come next: their first two photos are fetched while the break shows, so the cards open
  // with a photo on them.
  it("has the first two swipe cards' photos fetched while it shows", async () => {
    await render(<Break2Step state={vibed(["nature"])} onAnswer={onAnswer} />);
    const [first, second] = site.cardsFor(data, 0);

    expect(mockPrefetch).toHaveBeenCalledWith([first.img, second.img]);
  });

  it("goes on from Next", async () => {
    const view = await render(<Break2Step state={vibed(["nature"])} onAnswer={onAnswer} />);

    await fireEvent.press(view.getByText("Next"));

    expect(onAnswer).toHaveBeenCalledWith({ step: "break2" });
  });
});

describe("Food tips?", () => {
  const nearly = { ...WEEK, pace: "some" as const, drive: 240 as const, who: "couple", age: "30-44", vibes: [], into: [], activities: [] };

  it("asks the website's yes or no", async () => {
    const view = await render(<FoodStep state={nearly} onAnswer={onAnswer} />);

    expect(view.getByText("Nearly there")).toBeTruthy();
    expect(view.getByText("Food tips?")).toBeTruthy();
    expect(view.getByText("Cafés and places to eat, placed along each day.")).toBeTruthy();
    expect(view.getByText("Yes")).toBeTruthy();
    expect(view.getByText("Add the good places to eat")).toBeTruthy();
    expect(view.getByText("No")).toBeTruthy();
    expect(view.getByText("Just the places to see")).toBeTruthy();
    expect(picked(view, "Yes")).toEqual({ selected: false });
    expect(picked(view, "No")).toEqual({ selected: false });
  });

  it("reports yes and no, and marks the one picked before", async () => {
    const view = await render(<FoodStep state={{ ...nearly, food: false }} onAnswer={onAnswer} />);

    expect(picked(view, "No")).toEqual({ selected: true });
    expect(picked(view, "Yes")).toEqual({ selected: false });

    await fireEvent.press(view.getByText("Yes"));
    expect(onAnswer).toHaveBeenLastCalledWith({ step: "food", value: true });

    await fireEvent.press(view.getByText("No"));
    expect(onAnswer).toHaveBeenLastCalledWith({ step: "food", value: false });
  });
});

// The swipe cards. What the cards are, where a deck starts and what the answers become is the copied quiz
// logic's (cardsFor, deckStart, deckYes, deckAnswer); the card under a finger is swipeDeck.test.tsx's.
describe("What are you into?", () => {
  const TODAY = new Date(2026, 10, 27);
  // As far as the vibe, for a trip in January.
  const before = { ...WEEK, pace: "some" as const, drive: 240 as const, who: "couple", age: "30-44", vibes: ["nature"] };
  const cards: any[] = site.cardsFor(data, 0);
  const KEY = cards.map((c) => c.id).join();
  const creditOf = (c: any) => `${(data.places as any)[c.site].name}. Photo: ${c.credit}`;
  const onDeck = jest.fn();
  const announce = AccessibilityInfo.announceForAccessibilityWithOptions as jest.Mock;

  // The step as the screen holds it: the deck kept above it, so it is still there when the step is drawn again.
  function Held({ state = before, from = null, places = data }: { state?: QuizState; from?: any; places?: any }) {
    const [deck, setDeck] = React.useState(from);
    const keep = (next: any) => {
      onDeck(next);
      setDeck(next);
    };
    return <IntoStep state={state} onAnswer={onAnswer} deck={deck} onDeck={keep} today={TODAY} data={places} />;
  }
  const yes = (view: any, c: any) => fireEvent.press(view.getByLabelText(`Yes, add ${c.label.toLowerCase()}`));
  const no = (view: any, c: any) => fireEvent.press(view.getByLabelText(`No, skip ${c.label.toLowerCase()}`));

  it("deals the website's cards, a kind of place or an activity each, on the first of them", async () => {
    const view = await render(<Held />);
    const [first, second] = cards;

    expect(cards.map((c) => c.id)).toEqual([
      "Scenic", "Walks", "Nature", "Water", "hot-pools", "Culture", "kayaking", "Attractions", "stargazing", "Adventure", "wine",
    ]);
    // every card's photo is of a place the bundled data has, so its credit can name the place
    for (const c of cards) expect((data.places as any)[c.site]?.name).toBeTruthy();
    expect(view.getByText("What are you into?")).toBeTruthy();
    expect(view.getByText("1 of 11 · Swipe right for yes, left for no.")).toBeTruthy();

    const card = view.getByTestId("deck-card");
    expect(within(card).getByText(first.label)).toBeTruthy();
    expect(within(card).getByText(first.hint)).toBeTruthy();
    // the place in the photo and whose photo it is, as the website shows them on the card
    expect(creditOf(first)).toBe("Devil's Staircase Lookout. Photo: public domain, via Wikimedia Commons");
    expect(within(card).getByText(creditOf(first))).toBeTruthy();
    const photo = within(card).getByTestId("deck-photo");
    expect(photo.props.source).toEqual({ uri: first.img });
    expect(photo.props.accessibilityLabel).toBe(first.alt);
    // the next card's photo is under it
    const under = view.getByTestId("deck-under", { includeHiddenElements: true });
    expect(within(under).getByTestId("deck-photo", { includeHiddenElements: true }).props.source).toEqual({ uri: second.img });
  });

  it("goes on a card with Yes or with No, which is not yet an answer, and keeps its place with the screen", async () => {
    const view = await render(<Held />);

    await yes(view, cards[0]);
    expect(view.getByText("2 of 11 · Swipe right for yes, left for no.")).toBeTruthy();
    expect(within(view.getByTestId("deck-card")).getByText(cards[1].label)).toBeTruthy();
    expect(onDeck).toHaveBeenLastCalledWith({ idx: 1, yes: ["Scenic"], key: KEY });
    expect(announce).toHaveBeenLastCalledWith("Walks. From a short stroll to a day out. 2 of 11.", { queue: true });

    await no(view, cards[1]);
    expect(view.getByText("3 of 11 · Swipe right for yes, left for no.")).toBeTruthy();
    expect(onDeck).toHaveBeenLastCalledWith({ idx: 2, yes: ["Scenic"], key: KEY });
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it("hands the quiz the kinds of place and the activities once the last card is answered", async () => {
    const view = await render(<Held />);
    // Nature's whale says yes to wildlife too.
    const liked = ["Scenic", "Nature", "hot-pools", "wine"];

    for (const c of cards) await (liked.includes(c.id) ? yes(view, c) : no(view, c));

    const lists = site.deckAnswers(cards, liked);
    expect(lists).toEqual({ into: ["Scenic", "Nature"], activities: ["hot-pools", "wildlife", "wine"] });
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith({ step: "into", value: lists });
    // nothing held any more: back at this question, the deck is dealt from the answers
    expect(onDeck).toHaveBeenLastCalledWith(null);
  });

  describe("back at a deck already answered", () => {
    const answered = { ...before, into: ["Scenic", "Nature"], activities: ["hot-pools", "wildlife", "wine"] };
    const last = cards[cards.length - 1];

    it("shows its last card again", async () => {
      const view = await render(<Held state={answered} />);

      expect(view.getByText("11 of 11 · Swipe right for yes, left for no.")).toBeTruthy();
      expect(within(view.getByTestId("deck-card")).getByText(last.label)).toBeTruthy();
      expect(view.queryByTestId("deck-under", { includeHiddenElements: true })).toBeNull();
    });

    it("takes that card's yes back: No now leaves it out, the other answers kept", async () => {
      const view = await render(<Held state={answered} />);

      await no(view, last);

      expect(onAnswer).toHaveBeenCalledWith({ step: "into", value: { into: ["Scenic", "Nature"], activities: ["hot-pools", "wildlife"] } });
    });

    it("and Yes puts it in again", async () => {
      const view = await render(<Held state={answered} />);

      await yes(view, last);

      expect(onAnswer).toHaveBeenCalledWith({ step: "into", value: { into: ["Scenic", "Nature"], activities: ["hot-pools", "wildlife", "wine"] } });
    });
  });

  // The card under a finger is swipeDeck.test.tsx's; this is a swipe counting the same as a button here.
  it("takes a swipe for an answer as it takes a button: right is yes, left is no", async () => {
    const view = await render(<Held />);
    let t = 0;
    // One finger as PanResponder reads it, from x to x, `ms` after the touch before.
    const touch = (fromX: number, toX: number, ms: number) => {
      const finger = {
        touchActive: true,
        startPageX: 0,
        startPageY: 0,
        startTimeStamp: 0,
        currentPageX: toX,
        currentPageY: 0,
        currentTimeStamp: t + ms,
        previousPageX: fromX,
        previousPageY: 0,
        previousTimeStamp: t,
      };
      t += ms;
      return {
        touchHistory: { numberActiveTouches: 1, indexOfSingleActiveTouch: 0, mostRecentTimeStamp: t, touchBank: [finger] },
        nativeEvent: { touches: [finger], changedTouches: [finger] },
      };
    };
    const swipe = (dx: number) =>
      act(async () => {
        const card = view.getByTestId("deck-card");
        card.props.onResponderGrant(touch(0, 0, 100));
        card.props.onResponderMove(touch(0, Math.sign(dx), 16));
        card.props.onResponderMove(touch(Math.sign(dx), dx, 400));
        card.props.onResponderRelease(touch(dx, dx, 1));
      });

    await swipe(150);
    expect(onDeck).toHaveBeenLastCalledWith({ idx: 1, yes: ["Scenic"], key: KEY });
    expect(view.getByText("2 of 11 · Swipe right for yes, left for no.")).toBeTruthy();

    await swipe(-150);
    expect(onDeck).toHaveBeenLastCalledWith({ idx: 2, yes: ["Scenic"], key: KEY });

    // short of the point: the card stays
    await swipe(60);
    expect(view.getByText("3 of 11 · Swipe right for yes, left for no.")).toBeTruthy();
    expect(onDeck).toHaveBeenCalledTimes(2);
  });

  it("carries on where a deck was left part way", async () => {
    const view = await render(<Held from={{ idx: 4, yes: ["Scenic", "Water"], key: KEY }} />);

    expect(view.getByText("5 of 11 · Swipe right for yes, left for no.")).toBeTruthy();
    expect(within(view.getByTestId("deck-card")).getByText(cards[4].label)).toBeTruthy();

    await yes(view, cards[4]);
    expect(onDeck).toHaveBeenLastCalledWith({ idx: 5, yes: ["Scenic", "Water", "hot-pools"], key: KEY });
  });

  // The cards follow the places: an update that takes the last hot pool out of the data takes its card out.
  // A deck left part way through the old cards doesn't fit the new ones, so it starts again.
  it("deals afresh when the cards on offer have changed", async () => {
    const places = Object.fromEntries(
      Object.entries(data.places).map(([id, p]) => [id, { ...p, activities: p.activities.filter((a) => a !== "hot-pools") }]),
    );
    const fewer = site.cardsFor({ places }, 0);
    expect(fewer.map((c: any) => c.id)).toEqual(cards.map((c) => c.id).filter((id) => id !== "hot-pools"));
    const view = await render(<Held from={{ idx: 4, yes: ["Scenic", "Water"], key: KEY }} places={{ places }} />);

    expect(view.getByText("1 of 10 · Swipe right for yes, left for no.")).toBeTruthy();
    expect(within(view.getByTestId("deck-card")).getByText("Scenic")).toBeTruthy();

    await no(view, fewer[0]);
    expect(onDeck).toHaveBeenLastCalledWith({ idx: 1, yes: [], key: fewer.map((c: any) => c.id).join() });
  });
});
