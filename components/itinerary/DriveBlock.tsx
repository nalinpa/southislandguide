import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, PanResponder, type PanResponderGestureState } from "react-native";
import { Car, GripHorizontal } from "lucide-react-native";

import { tokens } from "@/lib/ui/tokens";
import { PLANNER } from "@/lib/constants/gameplay";
import { slotIndexToTimeLabel, slotsToDurationLabel } from "@/lib/utils/itineraryPhysics";

type DriveBlockProps = {
  fromLabel: string;
  toLabel: string;
  startSlot: number;
  slots: number;
  /** The earliest and latest the drive can start. With onMove, the drive can be dragged between them. */
  earliest?: number;
  latest?: number;
  /** Moves the drive to start at this slot, and hands back where it settled (where it was, if refused). */
  onMove?: (startSlot: number) => number | void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
};

const TAP_SLOP = 5;

// Where a drag lands: the nearest half hour, kept between the end of the place before
// the drive and the start of the place it leads to.
export function driveDropSlot(startSlot: number, dy: number, slotHeight: number, earliest: number, latest: number): number {
  return Math.min(latest, Math.max(earliest, startSlot + Math.round(dy / slotHeight)));
}

// The drive between two areas, drawn on the day timeline in the time it takes up. The
// planner works out how long it is; the user can only move it, between the place before
// it and the place it leads to, to spend the spare time in the town they're driving to.
// So it is flat and neutral where a place is a raised teal card: no shadow, no colour,
// a solid edge (a dashed edge on this screen means "tap to add"), and a small grip only
// when it can be moved.
//
// Dragged the way the shared TimelineBlock drags a place (PanResponder, settling on the
// slot it lands on). No zIndex, so a place being dragged (zIndex 10) passes over it.
export function DriveBlock({ fromLabel, toLabel, startSlot, slots, earliest, latest, onMove, onDragStart, onDragEnd }: DriveBlockProps) {
  const H = PLANNER.SLOT_HEIGHT;
  const time = slotIndexToTimeLabel(startSlot);
  const duration = slotsToDurationLabel(slots);
  const lo = earliest ?? startSlot;
  const hi = latest ?? startSlot;
  const movable = !!onMove;

  const y = useRef(new Animated.Value(startSlot * H)).current;
  const settle = (slot: number) => Animated.spring(y, { toValue: slot * H, useNativeDriver: false, friction: 7 }).start();
  useEffect(() => {
    settle(startSlot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSlot]);

  // The handlers are made once; they read the props through this.
  const latestProps = useRef({ startSlot, lo, hi, onMove, onDragStart, onDragEnd });
  latestProps.current = { startSlot, lo, hi, onMove, onDragStart, onDragEnd };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !!latestProps.current.onMove,
      onMoveShouldSetPanResponder: (_e, g: PanResponderGestureState) =>
        !!latestProps.current.onMove && Math.abs(g.dy) > TAP_SLOP,
      // As TimelineBlock: the timeline's ScrollView must not take the touch mid-drag.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => latestProps.current.onDragStart?.(),
      onPanResponderMove: (_e, g) => y.setValue((latestProps.current.startSlot * H) + g.dy),
      onPanResponderRelease: (_e, g) => {
        const p = latestProps.current;
        p.onDragEnd?.();
        const requested = driveDropSlot(p.startSlot, g.dy, H, p.lo, p.hi);
        const landed = requested === p.startSlot ? p.startSlot : p.onMove?.(requested);
        settle(typeof landed === "number" ? landed : p.startSlot);
      },
      // Abandoned (the system took the touch): back to where it was, nothing moved.
      onPanResponderTerminate: () => {
        latestProps.current.onDragEnd?.();
        settle(latestProps.current.startSlot);
      },
    }),
  ).current;

  // A half hour at a time with a screen reader (swipe up or down).
  const onAccessibilityAction = (e: { nativeEvent: { actionName: string } }) => {
    const step = e.nativeEvent.actionName === "increment" ? 1 : e.nativeEvent.actionName === "decrement" ? -1 : 0;
    const next = Math.min(hi, Math.max(lo, startSlot + step));
    if (step && next !== startSlot) onMove?.(next);
  };

  return (
    <Animated.View
      testID="drive-block"
      accessible
      accessibilityLabel={`Drive from ${fromLabel} to ${toLabel}, about ${duration.toLowerCase()}, leaving ${time}`}
      {...(movable
        ? {
            accessibilityRole: "adjustable" as const,
            accessibilityHint: "Swipe up or down to leave earlier or later.",
            accessibilityActions: [{ name: "increment" }, { name: "decrement" }],
            onAccessibilityAction,
          }
        : {})}
      style={[styles.container, { height: slots * H, transform: [{ translateY: y }] }]}
      {...(movable ? pan.panHandlers : {})}
    >
      <View style={styles.inner}>
        <Car color={tokens.colors.textMuted} size={18} />
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            Drive to {toLabel}
          </Text>
          {slots > 1 ? (
            <Text style={styles.detail} numberOfLines={1}>
              {fromLabel} to {toLabel}
            </Text>
          ) : null}
          <Text style={styles.detail} numberOfLines={1}>
            {time} · About {duration}
          </Text>
        </View>
        {movable ? (
          <View testID="drive-grip">
            <GripHorizontal color={tokens.colors.textMuted} size={18} />
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: "absolute", top: 0, left: 82, right: tokens.space.md, paddingVertical: 2 },
  // Text sits at the top, beside the time the drive starts: a long drive is taller
  // than the screen, and centred text would be off it.
  inner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgSurface,
    overflow: "hidden",
  },
  text: { flex: 1 },
  title: { fontSize: 15, fontWeight: "700", color: tokens.colors.text },
  detail: { fontSize: 12, fontWeight: "600", color: tokens.colors.text2, marginTop: 2 },
});
