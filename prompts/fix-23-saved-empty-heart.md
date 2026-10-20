# Fix: Saved Places' empty state names the heart, not the bookmark

Finding #23 from the 2026-10-20 UX sweep.

## File to change

`app/(app)/saved-sites.tsx`

## Problem

With nothing saved, the Saved Places screen says (line 183):

> Tap the bookmark icon on any place to save it here.

But a place is saved with the **heart** in its action bar (`components/sites/detail/ActionsBar.tsx:96-104`, label "Save" / "Saved"). The opening tour says so too ("Tap the heart to keep it on your list", `lib/tour/tourSteps.ts`). The bookmark is Explore's shortcut *to this list*, so the hint sends people to the wrong control.

## What to do

1. Line 183: `"Tap the bookmark icon on any place to save it here."` → `"Tap the heart on any place to save it here."`
2. The big icon above it (line 174) is a `Bookmark` too. Make it a `Heart` so the picture matches the words: change the `lucide-react-native` import on line 6 to `import { Heart, Trash2 } from "lucide-react-native";` (`Bookmark` is used nowhere else in the file) and line 174 to `<Heart color={tokens.colors.borderStrong} size={48} />`.

## Test impact

No test asserts this text or icon.

## Validation

- `npx tsc --noEmit`: no type errors.
- `npm test`: all tests pass.
- Do not touch any file other than `app/(app)/saved-sites.tsx`.
