# School holiday family trips and their App Store event — design (short)

Status: draft for owner approval, 2026-11-25. Nothing built. Replaces the New Year trip (`new-year-trip-design.md`, superseded).

## Why

An App Store in-app event puts a card on the product page and in search for up to 31 days, and Apple only accepts one about something timely in the app (guideline 2.3.13). The NZ summer school holidays are the biggest family travel time of the year: schools finish by Fri 18 Dec 2026, and Term 1 2027 starts between 28 Jan and 3 Feb. New family trips, out for the holidays, are that something. **It's mainly app promotion** (owner): the event card is there to win installs, so its success shows in App Store Connect's event numbers (impressions, opens, installs), not in who picks these trips.

## What it is (owner, 2026-11-25)

- **Family trips:** kids' and family activities, and not too much driving. That's an aim, not a promise (owner).
- **A timed set of suggested trips** (owner): in the app's trip picker for the holidays only, never on the website quiz.
- **One App Store event over the peak:** Fri 18 Dec 2026 to Sun 17 Jan 2027 (31 days).
- **Released in time for the holidays.**

## Goals

- Three new suggested trips, picked like the other 26, each 5–7 days (Claude's proposal, owner to confirm):
  - **From Christchurch:** the city (Orana Wildlife Park, Willowbank, the International Antarctic Centre), with Hanmer Springs' pools or Akaroa.
  - **From Picton:** Nelson (Founders Heritage Park) and the Abel Tasman beaches (Kaiteriteri).
  - **From Queenstown:** Queenstown (the gondola and luge, Kiwi Park), Arrowtown and Wānaka (Puzzling World).
- Days for kids: starting from 9am, finished by about 6pm, most days with a pool, a beach, wildlife or a short walk.
- Live in the app, new installs included, before 18 Dec.

## Non-goals

- No fixed trip dates: a family starts whenever they like within the holidays.
- Not on the website (owner): not in the quiz, not in the builder's data.
- No family mode in the web builder, and no new place field ("good for kids" is picked by hand).
- No brand or festival names anywhere (owner).

## Anti-goals

- A day that's mostly in the car.
- A family trip still in the picker after the holidays, or one showing on the website.
- A stop the app re-times on first open (the existing packing test catches this).
- An event card a new install opens to find nothing there.

## Approaches

- **A. Hand-made suggested trips** — the one sensible way, as with the New Year trip (owner picked A then). B, a family option in the web builder, is web only and can't back an in-app event this summer.

## How it's built (Claude's calls)

- **A `showUntil` date** on each timed trip (`"2027-02-03"`, the last day Term 1 can start). The picker lists a timed trip while today, the phone's local date, is on or before it, first in its town's list. From the day after, it's gone. A `showFrom` comes only when a later set ships before its window. Next holidays, the dates are moved in the code.
- **The website export leaves timed trips out**, both the quiz's trips and, on `trip-builder`, the builder's data.
- **Puzzling World is allowed in family trips** (owner, 2026-11-25), though it stays on the "never a trip stop" list for every other trip. The template test lists the three family trips' keys as the exception.
- **Tests stay true after the holidays:** picker tests that loop over every trip skip timed ones, and the timed cases run on a fixed clock.
- **Driving:** aim for about 2 h or less a day, counting day 1's drive out of the start town. No test enforces it (owner: an aim). Each day's real driving, from the app's own leg minutes, goes in the build report for the owner to read.
- **Titles say who it's for:** e.g. "Queenstown and Wānaka with Kids" (wording settled in the plan).
- **Analytics:** `suggested_trip_picked` gets the trip's key (owner: fine, though the point is promotion). One line.
- **Hours:** every stop checked against the operator's own page for the summer holidays. Like the other trips, nothing checks Christmas Day or Boxing Day closures.
- **Shipping:** JS only. An over-the-air update on 1.5, and 1.5's next store build (a new install first opens the bundle inside the store build), approved before 18 Dec.

## The App Store event (owner, App Store Connect)

- Name "School Holiday Road Trips" (25 characters); descriptions about the family trips.
- Badge: Special Event. Regions: New Zealand only (Australia's school holidays differ). No deep link.
- Dates: 18 Dec 2026 to 17 Jan 2027. It can be published up to 14 days before, once the trips are live.
- Card image 1920 × 1080 and a portrait details image: Claude renders them from a licensed photo the owner picks.
- The same trips can carry new events for the April, July and September holidays.

## Left to the builder

- Each trip's exact stops, times and length.
- The titles and descriptions.
