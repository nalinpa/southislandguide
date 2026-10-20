# Fix: Back returns to where you came from (place detail and the Guide)

Covers findings #16 and #17 from the 2026-10-20 UX sweep. They share one cause and must be fixed together.

## Files to change

1. `app/(app)/(tabs)/_layout.tsx`: tab back behaviour and the tab bar highlight
2. `app/(app)/(tabs)/sites/[siteId]/index.tsx`: the place's back button
3. `app/(app)/(tabs)/guide/index.tsx`: the Guide list's back button
4. `app/(app)/(tabs)/guide/[slug].tsx`: the Guide article's back button
5. `app/(app)/(tabs)/__tests__/tabBar.test.tsx`
6. `app/(app)/(tabs)/guide/__tests__/guide.test.tsx`

## Problem

Every detail route (`sites/[siteId]`, `sites/[siteId]/reviews`, `guide/index`, `guide/[slug]`, `itinerary/[itineraryId]`) is a **tab screen** on the one Tabs navigator. The Tabs navigator has no `backBehavior` set, so it uses React Navigation's default, `firstRoute`: `router.back()` from any tab screen goes to the first tab (Explore). See `node_modules/expo-router/build/react-navigation/routers/TabRouter.js:96` (`backBehavior = 'firstRoute'`).

What users see:

- **#16:** Map → tap a place → back arrow → **Explore**, not the Map. The same happens from a trip ("Details" in the stop editor), from Profile's saved-places preview, and from the Map's "Today's plan" cards. While on the place, the tab bar also highlights **Explore**, because `highlightedTab` maps a route to the tab named by its first path segment (`sites`).
- **#17:** The Guide's back button was hard-wired to Profile to work around `firstRoute` (`guide/index.tsx:33-38`). Fix-9 then added a Guide button on Explore's top bar, and the opening tour points at it. So Explore → Guide → back lands on **Profile**, and the tab bar highlights Profile the whole time (`TAB_FOR_SECTION = { guide: "account" }`, `_layout.tsx:28`).

## What to do

### 1. `_layout.tsx`: keep a history of tabs

Change line 95:

```tsx
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
```

to:

```tsx
    // "history": back goes to the screen you came from. The default, "firstRoute", sent
    // every back to Explore, which is wrong for the detail screens: they're tab screens
    // here, opened from every tab.
    <Tabs backBehavior="history" screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
```

With `history`, the tab state carries `state.history`: an array of `{ type: "route", key }`, oldest first, ending with the current route. Navigating to a route already in it moves that route to the end (`TabRouter.js:59-90`).

### 2. `_layout.tsx`: light the tab the screen was opened from

A place (and its reviews) and the guide can be opened from any tab. While one is showing, the tab bar should light **the tab it was opened from**: the newest entry in the history that isn't one of those shared screens. `itinerary/[itineraryId]` is *not* shared. It is the Plans tab's own content, has no back button, and should keep lighting Plans even when opened from Explore's "Add to Itinerary".

Replace lines 24–32 (the comment, `TAB_FOR_SECTION` and `highlightedTab`) with:

```tsx
// Which tab button a route belongs to: its first segment (sites/[siteId] → sites). The
// guide has no button; on its own (a cold deep link) it counts as Profile, where its
// "Open Guide" hero is.
const TAB_FOR_SECTION: Record<string, string> = { guide: "account" };
const sectionTab = (routeName: string) => {
  const section = routeName.split("/")[0];
  return TAB_FOR_SECTION[section] ?? section;
};

// A place, its reviews and the guide are opened from any tab, and light the tab they were
// opened from: the newest route in the tab history that isn't one of them. A trip
// (itinerary/[itineraryId]) is Plans' own screen and always lights Plans.
const isShared = (routeName: string) => routeName.startsWith("sites/[siteId]") || routeName.startsWith("guide/");
const highlightedTab = (state: any) => {
  const nameOf = new Map<string, string>(state.routes.map((r: any) => [r.key, r.name]));
  for (const entry of [...(state.history ?? [])].reverse()) {
    const name = nameOf.get(entry.key);
    if (name && !isShared(name)) return sectionTab(name);
  }
  return sectionTab(state.routes[state.index]?.name ?? "sites");
};
```

Change line 36 from:

```tsx
  const activeRouteName = highlightedTab(state.routes[state.index]?.name ?? "sites");
```

to:

```tsx
  const activeRouteName = highlightedTab(state);
```

Worked examples (history oldest → newest):

| History | Lit tab |
|---|---|
| `sites/index`, `map/index`, `sites/[siteId]/index` | Map |
| `sites/index`, `sites/[siteId]/index` | Explore |
| `sites/index`, `guide/index`, `guide/[slug]` | Explore |
| `account`, `guide/index` | Profile |
| `itinerary/[itineraryId]`, `sites/[siteId]/index` (stop editor → Details) | Plans |
| no `history` (tests, or a state without it) | by section, as today |

