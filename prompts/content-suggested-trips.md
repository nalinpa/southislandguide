# Content: Suggested trips — fix the two, then (owner's choice) widen them

Launch content. The two suggested trips are both in Christchurch, and one of them includes places that are no longer in the app.

## What exists

Suggested trips are curated, dateless templates a user can start a trip from: New Trip → "Suggested Trip" picker (`components/itinerary/CreateItineraryModal.tsx:347` on). They live in `lib/itineraryTemplates.ts`:

- **"Christchurch in a Day"**: the central city on foot (`CENTRAL_CITY_DAY`)
- **"Two Days in Christchurch"**: that day, then the Port Hills and the coast by car (`HILLS_AND_COAST_DAY`)

Each stop has a `siteId` (the place's doc id, which is its slug), a `siteName`, and **pre-baked** `slotIndex` / `durationSlots`. Slot 0 is 8:00 AM, a slot is 30 minutes, and each stop starts at least one travel leg after the last ends. The physics engine must have nothing to move when the trip is first opened. `lib/__tests__/itineraryTemplates.test.ts` packs every template with `packTrip` against the bundled place files and fails if a slot moves, if a stop isn't a real addable place, or if a day runs past 10 PM.

The launch is free, so the old "templates are the free product" reason (launch plan decision 2) no longer applies. Templates are now a quick start for planning. All keep `free: true`.

## The problem

Checked against the **live** place list on 2026-10-21: 502 places in 37 towns.

```sh
curl -s https://api.blacksands.app/v1/southislandguide/locations
```

The response is `{ ok: true, data: { locations: [...] } }`; each place's `id` is its slug.

- `quake-city` (Quake City) and `central-city-street-art` (Central City Street Art) are **not live**. Both sit in `CENTRAL_CITY_DAY`, so **both** Christchurch templates include them. Starting either trip adds two stops that open nothing.
- The other nine stops are live.
- The bundled `assets/data/christchurch_places_all.json` still has both as `"active": true`. That's why the test passes: it checks the local file, not the live list. It also means a re-run of `scripts/upload-places.js` would bring them back.

## Part 1 — Fix the two (do this)

1. **Leave Quake City and Central City Street Art out of every trip** (owner, 2026-10-21). That covers Part 2 too. Don't touch their `active` flag in `christchurch_places_all.json`: the owner hasn't said they're gone for good. The test can't catch these two, since their JSON stays `"active": true`, so removing them in step 3 is the fix.
2. **Make the test check `active`.** In `itineraryTemplates.test.ts`, where each stop is looked up (around line 39), also expect the bundled place's `active` not to be `false`. A stop on a place switched off in the JSON then fails the suite.
3. **Replace the two stops** in `CENTRAL_CITY_DAY` (slots 15 and 18, the afternoon after the Cardboard Cathedral) with one or two **live** places that:
   - are in `area: "christchurch"` and walkable from the Cardboard Cathedral / central city (this day is "on foot, no car needed");
   - are open over those hours **every day of the week** (the file's own rule; read each place's `hoursNote`);
   - aren't Stay (`canAddToItinerary`);
   - make a good afternoon after lunch and a cathedral: say a museum, gallery, the river or the Arts Centre.

   Choose from the live list. Show the owner the choice (name, why, its hours) and **wait for their go** before baking.
4. **Re-bake** the day's slots so the stops fit with the real in-town travel times (`assets/data/transit/christchurch.json`). Run the test; it tells you if any slot would move.
5. Update both templates' `description`s. "Christchurch in a Day" names Quake City and the street art.
6. Update the file's header comment (lines 1–19). Line 2 calls the picker "Suggested Itinerary"; it's "Suggested Trip". It says the stops come from `christchurch_places_all.json`, that every stop is in the christchurch area, and that the transit matrix is empty. Now: stops must be **live** places (check the api list, not just the JSON), and travel times come from the per-town tables and `lib/areas.ts`.

## Part 2 — Widen them across the island

Christchurch-only templates in a whole-island app undersell it. The owner's set (2026-10-21, revised 2026-10-22): no short trips (one town, one or two days); Kaikōura in a Day and Top of the South are struck; Glacier Country and Aoraki / Tekapo are covered by the longer trips. Every town is live and every town-to-town time is in (fix-32, 2026-10-22), so all of these can be built.

**Built:** Queenstown in Two Days, Queenstown in Three Days, Queenstown and Fiordland in Three Days, and every medium trip below (2026-10-22).

**Medium (all built 2026-10-22):**

| Template | Days | Route |
|---|---|---|
| Queenstown and Fiordland in Five Days | 5 | the 3-day trip plus Doubtful Sound |
| Queenstown and Wānaka | 4 | two days each, over the Crown Range |
| Christchurch to Queenstown via Tekapo and Mount Cook | 4 | Tekapo, the Hooker Valley, Wānaka |
| Queenstown to Christchurch via Mount Cook and Tekapo | 4 | the same, the other way round |
| Picton to Christchurch via Kaikōura | 3 | off the ferry: Blenheim, Kaikōura, Hanmer |
| Southern Scenic Route: Queenstown to Dunedin | 6 | Fiordland, Riverton, Bluff, the Catlins |
| West Coast: Christchurch to Queenstown | 7 | Arthur's Pass, Punakaiki, Hokitika, the glaciers, Haast, Wānaka |

**Long, after the medium ones; the owner hasn't chosen among them yet:** Picton to Queenstown via the West Coast (10), Queenstown to Picton via the West Coast (10), the southern loop from Christchurch or Queenstown (12), a South Island loop (14), the whole island from Christchurch, Picton or Queenstown (21; one closed loop offered from three starts).

### Rules for every new template

- Only **live** places (the api list), never Stay, each open at its slot **every day of the week**, judged from its `hoursNote`.
- Skip live places with a blank `area`: their legs fall back to the flat half hour. Two today, both Nelson Tasman: `adventure-inn-marahau` (a Stay anyway) and `black-hole-maitai-river`.
- **Realistic pacing**: a meal stop at midday, nothing before about 9 AM unless it's a sunrise thing, and the day ending by about 7 PM (the grid stops at 10 PM). Use each place's `recommendedDurationSlots` where it has one.
- **A day that crosses towns** needs the drive between them: the town-to-town times (`assets/data/area-drive-minutes.json`, every pair), measured from each town's hub (`area-hubs.json`), with far-out places' own times (`far-place-minutes.json`), all read by `lib/utils/transitMatrix.ts`. Don't hand-enter drive times. The template test packs against these real files, so it fails if a slot leaves too little time for a drive.
- **Set times:** a stop that runs at set times (a cruise, a tour, a pool session, a screening) must sit on a real departure. The place's `hoursNote` rarely lists them, and operators' pages often don't either; ask the owner to paste the booking page's times for a date, and note the source in the stop's comment.
- `key` in kebab case and unique; `label` short ("Queenstown and Fiordland"); two templates with the same label (the 3- and 5-day Fiordland ones) need the days in it ("Queenstown and Fiordland in Five Days"); `description` one sentence naming the main stops, in the same plain voice as the Christchurch ones.
- Pre-bake the slots, then let the test confirm nothing moves.

### Test changes for Part 2

- Line 31 asserts the day counts are exactly `[1, 2]`. Replace it with: every template has at least one day, all are `free`, and keys are unique.
- The test builds its place lookup from three bundled files (`christchurch`, `dunedin`, `timaru`, lines 10–19). Add the files for every town a template uses (`fiordland_te_anau_places.json`, `glacier_country_places.json`, …; see `assets/data/`). Line 8's comment says "all three areas"; reword it to fit.

### Checkpoint

Work **one template per round**. Before baking each, show the owner a table of the day or days: time, place, length, and why that order. Bake on their go.

## Validation

- `npx tsc --noEmit`: no type errors.
- `npm test`: all tests pass, including the new `active` check.
- Device: New Trip → Suggested Trip → each template. The trip opens with every stop where the template put it, and each stop opens its place.
- Files touched: `lib/itineraryTemplates.ts` and `lib/__tests__/itineraryTemplates.test.ts`.
