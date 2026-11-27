import { useMemo, useRef, type ReactNode } from "react";
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, type ImageSourcePropType, type ScrollViewInstance } from "react-native";
import { Car, ChevronRight, MapPin, X } from "lucide-react-native";

import { tokens } from "@/lib/ui/tokens";
import { areaName } from "@/lib/areas";
import { slotsToDurationLabel, tripSummary } from "@/lib/utils/itineraryPhysics";
import { formatTripDates } from "@/lib/utils/formatDates";
import type { PlaceLookup } from "@/lib/utils/transitMatrix";
import type { ItineraryDay } from "@/lib/models";

type TripOverviewProps = {
  /** The trip's name, at the head of the list: the bar above has no title row. */
  title: string;
  /** The trip's days as they stand on screen, packed. */
  days: ItineraryDay[];
  places: PlaceLookup;
  /** A town's picture (lib/areaImages.ts), or null when it has none. */
  imageFor: (areaId: string) => ImageSourcePropType | null;
  onOpenDay: (dayId: string) => void;
  /** Where day 1 sets off, for a trip that records its start town (its hub, transitMatrix's areaHub): day 1
   *  opens with the drive out of it, said and counted as a later day's is. Left out: day 1 starts with its first place. */
  startFrom?: string;
  /** Above the trip's name, inside the scroll (the guest's sign-in card). */
  header?: ReactNode;
  /** A sample, not a trip of theirs (the guest's suggested trip): no dates, as it isn't
   *  booked, no count of days (its name says it), and no arrow on a row. A tap still calls
   *  onOpenDay, which asks them to sign in. No lock on each row either: the one sign-in
   *  row under the list says it once (design sweep, 2026-11-13). */
  locked?: boolean;
  /** The open Duo: slimmer rows with a 56 photo, and the open day filled (design sweep, "The
   *  trip, picked: round 7"). Only styles change, so the list keeps its scroll across a fold. */
  wide?: boolean;
  /** Wide: the open day's position in `days` (from 0). A tap then calls onSelectDay with the
   *  row's position, not onOpenDay: the day shows on the right, where the phone switches. */
  selectedDay?: number;
  onSelectDay?: (n: number) => void;
  /** Wide: the open day's delete ×, a disc at the end of its row. */
  onDeleteDay?: (dayId: string) => void;
  /** Wide: beside the trip's name (the ⋯ menu). */
  menu?: ReactNode;
  /** After the last row, inside the scroll (Add Day). */
  footer?: ReactNode;
};

import { routeLine, dateParts } from "@/lib/utils/tripLines";
export { routeLine, dateParts } from "@/lib/utils/tripLines";

function localIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// The whole trip at a glance: one row per day, saying which town or towns it is in. The
// towns are worked out from the day's places (tripSummary), never chosen, so a row can
// say only what the day timeline would show. A row opens its day.
//
// A day that starts in a different town from where the one before ended opens with that
// drive, and says so: the planner doesn't know where the traveller sleeps, and this is
// where they see what that costs across the trip.
export function TripOverview({
  title,
  days,
  places,
  imageFor,
  onOpenDay,
  startFrom,
  header,
  locked = false,
  wide = false,
  selectedDay,
  onSelectDay,
  onDeleteDay,
  menu,
  footer,
}: TripOverviewProps) {
  const summary = useMemo(() => tripSummary(days, places, startFrom), [days, places, startFrom]);
  const today = localIsoDate(new Date());

  // Opens scrolled to today's row: a trip can run three weeks or more, and on the road
  // today is the one that matters. Once, when that row is first laid out.
  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrolledToToday = useRef(false);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {header}
      <View style={[styles.headingRow, wide && styles.headingRowWide]}>
        <View style={styles.heading}>
          <Text style={styles.tripTitle}>{title}</Text>
          {days.length > 0 && !locked ? (
            <Text style={styles.tripDates}>
              {`${formatTripDates(days[0].date, days[days.length - 1].date)} · `}
              {days.length} {days.length === 1 ? "day" : "days"}
            </Text>
          ) : null}
        </View>
        {wide ? menu : null}
      </View>
      {days.map((day, index) => {
        const { placeCount, areas, openingDrive, driveSlots, overflows } = summary[index];
        const isToday = !locked && day.date === today;
        const selected = wide && selectedDay === index;
        const towns = areas.map(areaName);
        const meta =
          `${placeCount} ${placeCount === 1 ? "place" : "places"}` +
          (driveSlots > 0 ? ` · ${slotsToDurationLabel(driveSlots).toLowerCase()} driving` : "");
        const opening = openingDrive ? `Starts with the drive from ${areaName(openingDrive.fromArea)}` : null;
        // The town the day ends in: where the traveller is that night, and where the
        // next day starts.
        const lastArea = areas[areas.length - 1];
        const picture = lastArea ? imageFor(lastArea) : null;

        const spoken = [
          `Day ${index + 1}`,
          locked ? null : dateParts(day.date, "long"),
          isToday ? "today" : null,
          towns.length ? towns.join(" then ") : null,
          ...(placeCount === 0 ? ["nothing planned yet"] : meta.split(" · ")),
          opening ? opening.charAt(0).toLowerCase() + opening.slice(1) : null,
          overflows ? "runs past 10 PM" : null,
          locked ? "locked" : null,
        ]
          .filter(Boolean)
          .join(", ");

        return (
          <TouchableOpacity
            key={day.id}
            testID={`day-row-${day.id}`}
            onLayout={(e) => {
              if (!isToday || scrolledToToday.current) return;
              scrolledToToday.current = true;
              scrollRef.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - tokens.space.md), animated: false });
            }}
            style={[styles.row, wide && styles.rowWide, selected && styles.rowSelected]}
            activeOpacity={0.7}
            onPress={() => (wide && onSelectDay ? onSelectDay(index) : onOpenDay(day.id))}
            accessibilityRole="button"
            accessibilityLabel={spoken}
            accessibilityState={wide ? { selected } : undefined}
          >
            {selected ? <View pointerEvents="none" style={styles.selEdge} /> : null}
            {picture ? (
              <Image testID="day-image" source={picture} style={[styles.picture, wide && styles.pictureWide]} />
            ) : (
              // Holds the picture's place, so every row lines up.
              <View testID="day-image-placeholder" style={[styles.picture, wide && styles.pictureWide, styles.noPicture]}>
                <MapPin size={22} color={tokens.colors.borderStrong} />
              </View>
            )}
            {/* The line under a row starts at the words, not under the picture. */}
            <View style={[styles.body, wide && styles.bodyWide]}>
            <View style={styles.main}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, wide && styles.titleWide]}>
                  Day {index + 1}
                  {locked ? "" : ` · ${dateParts(day.date, "short")}`}
                </Text>
                {/* "You are here", so it takes the highlight. */}
                {isToday ? <Text style={styles.today}>Today</Text> : null}
              </View>

              {towns.length > 0 ? <Text style={[styles.towns, wide && styles.townsWide]}>{routeLine(towns)}</Text> : null}

              {placeCount === 0 ? (
                <Text style={[styles.empty, wide && styles.detailWide, selected && styles.detailSelected]}>Nothing planned yet</Text>
              ) : (
                <Text style={[styles.meta, wide && styles.detailWide, selected && styles.detailSelected]}>{meta}</Text>
              )}

              {/* As the drive block on the day timeline: a muted car, secondary text. */}
              {opening ? (
                <View style={styles.drive}>
                  <Car color={tokens.colors.textMuted} size={15} />
                  <Text style={[styles.driveText, wide && styles.driveTextWide, selected && styles.detailSelected]}>{opening}</Text>
                </View>
              ) : null}

              {overflows ? <Text style={[styles.overflow, wide && styles.detailWide]}>Runs past 10 PM</Text> : null}
            </View>
            {selected && onDeleteDay ? (
              <TouchableOpacity
                onPress={() => onDeleteDay(day.id)}
                accessibilityRole="button"
                accessibilityLabel={`Delete Day ${index + 1}`}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.deleteDisc}
              >
                <X size={14} color={tokens.colors.text} strokeWidth={2.5} />
              </TouchableOpacity>
            ) : locked || wide ? null : (
              <ChevronRight size={20} color={tokens.colors.textMuted} />
            )}
            </View>
          </TouchableOpacity>
        );
      })}
      {footer}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: tokens.space.md, paddingBottom: 40 },
  headingRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  headingRowWide: { paddingBottom: 4 },
  heading: { flex: 1, gap: 2, paddingBottom: 4 },
  tripTitle: { fontSize: 22, fontWeight: "700", color: tokens.colors.text },
  tripDates: { fontSize: 14, color: tokens.colors.text2 },
  // A row on the white page with a line under its words, not a card (the design sweep's
  // look: docs/plans/design-sweep.md). The picture and the words start at the same height.
  row: { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingTop: 14 },
  body: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    minHeight: 72 + 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.line,
  },
  // The Duo's rows: a 56 photo and 13 pt words, the open day filled (selFill, with the dark
  // edge as an overlay so it takes no room).
  rowWide: { alignItems: "center", gap: 12, marginTop: 6, paddingTop: 8, padding: 8, borderRadius: 12 },
  rowSelected: { backgroundColor: tokens.colors.selFill },
  selEdge: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.selEdgeDark,
  },
  pictureWide: { width: 56, height: 56, borderRadius: 10 },
  bodyWide: { minHeight: 0, paddingBottom: 0, borderBottomWidth: 0 },
  titleWide: { fontSize: 13 },
  townsWide: { fontSize: 15, lineHeight: 20, minHeight: 0 },
  detailWide: { fontSize: 13 },
  detailSelected: { color: tokens.colors.text2 },
  driveTextWide: { fontSize: 12 },
  // The phone's × (the day strip's): a pale disc, a dark cross.
  deleteDisc: { padding: 5, borderRadius: 14, borderWidth: 1, borderColor: tokens.colors.border, backgroundColor: tokens.colors.bgElevated },
  main: { flex: 1, gap: 2 },
  // As the photo on an Explore card, small: the row is about the day, not the town.
  picture: { width: 72, height: 72, borderRadius: 12, borderWidth: 1, borderColor: tokens.colors.photoEdge },
  noPicture: { backgroundColor: tokens.colors.bgElevated, alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: tokens.space.xs },
  // What the list is scanned by, so not the faintest line in the row.
  title: { fontSize: 14, fontWeight: "600", color: tokens.colors.text2 },
  today: { fontSize: 12, fontWeight: "800", color: tokens.colors.highlight },
  // Room for two lines whether the route needs one or two, so every row is the same height.
  towns: { fontSize: 17, lineHeight: 22, minHeight: 44, fontWeight: "700", color: tokens.colors.text },
  meta: { fontSize: 14, color: tokens.colors.textMuted },
  empty: { fontSize: 14, color: tokens.colors.textMuted },
  drive: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  driveText: { flex: 1, fontSize: 13, fontWeight: "600", color: tokens.colors.text2 },
  overflow: { fontSize: 13, fontWeight: "700", color: tokens.colors.warning, marginTop: 2 },
});
