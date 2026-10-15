import { useMemo, useRef } from "react";
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, type ImageSourcePropType } from "react-native";
import { Car, ChevronRight, MapPin } from "lucide-react-native";

import { cardLift, tokens } from "@/lib/ui/tokens";
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
};

function localIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// In parts, not one format call: en-NZ puts a comma after the weekday on some engines
// and not others.
function dateParts(iso: string, length: "short" | "long"): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.toLocaleDateString("en-NZ", { weekday: length })} ${d.toLocaleDateString("en-NZ", { day: "numeric", month: length })}`;
}

// The whole trip at a glance: one row per day, saying which town or towns it is in. The
// towns are worked out from the day's places (tripSummary), never chosen, so a row can
// say only what the day timeline would show. A row opens its day.
//
// A day that starts in a different town from where the one before ended opens with that
// drive, and says so: the planner doesn't know where the traveller sleeps, and this is
// where they see what that costs across the trip.
export function TripOverview({ title, days, places, imageFor, onOpenDay }: TripOverviewProps) {
  const summary = useMemo(() => tripSummary(days, places), [days, places]);
  const today = localIsoDate(new Date());

  // Opens scrolled to today's row: a trip can run three weeks or more, and on the road
  // today is the one that matters. Once, when that row is first laid out.
  const scrollRef = useRef<ScrollView>(null);
  const scrolledToToday = useRef(false);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heading}>
        <Text style={styles.tripTitle}>{title}</Text>
        {days.length > 0 ? (
          <Text style={styles.tripDates}>
            {formatTripDates(days[0].date, days[days.length - 1].date)} · {days.length} {days.length === 1 ? "day" : "days"}
          </Text>
        ) : null}
      </View>
      {days.map((day, index) => {
        const { placeCount, areas, openingDrive, driveSlots, overflows } = summary[index];
        const isToday = day.date === today;
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
          dateParts(day.date, "long"),
          isToday ? "today" : null,
          towns.length ? towns.join(" then ") : null,
          ...(placeCount === 0 ? ["nothing planned yet"] : meta.split(" · ")),
          opening ? opening.charAt(0).toLowerCase() + opening.slice(1) : null,
          overflows ? "runs past 10 PM" : null,
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
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => onOpenDay(day.id)}
            accessibilityRole="button"
            accessibilityLabel={spoken}
          >
            {picture ? (
              <Image testID="day-image" source={picture} style={styles.picture} />
            ) : (
              // Holds the picture's place, so every row lines up.
              <View testID="day-image-placeholder" style={[styles.picture, styles.noPicture]}>
                <MapPin size={22} color={tokens.colors.borderStrong} />
              </View>
            )}
            <View style={styles.main}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>
                  Day {index + 1} · {dateParts(day.date, "short")}
                </Text>
                {/* "You are here", so it takes the highlight. */}
                {isToday ? <Text style={styles.today}>Today</Text> : null}
              </View>

              {towns.length > 0 ? <Text style={styles.towns}>{towns.join(" → ")}</Text> : null}

              {placeCount === 0 ? (
                <Text style={styles.empty}>Nothing planned yet</Text>
              ) : (
                <Text style={styles.meta}>{meta}</Text>
              )}

              {/* As the drive block on the day timeline: a muted car, secondary text. */}
              {opening ? (
                <View style={styles.drive}>
                  <Car color={tokens.colors.textMuted} size={15} />
                  <Text style={styles.driveText}>{opening}</Text>
                </View>
              ) : null}

              {overflows ? <Text style={styles.overflow}>Runs past 10 PM</Text> : null}
            </View>
            <ChevronRight size={20} color={tokens.colors.text2} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: tokens.space.md, gap: tokens.space.sm, paddingBottom: 40 },
  heading: { gap: 2, paddingHorizontal: 4, paddingBottom: 4 },
  tripTitle: { fontSize: 22, fontWeight: "800", color: tokens.colors.text },
  tripDates: { fontSize: 14, color: tokens.colors.text2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    backgroundColor: tokens.colors.bgCard,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    paddingHorizontal: tokens.space.md,
    paddingVertical: 14,
    ...cardLift,
  },
  main: { flex: 1, gap: 4 },
  // As the photo on an Explore row, a little smaller: the row is about the day, not the town.
  picture: { width: 72, height: 72, borderRadius: tokens.radius.md, alignSelf: "flex-start" },
  noPicture: { backgroundColor: tokens.colors.bgElevated, alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: tokens.space.xs },
  title: { fontSize: 13, fontWeight: "700", color: tokens.colors.text2 },
  today: { fontSize: 12, fontWeight: "800", color: tokens.colors.highlight },
  towns: { fontSize: 18, fontWeight: "700", color: tokens.colors.text },
  meta: { fontSize: 14, color: tokens.colors.text2 },
  empty: { fontSize: 14, color: tokens.colors.textMuted },
  drive: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  driveText: { flex: 1, fontSize: 13, fontWeight: "600", color: tokens.colors.text2 },
  overflow: { fontSize: 13, fontWeight: "700", color: tokens.colors.warning, marginTop: 2 },
});
