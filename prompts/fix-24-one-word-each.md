# Fix: One word for a trip, one for a place

Finding #24 from the 2026-10-20 UX sweep. Owner's choice (2026-10-20): **Trip** (the tab becomes **"Trips"**) and **place** (lower case in sentences, "Places" only where a title is in title case).

## Problem

The same two things go by different names on different screens:

- A trip is an "Itinerary" (Profile's "My Itineraries", "+ Add to Itinerary", the Add to Trip modal's title), a "Trip" ("New Trip", "Create Trip", "My Trips") and "Plans" (the tab, and the Plans screen's title when empty or for a guest).
- A place is a "place" (the tour, the sign-in prompts, the map's search, the Saved Places screen) and a "Location" with a capital L mid-sentence (Explore, Profile's saved card, the place screen's errors).

## Rules

- "Trip" / "Trips" for the thing; never "Itinerary" or "Plans" on screen.
- "place" / "places" in sentences; "Place" / "Places" only at the start of a title-case heading or label.
- **Leave "location" alone where it means the phone's location** (GPS): "Location Disabled", "Enable location to…", "Location unavailable", "Centre on my location".
- Code identifiers, route names (`itinerary/…`), tab keys and file names stay as they are. This is on-screen text only.

## Changes

### Tab and Trips screen

| File:line | Today | Becomes |
|---|---|---|
| `app/(app)/(tabs)/_layout.tsx:17` | `title: "Plans"` | `title: "Trips"` |
| `app/(app)/(tabs)/itinerary/index.tsx:41` | `<TopBar title="Plans" />` (guest) | `"Trips"` |
| `itinerary/index.tsx:49` | "Create an account to build and save an itinerary." | "Create an account to plan and save a trip." |
| `itinerary/index.tsx:91` | `<TopBar title="Plans" />` (no trips) | `"Trips"` |
| `itinerary/index.tsx:95` | "Create a trip and start adding places to build your perfect itinerary." | "Create a trip and start adding the places you want to see." |
| `itinerary/index.tsx:117` | `<TopBar title="My Trips" />` | `"Trips"` (one title for the tab's screen, whatever state it's in) |

### Adding to a trip

| File:line | Today | Becomes |
|---|---|---|
| `app/(app)/(tabs)/sites/[siteId]/index.tsx:271` | "Reconnect to Add to Itinerary" / "+ Add to Itinerary" | "Reconnect to Add to Trip" / "+ Add to Trip" |
| `components/map/MapOverlay.tsx:219` | "Add to Itinerary" | "Add to Trip" |
| `components/itinerary/AddToTripModal.tsx:115` | title "Add to Itinerary" | "Add to Trip" |
| `components/itinerary/ItineraryDetailView.tsx:843` | `Browse places and tap "+ Add to Itinerary" to build this day.` | `Browse places and tap "+ Add to Trip" to build this day.` |
| `components/itinerary/EditItemModal.tsx:101` | `` `Remove ${item.siteName} from your itinerary?` `` | `` `Remove ${item.siteName} from your trip?` `` |
| `components/itinerary/CreateItineraryModal.tsx:284` | "Suggested Itinerary" | "Suggested Trip" |

**The kit's trip-choice sheet.** `components.TripChoiceSheet` defaults to "Add to Itinerary", "Choose a day in your current itinerary" and "Create a fresh itinerary" (`node_modules/@blacksands/components/dist/index.cjs:2792-2796`). Both callers pass no text props, so override them in both: `sites/[siteId]/index.tsx:277` and `map/index.tsx:426`.

```tsx
        title="Add to Trip"
        addExistingSublabel="Choose a day in one of your trips"
        createNewSublabel="Pick dates and add this place"
```

The defaults "Add to existing trip" and "Start a new trip" already fit.

### Profile

| File:line | Today | Becomes |
|---|---|---|
| `components/account/ItinerariesCard.tsx:23` | "My Itineraries" | "My Trips" |
| `ItinerariesCard.tsx:32` | "No itineraries yet." | "No trips yet." |
| `ItinerariesCard.tsx:62` | "Up to {N} itineraries allowed." | "Up to {N} trips at a time." |
| `ItinerariesCard.tsx:66` | "New Itinerary" | "New Trip" |
| `components/account/SavedItemsCard.tsx:24` | "Saved Locations" | "Saved Places" |
| `SavedItemsCard.tsx:33` | "No saved Locations yet." | "No saved places yet." |

### Explore and the place screen

| File:line | Today | Becomes |
|---|---|---|
| `app/(app)/(tabs)/sites/index.tsx:159` | "Finding Locations..." | "Finding places..." |
| `sites/index.tsx:178` | fallback title "Locations" | "Places" |
| `sites/index.tsx:204` | label "Search Locations" (after fix-31: the closed state of the toggle) | "Search places" |
| `sites/index.tsx:222` | placeholder "Search Locations" | "Search places" |
| `sites/index.tsx:254` | "Enable location to see distances to nearby Locations." | "Enable location to see distances to nearby places." |
| `sites/index.tsx:268` | "Sign in to save Locations and leave reviews." | "Sign in to save places and leave reviews." |
| `sites/index.tsx:278` | `` `No Locations${…} match your search.` `` | `` `No places${…} match your search.` `` |
| `sites/index.tsx:279` | `` `No ${… : "Locations"} to show.` `` | `` `No ${… : "places"} to show.` `` |
| `sites/index.tsx:307` | "No Locations Found" | "No Places Found" |
| `app/(app)/(tabs)/sites/[siteId]/index.tsx:152` | "Location Not Found" | "Place Not Found" |
| `sites/[siteId]/index.tsx:153` | "Could not find this Location." | "Couldn't find this place." |

### Paywall text that can't show today

v1 has no paid unlock (`lib/hooks/useEntitlementGate.ts` grants everyone), so these never render. Change them anyway, so the old words don't come back when commerce is switched on:

| File:line | Today | Becomes |
|---|---|---|
| `app/(app)/(tabs)/map/index.tsx:323` | "{n} Premium Location(s) Nearby" | "{n} Premium Place(s) Nearby" |
| `map/index.tsx:465` | "Building itineraries is a Premium feature" | "Planning trips is a Premium feature" |

### Then sweep

After the edits, search the UI for leftovers, case-insensitive: `itinerar`, `Locations?\b`, `"Plans"`, `My Trips` across `app/`, `components/` and `lib/tour/`. Any match must be a code identifier, a route, a comment, or "location" meaning GPS.

## Test impact

Several tests assert the old wording. Update each to the new text. Don't change what they test:

- `app/(app)/(tabs)/__tests__/tabBar.test.tsx`: `"Plans"` → `"Trips"`
- `app/(app)/(tabs)/sites/__tests__/sitesList.test.tsx`: "Search Locations" (label and placeholder, about 20 places), "Finding Locations...", "No Locations Found", "No Locations in Christchurch match your search."
- `app/(app)/(tabs)/sites/[siteId]/__tests__/siteDetail.test.tsx`: "+ Add to Itinerary", "Reconnect to Add to Itinerary", including the test named "points at + Add to Itinerary" (line 397)
- `components/map/__tests__/mapOverlay.test.tsx`: "Add to Itinerary" (lines 208–224)
- `components/itinerary/__tests__/addToTripModal.test.tsx`: the title "Add to Itinerary" (lines 86–91)
- `components/layout/__tests__/topBar.test.tsx` uses "Plans" and "Search Locations" only as sample props to a generic component. Leave it.

Then grep all test files for the old strings above and fix any stragglers.

## Order

Do this after fix-31 (which changes the Explore search label to a ternary) and after fix-27 (which edits AddToTripModal). Line numbers here are from before both. Match by the text, not the line.

## Validation

- `npx tsc --noEmit`: no type errors.
- `npm test`: all tests pass.
- Only on-screen strings change, in the files listed and their tests.
