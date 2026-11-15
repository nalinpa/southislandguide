// components/map/MapOverlay.tsx
import React from "react";
import { StyleSheet, View } from "react-native";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWide } from "@blacksands/ui";

import { MapPanel } from "@/components/map/MapPanel";
import {
  PlaceCard,
  TodayCarousel,
  NearbyRow,
  NearbySection,
  type ActiveItineraryItem,
  type NearbySite,
} from "@/components/map/MapPieces";
import { darkEdge, tokens } from "@/lib/ui/tokens";
import type { Site } from "@/lib/models";

export type { ActiveItineraryItem, NearbySite };

interface MapOverlayProps {
  site: Site | null;
  distanceMeters: number;
  onOpen: () => void;
  onSelectSite: (id: string) => void;
  onFocusSite: () => void;
  onAddToItinerary?: () => void;
  isOffline?: boolean;
  nearbySites: NearbySite[];
  todayItems: ActiveItineraryItem[] | null;
  locStatus: "unknown" | "granted" | "denied";
  hasLoc: boolean;
  locError?: boolean;
  refreshingGPS?: boolean;
  bottomSheetRef: React.RefObject<BottomSheet | null>;
}

const SNAP_DEFAULT = ["12%", "22%", "40%"];

// The white page of the design sweep's look, with dark text (docs/plans/design-sweep.md).
// It was the brand's deep teal with white text, the one dark sheet in the app.
const SheetBackground = ({ style }: { style?: any }) => <View style={[style, styles.sheetBg]} />;

// The phone's bottom sheet; on the open Duo (wide) the same pieces float as a panel instead.
export function MapOverlayCard({
  site,
  onOpen,
  onSelectSite,
  onFocusSite,
  onAddToItinerary,
  isOffline = false,
  nearbySites,
  todayItems,
  locStatus,
  hasLoc,
  locError = false,
  distanceMeters,
  refreshingGPS = false,
  bottomSheetRef,
}: MapOverlayProps) {
  const insets = useSafeAreaInsets();
  const wide = useWide();

  const isDenied = locStatus === "denied";
  const isRequesting = !isDenied && !locError && !hasLoc;
  const loading = isRequesting || refreshingGPS;

  if (wide) {
    return (
      <MapPanel
        site={site}
        distanceMeters={distanceMeters}
        loading={loading}
        hasLoc={hasLoc}
        isOffline={isOffline}
        nearbySites={nearbySites}
        todayItems={todayItems}
        onOpen={onOpen}
        onSelectSite={onSelectSite}
        onFocusSite={onFocusSite}
        onAddToItinerary={onAddToItinerary}
      />
    );
  }

  const isBaseState = !!site && !loading;
  const showItinerary = isBaseState && !!todayItems?.length;
  const showNearby = isBaseState && !showItinerary && nearbySites.length > 0;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={1}
      snapPoints={SNAP_DEFAULT}
      enablePanDownToClose={false}
      backgroundComponent={SheetBackground}
      backgroundStyle={styles.sheetBgStyle}
      handleIndicatorStyle={styles.handle}
      style={styles.sheetLift}
    >
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
      >
        {site && (
          <PlaceCard
            site={site}
            loading={loading}
            hasLoc={hasLoc}
            distanceMeters={distanceMeters}
            isOffline={isOffline}
            onOpen={onOpen}
            onFocusSite={onFocusSite}
            onAddToItinerary={onAddToItinerary}
          />
        )}

        {showItinerary && todayItems && <TodayCarousel items={todayItems} onSelectSite={onSelectSite} />}

        {showNearby && (
          <NearbySection>
            {nearbySites.map((nearby) => (
              <NearbyRow key={nearby.id} nearby={nearby} onSelectSite={onSelectSite} />
            ))}
          </NearbySection>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBgStyle: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  // bgCard: white in light as the page is; in dark a step lighter than the page, with a
  // hairline, since the shadow shows nothing on a dark map. The sheet's background is laid
  // behind its content, so the line takes no room.
  sheetBg: { backgroundColor: tokens.colors.bgCard, borderWidth: 1, borderColor: darkEdge.borderColor },
  // A white sheet over a pale map needs an edge: a soft shadow upwards.
  sheetLift: {
    shadowColor: "#0A1F1B",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 12,
  },
  handle: { backgroundColor: tokens.colors.border, width: 36, height: 4 },
});
