# Fix: a real centre for each town, and their own times for far-out places

The app's drive times between towns are wrong in two ways.

1. **Several towns are measured from the wrong point.** The worst is Milford Sound: every drive there ends about 35 km short of the sound.
2. **One time per pair of towns can't be right for a place far from its town's centre.** Mirror Lakes counts as a Milford Sound place, so once Milford's centre is at the sound, Te Anau to Mirror Lakes counts about 2 hours when it's about 45 minutes. About 100 places across the island are like this.

This fix pins a hub place for each town, then gives each far-out place its own drive times to the hubs of the towns near it.

## How the times are made now

`node scripts/generate-drive-times.js areas` asks Google's Distance Matrix for one drive time per pair of towns (areas), from one town's centre to the other's. It writes them to `assets/data/area-drive-minutes.json`, and `lib/areas.ts` reads that file. The trip planner uses these times for every leg that crosses towns, within a day or overnight (`getLeg` in `lib/utils/transitMatrix.ts`). The day view shows them as drive blocks.

A town's centre comes from `centreOf` (`scripts/lib/driveMatrix.js:34`): the town's place nearest the average position of all its places. It uses a place, not the average point itself, because Haast's average point was in bush the maps service couldn't route to, and a place is somewhere people can drive to. Places come from the live api.

`towns` makes one table per town of times between that town's own places, in half-hour slots (`assets/data/transit/<area>.json`). Those tables are real road times, and this fix reuses them.

## The problems

### 1. Centres in the wrong place

A town whose places spread along a road, or cluster away from the town itself, gets a centre that isn't where visitors go. Milford Sound's centre is the Lake Marian Track, near the Divide, because Mirror Lakes, Lake Gunn, Key Summit and Lake Marian are in `milford-sound`. So `milford-sound|te-anau` is 73 min (really about 2 h), and `milford-sound|queenstown` is 199 min (really about 4 h, about 5 with stops; owner, 2026-10-21). Haast, Arthur's Pass, Timaru, Westport, Ōamaru, Twizel, Franz Josef and others are off too: see the hub table in step 1.

### 2. Far-out places

