// The pieces the quiz's questions are made of. The look is the website quiz's (kiwiguide-site
// public/styles.css, its .q-* rules), which the owner preferred to the app's flat rows, in the app's own
// colours so dark mode holds. Its paper, bar and line are bgBase, bgCard and line; its muted words are text2.
// Its two signal colours follow the app's rule instead (the tab bar, the tour's dots): teal for where you are and
// what you picked (its orange bar and green chosen state), orange only for the button to tap (its green Next).
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type TextInstance,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Check, ChevronLeft, ChevronRight, X, type LucideIcon } from "lucide-react-native";

import { cardLift, tokens } from "@/lib/ui/tokens";

// The dark behind a photo and under the words on it (the website's "night"): the login screen's scrim, a plain
// string so it can go into a gradient, and the same in light and dark, as a photo is.
const NIGHT = tokens.colors.scrim;
// Words and ticks over a photo or a filled disc: white in light and dark (as the "In trip" badge has it).
const ON_PHOTO = "#FFFFFF";

/** The website's Next: the app's main button at its height, corners and label. Pass as AppButton's shape. */
export const QUIZ_BUTTON = { radius: 16, height: 56, labelSize: 18, labelWeight: "800" } as const;
/** The quiz's one column on a wide screen: the website's phone width, centred. Its own wide layouts are stage 8. */
export const QUIZ_COLUMN = 520;

// Whether the phone is set to reduce motion, read when something is about to move. In a ref: turning it on
// or off draws nothing by itself.
function useReduceMotion() {
  const reduce = useRef(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      reduce.current = on;
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (on) => {
      reduce.current = on;
    });
    return () => sub.remove();
  }, []);
  return reduce;
}

// The bar slides to each step's place in a quarter of a second, the one thing that moves on the website's quiz
// too; under reduce motion it jumps.
function ProgressBar({ now }: { now: number }) {
  const reduce = useReduceMotion();
  const at = useRef(new Animated.Value(now)).current;
  const shown = useRef(now);
  useEffect(() => {
    if (shown.current === now) return;
    shown.current = now;
    if (reduce.current) at.setValue(now);
    // Width can't go to the native driver; it is one small view.
    else Animated.timing(at, { toValue: now, duration: 250, easing: Easing.ease, useNativeDriver: false }).start();
  }, [now, at, reduce]);
  return (
    <View
      style={styles.bar}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Quiz progress"
      accessibilityValue={{ min: 0, max: 100, now }}
    >
      <Animated.View style={[styles.barFill, { width: at.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }) }]} />
    </View>
  );
}

function RoundButton({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.round} onPress={onPress} activeOpacity={0.6} accessibilityRole="button" accessibilityLabel={label}>
      <Icon size={20} strokeWidth={2.2} color={tokens.colors.text} />
    </TouchableOpacity>
  );
}

/**
 * The quiz's top row: a round Back (left out on the first question), the bar, and a round Close where the
 * website has its name. No title.
 */
export function QuizHeader({ progress, onBack, onClose }: { progress: number; onBack?: () => void; onClose: () => void }) {
  return (
    <View style={styles.header}>
      {onBack ? <RoundButton icon={ChevronLeft} label="Back" onPress={onBack} /> : null}
      <ProgressBar now={progress} />
      <RoundButton icon={X} label="Close" onPress={onClose} />
    </View>
  );
}

