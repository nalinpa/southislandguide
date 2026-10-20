# Fix: The map's place sheet shows names, not raw ids

Finding #22 from the 2026-10-20 UX sweep.

## File to change

1. `components/map/MapOverlay.tsx`
2. `components/map/__tests__/mapOverlay.test.tsx`

## Problem

Under the place's name on the map's bottom sheet, the meta line is built from raw ids (lines 168–171):

```tsx
    const metaLine = [site.category[0], site.region]
      .filter(Boolean)
      .join(" · ")
      .toUpperCase();
```

So it reads `FOOD · WEST-COAST`, `WALKS · QUEENSTOWN-WANAKA` or `SCENIC · DUNEDIN-OTAGO`: hyphens, no macrons, and "Food" where every other screen says "Food & Drink". The region is also less useful than the town: the town is what the Explore picker, trip days and saved list all use.

## What to do

Use the category's label and the place's **town**:

```tsx
    // The category's label (as on Explore's tabs) and the town, by name. They used to be
    // the raw ids: "FOOD · WEST-COAST".
    const category = site.category[0];
    const metaLine = [category && SITE_CATEGORY_LABELS[category], site.area && areaName(site.area)]
      .filter(Boolean)
      .join(" · ")
      .toUpperCase();
```

Imports:

- `SITE_CATEGORY_LABELS` is a value, so change line 23 to `import { SITE_CATEGORY_LABELS, type Site, type SiteCategory } from "@/lib/models";`
- `import { areaName } from "@/lib/areas";`

This reads e.g. `FOOD & DRINK · TE ANAU` and `WALKS · WĀNAKA`.

## Test impact

Add one test to `mapOverlay.test.tsx`, following how the file already renders the sheet with a site. Use a site with `category: ["Food"]` and `area: "wanaka"`, and expect `getByText("FOOD & DRINK · WĀNAKA")`. No existing test asserts the meta line.

## Validation

- `npx tsc --noEmit`: no type errors.
- `npm test`: all tests pass.
- Do not touch any file other than the two listed.
