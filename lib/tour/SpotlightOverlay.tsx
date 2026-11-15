// The tour's dim, cut-out and card, copied from Rotorua's lib/tour/SpotlightOverlay.tsx.
// Changed here: the look (a white card, the highlight for Next, a dark teal dim), the card
// centred when its target hasn't registered, kept on screen at any height, and the layer
// made a modal for screen readers, with each step read out as it comes up.
// Since the design sweep (docs/plans/design-sweep.md): Skip Tour is inside the card, not a
// pill in the screen's corner, and the card has a pointer to the part it is about.
import React, { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, Mask, Rect } from "react-native-svg";
import Animated, { FadeIn, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";

import { useHalves, useWide } from "@blacksands/ui";

import { EXPLORE_SIDE } from "@/components/sites/ExploreSide";
import { cardLift, darkEdge, tokens } from "@/lib/ui/tokens";
import { useTour } from "./TourContext";
import { TourTripPreview } from "./TourTripPreview";

const AnimatedRect = Animated.createAnimatedComponent(Rect);
// Room round the lit part. It was 8, which on Explore ran the cut-out up over the bar.
const HOLE_PADDING = 4;
const CARD_HEIGHT_ESTIMATE = 190;
// The card's side margin, and the gap between it and the part it points at.
const CARD_SIDE = 12;
const CARD_GAP = 22;
const POINTER = 14;
// A Duo (docs/plans/design-sweep.md): the card is 360 wide, and a Welcome card's foot sits 24
// above the fold. A band target's card starts at the place column (the band, then its 20 pt
// side) and stays above the tab bar (about 64 pt).
const WIDE_CARD = 360;
const WELCOME_ABOVE_FOLD = 24;
const PLACE_COLUMN_SIDE = 20;
const TAB_BAR = 64;
// tokens.colors.scrim, the login screen's deep teal, as the dim's colour.
const DIM_RGB = "3,38,43";

export function SpotlightOverlay() {
  const { active, step, stepIndex, stepCount, targetRect, next, skip } = useTour();
  const win = useWindowDimensions();
  const wide = useWide();
  const { foldY, upright, ...halves } = useHalves();
  // The same numbers on a Duo (the window's own); named so a test can set them.
  const { width, height } = wide ? halves : win;
  const insets = useSafeAreaInsets();

  const holeX = useSharedValue(width / 2);
  const holeY = useSharedValue(height / 2);
  const holeW = useSharedValue(0);
  const holeH = useSharedValue(0);

  useEffect(() => {
    const to = targetRect
      ? {
          x: targetRect.x - HOLE_PADDING,
          y: targetRect.y - HOLE_PADDING,
          w: targetRect.width + HOLE_PADDING * 2,
          h: targetRect.height + HOLE_PADDING * 2,
          ms: 320,
        }
      : { x: width / 2, y: height / 2, w: 0, h: 0, ms: 200 };
    holeX.value = withTiming(to.x, { duration: to.ms });
    holeY.value = withTiming(to.y, { duration: to.ms });
    holeW.value = withTiming(to.w, { duration: to.ms });
    holeH.value = withTiming(to.h, { duration: to.ms });
  }, [targetRect, width, height, holeX, holeY, holeW, holeH]);

  const holeProps = useAnimatedProps(() => ({
    x: holeX.value,
    y: holeY.value,
    width: holeW.value,
    height: holeH.value,
  }));

  // Cards vary a lot in height (a caption vs. the trip preview), so where the card goes is
  // worked out again from its measured height on each step.
  const [cardHeight, setCardHeight] = useState(CARD_HEIGHT_ESTIMATE);
  useEffect(() => {
    setCardHeight(CARD_HEIGHT_ESTIMATE);
  }, [step?.id]);

  // The card takes the place of the screen for a screen reader, so it is read out as it
  // comes up rather than waiting to be found.
  useEffect(() => {
    if (active && step) AccessibilityInfo.announceForAccessibility(`${step.title}. ${step.body}`);
  }, [active, step]);

  if (!active || !step) return null;

  const top = insets.top + 16;
  const bottom = height - insets.bottom - 16;
  // A target in Explore's left band (wide): the card goes to its right, over the places.
  const inBand = wide && !!targetRect && targetRect.x < EXPLORE_SIDE;
  const fitsBelow = !!targetRect && targetRect.y + targetRect.height + CARD_GAP + cardHeight <= bottom;
  const welcomeTop = !wide ? (height - cardHeight) / 2 : upright ? foldY - WELCOME_ABOVE_FOLD - cardHeight : (height - cardHeight) / 2;
  const cardTop = !targetRect
    ? Math.max(top, welcomeTop)
    : inBand
      ? Math.max(top, Math.min(targetRect.y, bottom - TAB_BAR - cardHeight))
      : fitsBelow
        ? targetRect.y + targetRect.height + CARD_GAP
        : Math.max(top, targetRect.y - cardHeight - CARD_GAP);
  // The pointer sits under (or over) the middle of the lit part, kept clear of the card's
  // rounded corners.
  // The overlay covers the whole window, so the card keeps clear of the sides itself (a
  // Duo's rail, a landscape notch); 0 on a portrait iPhone.
  const sideLeft = CARD_SIDE + insets.left;
  const sideRight = CARD_SIDE + insets.right;
  // Wide: a fixed 360 card, centred on its target (or the screen) and kept off the sides.
  const area = width - insets.left - insets.right;
  const wideLeft = inBand
    ? EXPLORE_SIDE + PLACE_COLUMN_SIDE
    : Math.min(
        Math.max(targetRect ? targetRect.x + targetRect.width / 2 - WIDE_CARD / 2 : insets.left + (area - WIDE_CARD) / 2, sideLeft),
        width - sideRight - WIDE_CARD,
      );
  const cardLeft = wide ? wideLeft : sideLeft;
  const cardWidth = wide ? WIDE_CARD : width - sideLeft - sideRight;
  const pointerLeft = targetRect
    ? Math.min(Math.max(targetRect.x + targetRect.width / 2 - cardLeft, 28), cardWidth - 28) - POINTER / 2
    : 0;
  // On the card's left edge, at the target's middle, for a band target.
  const pointerTop = targetRect ? targetRect.y + targetRect.height / 2 - cardTop - POINTER / 2 : 0;

  const isLast = stepIndex === stepCount - 1;

  return (
    // A no-op Pressable (not a plain View) so it claims every touch behind the dim and the
    // cut-out: a bare View can lose the responder race to a screen's own elevated content
    // on Android. Not one accessible element, so a screen reader reaches the card's parts.
    <Pressable
      testID="tour-layer"
      accessible={false}
      accessibilityViewIsModal
      style={[StyleSheet.absoluteFill, styles.blocker]}
      onPress={() => {}}
    >
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <Mask id="spotlight-mask">
            <Rect x={0} y={0} width={width} height={height} fill="#FFFFFF" />
            <AnimatedRect animatedProps={holeProps} rx={12} fill="#000000" />
          </Mask>
        </Defs>
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={`rgba(${DIM_RGB},${step.dim ?? 0.82})`}
          mask="url(#spotlight-mask)"
        />
        {/* Wide: a ring round the lit part, so it reads in light and in dark. */}
        {wide ? (
          <AnimatedRect
            testID="tour-ring"
            animatedProps={holeProps}
            rx={12}
            fill="none"
            stroke={tokens.colors.selected}
            strokeWidth={2}
          />
        ) : null}
      </Svg>

      <Animated.View
        key={step.id}
        testID="tour-card"
        entering={FadeIn.duration(220)}
        onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
        style={[
          styles.card,
          { top: cardTop, left: cardLeft, maxHeight: height - insets.top - insets.bottom - 32 },
          wide ? { width: WIDE_CARD } : { right: sideRight },
        ]}
      >
        <View pointerEvents="none" style={[darkEdge, styles.cardEdge]} />
        {targetRect ? (
          <View
            testID="tour-pointer"
            pointerEvents="none"
            style={[
              styles.pointer,
              inBand
                ? [styles.pointerLeft, { left: -POINTER / 2, top: pointerTop }]
                : [fitsBelow ? styles.pointerUp : styles.pointerDown, { left: pointerLeft }],
            ]}
          />
        ) : null}
        {step.id === "trip" && (
          <ScrollView style={styles.previewScroll} bounces={false}>
            <TourTripPreview />
          </ScrollView>
        )}
        <Text style={styles.title} accessibilityRole="header">
          {step.title}
        </Text>
        <Text style={styles.body}>{step.body}</Text>
        <View style={styles.footer}>
          <View>
            <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {Array.from({ length: stepCount }).map((_, i) => (
                <View key={i} style={[styles.dot, i === stepIndex && styles.dotActive]} />
              ))}
            </View>
            {/* The way out, with the card it leaves. Not on the last step: Done ends it. */}
            {!isLast && (
              <Pressable
                style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed]}
                onPress={skip}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Skip tour"
              >
                <Text style={styles.skipText}>Skip Tour</Text>
              </Pressable>
            )}
          </View>
          <Pressable
            style={({ pressed }) => [styles.nextBtn, pressed && styles.pressed]}
            onPress={next}
            accessibilityRole="button"
          >
            <Text style={styles.nextText}>{step.nextLabel ?? (isLast ? "Done" : "Next")}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  blocker: { elevation: 999, zIndex: 999 },
  pressed: { opacity: 0.8 },
  card: {
    position: "absolute",
    // bgCard: white as the page is in light; in dark a step lighter, as the dim around it
    // is nearly the page's own colour.
    backgroundColor: tokens.colors.bgCard,
    borderRadius: 20,
    paddingHorizontal: tokens.space.lg,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 6,
    ...cardLift,
  },
  cardEdge: { borderRadius: 20 },
  // A square of the card's colour turned on its corner, half behind the card's edge. In
  // dark its two outer sides carry the card's hairline, and it covers the card's own line
  // where the two meet.
  pointer: {
    position: "absolute",
    width: POINTER,
    height: POINTER,
    backgroundColor: tokens.colors.bgCard,
    borderColor: darkEdge.borderColor,
    transform: [{ rotate: "45deg" }],
  },
  pointerUp: { top: -POINTER / 2, borderTopWidth: 1, borderLeftWidth: 1 },
  pointerDown: { bottom: -POINTER / 2, borderBottomWidth: 1, borderRightWidth: 1 },
  pointerLeft: { borderBottomWidth: 1, borderLeftWidth: 1 },
  // Shrinks first when the card meets its height limit, so Next stays on screen.
  previewScroll: { flexShrink: 1, flexGrow: 0, marginBottom: tokens.space.xs },
  title: { fontSize: 20, lineHeight: 25, fontWeight: "700", color: tokens.colors.text, letterSpacing: -0.2 },
  body: { fontSize: 15, color: tokens.colors.text2, lineHeight: 21 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  dots: { flexDirection: "row", gap: 6 },
  // The step you're on is teal, as "selected" is everywhere; orange is the button to tap.
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: tokens.colors.border },
  dotActive: { backgroundColor: tokens.colors.selected, width: 16 },
  // A quiet link, with its own 44pt of height so it's an easy tap.
  skipBtn: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start", marginTop: 2 },
  skipText: { color: tokens.colors.selected, fontSize: 15, fontWeight: "500" },
  nextBtn: {
    minHeight: 44,
    justifyContent: "center",
    backgroundColor: tokens.button.primary.bg,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  nextText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
