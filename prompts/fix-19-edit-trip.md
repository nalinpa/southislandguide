# Fix: Edit a trip: name, start date, length, and deleting Day 1

Finding #19 from the 2026-10-20 UX sweep. The owner asked for a full edit, "especially redate" (2026-10-20).

## Files to change

1. `components/itinerary/CreateItineraryModal.tsx`: gains an edit mode
2. `lib/utils/itineraryPhysics.ts`: one pure helper that re-dates and resizes a trip's days
3. `components/itinerary/ItineraryDetailView.tsx`: "Edit Trip" in the trip menu, and Day 1 can be deleted
4. `lib/utils/__tests__/itineraryPhysics.test.ts`
5. `components/itinerary/__tests__/createItineraryModal.test.tsx`
6. `components/itinerary/__tests__/itineraryDetailView.test.tsx`

## Problem

Once a trip is made, its name, start date and length are fixed:

- The trip menu (`ItineraryDetailView.tsx:901-930`) offers only Switch Trip and Delete Trip.
- Add Day only appends after the last day (`handleAddDay`, line 458).
- Day 1 can't be deleted: `canDelete = isActive && index > 0` (line 720).

If a traveller's plans shift by a day (a flight moves, a ferry is cancelled), the only fix is to delete the trip and rebuild every day.

The api already accepts all of this: `PUT /v1/:appId/itineraries/:id` takes `title`, `startDate`, `endDate` and `days`. It returns 409 `date_overlap` if the new range overlaps another of the user's trips (excluding this one), and caps a trip at 60 days (`enginev1/api/src/routes/itineraries.ts:84-106`, `lib/itinerary.ts:7`). `saveItinerary({ id, ... })` sends that update (`lib/services/itineraryService.ts:9-13`).

## Behaviour

| Edit | Result |
|---|---|
| Rename | Title changes. Blank falls back to "South Island Trip", as on create. |
| New start date | Every day moves with it and keeps its places, in order: Day 1 is the new start, Day 2 the day after, and so on. |
| More days | Empty days are added at the end. |
| Fewer days | Days are dropped from the end. If any of them hold places, ask first: "Day 5 and Day 6 have 4 places. Shorten the trip and remove them?" (Cancel / "Remove Places", destructive). |
| Overlaps another trip | Refused with the same message as create: `Dates overlap with "<title>". Choose different dates.` A 409 from the server shows "Those dates overlap an existing trip. Pick a different range." |
| Delete Day 1 | Allowed whenever the trip has more than one day. The trip then starts a day later and the other days keep their dates. Deleting any other day keeps today's behaviour: the days after it each move a day earlier. |

Re-dating and dropping trailing days never change how a remaining day is timed. Packing depends on the order of places and the day before, not on dates. So none of these edits needs the planner's `tryEdit` gate. Delete Day 1 already goes through `applyEdit` in `handleDeleteDay`; keep that.

## What to do

### 1. `itineraryPhysics.ts`: the helper

```ts
// A trip's days re-dated from a new start and cut or padded to `count`: each day keeps
// its places and moves with the start; days past `count` are dropped, and new ones are
// empty. Dates only label the days; how a day is timed doesn't depend on them, so
// nothing needs re-packing.
export function redateTrip(
  days: ItineraryDay[],
  startDate: string,
  count: number,
  newDayId: () => string,
): ItineraryDay[] {
  const start = new Date(startDate + "T00:00:00");
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return days[i] ? { ...days[i], date: iso } : { id: newDayId(), date: iso, items: [] };
  });
}
```

### 2. `CreateItineraryModal.tsx`: edit mode

Add an optional prop `trip?: Itinerary` (import the type from `@/lib/models`). With `trip` set, the modal edits that trip instead of creating one. Everything else about the modal stays as it is for create, including the date picker and its comments (lines 188–280), which edit mode reuses unchanged.

- **On open** (the `useEffect` at lines 73–83): with `trip`, set `title` to `trip.title`, `startDate` to `new Date(trip.startDate + "T00:00:00")`, `numDays` to `trip.days.length`, and `selectedTemplate` to `null`. Without `trip`, keep today's defaults. Add `trip` to its deps.
- **Header** (line 149): `trip ? "Edit Trip" : "New Trip"`.
- **Templates** (lines 282–350): hidden in edit mode. Use `templatesEnabled && !trip`.
- **Days stepper** (lines 352–384): already shown when `selectedTemplate === null`, which is always true in edit mode. `locked` is never set by the edit caller.
- **Button** (lines 389–399): label `trip ? "Save Changes" : "Create Trip"`, offline label `trip ? "Reconnect to Save" : "Reconnect to Create Trip"`, loading label `trip ? "Saving..." : "Creating..."`.
- **Save**: in `handleCreate`, branch at the top when `trip` is set:

```tsx
    if (trip) {
      const newStart = isoDate(startDate);
      const days = redateTrip(trip.days, newStart, numDays, () => `day_${randomUUID()}`);
      const newEnd = days[days.length - 1].date;
      const conflict = itineraries.find(
        (itin) => itin.id !== trip.id && newStart <= itin.endDate && newEnd >= itin.startDate,
      );
      if (conflict) {
        setErrorMsg(`Dates overlap with "${conflict.title}". Choose different dates.`);
        return;
      }
      const dropped = trip.days.slice(numDays);
      const droppedPlaces = dropped.reduce((n, d) => n + (d.items?.length ?? 0), 0);
      const save = async () => {
        try {
          await saveItinerary({ id: trip.id, title: title.trim() || "South Island Trip", startDate: newStart, endDate: newEnd, days });
          onCreated(trip.id);
          onClose();
        } catch (err) {
          setErrorMsg(
            err instanceof ApiError && err.status === 409
              ? "Those dates overlap an existing trip. Pick a different range."
              : "Couldn't save the trip. Try again.",
          );
        }
      };
      if (droppedPlaces === 0) return save();
      const names = dropped.map((_, i) => `Day ${numDays + i + 1}`).join(" and ");
      Alert.alert(
        "Shorten the Trip?",
        `${names} ${dropped.length === 1 ? "has" : "have"} ${droppedPlaces} ${droppedPlaces === 1 ? "place" : "places"}. Shorten the trip and remove ${droppedPlaces === 1 ? "it" : "them"}?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Remove Places", style: "destructive", onPress: () => void save() },
        ],
      );
      return;
    }
