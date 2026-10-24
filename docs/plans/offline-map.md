# Plan: a saved map for no signal

Written 2026-10-23. Line numbers were right on that date and drift; confirm each before relying on it.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** With no signal, the map tab shows roads, towns and terrain under the pins and the blue dot, instead of a blank grid, for anyone who saved the map beforehand.

**Architecture:** A script downloads LINZ topographic map tiles for the South Island once and puts them on Firebase Hosting, along with a list of the tiles. The app downloads that set into the phone's cache folder on request, from a row on the Account tab. When the phone is offline, the map draws those files through react-native-maps' `UrlTile` in `offlineMode`, which reads only files on the phone. When online, the map stays Apple Maps, as it is today.

**Tech stack:** react-native-maps 1.27.2 `UrlTile` (`tileCachePath`, `offlineMode`, `maximumNativeZ`, iOS Apple Maps), expo-file-system 57 (`File`, `Directory`, `Paths`), NetInfo, zustand, TanStack Query, Firebase Hosting, LINZ Data Service tiles (CC BY 4.0).

**Spec:** this file. Background: the conversation of 2026-10-23 on whether the app works without phone signal (Milford and mobile coverage posts).

## How the library stores tiles (checked in node_modules, 2026-10-23)

- `node_modules/react-native-maps/ios/AirMaps/AIRMapUrlTileCachedOverlay.m`, `getTileImage`: a tile is read from `{tileCachePath}/{z}/{x}/{y}`. **The file name is the y number with no extension.** Our download must write exactly that layout.
- `offlineMode`: nothing is fetched; only files on the phone are used. A missing tile is filled by enlarging a lower-zoom tile, up to about 3 levels lower.
- `maximumNativeZ`: above this zoom, the tile at that zoom is enlarged. Set it to the highest zoom we save, so the overlay covers every zoom (blurry when close in).
- `react-native-map-clustering` passes any child that isn't a marker straight through to the map (`lib/ClusteredMapView.js:82-86`). A `UrlTile` inside `ClusterMapView` reaches MapKit.

## Decisions

