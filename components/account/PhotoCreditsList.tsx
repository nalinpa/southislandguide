import { useMemo, type ReactNode } from "react";
import { View, StyleSheet, ScrollView } from "react-native";

import { AppText, LoadingState, Screen } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { areaName } from "@/lib/areas";
import { AREA_PHOTO_CREDITS } from "@/lib/areaPhotos";
import { hooksBag } from "@/lib/hooksBag";

type Credit = { key: string; title: string; detail: string; credit: string };

// Every photographer the photos' licences ask to be named (Tourism New Zealand's and Great
// South's image libraries require it). The place page names them over its photo; here
// they are named for every photo, including the ones too small to carry a credit: list
// rows, map cards, the featured card and the trip view's town squares. Places first, by
// name, then the town photos.
export function PhotoCreditsList({
  pane,
  top,
}: {
  /** In the Profile's right pane: no top bar, no screen around it. */
  pane?: boolean;
  /** The route's top bar. */
  top?: ReactNode;
}) {
  const { locations, loading } = hooksBag.useLocations();

  const credits = useMemo<Credit[]>(() => {
    const places = locations
      .filter((l) => (l.imageUrl || l.imageThumbnailUrl) && l.imageCredit?.trim())
      .map((l) => ({
        key: l.id,
        title: l.name,
        detail: l.area ? areaName(l.area) : "",
        credit: l.imageCredit!.trim(),
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
    const towns = Object.entries(AREA_PHOTO_CREDITS)
      .map(([area, credit]) => ({ key: `town-${area}`, title: areaName(area), detail: "town photo", credit }))
      .sort((a, b) => a.title.localeCompare(b.title));
    return [...places, ...towns];
  }, [locations]);

  // On the route the loading state fills the screen as it always has, with no top bar.
  if (loading) {
    const wait = <LoadingState label="Loading photo credits..." />;
    return pane ? wait : <Screen>{wait}</Screen>;
  }

  const content = (
    <>
      {top}
      <ScrollView contentContainerStyle={styles.content}>
        {credits.length === 0 ? (
          <AppText variant="body" status="hint">
            No photos in the app need a credit yet.
          </AppText>
        ) : (
          credits.map((c) => (
            <View
              key={c.key}
              testID="credit-row"
              style={styles.row}
              accessible
              accessibilityLabel={`${c.title}${c.detail ? `, ${c.detail}` : ""}: photo by ${c.credit}`}
            >
              <AppText style={styles.title}>{c.title}</AppText>
              {c.detail ? <AppText style={styles.detail}>{c.detail}</AppText> : null}
              <AppText style={styles.credit}>{`Photo: ${c.credit}`}</AppText>
            </View>
          ))
        )}
      </ScrollView>
    </>
  );

  // paddingTop 0 hands the status-bar inset to the top bar, as on Saved Places.
  return pane ? content : (
    <Screen padded={false} style={styles.screen}>
      {content}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 0 },
  content: { padding: tokens.space.md, paddingBottom: tokens.space.xl },
  // The white page and one line colour (design sweep): the place's name, then its town in
  // the idle grey, then the credit.
  row: {
    paddingVertical: tokens.space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.line,
    gap: 2,
  },
  title: { fontSize: 16, fontWeight: "600", color: tokens.colors.text },
  detail: { fontSize: 14, color: tokens.colors.textMuted },
  credit: { fontSize: 14, color: tokens.colors.text2 },
});
