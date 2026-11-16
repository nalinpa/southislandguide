import { useLocalSearchParams } from "expo-router";

import { SiteDetail } from "@/components/sites/detail/SiteDetail";

export { latestReview } from "@/components/sites/detail/SiteDetail";

// This route is a TAB screen, not a stack screen: app/(app)/(tabs) has the only
// layout, so sites/[siteId] is registered straight on the Tabs navigator. React
// Navigation keeps one instance of a tab screen mounted and only swaps its
// params — so opening a second place reused the first place's component, and
// with it the ScrollView's offset and the hero's parallax `scrollY`. Keying the
// body by id gives each place a fresh instance.
export default function SiteDetailRoute() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();
  const id = String(siteId);
  return <SiteDetail key={id} id={id} />;
}
