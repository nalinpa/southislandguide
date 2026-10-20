# Fix: Proper names for the towns whose ids don't capitalise right

Finding #29 from the 2026-10-20 UX sweep.

## File to change

`lib/areas.ts`

## Problem

A town's on-screen name comes from `AREAS` (`lib/areas.ts:8-15`, six towns so far). Any other town is named by capitalising its id (`areaName`, line 38): `te-anau` becomes "Te Anau". That works for most of the 37 towns in the place data. Three come out wrong, and they show on Explore's town title, the town picker, trip days, the trip overview and the saved list:

| id | Shown today | Should be |
|---|---|---|
| `aoraki-mount-cook` | Aoraki Mount Cook | Aoraki / Mount Cook |
| `arthurs-pass` | Arthurs Pass | Arthur's Pass |
| `catlins` | Catlins | The Catlins |

The file's own comment (lines 34–37) says this is what `AREAS` is for: names that capitals can't make.

## What to do

Add the three to `AREAS`, after `wanaka`, in this order:

```ts
  { id: "aoraki-mount-cook", label: "Aoraki / Mount Cook" },
  { id: "arthurs-pass", label: "Arthur's Pass" },
  { id: "catlins", label: "The Catlins" },
```

**Why the order matters.** Explore's town picker lists, within each region, the towns in `AREAS` first (in `AREAS` order), then the rest alphabetically by id (`sites/index.tsx:80-82`). These three already sort first among their region's unlabelled towns, so appending them in this order leaves the picker's order exactly as it is today.

`AreaId` widens to include the three. Nothing switches on it exhaustively. `AREA_LABELS` and `areaLabel` pick them up automatically.

### Not in this fix, unless the owner says so

Official dual or macron names exist for a few more: Lake Tekapo / Takapō (`tekapo`), Tūātapere (`tuatapere`), Riverton / Aparima (`riverton`), Franz Josef / Waiau (`franz-josef`), Milford Sound / Piopiotahi (`milford-sound`). Their capitalised ids read correctly today, so leave them.

## Test impact

`sitesList.test.tsx:533` ("offers a town it has no label for…") uses `lake-tekapo`, which is not one of these three, so it is unaffected. No test asserts these three names.

## Validation

- `npx tsc --noEmit`: no type errors.
- `npm test`: all tests pass.
- Do not touch any file other than `lib/areas.ts`.
