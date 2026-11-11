// The map saved for no signal (docs/plans/offline-map.md, v2 Task 3): packs downloaded from
// our bucket in the background, then unpacked into the phone's cache folder, laid out the
// way react-native-maps reads them. Runs against jest-expo's in-memory file system, so
// folders and files are real; only the background download is stood in, and it writes the
// pack's bytes where the real one would.

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("expo-file-system/legacy", () => ({
  FileSystemSessionType: { BACKGROUND: 0, FOREGROUND: 1 },
  createDownloadResumable: jest.fn(),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import { createDownloadResumable } from "expo-file-system/legacy";

import {
  OFFLINE_PACKS_URL,
  offlineMapDir,
  removeOfflineMap,
  saveOfflineMap,
  savedMapLevel,
  type OfflineMapPack,
} from "@/lib/offlineMap";

const mockResumable = createDownloadResumable as jest.Mock;

const V1_KEY = "offlineMap.saved.v1";
const LEVEL_KEY = "offlineMap.saved.v2";
const MILFORD = "11/1979/1308";
const NEXT_DOOR = "11/1980/1308";
const CLOSE_IN = "12/3958/2617";

// A pack and its bytes, as scripts/build-offline-map.js --pack writes them.
const bins: Record<string, Uint8Array> = {};
function pack(file: string, tiles: Record<string, string>): OfflineMapPack {
  const text = Object.values(tiles).join("");
  bins[file] = new TextEncoder().encode(text);
  let offset = 0;
  return {
    file,
    bytes: text.length,
    tiles: Object.entries(tiles).map(([tile, body]) => {
      const entry: [string, number, number] = [tile, offset, body.length];
      offset += body.length;
      return entry;
    }),
  };
}
const set = (...packs: OfflineMapPack[]) => ({ bytes: packs.reduce((sum, p) => sum + p.bytes, 0), packs });
const manifest = () => ({
  sets: {
    standard: set(pack("standard-1.bin", { [MILFORD]: "milford" }), pack("standard-2.bin", { [NEXT_DOOR]: "next" })),
    detailed: set(pack("detailed-1.bin", { [CLOSE_IN]: "close-in" })),
  },
});

const packsDir = () => new Directory(Paths.cache, "offline-map-packs");
const onPhone = (tile: string) => new File(offlineMapDir(), tile);
const downloaded = () => mockResumable.mock.calls.map(([url]) => url.replace(`${OFFLINE_PACKS_URL}/`, ""));
const quiet = { onProgress: jest.fn(), shouldStop: () => false };

let cancelled: string[];
beforeEach(async () => {
  await AsyncStorage.clear();
  for (const dir of [offlineMapDir(), packsDir()]) if (dir.exists) dir.delete();
  cancelled = [];
  mockResumable.mockReset().mockImplementation((url: string, fileUri: string, _options, onWrite) => ({
    downloadAsync: async () => {
      const bytes = bins[url.split("/").pop()!];
      new File(fileUri).write(bytes);
      onWrite({ totalBytesWritten: bytes.length, totalBytesExpectedToWrite: bytes.length });
      return { status: 200, uri: fileUri };
    },
    cancelAsync: async () => void cancelled.push(url),
  }));
});

it("unpacks each pack into {z}/{x}/{y} files with the tile's own bytes", async () => {
  const result = await saveOfflineMap(manifest(), "standard", quiet);

  expect(result).toBe("saved");
  expect(downloaded()).toEqual(["standard-1.bin", "standard-2.bin"]);
  expect(mockResumable.mock.calls[0][2]).toEqual({ sessionType: 0 });
  expect(onPhone(MILFORD).textSync()).toBe("milford");
  expect(onPhone(NEXT_DOOR).textSync()).toBe("next");
  expect(await savedMapLevel()).toBe("standard");
  // The packs themselves don't stay on the phone.
  expect(packsDir().list()).toHaveLength(0);
});

it("counts the download in bytes, then the unpacking in tiles", async () => {
  const onProgress = jest.fn();
  await saveOfflineMap(manifest(), "standard", { onProgress, shouldStop: () => false });

  expect(onProgress).toHaveBeenCalledWith("saving", 11, 11);
  expect(onProgress).toHaveBeenLastCalledWith("unpacking", 2, 2);
});

// Signal dropped part way: the pack that landed is kept, and Carry on gets only the other.
it("packs that are already done aren't downloaded again", async () => {
  mockResumable.mockImplementationOnce(mockResumable.getMockImplementation()!).mockImplementationOnce(() => ({
    downloadAsync: async () => {
      throw new Error("The Internet connection appears to be offline.");
    },
    cancelAsync: async () => {},
  }));
  await expect(saveOfflineMap(manifest(), "standard", quiet)).rejects.toThrow("offline");
  expect(onPhone(MILFORD).exists).toBe(true);
  expect(await savedMapLevel()).toBeNull();

  mockResumable.mockClear();
  expect(await saveOfflineMap(manifest(), "standard", quiet)).toBe("saved");
  expect(downloaded()).toEqual(["standard-2.bin"]);
});

// The app was closed while unpacking: the pack is still on the phone, and isn't done.
it("an unpack cut short leaves the pack not done, and runs again without a download", async () => {
  const tiles = Object.fromEntries(Array.from({ length: 600 }, (_, i) => [`11/${1000 + i}/1308`, "t" + i]));
  const big = { sets: { standard: set(pack("standard-1.bin", tiles)), detailed: set() } };
  let seen = 0;

  const result = await saveOfflineMap(big, "standard", {
    onProgress: (phase, done) => void (phase === "unpacking" && (seen = done)),
    shouldStop: () => seen >= 250,
  });

  expect(result).toBe("stopped");
  expect(seen).toBeLessThan(600);
  expect(await savedMapLevel()).toBeNull();

  mockResumable.mockClear();
  expect(await saveOfflineMap(big, "standard", quiet)).toBe("saved");
  expect(downloaded()).toEqual([]);
  expect(onPhone("11/1599/1308").textSync()).toBe("t599");
});

it("the v1 flag reads as standard, and its tiles aren't downloaded again", async () => {
  await AsyncStorage.setItem(V1_KEY, "1");
  onPhone(MILFORD).create({ intermediates: true });

  expect(await savedMapLevel()).toBe("standard");
  expect(await saveOfflineMap(manifest(), "standard", quiet)).toBe("saved");
  expect(downloaded()).toEqual([]);
});

it("Detailed after Standard downloads only the detailed packs", async () => {
  await saveOfflineMap(manifest(), "standard", quiet);
  mockResumable.mockClear();

  expect(await saveOfflineMap(manifest(), "detailed", quiet)).toBe("saved");

  expect(downloaded()).toEqual(["detailed-1.bin"]);
  expect(onPhone(CLOSE_IN).textSync()).toBe("close-in");
  expect(await savedMapLevel()).toBe("detailed");
});

it("Detailed from nothing gets both sets", async () => {
  await saveOfflineMap(manifest(), "detailed", quiet);
  expect(downloaded()).toEqual(["standard-1.bin", "standard-2.bin", "detailed-1.bin"]);
});

it("Stop cancels the downloads", async () => {
  jest.useFakeTimers();
  try {
    // Downloads that only end when cancelled, as a real one does: with nothing back.
    mockResumable.mockImplementation((url: string) => {
      let end: (v: undefined) => void;
      return {
        downloadAsync: () => new Promise<undefined>((resolve) => (end = resolve)),
        cancelAsync: async () => {
          cancelled.push(url);
          end(undefined);
        },
      };
    });
    let stop = false;
    const saving = saveOfflineMap(manifest(), "standard", { onProgress: jest.fn(), shouldStop: () => stop });
    await jest.advanceTimersByTimeAsync(600);
    stop = true;
    await jest.advanceTimersByTimeAsync(600);

    expect(await saving).toBe("stopped");
    expect(cancelled).toHaveLength(2);
    expect(await savedMapLevel()).toBeNull();
  } finally {
    jest.useRealTimers();
  }
});

// The bucket answers a missing pack with an error page, which downloads without complaint.
it("a pack that isn't the size the list says is thrown away", async () => {
  mockResumable.mockImplementation((_url: string, fileUri: string) => ({
    downloadAsync: async () => {
      new File(fileUri).write("Not found");
      return { status: 404, uri: fileUri };
    },
    cancelAsync: async () => {},
  }));

  await expect(saveOfflineMap(manifest(), "standard", quiet)).rejects.toThrow("404");
  expect(packsDir().list()).toHaveLength(0);
  expect(await savedMapLevel()).toBeNull();
});

// iOS empties the cache folder when the phone runs low on storage, without telling the app.
it("not saved when the folder is gone, and every pack is needed again", async () => {
  await saveOfflineMap(manifest(), "standard", quiet);
  offlineMapDir().delete();
  mockResumable.mockClear();

  expect(await savedMapLevel()).toBeNull();
  await saveOfflineMap(manifest(), "standard", quiet);
  expect(downloaded()).toEqual(["standard-1.bin", "standard-2.bin"]);
});

it("remove deletes the folders and the flags", async () => {
  await AsyncStorage.setItem(V1_KEY, "1");
  await saveOfflineMap(manifest(), "detailed", quiet);

  await removeOfflineMap();

  expect(offlineMapDir().exists).toBe(false);
  expect(packsDir().exists).toBe(false);
  expect(await AsyncStorage.getItem(V1_KEY)).toBeNull();
  expect(await AsyncStorage.getItem(LEVEL_KEY)).toBeNull();
  expect(await savedMapLevel()).toBeNull();
});
