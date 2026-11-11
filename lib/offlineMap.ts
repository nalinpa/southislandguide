import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import { FileSystemSessionType, createDownloadResumable } from "expo-file-system/legacy";
// Not in package.json: it comes with the expo package and is in every build. Adding it
// there would change the fingerprint, and updates would stop matching the builds on phones.
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

// The map saved for no signal (docs/plans/offline-map.md, v2): LINZ topo tiles built by
// scripts/build-offline-map.js and served from our Cloudflare R2 bucket, so no LINZ key
// ships in the app. Two sizes: Standard is the whole country to zoom 11; Detailed adds
// zoom 12 over the app's map area.
//
// The tiles come as a few packs of 40 MB or less, not thousands of small files, so iOS can
// carry on downloading with the app closed or the phone locked. Each pack is then unpacked
// into the {z}/{x}/{y} files the map reads.

// v1's loose tiles: the address the map's tile layer is given. Offline it reads the folder.
export const OFFLINE_MAP_URL = "https://tiles.blacksands.app/offline-map/v1";
export const OFFLINE_PACKS_URL = "https://tiles.blacksands.app/offline-map/v2";
// The highest zoom of each size: the sets' maxZ in scripts/build-offline-map.js, which must
// match. Past it the map enlarges these tiles, so close in they're blurry but never missing.
// ponytail: Detailed's zoom 12 covers the South Island only, so with it saved the North
// Island is blank past zoom 11 until its own pack goes in with the North Island release.
export const OFFLINE_MAP_MAX_Z = { standard: 11, detailed: 12 };
// Each size in MB, rounded to 10, as the script's --pack prints them. Standard is 77.7 MB
// (2026-11-07); zoom 12 adds 168.1 MB in 11,155 tiles (2026-11-11), so Detailed is 245.8.
export const OFFLINE_MAP_SIZES_MB = { standard: 80, detailed: 250 };

export type MapLevel = "standard" | "detailed";
export type OfflineMapPack = { file: string; bytes: number; tiles: [tile: string, offset: number, length: number][] };
export type OfflineMapManifest = { sets: Record<MapLevel, { bytes: number; packs: OfflineMapPack[] }> };
export type SavePhase = "saving" | "unpacking";

// v1 saved the same zoom 5–11 tiles into the same folder one by one, so its flag counts as
// Standard and those phones don't download it again.
const V1_KEY = "offlineMap.saved.v1";
const LEVEL_KEY = "offlineMap.saved.v2";
// The packs already unpacked, by file name, so a save cut short carries on with the rest.
const PACKS_KEY = "offlineMap.packs.v2";
// The size a save that hasn't finished was for, so the app can carry on with it when it's
// next opened: "detailed", or "detailed:stopped" when the person tapped Stop.
const PENDING_KEY = "offlineMap.pending.v2";
const AWAKE_TAG = "offline-map";
const STOP_CHECK_MS = 500;
const YIELD_EVERY = 250;

// In Caches, not Documents: iOS backs Documents up to iCloud, and Apple's storage rules
// reject apps that keep content there that can be downloaded again. iOS may empty Caches
// when storage runs low, so savedMapLevel checks the folder, not only the flag.
export function offlineMapDir() {
  return new Directory(Paths.cache, "offline-map");
}

const packsDir = () => new Directory(Paths.cache, "offline-map-packs");

// The list of packs and where each tile sits in them. Kept on the phone once fetched: v2's
// files never change, and unpacking a pack that has already landed needs the list even
// with no signal.
const manifestFile = () => new File(Paths.cache, "offline-map-manifest-v2.json");

export async function fetchOfflineMapManifest(): Promise<OfflineMapManifest> {
  try {
    const res = await fetch(`${OFFLINE_PACKS_URL}/manifest.json`);
    if (!res.ok) throw new Error(`Map list: ${res.status}`);
    const text = await res.text();
    const manifest = JSON.parse(text);
    manifestFile().write(text);
    return manifest;
  } catch (e) {
    if (manifestFile().exists) return JSON.parse(await manifestFile().text());
    throw e;
  }
}

