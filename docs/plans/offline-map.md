# Plan: a saved map for no signal

Written 2026-10-23. Line numbers were right on that date and drift; confirm each before relying on it.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** With no signal, the map tab shows roads, towns and terrain under the pins and the blue dot, instead of a blank grid, for anyone who saved the map beforehand.

**Architecture:** A script downloads LINZ topographic map tiles for the whole country once and puts them in a Cloudflare R2 bucket, along with a list of the tiles. The app downloads that set into the phone's cache folder on request, from a row on the Account tab. When the phone is offline, the map draws those files through react-native-maps' `UrlTile` in `offlineMode`, which reads only files on the phone. When online, the map stays Apple Maps, as it is today.

**Tech stack:** react-native-maps 1.27.2 `UrlTile` (`tileCachePath`, `offlineMode`, `maximumNativeZ`, iOS Apple Maps), expo-file-system 57 (`File`, `Directory`, `Paths`), NetInfo, zustand, TanStack Query, Cloudflare R2, LINZ Data Service tiles (CC BY 4.0).

**Spec:** this file. Background: the conversation of 2026-10-23 on whether the app works without phone signal (Milford and mobile coverage posts).

## How the library stores tiles (checked in node_modules, 2026-10-23)

- `node_modules/react-native-maps/ios/AirMaps/AIRMapUrlTileCachedOverlay.m`, `getTileImage`: a tile is read from `{tileCachePath}/{z}/{x}/{y}`. **The file name is the y number with no extension.** Our download must write exactly that layout.
- `offlineMode`: nothing is fetched; only files on the phone are used. A missing tile is filled by enlarging a lower-zoom tile, up to about 3 levels lower.
- `maximumNativeZ`: above this zoom, the tile at that zoom is enlarged. Set it to the highest zoom we save, so the overlay covers every zoom (blurry when close in).
- `react-native-map-clustering` passes any child that isn't a marker straight through to the map (`lib/ClusteredMapView.js:82-86`). A `UrlTile` inside `ClusterMapView` reaches MapKit.

## Decisions

| Question | Decision |
|---|---|
| Map look | **Topo, owner 2026-11-07.** LINZ topo maps. NZ Topo250 (LDS layer 50798) up to zoom 11, NZ Topo50 (layer 50767) from zoom 12. They show state highway numbers, towns, tracks and huts, which is what someone on the Milford road needs. The alternative is LINZ aerial photos: one source, but no names on anything. Either one changes only `tileUrl` in the script. |
| Area | **The whole country, owner 2026-11-07:** -47.5 to -34.3, 166.2 to 178.7 (`BOUNDS` in `scripts/build-offline-map.js`), so nobody has to save again when the North Island goes live. One download, no towns picked out. People in towns usually have signal and Apple Maps; the gaps are between towns. |
| Highest zoom | **Set after Task 1's first `--apply`, by size.** The rectangle holds 9,849 tiles up to zoom 11 and 38,793 up to zoom 12 (the South Island alone was 3,851 and 15,006). Tiles over the sea are a few hundred bytes, so the size is mostly land. Zoom 12 if the set is 250 MB or less and saving takes under about 10 minutes on Wi-Fi, else zoom 11. |
| Where the tiles are hosted | **Cloudflare R2, owner 2026-11-07** (was Firebase Hosting): a public bucket on a blacksands.app address, e.g. `https://tiles.blacksands.app/offline-map/v1/`. R2 charges nothing for downloads, and with `Cache-Control: immutable` most requests are answered from Cloudflare's cache. Each phone downloads from us, not from LINZ, so no LINZ key ships in the app (LINZ asks that keys not be shown to the public). |
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
- Produces: `tileUrl(tile: string, key: string): string`. Topo250 for z ≤ 11, Topo50 for z ≥ 12: `https://tiles-{a-d}.data-cdn.linz.govt.nz/services;key=${key}/tiles/v4/layer=${layer}/EPSG:3857/${z}/${x}/${y}.png`. The subdomain letter is picked from the tile so requests spread.
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

### Task 2: Host the tiles (Cloudflare R2, owner 2026-11-07)

**Interfaces:**
- Produces: `https://tiles.blacksands.app/offline-map/v1/manifest.json` and `.../offline-map/v1/{z}/{x}/{y}.png`. If the owner picks another address, Task 3's `OFFLINE_MAP_URL` uses it.

