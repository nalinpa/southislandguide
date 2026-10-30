// The tour's dim, cut-out and card, copied from Rotorua's lib/tour/SpotlightOverlay.tsx.
// Changed here: the look (a white card, the highlight for Next, a dark teal dim), the card
// centred when its target hasn't registered, kept on screen at any height, and the layer
// made a modal for screen readers, with each step read out as it comes up.
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

import { cardLift, tokens } from "@/lib/ui/tokens";
import { useTour } from "./TourContext";
import { TourTripPreview } from "./TourTripPreview";

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const HOLE_PADDING = 8;
const CARD_HEIGHT_ESTIMATE = 180;
// tokens.colors.scrim, the login screen's deep teal, as the dim's colour.
const DIM_RGB = "3,38,43";

export function SpotlightOverlay() {
  const { active, step, stepIndex, stepCount, targetRect, next, skip } = useTour();
  const { width, height } = useWindowDimensions();
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
  const fitsBelow = !!targetRect && targetRect.y + targetRect.height + 20 + cardHeight <= bottom;
  const cardTop = !targetRect
    ? Math.max(top, (height - cardHeight) / 2)
    : fitsBelow
      ? targetRect.y + targetRect.height + 20
      : Math.max(top, targetRect.y - cardHeight - 20);

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
            <AnimatedRect animatedProps={holeProps} rx={16} fill="#000000" />
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
      </Svg>

      {!isLast && (
        <Pressable
          style={({ pressed }) => [
            styles.skipBtn,
            step.skipAtBottom ? { bottom: insets.bottom + 12 } : { top: insets.top + 12 },
            pressed && styles.pressed,
          ]}
          onPress={skip}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Skip tour"
        >
          <Text style={styles.skipText}>Skip Tour</Text>
        </Pressable>
      )}

      <Animated.View
        key={step.id}
        testID="tour-card"
        entering={FadeIn.duration(220)}
        onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
        style={[styles.card, { top: cardTop, maxHeight: height - insets.top - insets.bottom - 32 }]}
      >
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
          <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {Array.from({ length: stepCount }).map((_, i) => (
              <View key={i} style={[styles.dot, i === stepIndex && styles.dotActive]} />
            ))}
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
  skipBtn: {
    position: "absolute",
    right: 16,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  skipText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  card: {
    position: "absolute",
    left: 20,
    right: 20,
    backgroundColor: tokens.colors.bgCard,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.lg,
    gap: tokens.space.xs,
    ...cardLift,
  },
  // Shrinks first when the card meets its height limit, so Next stays on screen.
  previewScroll: { flexShrink: 1, flexGrow: 0, marginBottom: tokens.space.xs },
  title: { fontSize: 19, fontWeight: "800", color: tokens.colors.text, letterSpacing: -0.3 },
  body: { fontSize: 15, color: tokens.colors.text2, lineHeight: 21 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: tokens.space.xs },
  dots: { flexDirection: "row", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: tokens.colors.border },
  dotActive: { backgroundColor: tokens.colors.highlight, width: 16 },
  nextBtn: {
    minHeight: 44,
    justifyContent: "center",
    backgroundColor: tokens.colors.highlight,
    paddingHorizontal: 24,
    borderRadius: 99,
  },
  nextText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
