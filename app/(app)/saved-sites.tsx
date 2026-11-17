import { View, StyleSheet } from "react-native";
import { router } from "expo-router";

import { AppText } from "@/lib/uiKit";
import { TopBar, TopBarBack } from "@/components/layout/TopBar";
import { SavedPlacesList } from "@/components/account/SavedPlacesList";

// The list is a component so the Profile's right pane on the open Duo can show it too; this
// route adds the top bar, with the count of what the category strip is showing.
export default function SavedSitesPage() {
  return (
    <SavedPlacesList
      top={(count) => (
        <TopBar
          title="Saved Places"
          leading={<TopBarBack onPress={() => router.back()} label="Back" />}
          actions={
            count > 0 ? (
              <View style={styles.countBadge}>
                <AppText style={styles.countText}>{count}</AppText>
              </View>
            ) : undefined
          }
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  countText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
});
