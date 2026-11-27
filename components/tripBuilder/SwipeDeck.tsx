// The swipe cards of "What are you into?": one card per kind of place or activity, answered by swiping it right
// (yes) or left (no), or with the Yes and No buttons under it. The behaviour is the website's deck (the page half
// of kiwiguide-site public/plan/quiz.js: setupDeck, decide and its hint), the look its .q-card rules. What the
// cards are and what the answers become is the copied quiz logic's, wired up in QuizSteps (IntoStep).
//
// How it moves: the card and its YES and NOPE stamps hang off one animated value that lives on the phone's
// animation thread (the native driver). A finger is followed with PanResponder, the way the trip view's drive
// block is: JavaScript only passes the finger's place along, a number a frame, while nothing else is running.
// Flying off, springing back and the nudge are whole animations run on that thread, so none of them waits on
// JavaScript or on a redraw.
// ponytail: not gesture-handler + reanimated, which would take the finger off the JavaScript thread too. Jest
// here can't load reanimated or worklets (jest.config.js has no resolver for them, and other suites stub them
// by hand), so the swipe would be tested against stand-ins; with PanResponder the tests drive the real code.
// Move the finger to a gesture-handler pan if the owner feels a lag on the phone: decide() and the value stay.
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
  type GestureResponderHandlers,
  type PanResponderGestureState,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Heart, X } from "lucide-react-native";

import { cardLift, tokens } from "@/lib/ui/tokens";
import { NIGHT, ON_PHOTO, useReduceMotion } from "./quizParts";

/** A card as it is drawn. credit: the place in the photo and whose photo it is, as the website words it. */
export type DeckCard = { id: string; label: string; hint: string; img: string; alt: string; credit: string };

type SwipeDeckProps = {
  /** The card to answer, and the one under it (none under the last). */
  card: DeckCard;
  next?: DeckCard;
  /** Where the card is in the deck ("3 of 11"), for a screen reader. */
  count: string;
  /** The deck's first card: the one-time nudge may play. */
  first?: boolean;
  /** The card has been answered and, unless the phone is set to reduce motion, has flown off. */
  onAnswer: (yes: boolean) => void;
};

// The website's numbers: a card let go more than 100 pt from the middle counts, it tilts a degree for every
// 18 pt, its stamp is full at 90 pt, and it flies off or comes back in a quarter of a second.
const PAST = 100;
const TILT = 18;
const STAMP = 90;
const OFF_MS = 250;
// The card under the top one, while the top one is in the middle: this much of its full size.
const UNDER = 0.95;
// The app's addition: a quick flick counts though it is short of that, once the card has moved a little.
// Points a millisecond, from the finger's last move.
const FLICK = 0.5;
const FLICK_FROM = 24;
// A sideways move this long takes the card; less, or more up and down than sideways, is left to the page.
const TAKE = 4;

/**
 * The nudge has been shown: once for each run of the app, as the website shows it once for each visit.
 * Out in the open so a test can start afresh.
 */
export const deckNudge = { seen: false };

