import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "southislandguide:appOpenCount";

// Counts how many times the app has been started. The count is kept on the phone
// via AsyncStorage and goes up by one each start-up. Returns null until the stored
// value has been read, so callers can distinguish "not yet loaded" from "first open".
export function useAppOpenCount(): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const current = raw ? parseInt(raw, 10) : 0;
      const next = current + 1;
      await AsyncStorage.setItem(STORAGE_KEY, String(next));
      if (!cancelled) setCount(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return count;
}
