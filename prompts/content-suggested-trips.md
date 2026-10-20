# Content: Suggested trips — fix the two, then (owner's choice) widen them

Launch content. The two suggested trips are both in Christchurch, and one of them includes places that are no longer in the app.

## What exists

Suggested trips are curated, dateless templates a user can start a trip from: New Trip → "Suggested Itinerary" picker (`components/itinerary/CreateItineraryModal.tsx:282-350`). They live in `lib/itineraryTemplates.ts`:

- **"Christchurch in a Day"**: the central city on foot (`CENTRAL_CITY_DAY`)
- **"Two Days in Christchurch"**: that day, then the Port Hills and the coast by car (`HILLS_AND_COAST_DAY`)

Each stop has a `siteId` (the place's doc id, which is its slug), a `siteName`, and **pre-baked** `slotIndex` / `durationSlots`. Slot 0 is 8:00 AM, a slot is 30 minutes, and each stop starts at least one travel leg after the last ends. The physics engine must have nothing to move when the trip is first opened. `lib/__tests__/itineraryTemplates.test.ts` packs every template with `packTrip` against the bundled place files and fails if a slot moves, if a stop isn't a real addable place, or if a day runs past 10 PM.

The launch is free, so the old "templates are the free product" reason (launch plan decision 2) no longer applies. Templates are now a quick start for planning. All keep `free: true`.

## The problem

Checked against the **live** place list on 2026-10-20: 503 places in 37 towns.

```sh
curl -s https://api.blacksands.app/v1/southislandguide/locations
```

The response is `{ locations: [...] }`; each place's `id` is its slug.

- `quake-city` (Quake City) and `central-city-street-art` (Central City Street Art) are **not live**. Both sit in `CENTRAL_CITY_DAY`, so **both** Christchurch templates include them. Starting either trip adds two stops that open nothing.
- The other nine stops are live.
- The bundled `assets/data/christchurch_places_all.json` still has both as `"active": true`. That's why the test passes: it checks the local file, not the live list. It also means a re-run of `scripts/upload-places.js` would bring them back.

## Part 1 — Fix the two (do this)

1. **Ask the owner** whether Quake City and Central City Street Art are retired for good (closed or moved) or only switched off. If retired: set `"active": false` on both in `christchurch_places_all.json`, so a re-upload doesn't revive them. If only switched off for now: leave the JSON alone, and tell the owner the test can't catch this case.
2. **Make the test check `active`.** In `itineraryTemplates.test.ts`, where each stop is looked up (around line 39), also expect the bundled place's `active` not to be `false`. A stop on a retired place then fails the suite.
3. **Replace the two stops** in `CENTRAL_CITY_DAY` (slots 15 and 18, the afternoon after the Cardboard Cathedral) with one or two **live** places that:
   - are in `area: "christchurch"` and walkable from the Cardboard Cathedral / central city (this day is "on foot, no car needed");
   - are open over those hours **every day of the week** (the file's own rule; read each place's `hoursNote`);
   - aren't Stay (`canAddToItinerary`);
   - make a good afternoon after lunch and a cathedral: say a museum, gallery, the river or the Arts Centre.

   Choose from the live list. Show the owner the choice (name, why, its hours) and **wait for their go** before baking.
4. **Re-bake** the day's slots so the stops fit with the real in-town travel times (`assets/data/transit/christchurch.json`). Run the test; it tells you if any slot would move.
5. Update both templates' `description`s. "Christchurch in a Day" names Quake City and the street art.
6. Update the file's header comment (lines 1–19). It says the stops come from `christchurch_places_all.json`, that every stop is in the christchurch area, and that the transit matrix is empty. Now: stops must be **live** places (check the api list, not just the JSON), and travel times come from the per-town tables and `lib/areas.ts`.

## Part 2 — Widen them across the island (owner keeps or strikes this part)

Christchurch-only templates in a whole-island app undersell it. Proposed set, for the owner to pick from (one or two days each, built around one town, so no town-to-town drive is needed yet):

| Template | Days | Town(s) |
|---|---|---|
| Dunedin and the Otago Peninsula | 1–2 | `dunedin` |
| Te Anau and Milford Sound | 2 | `te-anau`, `milford-sound` |
| Glacier Country | 2 | `franz-josef`, `fox-glacier` |
| Nelson and Abel Tasman | 2 | `nelson`, `abel-tasman` |
| Aoraki / Mount Cook and Tekapo | 2 | `aoraki-mount-cook`, `tekapo` |
| Kaikōura in a Day | 1 | `kaikoura` |
| Queenstown in Two Days | 2 | **after Queenstown is loaded**: its places aren't live yet (`queenstown_places.json` is untracked and has no `area`) |
| Christchurch to Queenstown via Tekapo | 3–4 | **after** Queenstown is loaded **and** the town-to-town drive times run (`generate-drive-times areas --apply`) |

**Ask the owner which to build before starting Part 2.**

### Rules for every new template

- Only **live** places (the api list), never Stay, each open at its slot **every day of the week**, judged from its `hoursNote`.
- **Realistic pacing**: a meal stop at midday, nothing before about 9 AM unless it's a sunrise thing, and the day ending by about 7 PM (the grid stops at 10 PM). Use each place's `recommendedDurationSlots` where it has one.
- **A day that crosses towns** needs the drive between them: `lib/areas.ts` reads `assets/data/area-drive-minutes.json`, which holds **300 of the 666 town pairs** today, because the owner runs the town-to-town step once, after the last town is in. Check every pair a template crosses (including overnight, day to day) is in that file. If one isn't, that template waits for the run. Don't hand-enter drive times.
- `key` in kebab case and unique; `label` short ("Te Anau and Milford Sound"); `description` one sentence naming the main stops, in the same plain voice as the Christchurch ones.
- Pre-bake the slots, then let the test confirm nothing moves.

### Test changes for Part 2

- Line 31 asserts the day counts are exactly `[1, 2]`. Replace it with: every template has at least one day, all are `free`, and keys are unique.
- The test builds its place lookup from three bundled files (`christchurch`, `dunedin`, `timaru`, lines 10–19). Add the files for every town a template uses (`fiordland_te_anau_places.json`, `glacier_country_places.json`, …; see `assets/data/`).

### Checkpoint

Work **one template per round**. Before baking each, show the owner a table of the day or days: time, place, length, and why that order. Bake on their go.

## Validation

- `npx tsc --noEmit`: no type errors.
- `npm test`: all tests pass, including the new `active` check.
- Device: New Trip → Suggested Itinerary → each template. The trip opens with every stop where the template put it, and each stop opens its place.
- Files touched: `lib/itineraryTemplates.ts`, `lib/__tests__/itineraryTemplates.test.ts`, and (Part 1, step 1, if the owner says retired) `assets/data/christchurch_places_all.json`.