### 3. `sites/[siteId]/index.tsx`: back with a fallback

Line 248, `onPress={() => router.back()}`, becomes:

```tsx
          // The screen it was opened from (tab history, app/(app)/(tabs)/_layout.tsx). A
          // place opened cold, from a link, has nowhere to go back to: the list then.
          onPress={() => (router.canGoBack() ? router.back() : router.navigate("/(app)/(tabs)/sites"))}
```

Leave the error state's "Go Back" (`router.replace("/(app)/(tabs)/sites")`, line 154) as it is.

### 4. `guide/index.tsx`: back to wherever it was opened from

Replace lines 31–39 (the `leading` prop and its comment) with:

```tsx
        leading={
          <TopBarBack
            // The tab it was opened from: Explore's book button or Profile's Open Guide.
            // Opened cold, Profile, where its hero is.
            onPress={() => (router.canGoBack() ? router.back() : router.navigate("/(app)/(tabs)/account"))}
            label="Back"
          />
        }
```

### 5. `guide/[slug].tsx`: back with `router.back()`, not `navigate`

`navigate` would now be wrong here. Navigating to the guide list moves the list to the end of the history, *after* the article, so the list's own back button would then return to the article. Replace lines 10–13:

```tsx
// Back goes to the guide list explicitly. This is a tab screen, and the Tabs
// navigator's default back behaviour returns to the FIRST tab (Explore), not to
// the screen you came from.
const backToGuideList = () => router.navigate("/(app)/(tabs)/guide");
```

with:

```tsx
// Back pops the tab history (app/(app)/(tabs)/_layout.tsx) to the guide list this was
// opened from. Not router.navigate to the list: that would move the list after this
// article in the history, and the list's own back button would come back here.
// Opened cold, from a link, the list.
const backToGuideList = () =>
  router.canGoBack() ? router.back() : router.navigate("/(app)/(tabs)/guide");
```

Line 51's label "Back to the guide" stays. The "Guide Not Found" card (line 35) keeps using `backToGuideList`.

## Test impact

### `tabBar.test.tsx`

The mock builds `state` with no `history`, so the three existing tests keep passing through the fallback. Extend the mock:

- Add `"sites/[siteId]/index"` and `"guide/index"` to the mocked `routes`. Append them at the end so the existing indexes (0 = Explore, 2 = Map) still hold.
- Let a test set `mockNav.history` (an array of route names, turned into `{ type: "route", key }`; the keys equal the names in this mock). Pass `history` in `state` when it's set.
- Capture the `backBehavior` prop the mocked `Tabs` receives.

Add these tests:

1. "uses the tab history, so back returns to the screen before": `backBehavior` is `"history"`.
2. "lights the Map for a place opened from the map": history `["sites/index", "map/index", "sites/[siteId]/index"]`, index on the place route. Map is in the highlight colour and Explore is neutral.
3. "lights Explore for the guide opened from Explore": history `["sites/index", "guide/index"]`, so Explore is lit, not Profile.

### `guide.test.tsx`

- Add `canGoBack: jest.fn(() => true)` to `mockRouter` (line 20).
- Lines 136–141: press `getByLabelText("Back")`, expect `mockRouter.back` to have been called, and expect `navigate` not to have been called. Add a case with `canGoBack` returning `false`: it navigates to `/(app)/(tabs)/account`.
- Lines 170–180 (article back) and 192–197 ("Go Back" on Not Found): expect `back` when `canGoBack` is true, and `navigate("/(app)/(tabs)/guide")` when it's false. One case of each is enough.
- Update the header comment (lines 4–6). It explains the old `firstRoute` workaround, which is no longer true.

### Site detail

`sites/[siteId]/__tests__/siteDetail.test.tsx` has no test pressing the back button. If its router setup (it reads `route.getPathname()`) allows it, add one: open the Map, then the place, press back, and expect the Map's pathname. If not, rely on the device checks below.

## Device checks (the router's history is real only on a phone)

- Map → place → back → Map, with Map lit while the place shows.
- Explore list → place → back → the list.
- Trip → tap a stop → Details → back → the trip.
- Profile → a saved place in the preview → back → Profile.
- Explore → book button → an article → back → the guide list → back → Explore, with Explore lit throughout.
- Profile → Open Guide → back → Profile.
- Saved Places screen (Explore's bookmark) → place → back. This screen is on the root stack, outside the tabs. Report what happens; it is out of scope here.

## Validation

- `npx tsc --noEmit`: no type errors.
- `npm test`: all tests pass.
- Do not touch any file other than the six listed.
