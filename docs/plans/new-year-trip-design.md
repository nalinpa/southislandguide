# New Year trip and its App Store event — design (short)

Status: **superseded 2026-11-25** by [school-holidays-trips-design.md](school-holidays-trips-design.md) (owner: a school holidays plan, not New Year). Kept for its findings. Nothing built.

## Why

An App Store in-app event puts a card on the product page and in search for up to 31 days. Apple only accepts events about something timely inside the app (guideline 2.3.13), so the event needs a real New Year trip in the app. New Year in the Southern Lakes is a fixed date that a lot of young Kiwis travel for (Queenstown's lakefront New Year's Eve, and a festival near Wānaka on 30–31 Dec).

## What it is

One suggested trip with fixed dates, plus an App Store event pointing at it.

- **The trip (owner):** Queenstown and Wānaka over New Year. 30 and 31 Dec are free days. 1 Jan is a recovery day. Adventure and sightseeing before and after.
- **The event:** "NYE in Queenstown & Wānaka" (26 characters), from as soon as the trip is live until Mon 28 Dec, the last day the trip can be picked (an event card must never point at something that isn't there).

## Goals

- Picked from the suggested trips like the other 26, and it lands on the right dates.
- Free days really are free: no stops on 30 and 31 Dec.
- Live before the event starts, for people who already have the app and for new installs.

## Non-goals

- No festival names anywhere, in the app or on the store (owner: no brand, in case they object).
- No other events yet (Hokitika wild food, Easter, the Bluff oysters, Matariki are later).
- Not on the website: no quiz or builder change.
- No event mode in the trip builder (later, approach B).

## Anti-goals

- A trip that puts a stop or a drive on 30 or 31 Dec.
- A trip that lands on the wrong dates, or can still be picked after New Year.
- An event card a new install opens to find nothing there.

## Approaches

- **A. A hand-made suggested trip** — picked by the owner (2026-11-23).
- B. An event option in the web builder — later; web only, and it can't back an in-app event this December.
- C. A now, B later — not now.

## The trip (Claude's proposal, the owner checks the days)

6 days, Mon 28 Dec 2026 – Sat 2 Jan 2027, starting in Queenstown (the picker's existing start town), flying in and out of Queenstown:

1. **28 Dec, Queenstown:** adventure and sightseeing.
2. **29 Dec, Queenstown → Arrowtown → the Crown Range → Wānaka:** sights on the way, the night in Wānaka (the festival site is about 15 min away).
3. **30 Dec:** free.
4. **31 Dec:** free.
5. **1 Jan, recovery:** a slow Wānaka morning, then back to Queenstown in the afternoon for the hot pools (Onsen Hot Pools is in the place list).
6. **2 Jan, Queenstown:** one more adventure or sightseeing day.

Stops come from switched-on places, checked like the other suggested trips. 1 and 2 Jan are public holidays, so every stop's hours are checked for those days.

## How it's built (Claude's calls)

- **A fixed start date on the trip.** Suggested trips have no dates today: the person picks the start date. A new optional field on the template (its start date) sets the date picker when the trip is picked. The date can still be changed, as with any trip.
- **Hidden once its start date has passed.** So nobody picks it in February.
- **Listed first among Queenstown's trips** while it can be picked.
- **The free days are empty days.** The api keeps only a day's date and its stops when a trip is saved, so a day can't carry a "free day" label without an api change (shared, every app). An empty day shows "Nothing here yet · Browse places", which suits a free day. The trip's description says the 30th and 31st are left free.
- **Left out of the website export** (`scripts/export-site-trips.mjs`), so the quiz doesn't offer it and the builder doesn't reuse its days.
- **Tests:** the suggested-trip tests expect every day to have stops; free days get an exception. A test checks the dated trip's days fall on 28 Dec – 2 Jan.
- **Analytics:** `suggested_trip_picked` gets the trip's key, so the New Year trip can be counted apart from other 6-day Queenstown trips.
- **Shipping:** JS only. An over-the-air update on 1.5 reaches people who already have it. A new install first opens the bundle inside the store build, and an update only shows on the second open, so the trip also goes into 1.5's next store build (same runtime, so updates still match).

## The App Store event (owner, App Store Connect)

- Name "NYE in Queenstown & Wānaka"; short and long descriptions about the trip, with no festival name.
- Badge: Special Event. Regions: New Zealand and Australia (Claude's call).
- Card image 1920 × 1080: Claude can render it from a licensed photo, in the search-result asset's style.
- No deep link (Claude's call): Open starts the app as normal. A link straight to the trip picker is more code for people who already have the app.
- Check in App Store Connect: the publish lead time, the image sizes and the character limits.

## Left to the builder

- The exact stops and times for days 1, 2, 5 and 6.
- The description's wording.
