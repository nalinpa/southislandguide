import React, { useEffect } from "react";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useSession } from "@/lib/providers/SessionProvider";

export default function AuthLayout() {
  const { session } = useSession();

  useEffect(() => {
    if (session.status !== "loading") {
      SplashScreen.hideAsync();
    }
  }, [session.status]);

  if (session.status === "loading") {
    return null;
  }

  // Signed in: the login screen itself leaves, back to the screen that asked for sign-in
  // (leaveLogin in login.tsx). A redirect here replaced it with Explore first.

  // Deliberately no redirect for "guest" — a guest landing here is signing in
  // on purpose (every "Sign In" button in the app just pushes this route
  // without clearing guest state first). Bouncing them to the map made every
  // one of those buttons silently do nothing. Same fix as rotorua-guide.
  return <Slot />;
}
