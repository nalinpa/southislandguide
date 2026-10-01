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
  { key: "itinerary", title: "Plans", icon: "calendar-outline", activeIcon: "calendar" },
  { key: "map", title: "Map", icon: "map-outline", activeIcon: "map" },
  { key: "account", title: "Home", icon: "home-outline", activeIcon: "home" },
];

const normalizeRouteName = (name: string) => name.replace(/\/index$/, "");

// Which tab button to highlight for a route. Detail routes (sites/[siteId],
// itinerary/[itineraryId], guide/[slug]) are extra tab screens with no button
// of their own, so match on the route's first segment; the guide is opened from
// Home, so it highlights Home.
const TAB_FOR_SECTION: Record<string, string> = { guide: "account" };
const highlightedTab = (routeName: string) => {
  const section = routeName.split("/")[0];
  return TAB_FOR_SECTION[section] ?? section;
};

function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const activeRouteName = highlightedTab(state.routes[state.index]?.name ?? "sites");

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
            style={[styles.tab, isActive && { backgroundColor: tokens.colors.surfDim }]}
          >
            <Ionicons
              name={isActive ? t.activeIcon : t.icon}
              size={24}
              color={isActive ? tokens.colors.surf : tokens.colors.text2}
            />
            <AppText
              variant="label"
              style={[styles.tabLabel, { color: isActive ? tokens.colors.surf : tokens.colors.text2 }]}
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
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
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
    fontSize: 10,
  },
});
