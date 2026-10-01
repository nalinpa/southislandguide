import { useEffect, useMemo } from "react";
import { AppState } from "react-native";
import { createHooks } from "@blacksands/hooks";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import NetInfo from "@react-native-community/netinfo";
import { client } from "@/lib/api";

export const hooksBag = createHooks(client, {
  appId: "southislandguide",
  queryKeyPrefix: ["southislandguide"],
  storage: AsyncStorage,
  locationSource: {
    requestPermission: async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      return perm.status === "granted";
    },
    getCurrent: async () => {
      const cur = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      return { coords: cur.coords };
    },
    watchPosition: async (onUpdate) => {
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 1 },
        (loc) => onUpdate({ coords: loc.coords }),
      );
      return () => sub.remove();
    },
  },
  netInfo: {
    fetch: async () => {
      const state = await NetInfo.fetch();
      return { isConnected: state.isConnected, isInternetReachable: state.isInternetReachable };
    },
    addEventListener: (cb) =>
      NetInfo.addEventListener((state) =>
        cb({ isConnected: state.isConnected, isInternetReachable: state.isInternetReachable }),
      ),
  },
});

// Only active sites should ever be listed; inactive ones stay reachable by
// direct id (useLocation), or via useAllLocations, for things like existing
// itinerary entries and saved sites the user already added.
export const useAllLocations = hooksBag.useLocations;
hooksBag.useLocations = () => {
  const result = useAllLocations();
  const locations = useMemo(() => result.locations.filter((l) => l.active), [result.locations]);
  return { ...result, locations };
};

// The shared hook only asks for permission once, on mount, so a user who enables
// location in Settings stayed "denied" until an app restart. Re-check silently on
// return to the foreground — getForegroundPermissionsAsync never prompts, and
// request() only runs once it's already granted (so no re-prompt on Android).
const baseUseUserLocation = hooksBag.useUserLocation;
hooksBag.useUserLocation = (...args: Parameters<typeof baseUseUserLocation>) => {
  const result = baseUseUserLocation(...args);
  const { status, request } = result;
  useEffect(() => {
    if (status !== "denied") return;
    const sub = AppState.addEventListener("change", async (next) => {
      if (next !== "active") return;
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.granted) void request();
    });
    return () => sub.remove();
  }, [status, request]);
  return result;
};

export const {
  useMyCompletions,
  useCheckIn,
  useOfflineQueue,
  useMyReviews,
  useSubmitReview,
  useGPSGate,
  useDraftsStore,
  useTrackingStore,
  useGuestStore,
  useMapStore,
  useAppSettingsStore,
  useLocation,
  useLocations,
  usePublicReviews,
  useReportContent,
  useBlockUser,
  useBlockedUsers,
  useNearestUnvisited,
  useSortedRows,
  useNearestCheckpoint,
  useUserLocation,
  useLocationStore,
  useSyncManager,
  useMyReview,
  useLocationReviewsSummary,
} = hooksBag;