export async function savedMapLevel(): Promise<MapLevel | null> {
  if (!offlineMapDir().exists) return null;
  const level = await AsyncStorage.getItem(LEVEL_KEY);
  if (level === "standard" || level === "detailed") return level;
  return (await AsyncStorage.getItem(V1_KEY)) === "1" ? "standard" : null;
}

async function donePacks(): Promise<string[]> {
  // ponytail: all or nothing. If iOS emptied the folder, every pack is needed again; a
  // folder it only partly emptied isn't noticed.
  if (!offlineMapDir().exists) return [];
  try {
    return JSON.parse((await AsyncStorage.getItem(PACKS_KEY)) ?? "[]");
  } catch {
    return [];
  }
}

// Each tile's bytes out of the pack and into {z}/{x}/{y} with no extension: the layout
// react-native-maps' offline tiles are read from (getTileImage in
// ios/AirMaps/AIRMapUrlTileCachedOverlay.m). False if asked to stop part way.
async function unpack(pack: OfflineMapPack, bin: File, onTile: () => void, shouldStop: () => boolean) {
  const dir = offlineMapDir();
  const made = new Set<string>();
  const handle = bin.open();
  try {
    for (let i = 0; i < pack.tiles.length; i++) {
      const [tile, offset, length] = pack.tiles[i];
      const [z, x, y] = tile.split("/");
      if (!made.has(`${z}/${x}`)) {
        new Directory(dir, z, x).create({ intermediates: true, idempotent: true });
        made.add(`${z}/${x}`);
      }
      handle.offset = offset;
      new File(dir, z, x, y).write(handle.readBytes(length));
      onTile();
      // Reading and writing here block the screen, so let it draw now and then.
      if (i % YIELD_EVERY === YIELD_EVERY - 1) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (shouldStop()) return false;
      }
    }
  } finally {
    handle.close();
  }
  return true;
}

// A save that was started and hasn't finished: iOS closed the app, the signal went, or the
// person tapped Stop (`stopped`, which only they undo, with Carry on).
export async function pendingSave(): Promise<{ level: MapLevel; stopped: boolean } | null> {
  const [level, stopped] = ((await AsyncStorage.getItem(PENDING_KEY)) ?? "").split(":");
  return level === "standard" || level === "detailed" ? { level, stopped: stopped === "stopped" } : null;
}