```

  Import `Alert` from `react-native` and `redateTrip` from `@/lib/utils/itineraryPhysics` (the file already imports two helpers from there). `onCreated(trip.id)` lets the caller react the same way for both modes. With three or more dropped days, `names` reads "Day 4 and Day 5 and Day 6"; that's fine for a confirm.

- **Start-date picker floor**: `minDate={new Date()}` (line 270) stays. An under-way trip keeps its past start unless the user picks a new date.

### 3. `ItineraryDetailView.tsx`: open it, and let Day 1 go

- State: `const [editingTrip, setEditingTrip] = useState<Itinerary | null>(null);`
- Trip menu (line 904): add an **"Edit Trip"** row first, above Switch Trip, with `styles.menuRowDivider`:

```tsx
              <TouchableOpacity
                style={[styles.menuRow, styles.menuRowDivider]}
                activeOpacity={0.6}
                onPress={() => {
                  setShowTripMenu(false);
                  // The trip as it stands on screen, with the open day's edits saved first.
                  flushSave();
                  if (tripRef.current) setEditingTrip({ ...tripRef.current, days: currentDays() });
                }}
              >
                <Text style={styles.menuRowText}>Edit Trip</Text>
              </TouchableOpacity>
```

- Render the modal next to `DeleteTripModal`. Import `CreateItineraryModal` from `@/components/itinerary/CreateItineraryModal`:

```tsx
      {/* The saved trip arrives through useItineraries' refetch, like any other save. */}
      <CreateItineraryModal
        visible={!!editingTrip}
        trip={editingTrip ?? undefined}
        onClose={() => setEditingTrip(null)}
        onCreated={() => setEditingTrip(null)}
      />
```

- **The open day may have been cut off the end.** Change the `useEffect` that picks the day Days opens on (lines 246–250) so it also picks again when the open day no longer exists:

```tsx
  // The day Days opens on: today's, when the trip is under way (a trip can run three
  // weeks or more, and on the road today is the one that matters), otherwise the first.
  // Picked again if the open day goes (the trip was shortened under it).
  useEffect(() => {
    if (!localTrip?.days[0]?.id) return;
    if (activeDayId && localTrip.days.some((d) => d.id === activeDayId)) return;
    const today = localIsoDate(new Date());
    setActiveDayId((localTrip.days.find((d) => d.date === today) ?? localTrip.days[0]).id);
  }, [localTrip, activeDayId]);
```

- **Delete Day 1.** Line 720: `const canDelete = isActive && localTrip.days.length > 1;`. In `handleDeleteDay` (lines 390–425), the re-dating starts from `localTrip.startDate`. When the deleted day is the first, start from the old Day 2's date instead, so the remaining days keep their dates:

```tsx
          // Deleting the first day starts the trip a day later; the rest keep their dates.
          // Deleting any other day pulls the days after it a day earlier.
          const startDate = dayId === localTrip.days[0].id ? remainingDays[0].date : localTrip.startDate;
          const start = new Date(startDate + "T00:00:00");
```

  Then save `startDate` too: `nextTrip = { ...localTrip, days: updatedDays, startDate, endDate: newEndDate }`, and add `startDate: nextTrip.startDate` to the `saveTrip` call. `remainingDays` comes from `applyEdit`, which keeps each day's `date`.

## Test impact

- `itineraryPhysics.test.ts`: `redateTrip`. (a) Same count, new start: dates shift and ids and items are kept. (b) A larger count adds empty days with fresh ids. (c) A smaller count drops trailing days. (d) Dates cross a month end correctly (e.g. start `2026-10-30`, 4 days).
- `createItineraryModal.test.tsx`: an edit-mode block. (a) Opens prefilled, titled "Edit Trip", with no "Suggested Itinerary" dropdown. (b) Saving calls `saveItinerary` with `id`, the new dates and re-dated days. (c) Shortening past a day with places shows the "Shorten the Trip?" alert and doesn't save until "Remove Places". (d) An overlap with another trip shows the overlap message and doesn't save. Follow the file's existing mocks for `useItineraries` and the date picker.
- `itineraryDetailView.test.tsx`: (a) The trip menu shows "Edit Trip" (next to the existing menu tests around lines 461–497). (b) Day 1's tab offers delete when the trip has two or more days. (c) Deleting Day 1 saves `startDate` equal to the old Day 2's date, with the other days' dates unchanged. The existing Delete Day test (line 439) deletes a later day and must still pass.

## Device check

Make a 4-day trip and add places to days 1 and 3. Then:
- Edit Trip → move the start a week later: the same places sit on the same day numbers, under the new dates.
- Shorten to 2 days: the confirm names Day 3 and Day 4 and the place count.
- Delete Day 1: the trip starts a day later.

## Validation

- `npx tsc --noEmit`: no type errors.
- `npm test`: all tests pass.
- Do not touch any file other than the six listed.