- [x] **Step 1: Owner, Cloudflare dashboard.** R2 → create a bucket, `kiwiguide-offline-map`. Its Settings → Custom Domains → connect `tiles.blacksands.app` (blacksands.app is already on Cloudflare). Then Manage R2 API Tokens → create one with Object Read & Write on that bucket only; keep its Access Key ID, Secret and the account's S3 endpoint for Step 2, never in the repo or chat.
- [x] **Step 2: Owner uploads.** With rclone set up for R2 (`rclone config`, provider Cloudflare, the token from Step 1): `rclone copy offline-map-site r2:kiwiguide-offline-map --header-upload "Cache-Control: public, max-age=31536000, immutable" --transfers 32 --progress`. It's tens of thousands of small files, so `wrangler r2 object put`, one file per command, is too slow. A new set goes under `/v2/`, never over `/v1/`.
- [x] **Step 3: Check.** `curl -sI https://tiles.blacksands.app/offline-map/v1/11/1979/1308.png` should return `200`, `content-type: image/png` and the Cache-Control above. `curl -s https://tiles.blacksands.app/offline-map/v1/manifest.json | head -c 200` should show `{"bytes":`.

### Task 3: Saving the map on the phone

**Files:**
- Create: `lib/offlineMap.ts`
- Test: `lib/__tests__/offlineMap.test.ts` (mocks `expo-file-system`, `fetch` and AsyncStorage the way other `lib/__tests__` files do)

**Interfaces:**
- Consumes: Task 2's URLs.
- Produces:
  - `OFFLINE_MAP_URL = "https://tiles.blacksands.app/offline-map/v1"`
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
  | Not saved | Map for no signal | About {OFFLINE_MAP_ABOUT_MB} MB. Roads, towns and tracks across New Zealand, for when there's no signal. | Save map for no signal |
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

---

## v2: background download, a detailed map, the credit moved (owner, 2026-11-11)

From the first phone check of v1 (2026-11-11):
- **Too slow.** 71% after 15 minutes. The Map tab subscribed to every tile's progress and redrew the whole map 9,849 times. That's fixed once a percent (`oncePerPercent` in `lib/hooks/useOfflineMap.ts`, not yet published). v2 replaces the tile-by-tile download anyway.
- **"Could the download be done while the app is closed?"** Yes, through an iOS background download, which is already in the app: expo-file-system's legacy module and its `FileSystemBackgroundSessionHandler` are in the current build. So all of v2 ships over the air. iOS handles a few large files in the background well, but not 9,849 small ones, so the tiles are packed.
- **Very blurry close in.** Zoom 11 is LINZ's 1:250,000 map. Owner: offer both, the smaller less detailed map and the bigger more detailed one.
- **The credit was covered** by the bottom sheet. Owner: move it under the search bar.

### Decisions

| Question | Answer |
|---|---|
| Two sizes | **Standard:** zoom 5–11, all of NZ, as now (about 80 MB). **Detailed:** Standard plus zoom 12 (Topo50, 1:50,000) over the app's map area, `MAP_BOUNDS` (11,155 tiles, about 150 MB more, so about 230 MB). Task 1 measures the real size. Zoom 12 for the North Island goes in with the North Island release as one more pack (about 150 MB more). Until then, with Detailed saved, zooming past 11 north of `MAP_BOUNDS` shows no map, because UrlTile only enlarges tiles beyond `maximumNativeZ`. That's outside the app's places. |
| Packs | Each set's tiles are written back to back into files of about 40 MB or less (`standard-1.bin`, …, `detailed-1.bin`, …). The manifest lists each pack's tiles as `[tile, offset, length]`. Standard is 2 packs; Detailed adds about 4. If iOS cancels a download (the app swiped away), at most one pack is lost. |
| Background | Every pack still needed is started at once as a legacy `createDownloadResumable(…, { sessionType: BACKGROUND })`, so iOS carries on with the app closed or the phone locked. A pack is unpacked into `{z}/{x}/{y}` files when the app next runs JS: straight away if it's open, otherwise on the next open. It's marked done only after its last tile, so an unpack cut short runs again (writes are idempotent). Swiping the app away cancels the downloads; "Carry on" downloads the packs that aren't done again. |
| Hosting | `offline-map/v2/` beside v1 in the same bucket, with the same rclone command and `Cache-Control`. v1 stays for phones still on the old code. |
| Phones that saved v1 | Their tiles are the same z5–11 files in the same folder. The v1 flag counts as Standard saved, so there's no download again, and Detailed adds only its packs. |
| Credit | Moves from the map's bottom left to the map screen, under the search bar and the filter pills. It's small text on a light backing, shown only while the saved map is drawn. |