A leg across towns is always hub to hub. For a place far from its own hub, that is wrong in one of three ways (rough road times, owner's knowledge and mine, 2026-10-21):

- **Visited from another town.** The leg counts far too long.
  - Nelson → Tutaki Bakery (Murchison, in `westport`): counts about 3 h 15, really about 1 h 30.
  - Wānaka → Makarora Country Café (`haast`): about 1 h 50, really about 50 min.
  - Fox → Bruce Bay (`haast`): about 1 h 40, really about 40 min.
  - Christchurch → Sheffield Pies (`arthurs-pass`): about 2 h, really about 45 min.
  - Christchurch → Diamond Harbour Ferry (`banks-peninsula`; its position is in Lyttelton): about 1 h 25, really about 40 min.
  - Invercargill → Waipapa Point (`catlins`), Timaru → Fairlie (`tekapo`), Timaru → Peel Forest (`mid-canterbury`): each about 40–60 min too long.
- **Midway stops.** They're too long from one side whichever town they're in: Castle Hill, Lewis Pass, Lake Ianthe, Tākaka Hill, the Moeraki coast, Gore Bay and Kekerengu, Omarama and Lindis Pass, Little River, Murchison, Naseby.
- **Beyond the hub.** The leg counts too *short*, so a trip doesn't leave enough time: Karamea (Ōpārara Arch, Kōhaihai, Scotts Beach) is 1 h 30 to 2 h further than Westport; Jackson Bay, Wharariki, Puponga and Rob Roy are 40 min to 1 h further.

Moving places to another town in the admin panel fixes only the first kind, and merging towns only moves the edge between them. The fix is for each far-out place to carry its own times.

Some of today's wrong centres were covering for these by accident. Lake Pearson sits between Christchurch and Arthur's Pass, All Day Bay between Ōamaru and Moeraki, Winchester between Timaru and Geraldine. Moving a hub into town without part 2 would make legs to those stops worse.

### 3. Other things found in the live data (2026-10-21)

- **Abel Tasman's centre snaps badly.** From Kaiteriteri Recreation Reserve Campground, Motueka counts 31–60 min; from Kaiteriteri Beach, 40 m away, 30 min or less. The hub is Kaiteriteri Beach.
- **Two places had no town:** `adventure-inn-marahau` and `black-hole-maitai-river`. Fixed 2026-10-22 (`abel-tasman` and `nelson`). The cause was the admin panel: its Area dropdown listed only three towns, and saving any other place blanked its area. Every town is now an option.
- **`anchorage-campsite-abel-tasman` has no road** (walk or boat in), so Google has no route to it. Legs to it stay a guess from the distance. Expect it in the "no route" lists.
- **`queen-charlotte-track-day-walk` counts 90–120 min from Picton by road.** Visitors get there by water taxi from Picton. Owner: in the admin panel, move its position to the water-taxi base in Picton, like the Motuara Island cruise.
- **Moving a place's position doesn't refresh its times.** `towns` only asks about place ids it hasn't seen. A place moved within its town needs `towns --area <id> --all` for that town. A place moved to another town is new there and gets asked about.
- **`the-giants-house`** was blanked the same way and is back in `banks-peninsula`.
- **Places moved out of a town stay in its old table** (Murchison's out of `nelson-lakes` and `westport`, Diamond Harbour out of `banks-peninsula`, Peel Forest out of `mid-canterbury`). Harmless: a leg only reads a table when both ends are in that town.
- **Seasonal and gravel roads.** Molesworth Road is open in summer only, and the Milford Road closes for avalanches in winter. Rental insurance excludes Skippers Canyon. Google's times assume the road is open. Not in this fix.

## Ground rules

- **Calls to Google's maps service are real, and this month they cost money.** The owner's free 10,000 lookups for October 2026 are used up. They come back on 1 November (Pacific time). Until then every `--apply` is paid at US$5 per 1,000 lookups. Each dry run still prints "free: comes out of Google's 10,000 free lookups a month"; that is wrong this month, so tell the owner the paid cost alongside it. The owner will pay to get this done rather than wait (2026-10-22): about US$12 in all (town tables about US$1.20, town pairs about US$4.10, far-out places about US$6.70). Still show each dry run and its cost first. Don't suggest a second Google account to get more free lookups.
- Always do the dry run first, show the owner its output, and run `--apply` only when the owner says so. Dry runs need no key and make no lookups, so run them yourself. `GOOGLE_MAPS_API_KEY` is set only in the owner's terminal, so the owner runs every `--apply`: give the exact command and wait for its output. Never paste or print the key.
- **Don't hand-enter drive times.** Every time comes from the maps service.
- Stop after each step that says to wait, and show the owner what it made.
- Don't change `../enginev1` or `../rotorua-guide`.
- Follow the repo's existing style. Commit with clear messages; don't push unless asked.

## The fix

### Part 1: a pinned hub for each town

- The hub is named by **place id**, not coordinates. A place's position is one people can drive to (the reason `centreOf` uses places), and there are no coordinates to get wrong.
- The pins live in `scripts/lib/areaCentres.js`: a map from town id to place id, with a one-line comment on any pick that isn't obvious.
- In `areas()` (`scripts/generate-drive-times.js`), a town's centre is its pinned place if that place is in the live list, active and has a position. Otherwise it's `centreOf`, as now.
- The dry run lists each town with its centre and where that came from (`pinned` or `middle`), and warns about a pin whose place is missing or inactive. A town added later works with no pin and shows as `middle`.
- `areas --apply` also writes the hub it used for each town to `assets/data/area-hubs.json` (town id → place id). The app needs these for part 2.

### Part 2: far-out places carry their own times

- **A far-out place** is one more than 30 min from its town's hub in its town's own table (2 slots or more). In a town with no centre, every place counts as far-out. The Catlins is the only one: it's a route, not a town. Keep that list of towns in `areaCentres.js` too. The Catlins still gets a pin (Papatowai, in the middle), used only for a place added before the next run.
- **Its own times:** one drive time, in minutes, from the place to the hub of each town within 4 h of its own town, going by `area-drive-minutes.json` after part 1's run. Beyond 4 h, a few tens of minutes either way matter little.
- **A new mode:** `node scripts/generate-drive-times.js far [--apply] [--all]`. It writes `assets/data/far-place-minutes.json` (place id → { town id → minutes }). Like the other modes, it asks only for what's missing: a new far-out place, or a town that's newly within 4 h. `--all` asks again for everything. A place with no route keeps no time and gets listed, as `areas` does. A place not yet in its town's table gets skipped and listed (run `towns` first).
- **`getLeg`, for a leg across towns:**
  - *From* a far-out place with its own time to the other town's hub: that time, plus the hub to the destination from that town's table. Count the middle of the half-hour slot, or 0 if the destination is the hub.
  - *To* a far-out place with its own time to this town's hub: the start to this town's hub from this town's table (middle of the slot), plus the place's own time.
  - Both ends far-out: the shorter of the two.
  - A far-out place with no own time for that town (beyond 4 h): hub to hub, plus the place's time to its own hub from its town's table. That errs long, never far short.
  - Anything else: hub to hub, as now.
  - `drive` stays `{ fromArea, toArea }`, so the day view draws it as before.

## Steps

1. **Hubs: approved by the owner 2026-10-22.** Km is straight-line distance from the centre on 2026-10-21. `murchison` is a town since 2026-10-22 (step 2); its hub is `murchison-district-museum`. All 25 changed hubs were checked against the live list that day: present, active, in their own town, with a position.

   | Town | Centre today | Hub | km |
   |---|---|---|---|
   | `abel-tasman` | Kaiteriteri Recreation Reserve Campground | `kaiteriteri-beach` (the campground snaps badly, see 3 above) | 0.0 |
   | `aoraki-mount-cook` | Hooker Valley Track | `glacier-explorers` (at the Hermitage, in the village) | 1.7 |
   | `arrowtown` | Provisions of Arrowtown | same | 0.0 |
   | `arthurs-pass` | Lake Pearson (Moana Rua) | `arthurs-pass-national-park-visitor-centre` | 24.5 |
   | `banks-peninsula` | Akaroa Freedom Camping Area | same | 0.0 |
   | `blenheim` | The Original Marlborough Wine Tours | same (no place is in central Blenheim) | 0.0 |
   | `catlins` | McLean Falls | `peakes-kitchen-papatowai` (middle of the route; no-centre town) | 9.0 |
   | `central-otago` | Champagne Gully Freedom Camping | `cromwell-heritage-precinct` (base town: Cromwell) | 12.5 |
   | `christchurch` | The Old Countryhouse Backpackers | `christchurch-art-gallery` | 2.1 |
   | `dunedin` | Dunedin Botanic Garden | `dunedin-public-art-gallery` (on the Octagon) | 2.3 |
   | `fox-glacier` | Matheson Cafe | `cafe-neve` | 4.3 |
   | `franz-josef` | Otto/MacDonalds Campsite | `snakebite-brewery` | 10.7 |
   | `glenorchy` | Glenorchy Lagoon Walkway | same | 0.0 |
   | `golden-bay` | Labyrinth Rocks Park | `the-wholemeal-cafe` (base town: Tākaka) | 1.8 |
   | `gore` | Eastern Southland Gallery | same | 0.0 |
   | `greymouth` | DP1 Cafe | same | 0.0 |
   | `haast` | Roaring Billy Falls Walk | `the-hard-antler-haast` | 20.5 |
   | `hanmer-springs` | Conical Hill Walk | `hanmer-springs-thermal-pools-and-spa` | 1.1 |
   | `hokitika` | Woodstock Domain Camping | `hokitika-museum` | 6.5 |
   | `invercargill` | Classic Motorcycle Mecca | same | 0.0 |
   | `kaikoura` | Encounter Kaikōura | same | 0.0 |
   | `marlborough-sounds` | Pelorus Mail Boat | same (Havelock marina) | 0.0 |
   | `mid-canterbury` | The Staveley Store | `the-alpine-grind-methven` (base town: Methven) | 16.6 |
   | `milford-sound` | Lake Marian Track | `milford-foreshore-walk` (the cruise's point may be on the water) | 20.6 |
   | `murchison` | (new town) | `murchison-district-museum` | |
   | `nelson` | Tāhunanui Beach | `nelson-provincial-museum` | 3.7 |
   | `nelson-lakes` | Lake Rotoroa | `alpine-lodge-restaurant-st-arnaud` (base town: St Arnaud) | 20.7 |
   | `oamaru` | All Day Bay Freedom Camping | `waitaki-museum` (Thames St) | 14.1 |
   | `picton` | The Snout Track | `edwin-fox-maritime-museum` (foreshore) | 1.8 |
   | `punakaiki` | McMillan Road Freedom Camping | `pancake-rocks-and-blowholes-walk` | 1.6 |
   | `queenstown` | Skyline Queenstown Gondola and Luge | same | 0.0 |
   | `reefton` | The Strand Freedom Camping, Reefton | same | 0.0 |
   | `riverton` | Te Hikoi Museum | same | 0.0 |
   | `te-anau` | Punanga Manu o Te Anau Bird Sanctuary | `sandfly-cafe-te-anau` | 2.1 |
   | `tekapo` | Church of the Good Shepherd | same | 0.0 |
   | `timaru` | Winchester Bridge Freedom Camping | `south-canterbury-museum` | 23.9 |
   | `tuatapere` | Tui Base Camp | same | 0.0 |
   | `twizel` | Lake Middleton Campsite | `foodelicious-twizel` | 19.7 |
   | `waitaki-valley` | Waitaki Braids Cafe | same (Kurow) | 0.0 |
   | `wanaka` | Wānaka Bakpaka | same | 0.0 |
   | `westport` | Denniston Plateau and Brakehead | `museum-of-kawatiri` | 16.5 |

2. **Owner's changes in the admin panel: done 2026-10-22.** With part 2, where a place is listed no longer changes its drive times; it's only which town's list visitors find it in. The rule the owner chose: a stop on the way to a place is listed with that place; a place moves only when it belongs to another town.
   - **Milford Road stops stay in `milford-sound`** (Mirror Lakes, Lake Gunn, Key Summit, Lake Marian, Humboldt Falls, Cascade Creek Campsite): they're done on the Milford day, and their times to each other are already in Milford's table.
   - **Murchison is a town of its own, `murchison`:** `murchison-district-museum`, `rivers-cafe-murchison`, `tutaki-bakery-murchison`, `maruia-falls` (from `nelson-lakes`) and `buller-gorge-swingbridge` (from `westport`). `kawatiri-historic-railway-walk` stays in `nelson-lakes`, nearer St Arnaud. The app names it "Murchison" from its id (`areaName` in `lib/areas.ts`), so no code is needed for that.
   - **Moved:** `diamond-harbour-ferry` → `christchurch` (it leaves from Lyttelton); `big-tree-walk-peel-forest` and `peel-forest-campground-doc` → `timaru` (with Geraldine's places).
   - **Stay where they are:** Makarora Country Café and Blue Pools Track (`haast`, Haast Pass stops), Bruce Bay (`haast`), Sheffield Pies (`arthurs-pass`), Fairlie Bakehouse (`tekapo`), Waipapa Point Lighthouse (`catlins`). Part 2 gives them the right times.
   - **The Queen Charlotte Track Day Walk** now sits at the Picton water-taxi base (-41.2886, 174.0079), like the Motuara Island cruise.

   **Town tables, before the code: no code change is needed for these.** The dry run on 2026-10-22 showed `christchurch` 93 lookups, `timaru` 60 and `murchison` 25 (a new table), with every other town up to date. The walk moved within Picton, so Picton also needs `--all`. Commands for the owner, after showing the dry run:
   - `node scripts/generate-drive-times.js towns --area christchurch --apply`
   - `node scripts/generate-drive-times.js towns --area timaru --apply`
   - `node scripts/generate-drive-times.js towns --area murchison --apply`
   - `node scripts/generate-drive-times.js towns --area picton --all --apply`

   That's 242 lookups, about US$1.20. Commit the tables. These must be in place before step 6: far-out places are picked from the town tables.
3. **Code and test.**
   - Part 1: `scripts/lib/areaCentres.js`, the pinned-or-middle choice, and `area-hubs.json`.
   - Part 2: the `far` mode and the new `getLeg` rule.
   - Tests in `scripts/__tests__/driveMatrix.test.js`:
     - a pinned place wins over the middle;
     - a missing or inactive pin falls back to the middle;
     - far-out places are picked (2 slots or more, or any place in a no-centre town);
     - only hubs within 4 h are asked for;
     - only what's missing is asked for.
   - Tests in `lib/utils/__tests__/transitMatrix.test.ts`:
     - a far-out place to and from a town near it uses its own time;
     - with both ends far-out, the shorter one wins;
     - beyond 4 h, the leg is hub to hub plus the place's time to its hub;
     - a plain place is unchanged.
   - Update the comments: the header of `scripts/generate-drive-times.js` ("town centre (the middle of its places)") and the comment on `AREA_DRIVE_MINUTES` in `lib/areas.ts` (its "three in it until then are from memory" line is out of date). Also the comment on `getLeg` and the header of its test.
4. **Dry run part 1:** `node scripts/generate-drive-times.js areas --all`. `--all` asks for every pair again, because each changed centre changes all of its pairs. Expect 41 towns, 820 pairs (confirmed by a dry run on 2026-10-22) and the pinned/middle list, with every town `pinned`. Show the owner, with the cost: about US$4.10 before 1 November.
5. **On the owner's go:** `areas --all --apply`. A pair with no route keeps its old time; the script lists them.
6. **Dry run part 2:** `node scripts/generate-drive-times.js far`. The estimate on 2026-10-21 was about 105 far-out places and 1,340 lookups; the new table from step 5 will shift that a little. Show the owner, with the cost: about US$7 before 1 November.
7. **On the owner's go:** `far --apply`.
8. **Spot-check** these against what a visitor would expect, and show the owner. Check the town pairs in `area-drive-minutes.json`. Check the place legs with `getLeg` against the live list, in a throwaway script that doesn't get committed.

   | Leg | Expect about |
   |---|---|
   | `milford-sound\|te-anau` | 2 h |
   | `milford-sound\|queenstown` | 4 h |
   | `queenstown\|te-anau` | 2 h |
   | `haast\|wanaka` | 1 h 50 m |
   | `fox-glacier\|haast` | 1 h 40 m |
   | `arthurs-pass\|christchurch` | 2 h |
   | `christchurch\|timaru` | 2 h |
   | a Te Anau place → `mirror-lakes` | 45 m |
   | `murchison\|nelson` | 1 h 30 m – 1 h 45 m |
   | `murchison\|westport` | 1 h 15 m |
   | a Christchurch place → `sheffield-pies` | 45 m |
   | a Wānaka place → `makarora-country-cafe` | 50 m |
   | a Punakaiki place → `oparara-arch` | 2 h 30 m |
   | an Invercargill place → `curio-bay-petrified-forest` | 1 h 20 m |
   | a Dunedin place → `nugget-point-lighthouse` | 1 h 30 m |

9. **Run `npm test`.**
   - `lib/__tests__/areas.test.ts` checks that every town has a time to every other.
   - `lib/__tests__/itineraryTemplates.test.ts` fails for any suggested trip whose slots no longer fit the new drives. Re-bake each one it flags, following `prompts/content-suggested-trips.md`, and show the owner the new times before baking.

## Not in this fix

- Drive times from every place to every place across towns. A far-out place's times to nearby hubs cover nearly every leg that matters. A leg between two far-out places in different towns takes the shorter way through a hub, so it can still come out a little long (Lewis Pass to Lake Ianthe, say).
- Seasonal closures, gravel roads and roads rental insurance excludes.
- Making Karamea or Naseby a town of its own. That's the owner's call in the admin panel; part 2 already gets the drives right. (Murchison became one on 2026-10-22.)
- Te Anau's places reach 66 km out to Lumsden (`lumsden-freedom-camping`). Whether places like that belong to another town is the owner's call, in the admin panel.

## Validation

- `npx tsc --noEmit`: no type errors.
- `npm test`: all pass, including the new `driveMatrix` and `transitMatrix` tests.
- The spot-check table matches expectations, or the owner has seen the differences.
- Device, after the over-the-air update:
  - a trip with Te Anau one day and the Milford cruise the next shows a drive of about 2 hours;
  - a Te Anau day with Mirror Lakes shows a drive of about 45 minutes.

## Files touched

- `scripts/lib/areaCentres.js` (new)
- `scripts/lib/driveMatrix.js`, `scripts/generate-drive-times.js`
- `scripts/__tests__/driveMatrix.test.js`
- `lib/utils/transitMatrix.ts`, `lib/utils/__tests__/transitMatrix.test.ts`
- `lib/areas.ts` (comment)
- `assets/data/area-drive-minutes.json` (written by `areas --apply`)
- `assets/data/area-hubs.json` (new, written by `areas --apply`)
- `assets/data/far-place-minutes.json` (new, written by `far --apply`)
- `assets/data/transit/<area>.json` for towns that gained places (written by `towns --apply`)
- `lib/itineraryTemplates.ts`, if the test flags trips to re-bake
