// The swipe cards of "What are you into?": the top card follows a finger, flies off past a point or on a quick
// flick (right for yes, left for no) and comes back otherwise; Yes and No buttons do the same for anyone who
// doesn't swipe. What the cards are and what the answers become is the copied quiz logic's, wired up in IntoStep
// (quizStepsSecondHalf.test.tsx); this is the card's behaviour under a finger.

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
import { AccessibilityInfo, Animated, StyleSheet } from "react-native";
import { act, fireEvent, render, within } from "@testing-library/react-native";

import { SwipeDeck, deckNudge, type DeckCard } from "@/components/tripBuilder/SwipeDeck";

const SCENIC: DeckCard = {
  id: "Scenic",
  label: "Scenic",
  hint: "Lookouts and big views",
  img: "https://example.test/scenic.webp",
  alt: "A lake below snow-capped mountains",
  credit: "Devil's Staircase Lookout. Photo: public domain, via Wikimedia Commons",
};
const WALKS: DeckCard = {
  id: "Walks",
  label: "Walks",
  hint: "From a short stroll to a day out",
  img: "https://example.test/walks.webp",
  alt: "A swing bridge into beech forest",
  credit: "Routeburn Track Day Walk. Photo: ShakyIsles, CC BY-SA 4.0, resized",
};

const onAnswer = jest.fn();
const deck = (over: Partial<React.ComponentProps<typeof SwipeDeck>> = {}) =>
  render(<SwipeDeck card={SCENIC} next={WALKS} count="1 of 11" onAnswer={onAnswer} {...over} />);
const announce = AccessibilityInfo.announceForAccessibilityWithOptions as jest.Mock;

// The card's moves run on the phone's animation thread. Here each lands at once and says it finished, so a
// test sees what was asked for and what followed.
let timing: jest.SpyInstance;
let spring: jest.SpyInstance;
const land = (value: Animated.Value, config: { toValue: number }) => ({
  start: (done?: (result: { finished: boolean }) => void) => {
    value.setValue(config.toValue);
    done?.({ finished: true });
  },
  stop: jest.fn(),
});

