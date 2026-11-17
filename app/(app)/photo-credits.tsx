import { router } from "expo-router";

import { TopBar, TopBarBack } from "@/components/layout/TopBar";
import { PhotoCreditsList } from "@/components/account/PhotoCreditsList";

// The list is a component so the Profile's right pane on the open Duo can show it too.
export default function PhotoCreditsPage() {
  return <PhotoCreditsList top={<TopBar title="Photo Credits" leading={<TopBarBack onPress={() => router.back()} label="Back" />} />} />;
}
