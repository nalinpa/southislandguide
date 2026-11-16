import { Fragment, useMemo, type ComponentType } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { router } from "expo-router";
import { Car } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { components } from "@/lib/uiKit";
import { DriveBlock } from "@/components/itinerary/DriveBlock";
import { routeLine } from "@/components/itinerary/TripOverview";
import { tokens } from "@/lib/ui/tokens";
import { wideTop } from "@/lib/ui/wideTop";
import { PLANNER } from "@/lib/constants/gameplay";
import { areaName } from "@/lib/areas";
import { dayLegs, dayStartSiteId, slotRangeLabel, tripSummary, type DayLeg } from "@/lib/utils/itineraryPhysics";
import type { ItineraryDay } from "@/lib/models";
import type { PlaceLookup } from "@/lib/utils/transitMatrix";

const { SLOT_HEIGHT, MAX_GRID_SLOTS } = PLANNER;
const BLOCK_LEFT = 64;
// A hold this long never comes: the sample's stops can't be picked up.
const NEVER = 3_600_000;

type Props = {
  days: ItineraryDay[];
  index: number;
  places: PlaceLookup;
  /** A place's kind icon, as its map pin draws it. */
  iconFor: (siteId: string) => ComponentType<{ color: string; size: number }>;
};

// The open Duo's day side for a guest: one day of the suggested trip, read-only. The same
// heading and blocks as the signed-in day (ItineraryDetailView), on the same slot scale from the
// day's first stop (no hour grid), with nothing to drag or edit; a tap opens the place.
export function GuestDayView({ days, index, places, iconFor }: Props) {
  const insets = useSafeAreaInsets();
  const day = days[index];
  const items = day?.items ?? [];
  const areas = useMemo(() => tripSummary(days, places)[index]?.areas ?? [], [days, index, places]);
  const legs = useMemo(() => dayLegs(items, places, dayStartSiteId(days, index)), [items, days, index, places]);
  const legAfter = useMemo(() => new Map(legs.map((l) => [l.key, l])), [legs]);

  const starts = [...items.map((i) => i.slotIndex ?? 0), ...legs.map((l) => l.startSlot)];
  const ends = [...items.map((i) => (i.slotIndex ?? 0) + (i.durationSlots || 2)), ...legs.map((l) => l.startSlot + l.slots)];
  const first = starts.length ? Math.min(...starts) : 0;
  const last = ends.length ? Math.max(...ends) : 0;

  const renderLeg = (leg: DayLeg) =>
    leg.drive ? (
      <DriveBlock
        key={`drive_${leg.key}`}
        fromLabel={areaName(leg.drive.fromArea)}
        toLabel={areaName(leg.drive.toArea)}
        startSlot={leg.startSlot}
        slots={leg.slots}
        wide
      />
    ) : (
      <components.TransitBlock
        key={`transit_${leg.key}`}
        transitSize={leg.slots}
        top={leg.startSlot * SLOT_HEIGHT}
        height={leg.slots * SLOT_HEIGHT}
        variant="column"
        left={BLOCK_LEFT}
        icon={Car}
        formatLabel={(m: number) => `${m} min drive`}
        lineStyle="dotted"
        colors={{ text: tokens.colors.text2, icon: tokens.colors.textMuted, line: tokens.colors.border, patch: tokens.colors.page }}
      />
    );

  if (!day) return null;
  return (
    <View style={styles.fill}>
      <View testID="day-heading" style={[styles.heading, { paddingTop: wideTop(insets.top, insets.top + tokens.space.md) }]}>
        <Text style={styles.date}>{`Day ${index + 1}`}</Text>
        {areas.length > 0 ? <Text style={styles.route}>{routeLine(areas.map(areaName))}</Text> : null}
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View testID="guest-timeline" style={{ height: (last - first) * SLOT_HEIGHT + 100, marginTop: tokens.space.md }}>
          <View style={{ position: "absolute", top: -first * SLOT_HEIGHT, left: 0, right: 0 }}>
            {legAfter.has("opening") ? renderLeg(legAfter.get("opening")!) : null}
            {items.map((item) => (
              <Fragment key={item.id}>
                <components.TimelineBlock
                  wide
                  item={{
                    ...item,
                    timeLabel: slotRangeLabel(item.slotIndex ?? 0, item.durationSlots || 2),
                    durationLabel: undefined,
                  }}
                  left={BLOCK_LEFT}
                  icon={iconFor(item.siteId)}
                  colors={{ grip: "rgba(255,255,255,0.7)", note: tokens.colors.success }}
                  maxSlots={MAX_GRID_SLOTS + 1}
                  slotHeight={SLOT_HEIGHT}
                  holdToDrag={NEVER}
                  // Read-only: a drop settles where it started, and a tap opens the place.
                  onDrop={() => item.slotIndex ?? 0}
                  onDragStart={() => {}}
                  onDragEnd={() => {}}
                  onEdit={() => router.push(`/(app)/(tabs)/sites/${item.siteId}`)}
                />
                {legAfter.has(item.id) ? renderLeg(legAfter.get(item.id)!) : null}
              </Fragment>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  heading: { paddingHorizontal: tokens.space.md, paddingBottom: 4, gap: 2 },
  date: { fontSize: 14, color: tokens.colors.text2 },
  route: { fontSize: 22, fontWeight: "700", color: tokens.colors.text },
});
