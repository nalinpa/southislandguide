import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, PanResponder } from "react-native";
import { Car, GripHorizontal } from "lucide-react-native";
import { createTimelineBlockPanHandlers, type TimelineBlockProps } from "@blacksands/components";

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
  /** Hold to move (ms), as TimelineBlock's: unset, it drags from touch-down. */
  holdToDrag?: number;
};

// Where a drag lands: the half hour the engine rounded to, kept between the end of the
// place before the drive and the start of the place it leads to.
export function driveDropSlot(requested: number, earliest: number, latest: number): number {
  return Math.min(latest, Math.max(earliest, requested));
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
export function DriveBlock({ fromLabel, toLabel, startSlot, slots, earliest, latest, onMove, onDragStart, onDragEnd, holdToDrag }: DriveBlockProps) {
  const H = PLANNER.SLOT_HEIGHT;
  const time = slotIndexToTimeLabel(startSlot);
  // Lower case: it follows "About" mid-line ("About 1 hour", as "About 30 min").
  const duration = slotsToDurationLabel(slots).toLowerCase();
  const lo = earliest ?? startSlot;
  const hi = latest ?? startSlot;
  const movable = !!onMove;

  const pan = useRef(new Animated.ValueXY({ x: 0, y: startSlot * H })).current;
  const currentY = useRef(startSlot * H);
  useEffect(() => {
    const id = pan.y.addListener(({ value }) => {
      currentY.current = value;
    });
    return () => pan.y.removeListener(id);
  }, [pan]);
  useEffect(() => {
    Animated.spring(pan, { toValue: { x: 0, y: startSlot * H }, useNativeDriver: false, friction: 7 }).start();
  }, [pan, startSlot, H]);

  // The engine's place block gesture (TimelineBlock's), so a drive picks up the way a place
  // does: with holdToDrag, a swipe scrolls the day and a hold then a drag moves it. The
  // handlers are made once; they read the props through this. A drive has no editor, so a
  // tap does nothing.
  const latestProps = useRef<TimelineBlockProps>(null as unknown as TimelineBlockProps);
  latestProps.current = {
    item: { id: "drive", siteName: "", slotIndex: startSlot, durationSlots: slots },
    maxSlots: PLANNER.MAX_GRID_SLOTS,
    slotHeight: H,
    // The engine rounds to the nearest half hour; a drive also keeps between its places.
    onDrop: (_id, slot) => {
      const to = driveDropSlot(slot, lo, hi);
      const landed = to === startSlot ? startSlot : onMove?.(to);
      return typeof landed === "number" ? landed : startSlot;
    },
    onEdit: () => {},
    onDragStart: () => onDragStart?.(),
    onDragEnd: () => onDragEnd?.(),
    holdToDrag,
  };
  const [gesture] = useState(() => {
    const handlers = createTimelineBlockPanHandlers(pan, currentY, latestProps, () => {});
    return { handlers, responder: PanResponder.create(handlers) };
  });
  // Removed mid-hold (the day switched): the hold's timer goes with it.
  useEffect(() => gesture.handlers.cancelHold, [gesture]);

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
      accessibilityLabel={`Drive from ${fromLabel} to ${toLabel}, about ${duration}, leaving ${time}`}
      {...(movable
        ? {
            accessibilityRole: "adjustable" as const,
            accessibilityHint: "Swipe up or down to leave earlier or later.",
            accessibilityActions: [{ name: "increment" }, { name: "decrement" }],
            onAccessibilityAction,
          }
        : {})}
      style={[styles.container, { height: slots * H, transform: [{ translateY: pan.y }] }]}
      {...(movable ? gesture.responder.panHandlers : {})}
    >
      <View style={styles.inner}>
        <Car color={tokens.colors.text2} size={22} strokeWidth={2} />
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
  // 64 from the left, as the place blocks and the short drives are (ItineraryDetailView's BLOCK_LEFT).
  container: { position: "absolute", top: 0, left: 64, right: tokens.space.md, paddingVertical: 2 },
  // Text sits at the top, beside the time the drive starts: a long drive is taller
  // than the screen, and centred text would be off it.
  inner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    // The car 14 in and the words 46 in: the place block's icon column and text edge.
    gap: 10,
    paddingLeft: 14,
    paddingRight: 12,
    paddingVertical: 10,
    borderRadius: 12,
    // A pale teal with no outline (design sweep, the Days view, round 5): a fill on this
    // screen means the block can be dragged. It was white with a line.
    backgroundColor: tokens.colors.driveFill,
    overflow: "hidden",
  },
  text: { flex: 1 },
  title: { fontSize: 15, fontWeight: "600", color: tokens.colors.text },
  detail: { fontSize: 12, fontWeight: "600", color: tokens.colors.text2, marginTop: 2 },
});