// Saves the map up to `level`. Every pack still needed starts at once as an iOS background
// download, so it carries on with the app closed or the phone locked; swiping the app away
// cancels them. Each pack is unpacked as soon as it lands, one at a time, then recorded as
// done and deleted, so little is left to do once the last download ends. A pack is done
// only after its last tile, so an unpack cut short runs again (the writes are the same
// each time). Packs that landed are unpacked even when another failed, so "Carry on"
// downloads only what's missing. The flag is set only after the last pack.
//
// Unpacking needs the app running, so the screen is kept awake while a save is going, and
// what was being saved is remembered (pendingSave) for the next time the app opens.
// `download: false` only unpacks what has already landed: for carrying on by itself on
// mobile data, where a download must be asked for.
// ponytail: if iOS ends the app while it's closed, a pack that finishes afterwards has
// nowhere to land and is downloaded again. A native download handler fixes that; it
// needs a store build (TASKS.md, backlog).
export async function saveOfflineMap(
  manifest: OfflineMapManifest,
  level: MapLevel,
  {
    onProgress,
    shouldStop,
    download = true,
  }: { onProgress(phase: SavePhase, done: number, total: number): void; shouldStop(): boolean; download?: boolean },
): Promise<"saved" | "stopped"> {
  const have = await savedMapLevel();
  const done = await donePacks();
  const sets: MapLevel[] = level === "detailed" ? ["standard", "detailed"] : ["standard"];
  // Everything this save is for, done or not, so the percentage is of the whole map.
  const wanted = sets
    .filter((set) => !(have === "detailed" || (have && set === "standard")))
    .flatMap((set) => manifest.sets[set].packs);
  const packs = wanted.filter((pack) => !done.includes(pack.file));

  packsDir().create({ intermediates: true, idempotent: true });
  const binOf = (pack: OfflineMapPack) => new File(packsDir(), pack.file);
  // A pack that downloaded before but wasn't unpacked (the app was closed first).
  const landed = (pack: OfflineMapPack) => binOf(pack).exists && binOf(pack).size === pack.bytes;

  const totalBytes = wanted.reduce((sum, pack) => sum + pack.bytes, 0);
  const written = new Map(wanted.map((pack) => [pack.file, done.includes(pack.file) || landed(pack) ? pack.bytes : 0]));
  const report = () => onProgress("saving", [...written.values()].reduce((a, b) => a + b, 0), totalBytes);

  // One pack at a time, in the order they land. While downloads are still going the count
  // shown is theirs; after the last one it's the tiles.
  const totalTiles = wanted.reduce((sum, pack) => sum + pack.tiles.length, 0);
  let tiles = wanted.filter((pack) => done.includes(pack.file)).reduce((sum, pack) => sum + pack.tiles.length, 0);
  let downloading = 0;
  let stopped = false;
  let unpackError: unknown;
  let queue: Promise<void> = Promise.resolve();
  const unpackNext = (pack: OfflineMapPack) => {
    queue = queue.then(async () => {
      if (stopped || unpackError || shouldStop()) return;
      try {
        const bin = binOf(pack);
        const onTile = () => {
          tiles++;
          if (!downloading) onProgress("unpacking", tiles, totalTiles);
        };
        if (!(await unpack(pack, bin, onTile, shouldStop))) return;
        done.push(pack.file);
        await AsyncStorage.setItem(PACKS_KEY, JSON.stringify(done));
        bin.delete();
      } catch (e) {
        unpackError = e;
      }
    });
  };

  // Unpacking alone leaves the note as it is: a save the person stopped stays stopped.
  if (download) await AsyncStorage.setItem(PENDING_KEY, level);
  void activateKeepAwakeAsync(AWAKE_TAG).catch(() => {});
  let results: PromiseSettledResult<void>[] = [];
  try {
    report();
    for (const pack of packs.filter(landed)) unpackNext(pack);

    const downloads = (download ? packs.filter((pack) => !landed(pack)) : []).map((pack) => ({
      pack,
      task: createDownloadResumable(
        `${OFFLINE_PACKS_URL}/${pack.file}`,
        binOf(pack).uri,
        { sessionType: FileSystemSessionType.BACKGROUND },
        ({ totalBytesWritten }) => {
          written.set(pack.file, totalBytesWritten);
          report();
        },
      ),
    }));
    downloading = downloads.length;
    const watch = setInterval(() => {
      if (stopped || !shouldStop()) return;
      stopped = true;
      for (const { task } of downloads) void task.cancelAsync().catch(() => {});
    }, STOP_CHECK_MS);
    try {
      results = await Promise.allSettled(
        downloads.map(async ({ pack, task }) => {
          try {
            const result = await task.downloadAsync();
            // Nothing back: cancelled. Our bucket answers a missing pack with an error page,
            // which downloads fine, so the status and the size are checked too.
            if (!result) return;
            if (result.status !== 200 || binOf(pack).size !== pack.bytes) {
              if (binOf(pack).exists) binOf(pack).delete();
              throw new Error(`Map pack ${pack.file}: ${result.status}`);
            }
            unpackNext(pack);
          } finally {
            downloading--;
          }
        }),
      );
    } finally {
      clearInterval(watch);
    }
    await queue;
  } finally {
    void deactivateKeepAwake(AWAKE_TAG).catch(() => {});
  }

  if (unpackError) throw unpackError;
  const failed = results.find((r) => r.status === "rejected");
  if (failed) throw failed.reason;
  if (stopped || shouldStop()) {
    await AsyncStorage.setItem(PENDING_KEY, `${level}:stopped`);
    return "stopped";
  }
  if (packs.some((pack) => !done.includes(pack.file))) return "stopped";
  await AsyncStorage.setItem(LEVEL_KEY, level === "detailed" || have === "detailed" ? "detailed" : "standard");
  await AsyncStorage.removeItem(PENDING_KEY);
  return "saved";
}

export async function removeOfflineMap() {
  for (const dir of [offlineMapDir(), packsDir()]) if (dir.exists) dir.delete();
  if (manifestFile().exists) manifestFile().delete();
  await AsyncStorage.multiRemove([V1_KEY, LEVEL_KEY, PACKS_KEY, PENDING_KEY]);
}