/** A question's head: the small line over it, the question, and a line under it. */
export function QuizHead({ kicker, title, lead, small }: { kicker?: string; title: string; lead?: string; small?: boolean }) {
  const heading = useRef<TextInstance>(null);
  // A new question: a screen reader starts at it, as the website moves focus to each new heading.
  useEffect(() => {
    if (heading.current) AccessibilityInfo.sendAccessibilityEvent(heading.current, "focus");
  }, []);
  return (
    <View style={styles.head}>
      {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
      <Text ref={heading} accessibilityRole="header" style={[styles.title, small && styles.titleSmall]}>
        {title}
      </Text>
      {lead ? <Text style={[styles.lead, small && styles.leadSmall]}>{lead}</Text> : null}
    </View>
  );
}

// A button or card that takes its share of the screen's spare height, up to `most`, as the website's do (flex
// with a max-height), so a few of them fill a phone and many of them scroll. The limit is lifted to the words'
// own height, which is measured: at a large text size they are never cut off.
function useShare(most: number, around = 0) {
  const [words, setWords] = useState(0);
  return {
    share: { flexGrow: 1, flexShrink: 0, maxHeight: Math.max(most, words + around) } as const,
    onWords: (e: LayoutChangeEvent) => setWords(e.nativeEvent.layout.height),
  };
}

type OptionButtonProps = {
  label: string;
  hint?: string;
  /** The answer given before (back on a question already answered). */
  selected?: boolean;
  onPress: () => void;
};

// One answer in a list: the website's bordered button, with the chevron that says a tap goes straight on. The
// one picked before has a teal border, a pale teal fill and a tick in place of the chevron.
export function OptionButton({ label, hint, selected = false, onPress }: OptionButtonProps) {
  // 32: the button's own padding and border, above and below the words.
  const { share, onWords } = useShare(96, 32);
  return (
    <TouchableOpacity
      style={[styles.option, share, selected && styles.optionOn]}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      accessibilityState={{ selected }}
    >
      <View style={styles.optionWords} onLayout={onWords}>
        <Text style={styles.optionLabel}>{label}</Text>
        {hint ? <Text style={styles.optionHint}>{hint}</Text> : null}
      </View>
      {selected ? (
        <Check size={20} strokeWidth={2.5} color={tokens.colors.selected} />
      ) : (
        <ChevronRight size={20} strokeWidth={2.5} color={tokens.colors.text2} />
      )}
    </TouchableOpacity>
  );
}

type TownCardProps = {
  img: string;
  title: string;
  line: string;
  selected?: boolean;
  /** The loop back to the start town: the website's ring round it. */
  home?: boolean;
  onPress: () => void;
};

// A town to pick: its photo fills the card, with its name and a line in white over a dark fade at the foot.
// The photos come from the api, as on the website: with no signal the card is its dark fill and still reads.
export function TownCard({ img, title, line, selected = false, home, onPress }: TownCardProps) {
  const { share, onWords } = useShare(300);
  return (
    // The shadow is on this view and the clipping on the one inside: iOS cuts a shadow off a view that clips.
    <View style={[styles.cardLift, share]}>
      <TouchableOpacity
        testID="town-card"
        style={styles.card}
        activeOpacity={0.8}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${line}`}
        accessibilityState={{ selected }}
      >
        <Image testID="town-photo" source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} accessible={false} />
        {/* In the card's own flow, not laid over it, so a card is never shorter than its words. */}
        <LinearGradient colors={[`${NIGHT}00`, `${NIGHT}E6`, `${NIGHT}E6`]} locations={[0, 0.4, 1]} style={styles.cardWords} onLayout={onWords}>
          <Text style={styles.cardName}>{title}</Text>
          <Text style={styles.cardLine}>{line}</Text>
        </LinearGradient>
        {selected ? (
          <View testID="town-picked" style={styles.cardTick}>
            <Check size={16} strokeWidth={3} color={ON_PHOTO} />
          </View>
        ) : null}
      </TouchableOpacity>
      {home ? <View testID="town-home-ring" pointerEvents="none" style={styles.cardRing} /> : null}
    </View>
  );
}

/** The first photo break's photo: a card at the top of the screen, not the whole screen (it is a small photo). */
export function BreakPhoto({ uri }: { uri: string }) {
  const { height } = useWindowDimensions();
  return (
    <View style={styles.breakLift}>
      {/* ponytail: cut to 3:2, as the app frames its place photos; the website shows it at its own shape.
          Read the shape from the photo once it loads if a town's ever crops badly. */}
      <Image testID="town-photo" source={{ uri }} style={[styles.breakPhoto, { maxHeight: height * 0.52 }]} contentFit="cover" transition={150} accessible={false} />
    </View>
  );
}

// The slider's height (a full finger) and its knob.
const SLIDER = 44;
const KNOB = 28;

type DaysSliderProps = { value: number; min: number; max: number; onChange: (n: number) => void };

// The website's range input. Dragged the way the trip view's drive block is (PanResponder): a day is a step
// about 14 pt wide on a phone, so it needs no animation thread, and it runs as it is in the tests.
// To a screen reader it is a slider: swipe up or down for a day more or fewer.
export function DaysSlider({ value, min, max, onChange }: DaysSliderProps) {
  // The touch handlers are made once; they read the newest numbers through this. width: the slider's, for
  // turning where a finger is into a day. from: where the finger went down.
  const live = useRef({ width: 0, min, max, onChange, from: 0 });
  Object.assign(live.current, { min, max, onChange });
  const [pan] = useState(() => {
    // The day under a point on the slider: the knob's middle runs from half a knob in to half a knob short.
    const set = (x: number) => {
      const { width: w, min: lo, max: hi } = live.current;
      const run = w - KNOB;
      if (run > 0) live.current.onChange(Math.max(lo, Math.min(hi, lo + Math.round(((x - KNOB / 2) / run) * (hi - lo)))));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // A drag on the slider is the slider's: the page under it doesn't take it back to scroll.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        live.current.from = e.nativeEvent.locationX;
        set(live.current.from);
      },
      onPanResponderMove: (_e, g) => set(live.current.from + g.dx),
    });
  });
  // How far along the line the knob is, 0 to 1. Drawn by share of the line (flex), not by the measured width, so
  // it is in place on the first frame.
  const along = max > min ? (value - min) / (max - min) : 0;
  const step = (by: number) => onChange(Math.max(min, Math.min(max, value + by)));
  return (
    <View
      style={styles.slider}
      onLayout={(e) => {
        live.current.width = e.nativeEvent.layout.width;
      }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Number of days"
      accessibilityValue={{ min, max, now: value, text: `${value} days` }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === "increment") step(1);
        if (e.nativeEvent.actionName === "decrement") step(-1);
      }}
      {...pan.panHandlers}
    >
      {/* Nothing inside takes a touch, so where a finger lands is measured from the slider's own edge. */}
      <View pointerEvents="none" style={styles.sliderLine} />
      <View pointerEvents="none" style={styles.sliderRow}>
        <View testID="days-slider-fill" style={[styles.sliderFill, { flex: along }]} />
        <View style={styles.sliderKnob} />
        <View testID="days-slider-rest" style={{ flex: 1 - along }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // .q-head: the row under the clock. In the page's column on an iPad.
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    maxWidth: QUIZ_COLUMN,
    alignSelf: "center",
    paddingHorizontal: tokens.space.md,
    paddingTop: tokens.space.xs,
    paddingBottom: 10,
  },
  // .q-back: 44 round, a hairline, the card colour.
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    backgroundColor: tokens.colors.bgCard,
    alignItems: "center",
    justifyContent: "center",
  },
  // .q-bar: 8 tall and rounded, filling the row.
  bar: { flex: 1, height: 8, borderRadius: 4, backgroundColor: tokens.colors.line, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4, backgroundColor: tokens.colors.selected },
  // .q-kicker and the quiz's h1 (28, semibold, tight), at the website's sizes: not in the app's type scale.
  head: { gap: 8, marginBottom: 8 },
  kicker: { fontSize: 15, fontWeight: "600", color: tokens.colors.text2 },
  title: { fontSize: 28, lineHeight: 33, fontWeight: "600", letterSpacing: -0.7, color: tokens.colors.text },
  lead: { fontSize: 17, lineHeight: 24, fontWeight: "600", color: tokens.colors.text },
  // The photo break's line (.q-brk-line) and the town's line under it (.q-brk-body).
  titleSmall: { fontSize: 26, lineHeight: 33 },
  leadSmall: { fontWeight: "400", lineHeight: 25 },
  // .q-btn: a 2 pt line round a card-coloured button with 14 corners; .q-on for the one picked.
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 56,
    paddingVertical: 14,
    paddingLeft: 18,
    paddingRight: 14,
    borderWidth: 2,
    borderColor: tokens.colors.line,
    borderRadius: 14,
    backgroundColor: tokens.colors.bgCard,
  },
  optionOn: { borderColor: tokens.colors.selected, backgroundColor: tokens.colors.selFill },
  optionWords: { flex: 1 },
  optionLabel: { fontSize: 17, lineHeight: 23, fontWeight: "600", color: tokens.colors.text },
  optionHint: { marginTop: 2, fontSize: 14, lineHeight: 19, color: tokens.colors.text2 },
  // .q-town: 20 corners, a soft shadow (the app's card shadow, near the website's), at least 176 tall.
  cardLift: { minHeight: 176, borderRadius: 20, backgroundColor: NIGHT, ...cardLift },
  card: { flexGrow: 1, justifyContent: "flex-end", borderRadius: 20, overflow: "hidden", backgroundColor: NIGHT },
  // .q-town-text: the fade starts well above the words.
  cardWords: { gap: 4, paddingTop: 64, paddingHorizontal: 16, paddingBottom: 14 },
  cardName: { fontSize: 22, lineHeight: 27, fontWeight: "800", color: ON_PHOTO },
  cardLine: { fontSize: 14, lineHeight: 20, color: ON_PHOTO },
  // The town picked before: a tick on the app's teal fill, in the photo's corner (the website's ticked box).
  cardTick: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: ON_PHOTO,
    backgroundColor: tokens.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  // .q-home: a 4 pt ring just outside the card, in the amber that marks things on the app's dark bar (the
  // website's is its yellow). Outside, so the photo lines up with the other cards'.
  cardRing: {
    position: "absolute",
    top: -4,
    right: -4,
    bottom: -4,
    left: -4,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: tokens.colors.highlightOnDark,
  },
  // .q-brk-card: the photo as a card with a deeper shadow.
  breakLift: { borderRadius: 20, backgroundColor: NIGHT, ...cardLift, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 20 },
  breakPhoto: { width: "100%", aspectRatio: 3 / 2, borderRadius: 20 },
  // .q-range: a full finger tall, the line and knob drawn in its middle.
  slider: { height: SLIDER, justifyContent: "center" },
  // The whole line, behind; then, in a row over it, the filled part up to the knob, the knob, and the rest.
  sliderLine: { position: "absolute", left: 0, right: 0, top: (SLIDER - 6) / 2, height: 6, borderRadius: 3, backgroundColor: tokens.colors.line },
  sliderRow: { flexDirection: "row", alignItems: "center" },
  sliderFill: { height: 6, borderTopLeftRadius: 3, borderBottomLeftRadius: 3, backgroundColor: tokens.colors.selected },
  sliderKnob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    borderWidth: 2,
    borderColor: tokens.colors.selected,
    backgroundColor: tokens.colors.bgCard,
  },
});