export function SwipeDeck({ card, next, count, first, onAnswer }: SwipeDeckProps) {
  const { width, fontScale } = useWindowDimensions();
  const reduce = useReduceMotion();
  // Everything below is made once; it reads the newest card and callback through this.
  // off: how far a card flies, clear of the window from wherever its column sits. busy: a card is on its way
  // off. answered: the card whose answer was last passed on. gone: the question has been left.
  const live = useRef({ card, onAnswer, off: 0, busy: false, answered: null as string | null, gone: false });
  Object.assign(live.current, { card, onAnswer, off: width * 1.3 });

  const [deck] = useState(() => {
    // One value per card, made on the animation thread from the start, so a finger's moves go straight there.
    const pans = new Map<string, Animated.Value>();
    const panOf = (id: string) => {
      let pan = pans.get(id);
      if (!pan) pans.set(id, (pan = new Animated.Value(0, { useNativeDriver: true })));
      return pan;
    };

    const nudge: { timer?: ReturnType<typeof setTimeout>; moving?: Animated.CompositeAnimation } = {};
    const stopNudge = () => {
      clearTimeout(nudge.timer);
      nudge.moving?.stop();
      nudge.moving = undefined;
    };

    // The card on top can still be answered: it isn't on its way off, and its answer hasn't been passed on. Once
    // it has, the next card takes a moment to be drawn; a tap or swipe in that moment is still on this card, and
    // must not answer it again (the deck would go on a card too far).
    const open = () => {
      const now = live.current;
      return !now.busy && !now.gone && now.answered !== now.card.id;
    };
    const pass = (id: string, yes: boolean) => {
      live.current.answered = id;
      live.current.onAnswer(yes);
    };

    // A card answered: it flies off, then the answer is passed on (the next card, or the next question).
    const decide = (yes: boolean) => {
      if (!open()) return;
      const now = live.current;
      const id = now.card.id;
      stopNudge();
      if (reduce.current) return pass(id, yes);
      now.busy = true;
      Animated.timing(panOf(id), {
        toValue: yes ? now.off : -now.off,
        duration: OFF_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        now.busy = false;
        // Stopped, or the question left mid-flight: nothing was answered.
        if (finished && !now.gone) pass(id, yes);
      });
    };

    // The finger lifted (or the touch was taken away): past the point or a quick flick answers, else back it goes.
    const letGo = (g: PanResponderGestureState) => {
      const now = live.current;
      if (!open()) return;
      const flick = Math.abs(g.vx) > FLICK && Math.abs(g.dx) > FLICK_FROM && g.vx * g.dx > 0;
      if (Math.abs(g.dx) > PAST || flick) return decide(g.dx > 0);
      const pan = panOf(now.card.id);
      if (reduce.current) pan.setValue(0);
      else Animated.spring(pan, { toValue: 0, speed: 18, bounciness: 6, useNativeDriver: true }).start();
    };

    const responder = PanResponder.create({
      // Not on a touch alone, so the page under the cards can still be scrolled from them (the website's
      // touch-action: pan-y): only once the finger has gone sideways.
      onMoveShouldSetPanResponder: (_e, g) => open() && Math.abs(g.dx) > TAKE && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: stopNudge,
      onPanResponderMove: (_e, g) => {
        if (open()) panOf(live.current.card.id).setValue(g.dx);
      },
      onPanResponderRelease: (_e, g) => letGo(g),
      onPanResponderTerminate: (_e, g) => letGo(g),
    });

    return { panOf, decide, nudge, stopNudge, handlers: responder.panHandlers };
  });

  // Set back when the effect runs, not only where the deck is made: React may undo an effect and run it again.
  useEffect(() => {
    live.current.gone = false;
    return () => {
      live.current.gone = true;
    };
  }, []);

  // A new card is read out, with where it is in the deck. Not the first: the question has just been.
  const shown = useRef(card.id);
  useEffect(() => {
    if (shown.current === card.id) return;
    shown.current = card.id;
    AccessibilityInfo.announceForAccessibilityWithOptions(`${card.label}. ${card.hint}. ${count}.`, { queue: true });
  }, [card, count]);

  // The website's one-time nudge: a moment after the first card shows it leans right, then left (out in 600 ms,
  // held for 400, back in 500), to show it moves. A touch or an answer stops it.
  useEffect(() => {
    if (!first || deckNudge.seen) return;
    const pan = deck.panOf(card.id);
    deck.nudge.timer = setTimeout(() => {
      // Read now, not when the card showed: the setting comes in a moment after the screen does. Not counted
      // as seen, so it can still play once the setting is off.
      if (reduce.current || live.current.busy) return;
      deckNudge.seen = true;
      const to = (toValue: number, duration: number, easing: (t: number) => number) =>
        Animated.timing(pan, { toValue, duration, easing, useNativeDriver: true });
      const out = Easing.out(Easing.ease);
      const back = Easing.inOut(Easing.ease);
      deck.nudge.moving = Animated.sequence([
        to(40, 600, out),
        to(40, 400, Easing.linear),
        to(0, 500, back),
        to(-40, 600, out),
        to(-40, 400, Easing.linear),
        to(0, 500, back),
      ]);
      deck.nudge.moving.start();
    }, 600);
    return deck.stopNudge;
  }, [first, card.id, deck, reduce]);

  const what = card.label.toLowerCase();
  const said = `${count}. ${card.hint}`;
  return (
    <>
      {/* .q-deck: as tall as the screen has room for. Taller with larger text, so a card's words fit on it. */}
      <View style={[styles.deck, { minHeight: 260 * Math.max(1, fontScale) }]}>
        {/* Keyed by card: the one under becomes the one on top without being drawn again, photo and all. */}
        {next ? <Card key={next.id} card={next} over={deck.panOf(card.id)} /> : null}
        <Card key={card.id} card={card} pan={deck.panOf(card.id)} off={live.current.off} handlers={deck.handlers} />
      </View>
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.round, styles.roundNo]}
          onPress={() => deck.decide(false)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`No, skip ${what}`}
          accessibilityHint={said}
        >
          <X size={28} strokeWidth={2.6} color={ON_PHOTO} />
          <Text style={styles.roundWord}>No</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.round, styles.roundYes]}
          onPress={() => deck.decide(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Yes, add ${what}`}
          accessibilityHint={said}
        >
          <Heart size={26} color={ON_PHOTO} fill={ON_PHOTO} />
          <Text style={styles.roundWord}>Yes</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

type CardProps = {
  card: DeckCard;
  /** On top: where the card is, sideways from the middle. Left out for the card under it. */
  pan?: Animated.Value;
  off?: number;
  handlers?: GestureResponderHandlers;
  /** Under the top card: where the top card is. */
  over?: Animated.Value;
};

// One card: the photo fills it, with its name, its line and the photo's credit in white over a dark fade.
// The card under the top one is the same card, a little smaller so all of it is behind (the website's is inset
// by about as much). It shows as the top one moves away, and grows to full size as the top one nears the point
// where it counts, so nothing jumps when it takes the top card's place.
function Card({ card, pan, off = 1, handlers, over }: CardProps) {
  const top = !!pan;
  return (
    <Animated.View
      testID={top ? "deck-card" : "deck-under"}
      style={[
        styles.cardLift,
        {
          transform: top
            ? [{ translateX: pan }, { rotate: pan.interpolate({ inputRange: [-off, off], outputRange: [`${-off / TILT}deg`, `${off / TILT}deg`] }) }]
            : [{ scale: over ? over.interpolate({ inputRange: [-PAST, 0, PAST], outputRange: [1, UNDER, 1], extrapolate: "clamp" }) : UNDER }],
        },
      ]}
      pointerEvents={top ? "auto" : "none"}
      accessibilityElementsHidden={!top}
      importantForAccessibility={top ? "auto" : "no-hide-descendants"}
      {...handlers}
    >
      <View style={styles.card}>
        <Image
          testID="deck-photo"
          source={{ uri: card.img }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          // A photo that arrives after its card fades in over the card's dark fill.
          transition={150}
          accessible
          accessibilityRole="image"
          accessibilityLabel={card.alt}
        />
        <LinearGradient colors={[`${NIGHT}00`, `${NIGHT}DB`, `${NIGHT}DB`]} locations={[0, 0.6, 1]} style={styles.cardWords}>
          <Text style={styles.cardName} accessibilityRole="header">
            {card.label}
          </Text>
          <Text style={styles.cardLine}>{card.hint}</Text>
          <Text style={styles.cardCredit}>{card.credit}</Text>
        </LinearGradient>
        {pan ? (
          // The stamps come up as the card is pulled their way. For the eye only: the buttons say yes and no.
          <>
            <Animated.View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.stamp, styles.stampYes, { opacity: pan.interpolate({ inputRange: [0, STAMP], outputRange: [0, 1], extrapolate: "clamp" }) }]}
            >
              <Text style={styles.stampWord}>YES</Text>
            </Animated.View>
            <Animated.View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.stamp, styles.stampNo, { opacity: pan.interpolate({ inputRange: [-STAMP, 0], outputRange: [1, 0], extrapolate: "clamp" }) }]}
            >
              <Text style={styles.stampWord}>NOPE</Text>
            </Animated.View>
          </>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // .q-deck: fills the room between the question and the buttons; no taller than the website lets it on an iPad.
  deck: { flexGrow: 1, maxHeight: 660 },
  // .q-card: 22 corners and a deep shadow. The shadow is on this view and the clipping on the one inside.
  cardLift: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 22,
    backgroundColor: NIGHT,
    ...cardLift,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  card: { flex: 1, justifyContent: "flex-end", borderRadius: 22, overflow: "hidden", backgroundColor: NIGHT },
  // .q-card-text
  cardWords: { gap: 4, paddingTop: 56, paddingHorizontal: 18, paddingBottom: 18 },
  cardName: { fontSize: 28, lineHeight: 32, fontWeight: "800", color: ON_PHOTO },
  cardLine: { fontSize: 16, lineHeight: 22, color: ON_PHOTO },
  cardCredit: { marginTop: 4, fontSize: 11, lineHeight: 14, color: ON_PHOTO, opacity: 0.8 },
  // .q-stamp, .q-yes and .q-no: the website's green and red are the app's success fill and its red fill.
  stamp: { position: "absolute", top: 20, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 3, borderColor: ON_PHOTO, borderRadius: 10 },
  stampYes: { left: 18, backgroundColor: tokens.colors.success, transform: [{ rotate: "-12deg" }] },
  stampNo: { right: 18, backgroundColor: tokens.colors.dangerFill, transform: [{ rotate: "12deg" }] },
  stampWord: { fontSize: 22, fontWeight: "800", color: ON_PHOTO },
  // .q-deck-btns and .q-round: two 72 round buttons, red for no and green for yes, each with its word in it.
  // Sized by their least, so the word is never cut off at a large text size.
  buttons: { flexDirection: "row", justifyContent: "center", gap: 56, marginTop: 4 },
  round: { minWidth: 72, minHeight: 72, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, alignItems: "center", justifyContent: "center", gap: 2 },
  roundNo: { backgroundColor: tokens.colors.dangerFill },
  roundYes: { backgroundColor: tokens.colors.success },
  roundWord: { fontSize: 13, fontWeight: "800", color: ON_PHOTO },
});
