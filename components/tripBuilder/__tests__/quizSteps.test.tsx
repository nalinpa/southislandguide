// The quiz's first seven questions as the app draws them. Each shows the website's own lists and words (the
// copied quizLogic.js; the wording is the page half of kiwiguide-site public/plan/quiz.js) and hands back the
// pick in quizFlow's shape. Where the answer leads is quizFlow's (lib/__tests__/quizFlow.test.ts).

jest.mock("@/lib/uiKit", () => require("@/test/uiKitMock"));
jest.mock("expo-image", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { Image: (props: any) => React.createElement(View, props) };
});
jest.mock("expo-linear-gradient", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { LinearGradient: (p: any) => React.createElement(View, p) };
});

import React from "react";
import { AccessibilityInfo } from "react-native";
import { fireEvent, render, within } from "@testing-library/react-native";

import { BandStep, BreakStep, DaysStep, FinishStep, MonthStep, SeasonStep, StartStep } from "@/components/tripBuilder/QuizSteps";
import { blankQuiz, type QuizState } from "@/lib/tripBuilder/quizFlow";
import { tokens } from "@/lib/ui/tokens";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const site = require("@/lib/tripBuilder/quizLogic");

const TODAY = new Date(2026, 10, 27);
const st = (over: Partial<QuizState> = {}): QuizState => ({ ...blankQuiz(), ...over });
const town = (id: string) => site.TOWNS.find((t: any) => t.id === id);
// The photo addresses on screen, in order.
const photos = (view: any): string[] => view.getAllByTestId("town-photo").map((p: any) => p.props.source.uri);
// The button a line of text sits in.
const buttonOf = (node: any) => {
  for (let n = node; n; n = n.parent) if (n.props?.accessibilityRole === "button") return n;
  throw new Error("not in a button");
};
const announce = AccessibilityInfo.announceForAccessibilityWithOptions as jest.Mock;

const onAnswer = jest.fn();
const onOpen = jest.fn();
beforeEach(() => jest.clearAllMocks());