// A finger as PanResponder reads it: from x to x (and y to y), `ms` after the touch before.
let t = 0;
const touch = (fromX: number, toX: number, ms = 400, fromY = 0, toY = 0) => {
  const before = t;
  t += ms;
  const finger = {
    touchActive: true,
    startPageX: 0,
    startPageY: 0,
    startTimeStamp: 0,
    currentPageX: toX,
    currentPageY: toY,
    currentTimeStamp: t,
    previousPageX: fromX,
    previousPageY: fromY,
    previousTimeStamp: before,
  };
  return {
    touchHistory: { numberActiveTouches: 1, indexOfSingleActiveTouch: 0, mostRecentTimeStamp: t, touchBank: [finger] },
    nativeEvent: { touches: [finger], changedTouches: [finger] },
  };
};
// A drag of `dx` taking `ms`, then the finger lifted. PanResponder's speed is the last move's, and it has none
// for a touch's first move (it has no move before it to time it from), so the drag starts with a first move of
// a point, as a real one does.
// The card's handlers are called as the responder system calls them once the card has the touch. (fireEvent
// won't pass these on: it first asks the card whether it wants a touch that hasn't moved, and it doesn't.)
const swipe = async (view: any, dx: number, ms = 400) => {
  const card = view.getByTestId("deck-card");
  const first = Math.sign(dx);
  await act(async () => {
    card.props.onResponderGrant(touch(0, 0, 100));
    card.props.onResponderMove(touch(0, first, 16));
    card.props.onResponderMove(touch(first, dx, ms));
    card.props.onResponderRelease(touch(dx, dx, 1));
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  deckNudge.seen = false;
  timing = jest.spyOn(Animated, "timing").mockImplementation(land as never);
  spring = jest.spyOn(Animated, "spring").mockImplementation(land as never);
});
afterEach(() => {
  timing.mockRestore();
  spring.mockRestore();
});

describe("the card on top", () => {
  it("shows its photo, with what is in it for a screen reader, its name, its line and the photo's credit", async () => {
    const view = await deck();
    const card = view.getByTestId("deck-card");
    const photo = within(card).getByTestId("deck-photo");

    expect(photo.props.source).toEqual({ uri: SCENIC.img });
    expect(photo.props.accessibilityLabel).toBe(SCENIC.alt);
    expect(within(card).getByText("Scenic")).toBeTruthy();
    expect(within(card).getByText("Lookouts and big views")).toBeTruthy();
    expect(within(card).getByText("Devil's Staircase Lookout. Photo: public domain, via Wikimedia Commons")).toBeTruthy();
  });

  it("has the next card under it, to show as it moves away, and out of a screen reader's way", async () => {
    const view = await deck();
    const under = view.getByTestId("deck-under", { includeHiddenElements: true });

    expect(within(under).getByTestId("deck-photo", { includeHiddenElements: true }).props.source).toEqual({ uri: WALKS.img });
    expect(view.queryByTestId("deck-under")).toBeNull();
    expect(view.queryByText("Walks")).toBeNull();
  });

  // A little smaller while it waits, so all of it is behind the top card; full size by the time the top card is
  // far enough to count, so nothing jumps when it takes the top card's place.
  it("brings the card under it up to full size as the top card is pulled away", async () => {
    const view = await deck();
    const size = () => {
      const under = view.getByTestId("deck-under", { includeHiddenElements: true });
      return (StyleSheet.flatten(under.props.style).transform as { scale: number }[])[0].scale;
    };
    expect(size()).toBeCloseTo(0.95);

    const card = view.getByTestId("deck-card");
    await act(async () => {
      card.props.onResponderGrant(touch(0, 0, 100));
      card.props.onResponderMove(touch(0, 1, 16));
      card.props.onResponderMove(touch(1, 50, 400));
    });
    await view.rerender(<SwipeDeck card={SCENIC} next={WALKS} count="1 of 11" onAnswer={onAnswer} />);
    expect(size()).toBeGreaterThan(0.96);
    expect(size()).toBeLessThan(1);

    await act(async () => card.props.onResponderMove(touch(50, 140, 400)));
    await view.rerender(<SwipeDeck card={SCENIC} next={WALKS} count="1 of 11" onAnswer={onAnswer} />);
    expect(size()).toBe(1);
  });

  it("has nothing under the last card", async () => {
    const view = await deck({ next: undefined });
    expect(view.queryByTestId("deck-under", { includeHiddenElements: true })).toBeNull();
  });
});

describe("Yes and No", () => {
  it("name the card they answer, and say where it is in the deck and what it means", async () => {
    const view = await deck();

    expect(view.getByLabelText("Yes, add scenic").props.accessibilityHint).toBe("1 of 11. Lookouts and big views");
    expect(view.getByLabelText("No, skip scenic").props.accessibilityHint).toBe("1 of 11. Lookouts and big views");
    expect(view.getByText("Yes")).toBeTruthy();
    expect(view.getByText("No")).toBeTruthy();
  });

  it("send the card off to the right for yes, then answer yes", async () => {
    const view = await deck();

    await fireEvent.press(view.getByLabelText("Yes, add scenic"));

    expect(timing).toHaveBeenCalledTimes(1);
    const [, move] = timing.mock.calls[0];
    expect(move.toValue).toBeGreaterThan(300);
    expect(move).toEqual(expect.objectContaining({ duration: 250, useNativeDriver: true }));
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it("send it off to the left for no, then answer no", async () => {
    const view = await deck();

    await fireEvent.press(view.getByLabelText("No, skip scenic"));

    expect(timing.mock.calls[0][1].toValue).toBeLessThan(-300);
    expect(onAnswer).toHaveBeenCalledWith(false);
  });

  // The card is on its way off: a second tap mustn't answer the card that is about to show.
  it("take one answer while the card is on its way off", async () => {
    timing.mockImplementationOnce((() => ({ start: jest.fn(), stop: jest.fn() })) as never);
    const view = await deck();

    await fireEvent.press(view.getByLabelText("Yes, add scenic"));
    await fireEvent.press(view.getByLabelText("No, skip scenic"));
    await swipe(view, 200);

    expect(timing).toHaveBeenCalledTimes(1);
    expect(onAnswer).not.toHaveBeenCalled();
  });

  // The card has flown off and its answer is in, but the next card hasn't been drawn yet: a second tap or
  // swipe in that gap is still on the card just answered, and must not answer it again (the deck would move on
  // a card too far).
  it("take one answer for a card: a second, before the next card shows, is nothing", async () => {
    const view = await deck();

    await fireEvent.press(view.getByLabelText("Yes, add scenic"));
    await fireEvent.press(view.getByLabelText("No, skip scenic"));
    await fireEvent.press(view.getByLabelText("Yes, add scenic"));
    await swipe(view, -150);

    expect(onAnswer.mock.calls).toEqual([[true]]);
    expect(timing).toHaveBeenCalledTimes(1);

    // the next card is answered as usual
    await view.rerender(<SwipeDeck card={WALKS} count="2 of 11" onAnswer={onAnswer} />);
    await fireEvent.press(view.getByLabelText("No, skip walks"));
    expect(onAnswer.mock.calls).toEqual([[true], [false]]);
  });
});

describe("a swipe", () => {
  it("past the point, to the right, is yes", async () => {
    const view = await deck();

    await swipe(view, 120);

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(true);
    expect(timing.mock.calls[0][1].toValue).toBeGreaterThan(300);
  });

  it("past the point, to the left, is no", async () => {
    const view = await deck();

    await swipe(view, -120);

    expect(onAnswer).toHaveBeenCalledWith(false);
    expect(timing.mock.calls[0][1].toValue).toBeLessThan(-300);
  });

  it("short of the point is no answer: the card springs back to the middle", async () => {
    const view = await deck();

    await swipe(view, 90);
    await swipe(view, -90);

    expect(onAnswer).not.toHaveBeenCalled();
    expect(timing).not.toHaveBeenCalled();
    expect(spring).toHaveBeenCalledTimes(2);
    expect(spring.mock.calls[0][1]).toEqual(expect.objectContaining({ toValue: 0, useNativeDriver: true }));
  });

  it("that is a quick flick counts though it is short of the point", async () => {
    const view = await deck();

    // 60 pt in 50 ms
    await swipe(view, 60, 50);
    expect(onAnswer).toHaveBeenLastCalledWith(true);

    await view.rerender(<SwipeDeck card={WALKS} count="2 of 11" onAnswer={onAnswer} />);
    await swipe(view, -60, 50);
    expect(onAnswer).toHaveBeenLastCalledWith(false);
    expect(onAnswer).toHaveBeenCalledTimes(2);
  });

  it("that barely moves is not a flick, however quick", async () => {
    const view = await deck();

    await swipe(view, 10, 5);

    expect(onAnswer).not.toHaveBeenCalled();
  });

  // The page under the cards scrolls on a small phone: an up-and-down drag is the page's, a sideways one the card's.
  it("is the card's when it goes sideways, and left to the page when it goes up and down", async () => {
    const view = await deck();
    const card = view.getByTestId("deck-card");
    const moved = (dx: number, dy: number) => {
      card.props.onStartShouldSetResponderCapture(touch(0, 0, 100));
      card.props.onMoveShouldSetResponderCapture(touch(0, dx, 30, 0, dy));
      return card.props.onMoveShouldSetResponder(touch(dx, dx, 1, dy, dy));
    };

    expect(moved(12, 3)).toBe(true);
    expect(moved(-12, 3)).toBe(true);
    expect(moved(3, 12)).toBe(false);
    expect(moved(2, 0)).toBe(false);
    // and once it has the drag, it keeps it
    expect(card.props.onResponderTerminationRequest(touch(0, 0, 1))).toBe(false);
  });

  it("is not taken as a tap on the card: a touch that doesn't move is nothing", async () => {
    const view = await deck();
    expect(view.getByTestId("deck-card").props.onStartShouldSetResponder(touch(0, 0, 1))).toBe(false);
  });
});

describe("with reduce motion on", () => {
  beforeEach(() => (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValueOnce(true));

  it("the card just changes: no flying off", async () => {
    const view = await deck();

    await fireEvent.press(view.getByLabelText("Yes, add scenic"));
    expect(onAnswer).toHaveBeenLastCalledWith(true);

    await view.rerender(<SwipeDeck card={WALKS} count="2 of 11" onAnswer={onAnswer} />);
    await swipe(view, -150);
    expect(onAnswer).toHaveBeenLastCalledWith(false);
    expect(timing).not.toHaveBeenCalled();
  });

  // No fly-off to wait for, so the answer is in at once and the same gap is there before the next card shows.
  it("a card still takes one answer: a second, before the next card shows, is nothing", async () => {
    const view = await deck();

    await fireEvent.press(view.getByLabelText("No, skip scenic"));
    await fireEvent.press(view.getByLabelText("Yes, add scenic"));
    await swipe(view, 150);

    expect(onAnswer.mock.calls).toEqual([[false]]);
  });

  it("a card let go short of the point is put back, not sprung back", async () => {
    const view = await deck();

    await swipe(view, 60);

    expect(onAnswer).not.toHaveBeenCalled();
    expect(spring).not.toHaveBeenCalled();
  });
});

describe("a new card", () => {
  it("is read out to a screen reader, with where it is in the deck; the first is not (the question is)", async () => {
    const view = await deck();
    expect(announce).not.toHaveBeenCalled();

    await view.rerender(<SwipeDeck card={WALKS} count="2 of 11" onAnswer={onAnswer} />);

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith("Walks. From a short stroll to a day out. 2 of 11.", { queue: true });
    expect(view.getByLabelText("Yes, add walks")).toBeTruthy();
  });

  it("can be answered as soon as it shows", async () => {
    const view = await deck();
    await fireEvent.press(view.getByLabelText("Yes, add scenic"));
    await view.rerender(<SwipeDeck card={WALKS} count="2 of 11" onAnswer={onAnswer} />);

    await swipe(view, -130);

    expect(onAnswer.mock.calls).toEqual([[true], [false]]);
  });
});

// The website's one-time nudge on the first card: after a moment it leans right, then left, to show it moves.
describe("the nudge", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  const leans = () => timing.mock.calls.map(([, move]) => move.toValue);

  it("leans the first card right then left after a moment, once", async () => {
    const view = await deck({ first: true });
    expect(timing).not.toHaveBeenCalled();

    await act(() => jest.advanceTimersByTime(600));

    expect(leans()).toEqual([40, 40, 0, -40, -40, 0]);
    expect(onAnswer).not.toHaveBeenCalled();

    // the deck opened again later in the same run of the app: not again
    await view.unmount();
    timing.mockClear();
    await deck({ first: true });
    await act(() => jest.advanceTimersByTime(5000));
    expect(timing).not.toHaveBeenCalled();
  });

  it("is only for the deck's first card", async () => {
    await deck({ first: false });
    await act(() => jest.advanceTimersByTime(5000));
    expect(timing).not.toHaveBeenCalled();
  });

  it("doesn't play once the card has been touched", async () => {
    const view = await deck({ first: true });

    await swipe(view, 30);
    spring.mockClear();
    await act(() => jest.advanceTimersByTime(5000));

    expect(timing).not.toHaveBeenCalled();
  });

  it("doesn't play with reduce motion on", async () => {
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValueOnce(true);
    await deck({ first: true });

    await act(() => jest.advanceTimersByTime(5000));

    expect(timing).not.toHaveBeenCalled();
    // not counted as seen: it can play when the setting is turned off
    expect(deckNudge.seen).toBe(false);
  });
});

// React can run an effect, undo it and run it again (it does in its strict mode). The deck marks itself gone
// when it is undone, so it has to mark itself back when it is run.
it("is not left dead when its effects are run twice", async () => {
  const view = await render(
    <React.StrictMode>
      <SwipeDeck card={SCENIC} next={WALKS} count="1 of 11" onAnswer={onAnswer} />
    </React.StrictMode>,
  );

  await fireEvent.press(view.getByLabelText("Yes, add scenic"));

  expect(onAnswer).toHaveBeenCalledWith(true);
});

it("says nothing after it has gone: a card still flying when the question is left answers nothing", async () => {
  let finish: (result: { finished: boolean }) => void = () => {};
  timing.mockImplementationOnce((() => ({ start: (done: typeof finish) => (finish = done), stop: jest.fn() })) as never);
  const view = await deck();

  await fireEvent.press(view.getByLabelText("Yes, add scenic"));
  await view.unmount();
  finish({ finished: true });

  expect(onAnswer).not.toHaveBeenCalled();
});
