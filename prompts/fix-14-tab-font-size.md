# Fix: Increase tab label font size from 10pt to 11pt

## File to change

`app/(app)/(tabs)/_layout.tsx`

## Problem

Tab labels are set at `fontSize: 10` (line 117). This is at Apple HIG's absolute minimum for body text, and can be hard to read on smaller devices or for users with vision accessibility settings. Increasing by 1pt makes a noticeable difference without changing the layout.

## Current code (for reference)

Lines 116–118:
```tsx
  tabLabel: {
    fontSize: 10,
  },
```

## What to do

Change line 117 from:
```tsx
    fontSize: 10,
```
To:
```tsx
    fontSize: 11,
```

That's it — a one-character change.

## Validation

- Run `npx tsc --noEmit` — no type errors.
- Run `npm test` — all tests pass (no test asserts on font size).
- Do not touch any file other than `app/(app)/(tabs)/_layout.tsx`.