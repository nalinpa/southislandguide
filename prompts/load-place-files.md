# Load a places JSON file into South Island Guide

You are loading one or more files of places (for example `assets/data/akaroa_banks_peninsula_places.json`) into South Island Guide, an Expo / React Native travel app in this repo, and making the app's travel times cover them. Read this whole brief before running anything.

Places live in Firestore (project `southislandguide`, collection `locations`). The app reads them through the shared api, so a place is in the app as soon as it is in Firestore: no app build or update is needed for the places themselves. Only the travel times and any new area labels ship in the app, as an over-the-air update.

## Ground rules

- **Writes to Firestore and calls to Google's maps service are real.** Always do the dry run first, show the owner its output, and run `--apply` only when the owner says so.
- **Never paste or print a key.** The Firebase key is a file whose path goes in `GOOGLE_APPLICATION_CREDENTIALS`; the maps key goes in `GOOGLE_MAPS_API_KEY`. Both are set in the owner's terminal.
- **Do not change `../enginev1` or `../rotorua-guide`.** The api is shared with another live app.
- **Do not set `isPremium` / `premium` on any place.** South Island has no store set up yet; one premium place makes the api fail the whole place list. The upload script strips both fields; keep it that way.
- Follow the repo's existing style. Commit with clear messages; do not push unless asked.

## The file

A JSON array, one object per place. The fields the app uses:

| Field | Required | Notes |
|---|---|---|
| `name` | yes | |
| `slug` | yes | lower-case words joined by `-`. Becomes the Firestore document id, so it must be unique across **all** places, not just this file. |
| `lat`, `lng` | yes | numbers |
| `category` | yes | non-empty array of ids from `SITE_CATEGORIES` in `lib/models.ts`: `Scenic`, `Adventure`, `Walks`, `Nature`, `Attractions`, `Water`, `Food`, `Culture`, `Stay`. **The first is the place's main category**: Explore lists it under that tab only, and it picks the marker and default photo. |
| `region` | yes | one of the region ids in `lib/guideContent.ts` (`canterbury`, `kaikoura`, `marlborough`, `nelson-tasman`, `west-coast`, `aoraki-mackenzie`, `queenstown-wanaka`, `fiordland`, `dunedin-otago`, `southland-catlins`) |
| `area` | **yes in practice** | the town the place is visited from, e.g. `christchurch`, `banks-peninsula`. Lower-case words joined by `-`. Without it the place has no town: Explore puts it under "Other", and travel to it is only estimated. The upload script does **not** check this field; you must. |
| `description` | yes | |
| `active` | | `true` to show it |
| `price` | | `Free`, `Cheap`, `Moderate` or `Expensive` |
| `hoursNote` | | opening times and access notes, `;`-separated |
| `recommendedDurationSlots` | | half-hour slots |
| `website`, `featured` | | `featured` is a number; higher is more featured |
| `sourceUrl`, `confidence` | | research notes; stay in the file, never uploaded |

## Steps

### 1. Check the file before anything is written

Write a short check (a one-off `node -e` is fine) and report the results to the owner:

- Every place has an `area`, and every `area` is a well-formed id.
- Every `category` entry is one of the nine ids.
- No `slug` already exists in the live list **unless the owner means to replace that place**. The live list: `https://api.blacksands.app/v1/southislandguide/locations` (public; inactive places with `?includeInactive=true`). Also check names, to catch the same place under a different slug.
- Coordinates fall inside the South Island box in `components/map/MapRegion.ts` (`MAP_BOUNDS`).
- The file has at most 500 places (the script writes in one Firestore batch, which allows 500). Split a bigger file.

### 2. Upload: dry run, then apply

```
node scripts/upload-places.js <file>            # dry run
node scripts/upload-places.js <file> --apply    # write, on the owner's go
```

The script itself refuses a key for any project but `southislandguide`, and refuses the file if names, slugs, coordinates, categories, regions, prices or descriptions are malformed. The dry run says how many places are **new** and how many it would **replace**.

**"Replace" overwrites the whole document**, including anything edited in the admin panel since (photos, shorter names, hours). If places in the file are already live and only their `area` or `region` should change, do not re-upload them: add the file to `FILES` in `scripts/set-area.js` and run that instead (dry run, then `--apply`); it touches only those two fields.

### 3. Confirm it is live

Fetch the live list again and confirm the new places are there with the right `area`, and the total count went up by the number of new places.

### 4. Travel times for the new places

`scripts/generate-drive-times.js` asks Google's Distance Matrix for travel times and **only for what is not already known**:

```
node scripts/generate-drive-times.js areas            # dry run: town-to-town pairs not yet timed
node scripts/generate-drive-times.js areas --apply
node scripts/generate-drive-times.js towns            # dry run: in-town times for new places only
node scripts/generate-drive-times.js towns --apply    # or --area <id> for one town
```

- `areas` writes `assets/data/area-drive-minutes.json`: one time per pair of towns. A new area costs only its pairs with the existing towns.
- `towns` writes one table per town, `assets/data/transit/<area>.json`, and the list of them in `assets/data/transit/index.ts`. A new place costs only its times to and from the rest of its town.
- Each run's dry output says how many lookups it would make. Google gives 10,000 a month free (about US$5 per 1,000 after); tell the owner if a run would go past what is left this month (they can see usage on the Google Maps Platform quotas page).
- Run them after step 3: they read the live list.

### 5. A label, if the name needs one

An area's name on screen is its id with capitals (`banks-peninsula` shows as "Banks Peninsula"). Only a name capitals can't make needs an entry in `AREAS` in `lib/areas.ts`: a macron (`wanaka` → "Wānaka") or an "&". If you add an area to `AREAS`, `lib/__tests__/areas.test.ts` requires a time to every other listed area in the generated file, so do step 4 first.

### 6. Check, commit, publish

- `node node_modules/jest/bin/jest.js --silent --maxWorkers=4` and `node node_modules/typescript/bin/tsc --noEmit` both pass. Tests use fixed sample drive times (`test/fixtures/area-drive-minutes.json`), so a new run doesn't change them; the suggested-itinerary test does use the real in-town tables, so if it fails, a template's baked times no longer fit and need re-baking.
- Commit the place file (with its `area`s), the updated `assets/data/area-drive-minutes.json`, `assets/data/transit/`, and any `lib/areas.ts` label.
- Publish the travel times to testers: `npx eas-cli@latest update --branch dev --platform ios --environment development --message "<what changed>" --non-interactive` (run from PowerShell on this machine; takes a few minutes).

### 7. Report to the owner

How many places went in and to which areas; the lookups used and what the dry runs said they'd cost; anything you skipped or that looked wrong in the data (duplicates, missing areas, odd coordinates, medium-confidence facts); the commits; and that the update is published.
