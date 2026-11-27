// The picked trip, drawn by the app's own trip view and nothing of the quiz's own: TripOverview for the trip (a
// row a day) and GuestDayView for one day's stops, the read-only day a guest sees on the Trips tab. Over and
// under it are the website's words for the trip (the page half of kiwiguide-site public/plan/quiz.js, its
// `reveal` screen). Nothing here edits the trip, and nothing is saved: Save and its sign-in are stage 6.
import { useCallback, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import builderData from "@/assets/data/builder-data.json";
import { GuestDayView } from "@/components/itinerary/GuestDayView";
import { TripOverview } from "@/components/itinerary/TripOverview";
import { CATEGORY_CONFIG } from "@/components/map/SiteMarker";
import { areaImage } from "@/lib/areaImages";
import { areaName } from "@/lib/areas";
import { usePlaceLookup } from "@/lib/hooks/usePlaceLookup";
import type { SiteCategory } from "@/lib/models";
import type { QuizState } from "@/lib/tripBuilder/quizFlow";
import { tripBody, tripStart, type QuizTrip } from "@/lib/tripBuilder/quizTrips";
import { tokens } from "@/lib/ui/tokens";
import { AppButton } from "@/lib/uiKit";
import type { PlaceLookup } from "@/lib/utils/transitMatrix";
import { days, or } from "./QuizSteps";
import { QUIZ_COLUMN, QuizHead } from "./quizParts";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const site = require("@/lib/tripBuilder/quizLogic") as {
  ACTIVITIES: { id: string; label: string }[];
  SEASONS: { id: string; label: string }[];
  MONTH_NAMES: string[];
  // "Built for you: some walking, up to 4 hours of driving a day, nature, food tips."
  summaryLine: (trip: { kind: string }, st: QuizState) => string;
  // A line about the season picked; none for "Not sure yet".
  seasonLine: (season: string | null) => string | null;
  // "About 4 h 30 of driving. Over your 4 h limit."
  driveLine: (minutes: number, limit: number) => string;
};

// The builder's own record of each place, which the trip was made from.
const bundled: Record<string, { area: string; lat: number; lng: number; category: string[] } | undefined> = builderData.places;
const activity = (id: string) => site.ACTIVITIES.find((a) => a.id === id)?.label ?? id;
// A stop's icon is its kind's, as its map pin has.
const iconFor = (siteId: string) => (CATEGORY_CONFIG[bundled[siteId]?.category[0] as SiteCategory] ?? CATEGORY_CONFIG.other).Icon;
// A tap on a stop does nothing, as on the website: the place's own page is in the tabs, under the quiz.
const stay = () => {};

type Props = {
  state: QuizState;
  trip: QuizTrip;
  /** The day the trips were built on: the trip's days are dated from the answers and it. */
  today: Date;
  /** The open day (from 0), or null for the whole trip. Held by the screen, so its Back can shut the day. */
  day: number | null;
  onDay: (n: number) => void;
  onAgain: () => void;
};

export function TripReveal({ state, trip, today, day, onDay, onAgain }: Props) {
  const { places, list, ready } = usePlaceLookup();
  // Whether the app has a place: its own list says so once it is in, and a place switched off since the
  // builder's data was made is left off the trip. Until then nothing can be said to be missing.
  const has = useCallback((siteId: string) => !ready || !!places(siteId), [ready, places]);
  // Where a place is, for the towns and the drives: the app's list. Until it is in (a first run with no signal)
  // the builder's record stands in, the one time a bundled copy does: the trip was made from it a moment ago,
  // and against an empty list every row would have no town and every drive would be the flat half hour.
  const lookup = useCallback<PlaceLookup>((siteId) => (ready ? places(siteId) : bundled[siteId]), [ready, places]);
  const imageFor = useCallback((areaId: string) => areaImage(areaId, list), [list]);
  const start = tripStart(state, today);
  // The trip as the app's own model has it, as Save will send it (stage 6). Here it is only drawn, so the
  // stops' ids need only differ.
  const body = useMemo(() => {
    let n = 0;
    return tripBody(trip, start, () => String(n++), has);
  }, [trip, start, has]);

  // The builder's count of a day's driving against the limit picked: the trip view doesn't know what was asked for.
  const longDrive = (n: number) => {
    const d = trip.days[n];
    return d?.overLimit && d.driveMinutes && state.drive ? site.driveLine(d.driveMinutes, state.drive) : null;
  };

  if (day != null) {
    const long = longDrive(day);
    return (
      <View style={styles.column}>
        <GuestDayView
          days={body.days}
          index={day}
          places={lookup}
          iconFor={iconFor}
          top={tokens.space.xs}
          onOpenPlace={stay}
          note={
            long ? (
              <View style={styles.warn}>
                <Text style={styles.warnWords}>
                  <Text style={styles.warnHead}>Long drive.</Text> {long}
                </Text>
              </View>
            ) : null
          }
        />
      </View>
    );
  }

  const season = site.SEASONS.find((s) => s.id === state.season);
  const when = state.month ? `${site.MONTH_NAMES[state.month.month]} ${state.month.year}` : (season?.label ?? "");
  const missing = trip.missing.map((a) => activity(a).toLowerCase());
  // Where each activity asked for is: its places and their days, one line an activity, under the trip so day 1
  // is on a phone's first screen.
  const notes = (state.activities ?? []).flatMap((a) => {
    const at = trip.days.flatMap((d, k) => d.items.filter((i) => i.activities.includes(a) && has(i.siteId)).map((i) => `${i.siteName} (Day ${k + 1})`));
    return at.length ? [`${activity(a)}: ${at.join(", ")}`] : [];
  });
  const seasonLine = site.seasonLine(state.season);

  return (
    <View style={styles.column}>
      <TripOverview
        // Not saved yet: the quiz's own heading names it, and no day of its first-guess dates is "today".
        unsaved
        title={trip.label}
        days={body.days}
        places={lookup}
        imageFor={imageFor}
        onOpenDay={(id) => onDay(body.days.findIndex((d) => d.id === id))}
        dayNote={(n) => {
          const long = longDrive(n);
          return long ? `Long drive. ${long}` : null;
        }}
        header={
          <View style={styles.head}>
            <QuizHead kicker="Your trip" title={trip.label} />
            <View>
              <Text style={styles.from}>{`From ${areaName(trip.start)}${trip.end === trip.start ? " and back" : ` to ${areaName(trip.end)}`}`}</Text>
              <Text style={styles.when}>{`${days(trip.days.length)}${when ? ` · ${when}` : ""}.`}</Text>
            </View>
            {/* TEMP (stage 6): Save goes here, over the trip, where the website has "Save and open in the app". */}
            <Text style={styles.match}>{site.summaryLine(trip, state)}</Text>
            {missing.length ? <Text style={styles.miss}>{`Nothing for ${or(missing)} on this route.`}</Text> : null}
          </View>
        }
        footer={
          <View style={styles.foot}>
            {notes.map((line) => (
              <Text key={line} style={styles.act}>
                {line}
              </Text>
            ))}
            {seasonLine ? <Text style={styles.season}>{seasonLine}</Text> : null}
            <AppButton variant="ghost" fullWidth onPress={onAgain}>
              Start again
            </AppButton>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // The quiz's one column, as its questions have: the trip view fills it and scrolls itself.
  column: { flex: 1, width: "100%", maxWidth: QUIZ_COLUMN, alignSelf: "center" },
  head: { gap: 8, paddingBottom: 4 },
  // .q-when: where it goes in the page's ink, how long and when in its quiet words.
  from: { fontSize: 17, lineHeight: 24, fontWeight: "700", color: tokens.colors.text },
  when: { fontSize: 17, lineHeight: 24, color: tokens.colors.text2 },
  // .q-match and .q-miss.
  match: { fontSize: 16, lineHeight: 23, color: tokens.colors.text2 },
  miss: { fontSize: 16, lineHeight: 23, fontWeight: "600", color: tokens.colors.text2 },
  foot: { gap: 8, paddingTop: 16 },
  // .q-act: the website's pale yellow behind an activity's places. The app's pale amber, which has a dark side.
  act: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    overflow: "hidden",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    color: tokens.colors.text,
    backgroundColor: tokens.colors.warningDim,
  },
  // .q-season.
  season: { marginTop: 4, fontSize: 16, lineHeight: 23, color: tokens.colors.text2 },
  // .q-warn, under an open day's heading: a line round it and "Long drive." in the trip view's warning colour
  // (its "Runs past 10 PM"), where the website has its orange.
  warn: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 2, borderColor: tokens.colors.warning, borderRadius: 12 },
  warnWords: { fontSize: 14, lineHeight: 19, fontWeight: "600", color: tokens.colors.text },
  warnHead: { fontWeight: "800", color: tokens.colors.warning },
});
