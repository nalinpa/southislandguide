# Fix: a failed share can be tried again

Finding 4 from the 2026-10-23 code review.

## Problem

`lib/services/share/shareService.ts:41-47` deletes the share card's image file after every attempt, including a failed one:

```ts
  async shareImageUriAsync(fileUri: string): Promise<ShareResult> {
    const ok = await shareImageAsync(fileUri);
    void safeUnlink(fileUri);
    …
```

After a failure, `app/share-frame.tsx` keeps `previewUri` pointing at the deleted file, and "Post to Social" stays enabled (`share-frame.tsx:181`). The preview still shows, because the `Image` already has the file loaded. But every retry hands the share sheet a file that no longer exists, and keeps failing until the user picks another photo.

A failure means both `Sharing.shareAsync` and the `RNShare.share` fallback threw. That's rare: dismissing the sheet isn't a failure on iOS, because `shareAsync` resolves either way.

## What to do

`shareService.ts`: delete the file only after a share that worked. A failed one keeps the file for the retry.

```ts
  async shareImageUriAsync(fileUri: string): Promise<ShareResult> {
    const ok = await shareImageAsync(fileUri);
    // Kept after a failure: the screen still offers the same file to try again.
    if (ok) void safeUnlink(fileUri);
    …
```

The file sits in the app's cache directory, so one left behind after a failure is cleared with the cache.

## Tests

`lib/services/share/__tests__/shareService.test.ts`:

- "always attempts to clean up the temp file" (line 72): rename it to "cleans up the temp file after a share". The body is unchanged.
- New: **keeps the file when both share paths fail.** Use the setup of "reports failure when both share paths fail" (line 62), with an `await Promise.resolve()` after the call, and expect `deleteAsync` not to have been called.

## Validation

- `npx tsc --noEmit`: no type errors.
- `npm test`: all pass.
- Touch only those two files.

## Not in this fix

- A failed share gives no message: `share-frame.tsx:97` acts only on `ok`, and an `ok: false` result does nothing visible. Add an error haptic or a line of text if testers hit it.
