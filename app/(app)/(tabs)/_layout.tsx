import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";

const ALL_TABS: Array<{
  key: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: "sites", title: "Explore", icon: "compass-outline", activeIcon: "compass" },
  { key: "itinerary", title: "Trips", icon: "calendar-outline", activeIcon: "calendar" },
  { key: "map", title: "Map", icon: "map-outline", activeIcon: "map" },
  { key: "account", title: "Profile", icon: "person-outline", activeIcon: "person" },
];

const normalizeRouteName = (name: string) => name.replace(/\/index$/, "");

// Which tab button a route belongs to: its first segment (sites/[siteId] → sites). The
// guide has no button; on its own (a cold deep link) it counts as Profile, where its
// "Open Guide" hero is.
const TAB_FOR_SECTION: Record<string, string> = { guide: "account" };
const sectionTab = (routeName: string) => {
  const section = routeName.split("/")[0];
  return TAB_FOR_SECTION[section] ?? section;
};

// A place, its reviews and the guide are opened from any tab, and light the tab they were
// opened from: the newest route in the tab history that isn't one of them. A trip
// (itinerary/[itineraryId]) is the Trips tab's own screen and always lights Trips.
const isShared = (routeName: string) => routeName.startsWith("sites/[siteId]") || routeName.startsWith("guide/");
const highlightedTab = (state: any) => {
  const nameOf = new Map<string, string>(state.routes.map((r: any) => [r.key, r.name]));
  for (const entry of [...(state.history ?? [])].reverse()) {
    const name = nameOf.get(entry.key);
    if (name && !isShared(name)) return sectionTab(name);
  }
  return sectionTab(state.routes[state.index]?.name ?? "sites");
};

function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const activeRouteName = highlightedTab(state);

  const onSelect = (tabKey: string) => {
    const targetRoute = state.routes.find((r: any) => normalizeRouteName(r.name) === tabKey);
    if (!targetRoute) return;
    const event = navigation.emit({ type: "tabPress", target: targetRoute.key, canPreventDefault: true });
    if (!event.defaultPrevented) {
      navigation.navigate(targetRoute.name);
    }
  };

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bottomNav,
        {
          backgroundColor: tokens.colors.bgCard,
          borderTopColor: tokens.colors.border,
          // Just the home-indicator space (34pt on Face ID iPhones), not that
          // plus 20, which left a visible gap under the labels. The floor matters:
          // on an iPhone SE and in the iPad compatibility window App Review
          // uses, insets.bottom is 0 and the labels would sit on the edge.
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      {ALL_TABS.map((t) => {
        const isActive = t.key === activeRouteName;
        return (
          <Pressable
            key={t.key}
            onPress={() => onSelect(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={t.title}
            // The highlight marks "you are here" on every screen.
            style={({ pressed }) => [
              styles.tab,
              isActive && { backgroundColor: tokens.colors.highlightDim },
              pressed && styles.tabPressed,
            ]}
          >
            <Ionicons
              name={isActive ? t.activeIcon : t.icon}
              size={24}
              color={isActive ? tokens.colors.highlight : tokens.colors.text2}
            />
            <AppText
              variant="label"
              style={[styles.tabLabel, { color: isActive ? tokens.colors.highlight : tokens.colors.text2 }]}
            >
              {t.title}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    // "history": back goes to the screen you came from. The default, "firstRoute", sent
    // every back to Explore, which is wrong for the detail screens: they're tab screens
    // here, opened from every tab.
    <Tabs backBehavior="history" screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="sites" />
      <Tabs.Screen name="itinerary" />
      <Tabs.Screen name="map" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 14,
    marginHorizontal: 4,
  },
  tabLabel: {
    fontSize: 11,
  },
  tabPressed: {
    opacity: 0.6,
  },
});