describe("Where do you start?", () => {
  it("shows the three featured towns with their photos and lines, and the rest behind Somewhere else?", async () => {
    const view = await render(<StartStep state={st()} onAnswer={onAnswer} />);

    expect(view.getByText("Plan your South Island trip in a minute")).toBeTruthy();
    expect(view.getByText("Where do you start?")).toBeTruthy();
    for (const id of ["queenstown", "christchurch", "picton"]) {
      expect(view.getByText(town(id).name)).toBeTruthy();
      expect(view.getByText(town(id).sub)).toBeTruthy();
    }
    expect(view.queryByText("Dunedin")).toBeNull();
    expect(view.getByText("Somewhere else?")).toBeTruthy();
    expect(view.getByText("Dunedin, Nelson or Invercargill")).toBeTruthy();
    // the other towns' card wears the first of them's photo
    expect(photos(view)).toEqual([town("queenstown").img, town("christchurch").img, town("picton").img, town("dunedin").img]);
  });

  // The photos load from the api, as on the website. With no signal the card is its dark fill, and the
  // white name and line on it still read.
  it("keeps a dark fill behind each photo, for when it can't load", async () => {
    const view = await render(<StartStep state={st()} onAnswer={onAnswer} />);
    const cards = view.getAllByTestId("town-card");

    expect(cards).toHaveLength(4);
    for (const card of cards) expect(card).toHaveStyle({ backgroundColor: tokens.colors.scrim });
    expect(within(cards[0]).getByText("Queenstown")).toBeTruthy();
    expect(within(cards[0]).getByTestId("town-photo")).toBeTruthy();
  });

  it("reports the town tapped", async () => {
    const view = await render(<StartStep state={st()} onAnswer={onAnswer} />);

    await fireEvent.press(view.getByText("Christchurch"));

    expect(onAnswer).toHaveBeenCalledWith({ step: "start", value: "christchurch" });
  });

  // The screen holds whether they are showing, for the visit (as the website does), so it is asked, not kept here.
  it("asks for the other towns from Somewhere else?, which is not an answer", async () => {
    const view = await render(<StartStep state={st()} onAnswer={onAnswer} onOpen={onOpen} />);

    await fireEvent.press(view.getByText("Somewhere else?"));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it("shows every town once they are open", async () => {
    const view = await render(<StartStep state={st()} onAnswer={onAnswer} open />);

    expect(view.queryByText("Somewhere else?")).toBeNull();
    for (const t of site.TOWNS) expect(view.getByText(t.name)).toBeTruthy();

    await fireEvent.press(view.getByText("Nelson"));
    expect(onAnswer).toHaveBeenCalledWith({ step: "start", value: "nelson" });
  });

  it("is open already, with the pick ticked, when the start is one of the other towns", async () => {
    const view = await render(<StartStep state={st({ start: "dunedin" })} onAnswer={onAnswer} />);

    expect(view.queryByText("Somewhere else?")).toBeNull();
    const picked = buttonOf(view.getByText("Dunedin"));
    expect(picked.props.accessibilityState).toEqual({ selected: true });
    expect(within(picked).getByTestId("town-picked")).toBeTruthy();
    expect(buttonOf(view.getByText("Queenstown")).props.accessibilityState).toEqual({ selected: false });
    expect(view.getAllByTestId("town-picked")).toHaveLength(1);
  });

  it("has no loop ring: that is the finish's", async () => {
    const view = await render(<StartStep state={st({ start: "queenstown" })} onAnswer={onAnswer} />);
    expect(view.queryByTestId("town-home-ring")).toBeNull();
  });
});

describe("How long have you got?", () => {
  it("shows the website's rough lengths under the start town", async () => {
    const view = await render(<BandStep state={st({ start: "picton" })} onAnswer={onAnswer} />);

    expect(view.getByText("From Picton")).toBeTruthy();
    expect(view.getByText("How long have you got?")).toBeTruthy();
    for (const b of site.BANDS) {
      expect(view.getByText(b.label)).toBeTruthy();
      expect(view.getByText(b.hint)).toBeTruthy();
    }
  });

  it("reports the length tapped, and marks the one picked before", async () => {
    const view = await render(<BandStep state={st({ start: "picton", band: "week" })} onAnswer={onAnswer} />);
    const picked = buttonOf(view.getByText("About a week"));
    const other = buttonOf(view.getByText("Three weeks"));

    expect(picked.props.accessibilityState).toEqual({ selected: true });
    expect(other.props.accessibilityState).toEqual({ selected: false });
    // a bordered button: the picked one's border and fill are teal, the others' the line colour on a card
    expect(picked).toHaveStyle({ borderWidth: 2, borderColor: tokens.colors.selected, backgroundColor: tokens.colors.selFill });
    expect(other).toHaveStyle({ borderWidth: 2, borderColor: tokens.colors.line, backgroundColor: tokens.colors.bgCard });

    await fireEvent.press(view.getByText("Ten days or so"));
    expect(onAnswer).toHaveBeenCalledWith({ step: "band", value: "ten" });
  });
});

describe("How many days?", () => {
  const week = st({ start: "queenstown", band: "week" });
  const least = site.leastFrom("queenstown");
  const count = (view: any) => view.getByTestId("days-count").props.accessibilityLabel;
  const chip = (view: any, n: number) => view.getByRole("button", { name: `${n} days` });
  const slider = (view: any) => view.getByLabelText("Number of days");

  it("opens on the rough length's number, between the fewest for the start town and 21", async () => {
    const view = await render(<DaysStep state={week} onAnswer={onAnswer} />);

    expect(view.getByText("About a week")).toBeTruthy();
    expect(view.getByText("How many days?")).toBeTruthy();
    expect(view.getByText(`Pick anything from ${least} to 21.`)).toBeTruthy();
    expect(count(view)).toBe("7 days");
    expect(within(view.getByTestId("days-count")).getByText("7")).toBeTruthy();
    expect(within(view.getByTestId("days-count")).getByText("days")).toBeTruthy();
  });

  it("opens on the days picked before", async () => {
    const view = await render(<DaysStep state={{ ...week, days: 6 }} onAnswer={onAnswer} />);
    expect(count(view)).toBe("6 days");
  });

  it("steps a day at a time and reports the number on Next", async () => {
    const view = await render(<DaysStep state={week} onAnswer={onAnswer} />);

    await fireEvent.press(view.getByLabelText("One day more"));
    await fireEvent.press(view.getByLabelText("One day more"));
    await fireEvent.press(view.getByLabelText("One day fewer"));
    expect(count(view)).toBe("8 days");
    expect(onAnswer).not.toHaveBeenCalled();

    await fireEvent.press(view.getByText("Next"));
    expect(onAnswer).toHaveBeenCalledWith({ step: "days", value: 8 });
  });

  it("stops at the fewest days for the start town and at 21", async () => {
    const view = await render(<DaysStep state={{ ...week, band: "weekend" }} onAnswer={onAnswer} />);

    for (let i = 0; i < 10; i++) await fireEvent.press(view.getByLabelText("One day fewer"));
    expect(count(view)).toBe(`${least} days`);
    expect(view.getByLabelText("One day fewer").props.accessibilityState).toEqual({ disabled: true });

    for (let i = 0; i < 30; i++) await fireEvent.press(view.getByLabelText("One day more"));
    expect(count(view)).toBe("21 days");
    expect(view.getByLabelText("One day more").props.accessibilityState).toEqual({ disabled: true });
  });

  it("jumps to one of the website's quick numbers", async () => {
    const view = await render(<DaysStep state={week} onAnswer={onAnswer} />);

    for (const n of [3, 5, 7, 10, 12, 14, 17, 21]) expect(chip(view, n)).toBeTruthy();
    expect(chip(view, 7).props.accessibilityState).toEqual({ selected: true });

    await fireEvent.press(chip(view, 12));
    expect(count(view)).toBe("12 days");
    expect(chip(view, 12).props.accessibilityState).toEqual({ selected: true });
    expect(chip(view, 7).props.accessibilityState).toEqual({ selected: false });

    await fireEvent.press(view.getByText("Next"));
    expect(onAnswer).toHaveBeenCalledWith({ step: "days", value: 12 });
  });

  // iOS has no live region, so the new count is read out: after whatever is being said, as the website's
  // aria-live="polite" number is.
  it("reads the new count out, politely, when a button changes it", async () => {
    const view = await render(<DaysStep state={week} onAnswer={onAnswer} />);
    expect(announce).not.toHaveBeenCalled();

    await fireEvent.press(view.getByLabelText("One day more"));
    expect(announce).toHaveBeenLastCalledWith("8 days", { queue: true });

    await fireEvent.press(chip(view, 14));
    expect(announce).toHaveBeenLastCalledWith("14 days", { queue: true });

    // the number it is already on: nothing new to say
    await fireEvent.press(chip(view, 14));
    expect(announce).toHaveBeenCalledTimes(2);
  });

  describe("the slider", () => {
    // The slider as laid out 300 wide: the knob (28 wide) runs from 14 in to 14 short of the end.
    const WIDTH = 300;
    const xOf = (n: number) => 14 + ((n - least) / (21 - least)) * (WIDTH - 28);
    let t = 0;
    // A touch as PanResponder reads it: one finger, where it went down on the slider, and from where to where since.
    const touch = (locationX: number, fromX = 0, toX = 0) => {
      t += 1;
      const finger = {
        touchActive: true,
        startPageX: 0,
        startPageY: 0,
        startTimeStamp: 0,
        currentPageX: toX,
        currentPageY: 0,
        currentTimeStamp: t,
        previousPageX: fromX,
        previousPageY: 0,
        previousTimeStamp: t - 1,
      };
      return {
        touchHistory: { numberActiveTouches: 1, indexOfSingleActiveTouch: 0, mostRecentTimeStamp: t, touchBank: [finger] },
        nativeEvent: { locationX, touches: [], changedTouches: [] },
      };
    };
    const laidOut = async () => {
      const view = await render(<DaysStep state={week} onAnswer={onAnswer} />);
      await fireEvent(slider(view), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: WIDTH, height: 44 } } });
      return view;
    };

    it("is a slider to a screen reader, from the fewest days to 21, on the count", async () => {
      const view = await laidOut();

      expect(slider(view).props.accessibilityRole).toBe("adjustable");
      expect(slider(view).props.accessibilityValue).toEqual({ min: least, max: 21, now: 7, text: "7 days" });
    });

    it("sets the days where it is touched, and follows the finger", async () => {
      const view = await laidOut();

      await fireEvent(slider(view), "responderGrant", touch(xOf(12)));
      expect(count(view)).toBe("12 days");
      expect(chip(view, 12).props.accessibilityState).toEqual({ selected: true });

      // three days' worth to the right
      await fireEvent(slider(view), "responderMove", touch(xOf(12), 100, 100 + (xOf(15) - xOf(12))));
      expect(count(view)).toBe("15 days");
      expect(slider(view).props.accessibilityValue.now).toBe(15);

      await fireEvent.press(view.getByText("Next"));
      expect(onAnswer).toHaveBeenCalledWith({ step: "days", value: 15 });
    });

    it("stops at its ends however far the finger goes", async () => {
      const view = await laidOut();

      await fireEvent(slider(view), "responderGrant", touch(xOf(7)));
      await fireEvent(slider(view), "responderMove", touch(xOf(7), 0, 900));
      expect(count(view)).toBe("21 days");

      await fireEvent(slider(view), "responderMove", touch(xOf(7), 900, -900));
      expect(count(view)).toBe(`${least} days`);
    });

    // By share of the line, not by a measured width: in place on the first frame, before anything is laid out.
    it("draws its filled part and knob along the line by the count, without waiting to be measured", async () => {
      const view = await render(<DaysStep state={week} onAnswer={onAnswer} />);
      const along = (n: number) => (n - least) / (21 - least);

      expect(view.getByTestId("days-slider-fill")).toHaveStyle({ flex: along(7) });
      expect(view.getByTestId("days-slider-rest")).toHaveStyle({ flex: 1 - along(7) });

      await fireEvent.press(view.getByLabelText("One day more"));
      expect(view.getByTestId("days-slider-fill")).toHaveStyle({ flex: along(8) });
    });

    it("keeps the drag: the page under it doesn't take it back", async () => {
      const view = await laidOut();
      expect(slider(view).props.onResponderTerminationRequest(touch(0))).toBe(false);
    });

    // VoiceOver: swipe up or down on it, a day at a time. It reads its own new value, so nothing is announced twice.
    it("moves a day at a time with a screen reader, and no further than its ends", async () => {
      const view = await laidOut();
      const act = (actionName: string) => fireEvent(slider(view), "accessibilityAction", { nativeEvent: { actionName } });

      await act("increment");
      expect(count(view)).toBe("8 days");
      await act("decrement");
      await act("decrement");
      expect(count(view)).toBe("6 days");
      expect(announce).not.toHaveBeenCalled();

      for (let i = 0; i < 30; i++) await act("increment");
      expect(count(view)).toBe("21 days");
      for (let i = 0; i < 30; i++) await act("decrement");
      expect(count(view)).toBe(`${least} days`);
    });

    it("shows its ends under it, for the eye only: a screen reader has them from the slider", async () => {
      const view = await laidOut();
      const ends = view.getByTestId("days-ends", { includeHiddenElements: true });

      expect(within(ends).getByText(String(least), { includeHiddenElements: true })).toBeTruthy();
      expect(within(ends).getByText("21", { includeHiddenElements: true })).toBeTruthy();
      expect(view.queryByTestId("days-ends")).toBeNull();
    });
  });
});

