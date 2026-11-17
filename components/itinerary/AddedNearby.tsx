import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { Check, Image as ImageIcon, Plus } from "lucide-react-native";
import { formatDistanceMeters } from "@blacksands/hooks";

import { AppButton } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { siteImage } from "@/lib/categoryImages";
import { SITE_CATEGORY_LABELS, type SiteCategory } from "@/lib/models";

export type NearRow = {
  id: string;
  name: string;
  meters: number;
  imageUrl?: string | null;
  category?: SiteCategory;
};

/** Where a row's + has got to: saving, added (a check), or a message under the row. */
export type RowState = { state: "saving" | "added" } | { state: "message"; text: string };

type Props = {
  /** "Added to Day 9 · Tue 8 Dec" (and " of {trip}" with more than one trip). */
  line: string;
  dayNumber: number;
  placeName: string;
  rows: NearRow[];
  rowState: Record<string, RowState>;
  onAdd: (id: string) => void;
  onOpen: (id: string) => void;
  onDone: () => void;
  onViewTrip: () => void;
  /** Caps the list's height on a wide sheet; the phone's list fills the card instead. */
  listMaxHeight?: number;
};

// The done state of the Add to Trip sheet: where the place went, the places near it as
// photo rows each with its own +, and Done and View Trip pinned under the list.
export function AddedNearby({ line, dayNumber, placeName, rows, rowState, onAdd, onOpen, onDone, onViewTrip, listMaxHeight }: Props) {
  const busy = Object.values(rowState).some((s) => s.state === "saving");
  return (
    <View style={[styles.done, rows.length > 0 && listMaxHeight === undefined && styles.tall]}>
      <View style={styles.top}>
        <Check color={tokens.colors.success} size={18} strokeWidth={2.5} />
        <Text style={styles.topText}>{line}</Text>
      </View>
      {rows.length > 0 && (
        <>
          <Text style={styles.nearTitle}>Near {placeName}</Text>
          <ScrollView style={listMaxHeight === undefined ? styles.list : { flexGrow: 0, maxHeight: listMaxHeight }} showsVerticalScrollIndicator={false}>
            {rows.map((n, i) => {
              const s = rowState[n.id];
              const distance = formatDistanceMeters(n.meters);
              const photo = siteImage(n.imageUrl, n.category, "thumb", n.id);
              const meta = [n.category ? SITE_CATEGORY_LABELS[n.category] : null, distance].filter(Boolean).join(" · ");
              return (
                <View key={n.id} style={[styles.rowWrap, i > 0 && styles.hairline]}>
                  <View style={styles.row}>
                    <TouchableOpacity style={styles.open} accessibilityRole="button" accessibilityLabel={`${n.name}, ${distance}`} onPress={() => onOpen(n.id)}>
                      {photo ? (
                        <Image testID={`near-photo-${n.id}`} source={photo} style={styles.photo} />
                      ) : (
                        <View style={[styles.photo, styles.placeholder]}>
                          <ImageIcon color={tokens.colors.borderStrong} size={22} />
                        </View>
                      )}
                      <View style={styles.words}>
                        <Text style={styles.name} numberOfLines={2}>
                          {n.name}
                        </Text>
                        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
                      </View>
                    </TouchableOpacity>
                    {s?.state === "added" ? (
                      <View style={styles.plus} accessible accessibilityLabel={`${n.name} added`}>
                        <Check color={tokens.colors.success} size={20} />
                      </View>
                    ) : s?.state === "saving" ? (
                      <View style={styles.plus}>
                        <ActivityIndicator size="small" />
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.plus}
                        accessibilityRole="button"
                        accessibilityLabel={`Add ${n.name} to Day ${dayNumber}`}
                        accessibilityState={{ disabled: busy }}
                        disabled={busy}
                        onPress={() => onAdd(n.id)}
                      >
                        <Plus color={tokens.colors.selected} size={20} />
                      </TouchableOpacity>
                    )}
                  </View>
                  {s?.state === "message" && <Text style={styles.message}>{s.text}</Text>}
                </View>
              );
            })}
          </ScrollView>
        </>
      )}
      <AppButton variant="primary" fullWidth onPress={onDone}>
        Done
      </AppButton>
      <TouchableOpacity style={styles.viewTrip} accessibilityRole="button" onPress={onViewTrip}>
        <Text style={styles.viewTripText}>View Trip</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  done: { gap: tokens.space.sm, paddingTop: tokens.space.xs },
  // With rows the card is tall and the list takes what is between the line and the buttons.
  tall: { flex: 1 },
  top: { flexDirection: "row", alignItems: "center", gap: 8 },
  topText: { flexShrink: 1, fontSize: 16, fontWeight: "600", color: tokens.colors.text },
  nearTitle: { fontSize: 13, fontWeight: "600", color: tokens.colors.text2, marginTop: tokens.space.xs },
  list: { flex: 1 },
  rowWrap: { minHeight: 72, justifyContent: "center", paddingVertical: 8 },
  hairline: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.colors.line },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  open: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  photo: { width: 56, height: 56, borderRadius: 10, borderWidth: 1, borderColor: tokens.colors.photoEdge },
  placeholder: { backgroundColor: tokens.colors.bgElevated, alignItems: "center", justifyContent: "center" },
  words: { flex: 1 },
  name: { fontSize: 16, fontWeight: "500", color: tokens.colors.text },
  meta: { fontSize: 14, color: tokens.colors.textMuted },
  plus: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.selFill,
  },
  message: { fontSize: 14, color: tokens.colors.danger, marginTop: 4 },
  viewTrip: { alignSelf: "center", paddingVertical: 12, paddingHorizontal: tokens.space.md },
  viewTripText: { fontSize: 15, fontWeight: "600", color: tokens.colors.selected },
});
