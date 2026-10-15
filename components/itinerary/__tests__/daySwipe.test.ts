// Swiping the day timeline sideways goes to the next or previous day. It shares the screen
// with scrolling (vertical) and with dragging places and drives, which claim the touch the
// moment it starts on them, so a swipe only counts when it is clearly sideways.
import { daySwipeHandlers } from "@/components/itinerary/daySwipe";

const g = (dx: number, dy: number) => ({ dx, dy }) as any;

describe("daySwipeHandlers", () => {
  it("takes a clearly sideways move", () => {
    expect(daySwipeHandlers(jest.fn()).onMoveShouldSetPanResponder!(null as any, g(40, 5))).toBe(true);
    expect(daySwipeHandlers(jest.fn()).onMoveShouldSetPanResponder!(null as any, g(-40, -5))).toBe(true);
  });

  it("leaves a mostly vertical move to the scroll, and a small one alone", () => {
    expect(daySwipeHandlers(jest.fn()).onMoveShouldSetPanResponder!(null as any, g(40, 30))).toBe(false);
    expect(daySwipeHandlers(jest.fn()).onMoveShouldSetPanResponder!(null as any, g(10, 0))).toBe(false);
  });

  it("never takes a touch as it starts: a place or drive under the finger gets it", () => {
    expect(daySwipeHandlers(jest.fn()).onStartShouldSetPanResponder).toBeUndefined();
  });

  it("goes to the next day on a swipe left, and the day before on a swipe right", () => {
    const onSwipe = jest.fn();
    const handlers = daySwipeHandlers(onSwipe);

    handlers.onPanResponderRelease!(null as any, g(-80, 6));
    handlers.onPanResponderRelease!(null as any, g(80, -4));

    expect(onSwipe.mock.calls).toEqual([[1], [-1]]);
  });

  it("does nothing for a swipe that didn't go far enough", () => {
    const onSwipe = jest.fn();

    daySwipeHandlers(onSwipe).onPanResponderRelease!(null as any, g(-30, 0));

    expect(onSwipe).not.toHaveBeenCalled();
  });
});
