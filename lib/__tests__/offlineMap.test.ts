// The map saved for no signal (docs/plans/offline-map.md, Task 3): tiles downloaded from our
// bucket into the phone's cache folder, laid out the way react-native-maps reads them. Runs
// against jest-expo's in-memory file system, so folders and files are real; only the
// download is watched, and made to fail where a test needs it.

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { File } from "expo-file-system";

import { OFFLINE_MAP_URL, isOfflineMapSaved, offlineMapDir, removeOfflineMap, saveOfflineMap } from "@/lib/offlineMap";

const KEY = "offlineMap.saved.v1";
const MILFORD = "11/1979/1308";
const NEXT_DOOR = "11/1980/1308";

const manifest = (tiles: string[]) => ({ bytes: 1000, tiles });
const onPhone = (tile: string) => new File(offlineMapDir(), tile).exists;

let download: jest.SpyInstance;
beforeEach(async () => {
  await AsyncStorage.clear();
  if (offlineMapDir().exists) offlineMapDir().delete();
  // Calls through to the in-memory file system unless a test says otherwise.
  download = jest.spyOn(File, "downloadFileAsync");
});
afterEach(() => download.mockRestore());

it("writes each tile as {z}/{x}/{y} with no extension", async () => {
  await saveOfflineMap(manifest([MILFORD]), { onProgress: jest.fn(), shouldStop: () => false });

  expect(download).toHaveBeenCalledTimes(1);
  const [url, destination] = download.mock.calls[0];
  expect(url).toBe(`${OFFLINE_MAP_URL}/11/1979/1308.png`);
  expect(destination).toBeInstanceOf(File);
  expect(destination.uri).toMatch(/offline-map\/11\/1979\/1308$/);
  expect(onPhone(MILFORD)).toBe(true);
});

// The app went to the background mid-save, or the person tapped Stop: Carry on picks up
// where it left off.
it("skips tiles already on the phone", async () => {
  new File(offlineMapDir(), MILFORD).create({ intermediates: true });
  const onProgress = jest.fn();

  await saveOfflineMap(manifest([MILFORD, NEXT_DOOR]), { onProgress, shouldStop: () => false });

  expect(download).toHaveBeenCalledTimes(1);
  expect(download.mock.calls[0][0]).toBe(`${OFFLINE_MAP_URL}/11/1980/1308.png`);
  expect(onProgress).toHaveBeenLastCalledWith(2, 2);
});

// Signal dropped mid-save. One retry, then the save stops rather than calling a map with a
// hole in it saved.
it("a failed tile stops the save and leaves it unsaved", async () => {
  download.mockImplementation(async (url: string, destination: File) => {
    if (url.endsWith("/11/1980/1308.png")) throw new Error("The Internet connection appears to be offline.");
    destination.create({ intermediates: true });
    return destination;
  });

  await expect(
    saveOfflineMap(manifest([MILFORD, NEXT_DOOR]), { onProgress: jest.fn(), shouldStop: () => false }),
  ).rejects.toThrow("offline");

  expect(download.mock.calls.filter(([url]) => url.endsWith("/11/1980/1308.png"))).toHaveLength(2);
  expect(await isOfflineMapSaved()).toBe(false);
});

it("stops when asked", async () => {
  const tiles = Array.from({ length: 20 }, (_, i) => `11/${1970 + i}/1308`);
  let done = 0;

  const result = await saveOfflineMap(manifest(tiles), {
    onProgress: (d) => (done = d),
    shouldStop: () => done >= 1,
  });

  expect(result).toBe("stopped");
  expect(download.mock.calls.length).toBeLessThan(tiles.length);
  expect(await AsyncStorage.getItem(KEY)).toBeNull();
});

it("saved after every tile", async () => {
  const result = await saveOfflineMap(manifest([MILFORD, NEXT_DOOR]), { onProgress: jest.fn(), shouldStop: () => false });

  expect(result).toBe("saved");
  expect(await AsyncStorage.getItem(KEY)).toBe("1");
  expect(await isOfflineMapSaved()).toBe(true);
});

// iOS empties the cache folder when the phone runs low on storage, without telling the app.
it("not saved when the folder is gone", async () => {
  await AsyncStorage.setItem(KEY, "1");

  expect(offlineMapDir().exists).toBe(false);
  expect(await isOfflineMapSaved()).toBe(false);
});

it("remove deletes the folder and the flag", async () => {
  await saveOfflineMap(manifest([MILFORD]), { onProgress: jest.fn(), shouldStop: () => false });

  await removeOfflineMap();

  expect(offlineMapDir().exists).toBe(false);
  expect(await AsyncStorage.getItem(KEY)).toBeNull();
  expect(await isOfflineMapSaved()).toBe(false);
});
