import { StyleSheet, View } from "react-native";

import { TripOverview } from "@/components/itinerary/TripOverview";
import { areaImage } from "@/lib/areaImages";
import { tokens } from "@/lib/ui/tokens";
import { packTrip } from "@/lib/utils/itineraryPhysics";
import type { ItineraryItem } from "@/lib/models";
import type { PlaceLookup } from "@/lib/utils/transitMatrix";

// The tour's trip step: the real trip view with a fixed sample, since a new user has no
// trip to point at (docs/plans/opening-tour.md). The places are made up and looked up
// here, so nothing comes from the network; only the towns and the drives show.
const AREA: Record<string, string> = { chc: "christchurch", dun: "dunedin" };
const places: PlaceLookup = (siteId) => ({ area: AREA[siteId.split("-")[0]] });

const item = (siteId: string): ItineraryItem => ({
  id: siteId,
  siteId,
  siteName: siteId,
  slotIndex: 0,
  durationSlots: 3,
  timeLabel: "",
  durationLabel: "",
});

// A fixed past Saturday, so no row is ever "today".
const DAYS = packTrip(
  [
    { id: "day_1", date: "2026-02-14", items: ["chc-1", "chc-2", "chc-3", "chc-4"].map(item) },
    { id: "day_2", date: "2026-02-15", items: ["dun-1", "dun-2", "dun-3"].map(item) },
  ],
  places,
);

const imageFor = (areaId: string) => areaImage(areaId, []);

export function TourTripPreview() {
  return (
    <View style={styles.frame}>
      <TripOverview title="Your South Island Trip" days={DAYS} places={places} imageFor={imageFor} onOpenDay={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  // A fixed height for the trip view's own scroll to fill; it shrinks inside the card on a
  // short screen and the rows scroll.
  frame: {
    height: 300,
    flexShrink: 1,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.bgBase,
    overflow: "hidden",
  },
});
