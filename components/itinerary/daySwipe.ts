import type { PanResponderCallbacks } from "react-native";

// How far sideways (points) a move must go before it counts as a swipe, and by how much
// more than it goes up or down.
const CLAIM_DX = 30;
const SWIPE_DX = 60;

// Swiping the day timeline sideways: left for the next day, right for the day before.
// The timeline also scrolls up and down, and its places and drives are dragged: those
// claim a touch as it starts, so this never does, and it only takes a move that is
// clearly sideways. A short or mostly vertical one is left alone.
export function daySwipeHandlers(onSwipe: (step: 1 | -1) => void): PanResponderCallbacks {
  return {
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > CLAIM_DX && Math.abs(g.dx) > 2 * Math.abs(g.dy),
    onPanResponderRelease: (_e, g) => {
      if (Math.abs(g.dx) >= SWIPE_DX) onSwipe(g.dx < 0 ? 1 : -1);
    },
  };
}
