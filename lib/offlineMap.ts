import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";

// The map saved for no signal (docs/plans/offline-map.md): LINZ topo tiles for the whole
// country, built by scripts/build-offline-map.js and served from our Cloudflare R2 bucket,
// so no LINZ key ships in the app.
// ponytail: one set, v1. A rebuilt set goes to /v2/ with a new flag key, and phones save again.
export const OFFLINE_MAP_URL = "https://tiles.blacksands.app/offline-map/v1";
// The highest zoom saved: MAX_Z in scripts/build-offline-map.js, which must match. Past it
// the map enlarges these tiles, so close in they're blurry but never missing.
export const OFFLINE_MAP_MAX_Z = 11;
// The set's size in MB, rounded to 10, from manifest.json's bytes (the script prints it):
// 77.7 MB, 9,849 tiles, zoom 5 to 11 (2026-11-07). The Account row and the mobile-data
// warning quote it, so change it with any rebuilt set.
export const OFFLINE_MAP_ABOUT_MB = 80;

export type OfflineMapManifest = { bytes: number; tiles: string[] };

const SAVED_KEY = "offlineMap.saved.v1";
const PARALLEL = 6;

// In Caches, not Documents: iOS backs Documents up to iCloud, and Apple's storage rules
// reject apps that keep content there that can be downloaded again. iOS may empty Caches
// when storage runs low, so isOfflineMapSaved checks the folder, not only the flag.
export function offlineMapDir() {
  return new Directory(Paths.cache, "offline-map");
}

export async function fetchOfflineMapManifest(): Promise<OfflineMapManifest> {
  const res = await fetch(`${OFFLINE_MAP_URL}/manifest.json`);
  if (!res.ok) throw new Error(`Map list: ${res.status}`);
  return res.json();
}

// Six at a time from one queue. A tile already on the phone is skipped, so a save cut off
// (the app sent to the background, or Stop) carries on where it left off. A tile that fails
// twice stops the save: the other downloads finish the tile they're on and take no more.
// The flag is set only after the last tile.
export async function saveOfflineMap(
  manifest: OfflineMapManifest,
  { onProgress, shouldStop }: { onProgress(done: number, total: number): void; shouldStop(): boolean },
): Promise<"saved" | "stopped"> {
  const dir = offlineMapDir();
  const total = manifest.tiles.length;
  const todo = manifest.tiles.filter((tile) => !new File(dir, tile).exists);
  let done = total - todo.length;
  let next = 0;
  let failed = false;
  onProgress(done, total);

  const worker = async () => {
    while (next < todo.length && !failed && !shouldStop()) {
      const [z, x, y] = todo[next++].split("/");
      new Directory(dir, z, x).create({ intermediates: true, idempotent: true });
      // {z}/{x}/{y} with no extension: the layout react-native-maps' offline tiles are read
      // from (getTileImage in ios/AirMaps/AIRMapUrlTileCachedOverlay.m).
      const url = `${OFFLINE_MAP_URL}/${z}/${x}/${y}.png`;
      const file = new File(dir, z, x, y);
      // Idempotent: a failed save returns while its other downloads are still finishing, so
      // Carry on tapped straight away can meet a tile one of them is writing.
      const get = () => File.downloadFileAsync(url, file, { idempotent: true });
      try {
        await get().catch(get);
      } catch (e) {
        failed = true;
        throw e;
      }
      onProgress(++done, total);
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));

  if (next < todo.length) return "stopped";
  await AsyncStorage.setItem(SAVED_KEY, "1");
  return "saved";
}

export async function isOfflineMapSaved() {
  return (await AsyncStorage.getItem(SAVED_KEY)) === "1" && offlineMapDir().exists;
}

export async function removeOfflineMap() {
  const dir = offlineMapDir();
  if (dir.exists) dir.delete();
  await AsyncStorage.removeItem(SAVED_KEY);
}