### Task 1: Build the packs (script)
- `scripts/build-offline-map.js`: `MAX_Z` becomes per set. Standard: `BOUNDS` z5–11. Detailed: `MAP_BOUNDS` z12. `--apply` downloads the z12 tiles from LINZ, about 10 minutes at 4 at a time, and needs the owner's `LINZ_API_KEY`. Then `--pack` writes `offline-map-site/offline-map/v2/{standard,detailed}-N.bin` and `v2/manifest.json`:
  `{ "sets": { "standard": { "bytes", "packs": [{ "file", "bytes", "tiles": [["5/30/19", 0, 116], …] }] }, "detailed": { … } } }`.
- Test (`scripts/__tests__/offlineTiles.test.js`): packing two tiles gives offsets 0 and len(first), a new pack starts past the size limit, and reading back by offset gives each tile's bytes.
- The run prints each set's MB. Those numbers go into `OFFLINE_MAP_SIZES_MB` (Task 3) and this doc.
- **Built and uploaded 2026-11-11:** standard 77.7 MB in 2 packs, detailed 168.1 MB in 5 packs (11,155 tiles), so Detailed is 245.8 MB in all: "about 250 MB", and "about 170 MB more" after Standard. The zoom 12 tiles are kept in `offline-map-tiles-z12/`, outside the hosted folder. v2's files are served as never changing, so a rebuilt set goes to v3.

### Task 2: Host v2 (owner)
- The same rclone command as Task 2 above (it copies `offline-map-site`, so v2 goes up beside v1). The same curl checks, on `v2/manifest.json` and one `.bin`.

### Task 3: Save by packs, in the background (`lib/offlineMap.ts`)
- `OFFLINE_MAP_URL` → `/v2`. `OFFLINE_MAP_SIZES_MB = { standard, detailed }`.
- `savedMapLevel(): Promise<"standard" | "detailed" | null>` replaces `isOfflineMapSaved`. It reads the flag `offlineMap.saved.v2`, with the v1 flag counting as standard, and checks the folder exists.
- `saveOfflineMap(manifest, level, { onProgress(phase, done, total), shouldStop })`:
  - starts every pack that isn't done as a background download to `Paths.cache/offline-map-packs/`;
  - unpacks each one as it lands (`File.open()` → `offset` + `readBytes(length)` → `new File(dir, z, x, y).write(bytes)`), yielding to the screen every 250 tiles;
  - records the pack as done, then deletes the `.bin`.
  - Progress is downloaded bytes across the packs, then "Unpacking" by tiles.
  - Stop cancels the downloads.
- `removeOfflineMap` also deletes the packs folder and both flags.
- Tests:
  - a pack is unpacked to the right files with the right bytes;
  - packs that are already done aren't downloaded again;
  - an unpack cut short leaves the pack not done;
  - the v1 flag reads as standard;
  - Detailed after Standard downloads only the detailed packs;
  - Stop cancels the downloads.

### Task 4: The Account card
- With nothing saved, "Save map for no signal" opens the card with the choice:
  - **Standard map**: "About 80 MB. Roads, towns and tracks. Blurry close in."
  - **Detailed map**: "About 230 MB. Sharp close in, for walks and back roads."
- Then the card shows progress:
  - "Saving the map… 42%" with the bar, and "It keeps going if you leave the app. Don't swipe it away.";
  - then "Unpacking the map…";
  - then "Map saved".
- With Standard saved, the row also offers "Get the detailed map (about 150 MB more)". Remove stays.
- The mobile-data alert quotes the size of the level chosen.
- `useOfflineMap` returns `level` instead of `saved`, and its progress includes the phase. It keeps `oncePerPercent`.

### Task 5: The map
- `maximumNativeZ` is 12 with Detailed saved and 11 with Standard.
- The credit moves into `app/(app)/(tabs)/map/index.tsx`, under the search bar and the pills. It's removed from `SitesMapView`. Tests: it shows only while the saved map is drawn, and it isn't inside the bottom sheet.

### Task 6: Phone check (owner, dev build, over the air)
- Standard on Wi-Fi: lock the phone right after starting. Unlock after 2 minutes; it should have carried on. Time the whole save.
- Detailed after Standard: only the extra downloads.
- Airplane mode: Milford, Haast and the Catlins are sharp to zoom 12. The credit is visible under the search bar.
- Remove, then airplane mode again somewhere not looked at recently in Apple Maps (Dusky Sound, Stewart Island): the empty grid shows. Apple keeps its own copy of what was viewed online, so step 5's places can still show Apple's map.
- Swipe the app away during a save, then reopen it: "partly saved", and "Carry on" finishes.
