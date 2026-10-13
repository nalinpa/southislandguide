# Fix: Add a "now" time indicator line to the itinerary timeline

## File to change

`components/itinerary/ItineraryDetailView.tsx`

## Problem

The itinerary detail view has a sophisticated 30-minute-slot timeline (8 AM – 10 PM, lines 37–52 generate `TIME_SLOTS`) but no visual indicator showing the current time. Most calendar and planner apps include a "now" line, and it's especially useful in a travel app where users check their plan during the day.

## Current code (for reference)

The timeline is rendered inside a `ScrollView` with `timelineScroll` style. Each slot is a `gridRow` (line 741). The timeline container (line 740):
```tsx
timelineContainer: { position: "relative", paddingTop: tokens.space.md, paddingBottom: 100 },
```

Each `gridRow` has a fixed height of `SLOT_HEIGHT` (from `PLANNER.SLOT_HEIGHT`). The first slot starts at 8:00 AM (slot index 0 = 480 minutes from midnight).

## What to do

### 1. Add state for the current time

Inside the `ItineraryDetailView` component, add:
```tsx
// Updates the "now" line once a minute while the screen is open.
const [nowMinutes, setNowMinutes] = useState(() => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
});

useEffect(() => {
  const interval = setInterval(() => {
    const d = new Date();
    setNowMinutes(d.getHours() * 60 + d.getMinutes());
  }, 60_000);
  return () => clearInterval(interval);
}, []);
```

### 2. Compute the "now" line position

The timeline starts at 8:00 AM (480 minutes). Each slot is 30 minutes. The line's top offset in pixels:
```tsx
const TIMELINE_START_MINUTES = 8 * 60; // 480
const nowOffsetFromStart = nowMinutes - TIMELINE_START_MINUTES;
const nowSlotFraction = nowOffsetFromStart / 30; // how many slots down
const nowTopPx = nowSlotFraction * SLOT_HEIGHT;
const nowVisible = nowOffsetFromStart >= 0 && nowOffsetFromStart <= MAX_GRID_SLOTS * 30;
```

### 3. Render the "now" line inside the timeline container

Inside the timeline's `View` with `style={styles.timelineContainer}`, add the line as an absolutely-positioned element. It should sit in the same column as the time labels (left 70px, matching `timeLabelContainer.width`):

```tsx
{nowVisible && (
  <View
    style={[styles.nowLine, { top: nowTopPx + tokens.space.md }]}
    pointerEvents="none"
  />
)}
```

The `+ tokens.space.md` accounts for the `paddingTop` on the timeline container.

### 4. Add the style

```tsx
nowLine: {
  position: "absolute",
  left: 70, // aligns with the time label column's right edge
  right: tokens.space.md,
  height: 2,
  backgroundColor: tokens.colors.highlight,
  zIndex: 5,
  borderRadius: 1,
},
```

### 5. Only show on today's tab

The "now" line only makes sense for the current day. Check if the active day's date matches today:
```tsx
const todayIso = localIsoDate(new Date()); // localIsoDate is already defined at line 54
const activeDay = trip?.days.find((d) => d.id === activeDayId);
const isToday = activeDay?.date === todayIso;
```

Then change the visibility condition:
```tsx
{nowVisible && isToday && (
  <View style={[styles.nowLine, { top: nowTopPx + tokens.space.md }]} pointerEvents="none" />
)}
```

### 6. Auto-scroll to "now" on mount (today only)

When the timeline first renders on today's tab, scroll to the "now" line so the user sees their current position. Use the existing `timelineScrollRef` (a `ScrollView` ref):

```tsx
useEffect(() => {
  if (isToday && nowVisible && timelineScrollRef.current) {
    // Scroll so the "now" line is roughly in the upper third of the screen.
    const scrollTo = Math.max(0, nowTopPx - 120);
    timelineScrollRef.current.scrollTo({ y: scrollTo, animated: false });
  }
  // Only on mount — don't re-scroll as nowMinutes updates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [tripId, activeDayId]);
```

## Design notes

- The line uses `tokens.colors.highlight` (the orange `#C2410C`) — the same colour used for "you are here" throughout the app. It stands out against the white timeline without clashing with the teal time labels.
- `pointerEvents="none"` ensures the line doesn't intercept taps on items below it.
- `zIndex: 5` keeps it above the grid rows but below any modals.
- The line spans from the time column to the right edge, matching the dividers' width.

## Validation

- Run `npx tsc --noEmit` — no type errors.
- Run `npm test` — all tests pass. The existing itinerary detail tests mock the component or test logic that doesn't depend on the "now" line (it only renders for today's date, which test fixtures won't match).
- Do not touch any file other than `components/itinerary/ItineraryDetailView.tsx`.