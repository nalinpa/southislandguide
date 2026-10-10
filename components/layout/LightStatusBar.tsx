import { useCallback, useState } from "react";
import { StatusBar } from "react-native";
import { useFocusEffect } from "expo-router";

// White status-bar text for a screen whose top is dark (a teal bar, a photo),
// but only while that screen is in front. Tab screens stay mounted, and React
// Native lets the most recently mounted <StatusBar> win, so a permanently
// mounted one leaks white text onto whichever light screen is shown next.
export function LightStatusBar() {
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  return focused ? <StatusBar barStyle="light-content" /> : null;
}
