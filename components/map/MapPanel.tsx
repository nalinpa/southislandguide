// The open Duo's map panel: the sheet's own pieces (MapPieces) in a floating 360 card at the
// left, in place of the bottom sheet (docs/plans/design-sweep.md, "The map, picked: round 3").
// It ends on a whole Nearby row, at least 16 above the tab bar.
import React, { useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { useHalves } from "@blacksands/ui";

import { PlaceCard, TodayCarousel, NearbyRow, NearbySection } from "@/components/map/MapPieces";
import type { ActiveItineraryItem, NearbySite } from "@/components/map/MapPieces";
import { cardLift, darkEdge, tokens } from "@/lib/ui/tokens";
import type { Site } from "@/lib/models";

export const PANEL_WIDTH = 360;
export const SEARCH_HEIGHT = 56;
// The search card's top: under the status bar upright, at the top sideways (the bar is in the rail).
export const searchTop = (upright: boolean) => (upright ? 60 : 16);
// Panel, search card and the map's edge, 16 apart: the map's left padding.
export const PANEL_PAD = 16 + PANEL_WIDTH + 16;
const GAP = 12;
const ABOVE_TAB_BAR = 16;
const MIN_ROW = 48;
const PAD_TOP = 12;
const BOTTOM_PAD = 8;

export type MapPanelProps = {
  site: Site | null;
  distanceMeters: number;
  loading: boolean;
  hasLoc: boolean;
  isOffline?: boolean;
  nearbySites: NearbySite[];
  todayItems: ActiveItineraryItem[] | null;
  scrolled: React.MutableRefObject<boolean>;
  onOpen: () => void;
  onSelectSite: (id: string) => void;
  onFocusSite: () => void;
  onAddToItinerary?: () => void;
};

const height = (e: LayoutChangeEvent) => e.nativeEvent.layout.height;

export function MapPanel({ site, nearbySites, todayItems, scrolled, onSelectSite, loading, ...card }: MapPanelProps) {
  const { upright } = useHalves();
  const top = searchTop(upright) + SEARCH_HEIGHT + GAP;
  // Measured: the area the map screen gives us, the place card, the Nearby heading, each row.
  const [areaH, setAreaH] = useState<number | null>(null);
  const [cardH, setCardH] = useState(0);
  const [headH, setHeadH] = useState(0);
  const [rowH, setRowH] = useState<Record<string, number>>({});

  if (!site) return null;

  const showItinerary = !loading && !!todayItems?.length;
  const showNearby = !loading && !showItinerary && nearbySites.length > 0;

  // As many of the nearest as fit, whole rows. Unmeasured rows count as the least they can be.
  let room = areaH === null ? Infinity : areaH - top - ABOVE_TAB_BAR - PAD_TOP - BOTTOM_PAD - cardH - headH;
  const rows = nearbySites.filter((n) => {
    room -= rowH[n.id] ?? MIN_ROW;
    return room >= 0;
  });

  return (
    <View
      testID="map-panel-area"
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
      onLayout={(e) => setAreaH(height(e))}
    >
      <View testID="map-panel" style={[styles.panel, { top }]}>
        <View onLayout={(e) => setCardH(height(e))} testID="map-panel-head">
          <PlaceCard site={site} loading={loading} wide {...card} />
        </View>
        {showItinerary && todayItems && <TodayCarousel items={todayItems} onSelectSite={onSelectSite} scrolled={scrolled} width={PANEL_WIDTH} />}
        {showNearby && rows.length > 0 && (
          <NearbySection wide onHeadLayout={(e) => setHeadH(height(e) + 4)}>
            {rows.map((n) => (
              <NearbyRow
                key={n.id}
                nearby={n}
                wide
                onSelectSite={onSelectSite}
                onLayout={(e) => {
                  const h = height(e);
                  setRowH((prev) => (prev[n.id] === h ? prev : { ...prev, [n.id]: h }));
                }}
              />
            ))}
          </NearbySection>
        )}
        <View pointerEvents="none" style={[darkEdge, styles.edge]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    left: 16,
    width: PANEL_WIDTH,
    borderRadius: 20,
    paddingTop: PAD_TOP,
    paddingBottom: BOTTOM_PAD,
    backgroundColor: tokens.colors.bgCard,
    ...cardLift,
  },
  edge: { borderRadius: 20 },
});
