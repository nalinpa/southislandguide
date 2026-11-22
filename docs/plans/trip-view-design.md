# The quiz's trip, shown as the app shows it — short design

Owner, 2026-11-22. A small change on top of the trip builder (`trip-builder-design.md`), on the `trip-builder` branch.

## Why

A paywall will go after this screen later ("pay to keep the trip"), so the trip has to be something the visitor loves. The owner wants the app's own **Trip | Days** view: it looks good, and it's exactly what they'll get when they open the app.

## What it is

The reveal (after the trip choice) becomes the app's trip screen:

```
 [ Trip | Days ]                                   (segmented, as in the app)

 Trip                                              Days
 ┌──────┐ Day 2 · Sun 3 Jan                        Day 1   Day 2   Day 3 …   (tab strip)
 │photo │ Dunedin → Aoraki / Mount Cook        >   8 AM ─────────────────────
 └──────┘ 5 places · 5 hours driving                    ┌──────────────────────┐
          Starts with the drive from Dunedin       9 AM │ ⛰ Kātiki Point Light… │
          Long drive: over your 4 h limit.              │ 9:30 – 10:30 AM      │
 ...                                                    └──────────────────────┘
                                                        🚗 1.5 hour drive
```

- **Trip:** one row per day as in `components/itinerary/TripOverview.tsx`: the day's first stop's photo, "Day N · <date>", the route line ("A → B → C"), "<n> places · <h> hours driving", "Starts with the drive from <town>" when the app shows it. A free day reads as the app shows an empty day. The long-drive line stays under the days that are over the visitor's limit. Tapping a row opens Days on that day.
- **Days:** a strip of day tabs, then the day's timeline from 8 AM to 10 PM: hour lines, a teal block per stop (the app's icon for its category, name, "3:30 – 4:00 PM"), and the drives between stops ("30 min drive"), as in `GuestDayView` / the Days screen. No drag handles: nothing is editable on the site.
- **iPad (≥ 1024 px):** the trip list and the open day side by side, as the app does on wide screens; no Trip | Days switch there.
- **Kept around it:** the title, "Built for you: …" (their answers), the loop / one-way switch, the season line, "Save this trip" (and Start again). Save stays in reach at the bottom of the screen.
- **Dates:** the placeholder dates show as dates, with "dates to set in the app" in the header (as today). Accepted for now.

## How (picked: A, owner 2026-11-22)

- **A. The app's views rebuilt in the site's HTML and CSS (picked).** The numbers and words come from the app's own code, bundled into `pack.js` as the timing already is: `tripSummary` and the day legs (`lib/utils/itineraryPhysics.ts`), `routeLine` and `dateParts`. The last two live in `TripOverview.tsx`, which imports React Native, so they move to a plain file (`lib/utils/tripLines.ts`) that `TripOverview.tsx` imports back: a move with no behaviour change, covered by the app's tests (the only app-repo change). Colours from the app's tokens (`lib/ui/tokens`), copied by the export. Category icons: the same Lucide icons, as a small self-hosted SVG sprite.
- B. The app's real screens through React Native for Web: exact, follows the 2.0 redesign for free, but adds ~150 KB+, phone-only modules to stub, and a site build step. Not picked.

## Goals / non-goals

- Same view, same numbers as the app: the site's "places · hours driving", route line and drives come from the app's functions.
- Fast: about 10–20 KB more; nothing loads before the first answer.
- No map yet (later, once the paywall exists: owner leaning; Claude's call). No paywall now. No editing.
- The app's 2.0 redesign will mean redoing this view (accepted).

## Constraints

As the trip builder's: static site, self-hosted scripts and SVG, no CSP change, 300 KB budget, Trip/Trips and "place" wording, the save flow unchanged.

## Left to the builder

The exact CSS; how the tab strip scrolls; where Save sits on the phone (a bottom bar or after the list).