describe("Where does your trip finish?", () => {
  it("offers the loop first, ringed, then the towns the days can reach with their way home", async () => {
    // Four days from Queenstown: back to Queenstown, or on to Christchurch, Dunedin or Invercargill.
    const state = st({ start: "queenstown", band: "weekend", days: 4 });
    const cards = site.finishCards("queenstown", 4, false);
    const view = await render(<FinishStep state={state} onAnswer={onAnswer} />);

    expect(view.getByText("4 days from Queenstown")).toBeTruthy();
    expect(view.getByText("Where does your trip finish?")).toBeTruthy();
    expect(view.getByText("Finish back in Queenstown")).toBeTruthy();
    expect(view.getByText("A loop, back where you started")).toBeTruthy();
    expect(cards.towns.length).toBeGreaterThan(0);
    for (const id of cards.towns) {
      expect(view.getByText(town(id).name)).toBeTruthy();
      expect(view.getByText(town(id).out)).toBeTruthy();
    }
    expect(photos(view)).toEqual([town("queenstown").img, ...cards.towns.map((id: string) => town(id).img), ...cards.behind.slice(0, 1).map((id: string) => town(id).img)]);
    // the website's ring round the loop card, and only that card
    expect(view.getAllByTestId("town-home-ring")).toHaveLength(1);
    expect(within(buttonOf(view.getByText("Finish back in Queenstown")).parent).getByTestId("town-home-ring")).toBeTruthy();
  });

  it("reports the loop as the start town, and a town as itself", async () => {
    const view = await render(<FinishStep state={st({ start: "queenstown", band: "weekend", days: 4 })} onAnswer={onAnswer} />);

    await fireEvent.press(view.getByText("Finish back in Queenstown"));
    expect(onAnswer).toHaveBeenLastCalledWith({ step: "finish", value: "queenstown" });

    await fireEvent.press(view.getByText("Christchurch"));
    expect(onAnswer).toHaveBeenLastCalledWith({ step: "finish", value: "christchurch" });
  });

  it("keeps the further towns behind Somewhere else?, and asks for them when it is tapped", async () => {
    // Three weeks from Queenstown reaches every town: more than four cards.
    const state = st({ start: "queenstown", band: "long", days: 21 });
    const shut = site.finishCards("queenstown", 21, false);
    expect(shut.behind.length).toBeGreaterThan(1);
    const view = await render(<FinishStep state={state} onAnswer={onAnswer} onOpen={onOpen} />);

    for (const id of shut.behind) expect(view.queryByText(town(id).name)).toBeNull();
    expect(view.getByText(shut.behind.map((id: string) => town(id).name).join(", ").replace(/, ([^,]*)$/, " or $1"))).toBeTruthy();

    await fireEvent.press(view.getByText("Somewhere else?"));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it("shows every town the days can reach once they are open", async () => {
    const view = await render(<FinishStep state={st({ start: "queenstown", band: "long", days: 21 })} onAnswer={onAnswer} open />);

    expect(view.queryByText("Somewhere else?")).toBeNull();
    for (const t of site.TOWNS) if (t.id !== "queenstown") expect(view.getByText(t.name)).toBeTruthy();
  });

  it("is open already, with the pick ticked, when the finish is one of the further towns", async () => {
    const view = await render(<FinishStep state={st({ start: "queenstown", band: "long", days: 21, end: "nelson" })} onAnswer={onAnswer} />);

    expect(view.queryByText("Somewhere else?")).toBeNull();
    const picked = buttonOf(view.getByText("Nelson"));
    expect(picked.props.accessibilityState).toEqual({ selected: true });
    expect(within(picked).getByTestId("town-picked")).toBeTruthy();
    expect(buttonOf(view.getByText("Finish back in Queenstown")).props.accessibilityState).toEqual({ selected: false });
  });

  it("ticks the loop when it was the pick, and keeps its ring", async () => {
    const view = await render(<FinishStep state={st({ start: "queenstown", band: "weekend", days: 4, end: "queenstown" })} onAnswer={onAnswer} />);
    const loop = buttonOf(view.getByText("Finish back in Queenstown"));

    expect(loop.props.accessibilityState).toEqual({ selected: true });
    expect(within(loop).getByTestId("town-picked")).toBeTruthy();
    expect(view.getAllByTestId("town-home-ring")).toHaveLength(1);
  });
});

describe("the first photo break", () => {
  const state = st({ start: "dunedin", band: "week", days: 7, end: "dunedin" });

  it("shows the start town's photo, its days and the owner's line about it", async () => {
    const view = await render(<BreakStep state={state} onAnswer={onAnswer} />);

    expect(view.getByText("Dunedin, 7 days.")).toBeTruthy();
    expect(view.getByText(town("dunedin").fact)).toBeTruthy();
    expect(photos(view)).toEqual([town("dunedin").img]);
  });

  it("goes on from Next", async () => {
    const view = await render(<BreakStep state={state} onAnswer={onAnswer} />);

    await fireEvent.press(view.getByText("Next"));

    expect(onAnswer).toHaveBeenCalledWith({ step: "break1" });
  });
});

describe("Which NZ season are you picking?", () => {
  const loop = st({ start: "queenstown", band: "week", days: 7, end: "queenstown" });

  it("shows the four seasons with their months and feel, and Not sure yet", async () => {
    const view = await render(<SeasonStep state={loop} onAnswer={onAnswer} />);

    expect(view.getByText("From Queenstown and back · 7 days")).toBeTruthy();
    expect(view.getByText("Which NZ season are you picking?")).toBeTruthy();
    expect(view.getByText("Southern hemisphere seasons!")).toBeTruthy();
    for (const s of site.SEASONS) {
      expect(view.getByText(s.label)).toBeTruthy();
      expect(view.getByText(`${s.hint}. ${s.feel}`)).toBeTruthy();
    }
    expect(view.getByText("Not sure yet")).toBeTruthy();
    expect(view.getByText("Set your dates later in the app.")).toBeTruthy();
  });

  it("names both ends of a one-way trip", async () => {
    const view = await render(<SeasonStep state={{ ...loop, end: "christchurch" }} onAnswer={onAnswer} />);
    expect(view.getByText("Queenstown to Christchurch · 7 days")).toBeTruthy();
  });

  it("reports the season tapped, or unsure, and marks the one picked before", async () => {
    const view = await render(<SeasonStep state={{ ...loop, season: "winter" }} onAnswer={onAnswer} />);

    expect(buttonOf(view.getByText("Winter")).props.accessibilityState).toEqual({ selected: true });
    expect(buttonOf(view.getByText("Not sure yet")).props.accessibilityState).toEqual({ selected: false });

    await fireEvent.press(view.getByText("Autumn"));
    expect(onAnswer).toHaveBeenLastCalledWith({ step: "season", value: "autumn" });

    await fireEvent.press(view.getByText("Not sure yet"));
    expect(onAnswer).toHaveBeenLastCalledWith({ step: "season", value: "unsure" });
  });
});

describe("Which month?", () => {
  const summer = st({ start: "queenstown", band: "week", days: 7, end: "queenstown", season: "summer" });

  it("shows the season's months still to come, soonest first, and Not sure which month", async () => {
    const view = await render(<MonthStep state={summer} onAnswer={onAnswer} today={TODAY} />);

    expect(view.getByText("NZ summer · December to February")).toBeTruthy();
    expect(view.getByText("Which month?")).toBeTruthy();
    const months = site.monthsOf("summer", TODAY).map((m: any) => `${site.MONTH_NAMES[m.month]} ${m.year}`);
    expect(months).toEqual(["December 2026", "January 2027", "February 2027"]);
    for (const m of months) expect(view.getByText(m)).toBeTruthy();
    expect(view.getByText("Not sure which month")).toBeTruthy();
  });

  it("reports the month tapped with its year, and marks the one picked before", async () => {
    const view = await render(<MonthStep state={{ ...summer, month: { month: 0, year: 2027 } }} onAnswer={onAnswer} today={TODAY} />);

    expect(buttonOf(view.getByText("January 2027")).props.accessibilityState).toEqual({ selected: true });
    expect(buttonOf(view.getByText("December 2026")).props.accessibilityState).toEqual({ selected: false });

    await fireEvent.press(view.getByText("February 2027"));
    expect(onAnswer).toHaveBeenCalledWith({ step: "month", value: { month: 1, year: 2027 } });
  });

  it("reports no month for Not sure which month", async () => {
    const view = await render(<MonthStep state={summer} onAnswer={onAnswer} today={TODAY} />);

    await fireEvent.press(view.getByText("Not sure which month"));

    expect(onAnswer).toHaveBeenCalledWith({ step: "month", value: null });
  });
});

// A screen reader starts at each new question, as the website moves focus to its heading.
describe("a question's heading", () => {
  const focus = AccessibilityInfo.sendAccessibilityEvent as jest.Mock;

  it.each([
    ["Where do you start?", <StartStep key="s" state={st()} onAnswer={onAnswer} />],
    ["How long have you got?", <BandStep key="b" state={st({ start: "picton" })} onAnswer={onAnswer} />],
    ["Dunedin, 7 days.", <BreakStep key="k" state={st({ start: "dunedin", band: "week", days: 7, end: "dunedin" })} onAnswer={onAnswer} />],
  ])("takes the screen reader's focus when it shows: %s", async (title, step) => {
    const view = await render(step);

    expect(view.getByText(title).props.accessibilityRole).toBe("header");
    expect(focus).toHaveBeenCalledTimes(1);
    const [node, kind] = focus.mock.calls[0];
    expect(kind).toBe("focus");
    expect(node.props.children).toBe(title);
  });
});
