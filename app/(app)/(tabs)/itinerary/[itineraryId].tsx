import { useLocalSearchParams } from "expo-router";

import { ItineraryDetailView } from "@/components/itinerary/ItineraryDetailView";

export default function ItineraryDetailPage() {
  const { itineraryId, jumpToDay, jumpToSlot } = useLocalSearchParams<{
    itineraryId: string;
    jumpToDay?: string;
    jumpToSlot?: string;
  }>();

  // key: this route is a TAB screen (the only layout is the Tabs one), so React
  // Navigation keeps one instance and just swaps params. Without the key,
  // ItineraryDetailView kept the previous trip's activeDayId — it only sets
  // one when it's empty — so opening a second trip landed on a day that
  // doesn't exist in it: a blank timeline. Same root cause as the sites
  // detail scroll bug, fixed the same way. Safe: the view flushes unsaved
  // edits on blur, so the previous trip is saved before its instance goes.
  return (
    <ItineraryDetailView
      key={itineraryId}
      tripId={itineraryId}
      jumpToDay={jumpToDay}
      jumpToSlot={jumpToSlot}
    />
  );
}
