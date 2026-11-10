import React from "react";
import { Redirect } from "expo-router";

// Explore first, signed in or not: everyone starts as a guest (SessionProvider).
export default function Index() {
  return <Redirect href="/(app)/(tabs)/sites" />;
}