| Question | Decision |
|---|---|
| Map look | **Owner to confirm.** Recommended: LINZ topo maps. NZ Topo250 (LDS layer 50798) up to zoom 11, NZ Topo50 (layer 50767) from zoom 12. They show state highway numbers, towns, tracks and huts, which is what someone on the Milford road needs. The alternative is LINZ aerial photos: one source, but no names on anything. Either one changes only `tileUrl` in the script. |
| Area | The map's own bounds, `MAP_BOUNDS` in `components/map/MapRegion.ts` (-47.5 to -40.3, 166.2 to 174.6). The whole island in one download, no towns picked out. People in towns usually have signal and Apple Maps; the gaps are between towns. |
| Highest zoom | **Set after Task 1's dry run, by size.** The rectangle holds 3,851 tiles up to zoom 11 and 15,006 up to zoom 12. Tiles over the sea are a few hundred bytes, so the size is mostly land. Zoom 12 if the set is 150 MB or less, else zoom 11. |
| Where the tiles are hosted | Firebase Hosting on project `southislandguide`, under `/offline-map/v1/`. Each phone downloads from us, not from LINZ, so no LINZ key ships in the app (LINZ asks that keys not be shown to the public). **Owner to check the project is on the Blaze plan.** Spark allows 360 MB a day in total, about two saves. On Blaze it's about US$0.15 a GB: 1,000 saves of 120 MB is about $18. |
| Where on the phone | `Paths.cache` (Library/Caches). Not `Paths.document`: iOS backs that up to iCloud, and Apple's storage rules reject apps that put content that can be downloaded again there. iOS may clear the cache when storage runs low, so "saved" is checked against the folder each time, not only remembered. |
| When the saved map shows | Only when the phone is offline (the map screen's own `isOffline`). Online, Apple Maps is clearer and has names. |
| Cellular | Saving on mobile data asks first: "Not on Wi-Fi. Saving the map uses about N MB of data." |
| Who gets it | Everyone, guests too. The row sits beside "Show me around" on the Account tab, outside the signed-in block. |
| Credit | CC BY 4.0 asks for visible credit. While the saved map is showing: a small "Map: LINZ, CC BY 4.0" over the map. On the Account row, the line under the button says the same. Check the wording against LINZ's attribution page before Task 4. |
| Android | Not a target. |

## Global constraints

- No new native packages and no change to `app.config.ts`, so this ships as an over-the-air update. `UrlTile`, expo-file-system and NetInfo are already in the build. Task 5's device check confirms `UrlTile` renders under the new architecture before anything ships.
- iOS only. Don't change `../enginev1` or `../rotorua-guide`.
- Screen words: "place", never "location"; "Trip", never "itinerary". "No signal" is the guide's phrase; use it.
- Follow the existing comment style (full sentences, why not what, `ponytail:` for known ceilings) and test style. Write each test before the code it covers.
- `LINZ_API_KEY` is read from the environment, never the command line (same rule as `GOOGLE_MAPS_API_KEY` in `scripts/generate-drive-times.js`).

## Review focus

1. **The app goes to the background mid-save** (JS stops). On return the row reads "partly saved"; "Carry on" skips the files already there. Tests: Task 3, `skips tiles already on the phone`; Task 4, `shows partly saved after a stop`.
2. **Signal drops mid-save.** The save stops and the map isn't marked saved. Test: Task 3, `a failed tile stops the save and leaves it unsaved`.
3. **iOS clears the cache.** The flag says saved but the folder is gone. The row goes back to "Save", and the map doesn't try to draw. Test: Task 3, `not saved when the folder is gone`.
4. **The app opens with no signal.** The "saved" check is a query, and TanStack pauses queries offline. It must use `networkMode: "always"`, or the map never shows the saved tiles at the one time they're needed. Test: Task 4, `reads saved while offline`.
5. **Tapping Save with no signal.** The list of tiles can't be fetched; the row says "Needs signal to save" and nothing is written. Test: Task 4, `no signal when saving`.

---

### Task 1: Tile build script

**Files:**
- Create: `scripts/lib/offlineTiles.js` (working parts, CommonJS like `scripts/lib/driveMatrix.js`)
- Create: `scripts/build-offline-map.js` (command line, same shape as `scripts/generate-drive-times.js`: dry run by default, `--apply` downloads)
- Test: `scripts/__tests__/offlineTiles.test.js`
- Modify: `.gitignore` (add `offline-map-site/`)

**Interfaces:**
- Produces: `tilesFor(bounds: {minLat, maxLat, minLng, maxLng}, minZ: number, maxZ: number): string[]`, each tile as `"z/x/y"`, Web Mercator XYZ (y counted from the top).
- Produces: `tileUrl(tile: string, key: string): string`. Topo250 for z ≤ 11, Topo50 for z ≥ 12: `https://tiles-{a-d}.tiles-cdn.koordinates.com/services;key=${key}/tiles/v4/layer=${layer}/EPSG:3857/${z}/${x}/${y}.png`. The subdomain letter is picked from the tile so requests spread.
- Produces on disk, with `--apply`: `offline-map-site/offline-map/v1/{z}/{x}/{y}.png` and `offline-map-site/offline-map/v1/manifest.json` = `{ "bytes": number, "tiles": string[] }`. Tiles LINZ answers with an error are left out of both.

- [ ] **Step 1: Write the failing tests**

```js
const { tilesFor, tileUrl } = require("../lib/offlineTiles");
const BOUNDS = { minLat: -47.5, maxLat: -40.3, minLng: 166.2, maxLng: 174.6 };

test("covers the island's rectangle at each zoom", () => {
  expect(tilesFor(BOUNDS, 5, 5)).toEqual(["5/30/19", "5/30/20", "5/31/19", "5/31/20"]);
  expect(tilesFor(BOUNDS, 5, 11)).toHaveLength(3851);
  expect(tilesFor(BOUNDS, 5, 12)).toHaveLength(15006);
});

test("includes Milford Sound at zoom 11", () => {
  expect(tilesFor(BOUNDS, 11, 11)).toContain("11/1979/1308");
});

test("Topo250 up to zoom 11, Topo50 from 12", () => {
  expect(tileUrl("11/1979/1308", "K")).toMatch(/layer=50798\/EPSG:3857\/11\/1979\/1308\.png$/);
  expect(tileUrl("12/3958/2617", "K")).toMatch(/layer=50767\//);
  expect(tileUrl("12/3958/2617", "K")).toContain("key=K");
});
```

- [ ] **Step 2: Run it and see it fail.** `npx jest scripts/__tests__/offlineTiles.test.js`. Expected: FAIL, "Cannot find module '../lib/offlineTiles'".

- [ ] **Step 3: Implement `tilesFor` and `tileUrl`** in `scripts/lib/offlineTiles.js`. Standard slippy-map maths: `x = floor((lng + 180) / 360 * 2^z)`, `y = floor((1 - asinh(tan(lat)) / π) / 2 * 2^z)`, every x and y between the two corners inclusive.

- [ ] **Step 4: Run the tests and see them pass.** Same command. Expected: 3 passed.

- [ ] **Step 5: Write `scripts/build-offline-map.js`.**
  - Reads `MAX_Z` from a constant at the top (11 until the owner picks), with `MIN_Z = 5`, and the bounds copied from `MAP_BOUNDS`, with a comment naming that file.
  - Dry run prints tiles per zoom and the total.
  - `--apply` needs `LINZ_API_KEY`. It downloads 4 at a time, skips files already in `offline-map-site/`, retries a failed tile once, then writes `manifest.json`. It prints MB per zoom and the total.

- [ ] **Step 6: Run the dry run.** `node scripts/build-offline-map.js`. Expected: 3,851 tiles at MAX_Z 11.

- [ ] **Step 7: Owner gate.** With the key set: `node scripts/build-offline-map.js --apply`. Report the total MB to the owner. Then raise MAX_Z to 12, run again (only the new tiles download) and report again. The owner picks the zoom by the table in Decisions. Set MAX_Z to it and delete any zoom-12 folder if 11 was picked. Open three tiles in an image viewer: Milford, Christchurch, open sea.

- [ ] **Step 8: Commit.**

```bash
git add scripts/lib/offlineTiles.js scripts/build-offline-map.js scripts/__tests__/offlineTiles.test.js .gitignore
git commit -m "feat(map): script to build the saved map's tiles from LINZ"
```

### Task 2: Host the tiles

**Files:**
- Modify: `firebase.json` (add `hosting`)

**Interfaces:**
- Produces: `https://southislandguide.web.app/offline-map/v1/manifest.json` and `.../offline-map/v1/{z}/{x}/{y}.png`. Confirm the site's real address in the Firebase console first. If it differs, Task 3's `OFFLINE_MAP_URL` uses what the console shows.

- [ ] **Step 1: Add hosting.** In `firebase.json`: `"hosting": { "public": "offline-map-site", "headers": [{ "source": "/offline-map/**", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] }] }`. A new set goes under `/v2/`, never over `/v1/`.
- [ ] **Step 2: Owner deploys.** `firebase deploy --only hosting`. This publishes, so it's the owner's go.
- [ ] **Step 3: Check.** `curl -sI https://southislandguide.web.app/offline-map/v1/11/1979/1308.png` should return `200` and `content-type: image/png`. `curl -s .../manifest.json | head -c 200` should show `{"bytes":`.
- [ ] **Step 4: Commit.** `git add firebase.json && git commit -m "chore(map): host the saved map's tiles"`

### Task 3: Saving the map on the phone

**Files:**
- Create: `lib/offlineMap.ts`
- Test: `lib/__tests__/offlineMap.test.ts` (mocks `expo-file-system`, `fetch` and AsyncStorage the way other `lib/__tests__` files do)

**Interfaces:**
- Consumes: Task 2's URLs.
- Produces:
  - `OFFLINE_MAP_URL = "https://southislandguide.web.app/offline-map/v1"`
  - `OFFLINE_MAP_ABOUT_MB: number`: the size from Task 1, rounded to 10.
  - `OFFLINE_MAP_MAX_Z: number`: the highest zoom saved, the same as the script's `MAX_Z`, with a comment naming the script.
  - `offlineMapDir(): Directory`: `new Directory(Paths.cache, "offline-map")`.
  - `type OfflineMapManifest = { bytes: number; tiles: string[] }`
  - `fetchOfflineMapManifest(): Promise<OfflineMapManifest>`: throws when there's no answer.
  - `saveOfflineMap(manifest, opts: { onProgress(done: number, total: number): void; shouldStop(): boolean }): Promise<"saved" | "stopped">`
  - `isOfflineMapSaved(): Promise<boolean>`
  - `removeOfflineMap(): Promise<void>`
  - AsyncStorage key `"offlineMap.saved.v1"`, value `"1"`.

- [ ] **Step 1: Write the failing tests.** Names and what each asserts:
  - `writes each tile as {z}/{x}/{y} with no extension`: after saving a manifest of `["11/1979/1308"]`, `File.downloadFileAsync` was called with `${OFFLINE_MAP_URL}/11/1979/1308.png` and a `File` whose path ends `offline-map/11/1979/1308`.
  - `skips tiles already on the phone`: with `11/1979/1308` existing, only the other tile downloads; progress reaches `(2, 2)`.
  - `a failed tile stops the save and leaves it unsaved`: the download rejects twice for one tile. `saveOfflineMap` rejects, and `isOfflineMapSaved()` is `false`.
  - `stops when asked`: `shouldStop` returns true after the first tile. The result is `"stopped"` and the flag isn't set.
  - `saved after every tile`: the flag is `"1"` and `isOfflineMapSaved()` is `true`.
  - `not saved when the folder is gone`: the flag is `"1"`, the folder doesn't exist, and the result is `false`.
  - `remove deletes the folder and the flag`.
- [ ] **Step 2: Run them and see them fail.** `npx jest lib/__tests__/offlineMap.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement `lib/offlineMap.ts`.** Six downloads at a time from a shared queue. Create each `z/x` folder with `{ intermediates: true, idempotent: true }`. Retry a failed tile once. Set the flag only after the last tile. Comments: why Caches and not Documents (Decisions); the no-extension layout, citing `AIRMapUrlTileCachedOverlay.m`. Add `// ponytail: one set, v1. A rebuilt set goes to /v2/ with a new flag key, and phones save again.`
- [ ] **Step 4: Run the tests and see them pass.** Same command. Expected: 7 passed.
- [ ] **Step 5: Commit.** `git commit -m "feat(map): save the map's tiles on the phone"`, with both files.

### Task 4: The Account row

**Files:**
- Create: `lib/hooks/useOfflineMap.ts`
- Create: `components/account/OfflineMapCard.tsx`
- Modify: `app/(app)/(tabs)/account.tsx:84-99` (the card goes after the tour row, outside `isAuthed`)
- Test: `lib/hooks/__tests__/useOfflineMap.test.tsx`, `app/(app)/(tabs)/__tests__/account.test.tsx`

**Interfaces:**
- Consumes: everything Task 3 produces.
- Produces `useOfflineMap(): { saved: boolean; progress: { done: number; total: number } | null; error: "no-signal" | "stopped" | null; save(): Promise<void>; stop(): void; remove(): Promise<void> }`.
  - `saved` comes from the query `["offlineMap", "saved"]`, with `networkMode: "always"` and `staleTime: 0`.
  - `progress` and `error` live in a module zustand store, so a save keeps going and keeps its progress when the person leaves the tab.
  - `save` fetches the manifest (on failure `error = "no-signal"`) and runs `saveOfflineMap`. A thrown save or a `"stopped"` result sets `error = "stopped"`. A `"saved"` result invalidates the query.

- [ ] **Step 1: Write the failing hook tests.**
  - `reads saved while offline`: with `onlineManager.setOnline(false)`, `saved` becomes `true` when `isOfflineMapSaved` resolves `true`.
  - `no signal when saving`: the manifest fetch rejects, `error === "no-signal"`, and `saveOfflineMap` wasn't called.
  - `shows partly saved after a stop`: `saveOfflineMap` resolves `"stopped"` after progress `(10, 40)`. Then `error === "stopped"` and `progress` is `{ done: 10, total: 40 }`.
- [ ] **Step 2: Run and see them fail.** `npx jest lib/hooks/__tests__/useOfflineMap.test.tsx`
- [ ] **Step 3: Implement `useOfflineMap`.**
- [ ] **Step 4: Run and see them pass.**
- [ ] **Step 5: Write the failing Account test.** It renders the card for a guest. It shows `Save map for no signal`. Pressing it while NetInfo says `type: "cellular"` raises an `Alert` titled `Not on Wi-Fi`. Mock the hook.
- [ ] **Step 6: Build `OfflineMapCard`** in the style of the tour row. Exact copy:

  | State | Title | Line under it | Button |
  |---|---|---|---|
  | Not saved | Map for no signal | About {OFFLINE_MAP_ABOUT_MB} MB. Roads, towns and tracks across the South Island, for when there's no signal. | Save map for no signal |
  | Saving | Saving the map… {pct}% | Keep the app open until it's done. | Stop |
  | Partly saved | Map partly saved ({pct}%) | Carry on when you have Wi-Fi. | Carry on |
  | No signal | Map for no signal | Needs signal to save. | Save map for no signal |
  | Saved | Map saved for no signal | Shows on the map when there's no signal. Map: LINZ, CC BY 4.0. | Remove |

  Cellular confirm: `Alert.alert("Not on Wi-Fi", "Saving the map uses about {N} MB of data.", [Cancel, "Save anyway"])`. Remove asks: `"Remove the saved map?"`, `[Cancel, "Remove"]`. The button has `accessibilityRole="button"`, and the percentage is in the label.
- [ ] **Step 7: Run both test files and the typecheck.** `npx jest lib/hooks/__tests__/useOfflineMap.test.tsx "app/(app)/(tabs)/__tests__/account.test.tsx" && npm run typecheck`. Expected: all pass, no type errors.
- [ ] **Step 8: Commit.** `git commit -m "feat(account): save the map for no signal"`

### Task 5: Draw the saved map when offline

**Files:**
- Modify: `components/map/SitesMapView.tsx:111-252` (new prop, `UrlTile` child, credit line)
- Modify: `app/(app)/(tabs)/map/index.tsx:251-257` (pass the folder when offline and saved)
- Test: `components/map/__tests__/sitesMapView.test.tsx`, `app/(app)/(tabs)/map/__tests__/map.test.tsx`

**Interfaces:**
- Consumes: `offlineMapDir()`, `OFFLINE_MAP_URL` and `OFFLINE_MAP_MAX_Z` (Task 3), `useOfflineMap().saved` (Task 4).
- Produces: a `SitesMapView` prop `offlineTilesDir?: string | null`.

- [ ] **Step 1: Write the failing tests.**
  - In `sitesMapView.test.tsx`, add `UrlTile` to the `react-native-maps` mock (capture its props). Test `draws the saved tiles from the phone`: with `offlineTilesDir="file:///c/offline-map"`, `UrlTile` gets `tileCachePath` equal to that, `offlineMode: true`, `maximumNativeZ` equal to `OFFLINE_MAP_MAX_Z`, and `urlTemplate` `${OFFLINE_MAP_URL}/{z}/{x}/{y}.png`. The text `Map: LINZ, CC BY 4.0` shows. Test `no saved tiles online`: with `null`, there's no `UrlTile` and no credit.
  - In `map.test.tsx`: `passes the folder only when offline and saved`. The four combinations of offline and saved; only offline + saved passes a folder.
- [ ] **Step 2: Run and see them fail.**
- [ ] **Step 3: Implement.** In `SitesMapView`, render `UrlTile` as the first child of `ClusterMapView` when the prop is set (`tileSize={256}`, `minimumZ={5}`). When the prop is set, wrap the map in a `View` and lay the credit line over it: small muted text, `position: "absolute"`, `left: 8`, `bottom: 4`. In `map/index.tsx`, `offlineTilesDir={isOffline && saved ? offlineMapDir().uri : null}`. Comment the ceiling: `// ponytail: only when fully offline. One bar of signal that can't load Apple's tiles still shows a blank grid; a "Saved" map type beside satellite is the upgrade if testers hit it.`
- [ ] **Step 4: Run all tests and the typecheck.** `npm test && npm run typecheck`. Expected: all pass.
- [ ] **Step 5: Commit.** `git commit -m "feat(map): draw the saved map when there's no signal"`

### Task 6: Device check (owner, dev build)

- [ ] On Wi-Fi: Account, "Save map for no signal". Watch the percentage. Leave the tab and come back mid-save; the percentage carries on.
- [ ] Put the app in the background mid-save, return, and check it reads "partly saved". "Carry on" finishes.
- [ ] Airplane mode. Map tab: zoom out to the whole island, then in on Milford Sound, Haast and the Catlins. You should see topo under the pins and the blue dot, blurry when close in, never a grid.
- [ ] The credit line isn't hidden by the bottom sheet. If it is, move it, then re-run Task 5's test.
- [ ] Turn airplane mode off: back to Apple Maps.
- [ ] Remove, then airplane mode again: blank grid as before (proves the overlay is ours).
- [ ] Then: update the Milford and mobile coverage posts and the guide's no-signal lines to "save the map on the Account tab before you go". Add a line to `docs/plans/launch.md` "Already done".
