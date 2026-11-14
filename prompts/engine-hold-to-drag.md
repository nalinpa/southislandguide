# Engine: hold to move a place on the Days view

Kiwi Guide (south-island) shows a trip's day as places on the hours (the Days view). A tester (2026-11-14, in the US) wrote: "all other calendar apps do not let you move events around like that". A swipe that starts on a place drags the place instead of scrolling the day. The owner's call: **hold to move, as the iPhone's Calendar and Google Calendar do.** A swipe scrolls, a hold then a drag moves, a tap opens the place.

The place block is the engine's `TimelineBlock`. This prompt adds an opt-in hold to it. The app's own drive block gets the same hold at the last step.

You are working in the engine, not the app.

- Engine: `C:\Users\User\source\enginev1\components` (its own git repo, `@blacksands/components`, 0.11.0).
- The app: `C:\Users\User\source\south-island`, branch `1.2`. Read it, don't change it, until the last step.

## Read first

- `south-island/prompts/engine-design-sweep.md`: the first engine job. Its hard rules all apply here unchanged: opt-in only (Rotorua Guide and aklguide use `TimelineBlock` and must behave the same with no new prop), no new dependencies, nothing native, don't publish, PowerShell for npm, stop after each item.
- `src/TimelineBlock.tsx`: `createTimelineBlockPanHandlers` is the whole gesture. It sits outside the component so `test/timelineBlock.test.ts` can drive it with no renderer; keep it that way.
- Why it drags today: `onStartShouldSetPanResponder` claims every touch on touch-down, and `onPanResponderGrant` calls `onDragStart` at once. The app's `onDragStart` turns the day's scrolling off (`ItineraryDetailView.tsx`, `scrollEnabled={!isDragging}`), and `onPanResponderTerminationRequest` refuses to hand the touch on.
- The two things above the block that want a moving touch, in the app:
  - the day's `ScrollView` (scrolls up and down; on iOS a native scroll that starts cancels the JS touch, which reaches the block as a termination)
  - the day swipe, `components/itinerary/daySwipe.ts`: a parent PanResponder that claims a sideways move with `onMoveShouldSetPanResponder`, so it gets the touch only if the block agrees to hand it on.

## The work

### 1. `holdToDrag` on `TimelineBlock`

A new optional prop, `holdToDrag?: number`: how long, in ms, a finger must rest on the block before it picks up. Unset (or 0) is 0.11.0's behaviour exactly, and every existing test passes unchanged.

With it set, in `createTimelineBlockPanHandlers`:

- **Touch-down.** The block still becomes the responder (so a tap still reaches `onEdit`), but it does not drag: no `setIsDragging`, no `onDragStart`. It starts a timer for `holdToDrag` ms. Read the value from `latestProps` at touch-down, so a change takes effect on the next touch.
- **Before the timer fires ("not picked up"):**
  - The block does not move: moves are ignored.
  - `onPanResponderTerminationRequest` returns `true`, so the day swipe can take the touch.
  - A termination (the scroll or the day swipe took it) clears the timer and calls nothing else: no `onDragEnd`, since `onDragStart` was never called, and no spring.
  - A finger that moves more than 10 pt from where it went down (iOS's own allowance for a long press) clears the timer. That touch can no longer pick the block up, and its release does nothing (it is neither a tap nor a drop).
- **The timer fires with the finger still within 10 pt ("picked up"):**
  - `setIsDragging(true)`, `onDragStart()`, and the pan offset set from `currentY`, as the grant does today.
  - Note the finger's `dy` at that moment and drag by the movement since, so the block doesn't jump by the few points the finger drifted while holding.
  - From here everything is as today: moves drag, `onPanResponderTerminationRequest` returns `false`, a forced termination springs back with no drop, and a release drops through `onDrop`.
- **Release before it was picked up, within `TAP_SLOP`:** a tap. `onEdit(item)`, and nothing else: no `onDragStart` / `onDragEnd` pair, no spring.
- **Release after it was picked up, without moving past `TAP_SLOP`:** the person held and let go. Spring back to its slot and call `onDragEnd`, but not `onEdit` and not `onDrop`. (The app buzzes on pick-up, so the person knows the place was lifted; opening the editor as well would surprise them. Say so in the hand-back if you think otherwise; the owner decides.)
- **The note chip.** With `holdToDrag` set, `onMoveShouldSetPanResponder` returns `false`: a touch that starts on the chip and moves is a scroll, not a drag. A tap on the chip opens the note as today.
- **The timer never outlives the touch or the block.** It is cleared on release, on termination, and when the block unmounts (a day switched or a place removed mid-hold). How the component reaches it is yours to choose; keep the handlers testable without a renderer.

Accessibility, dragging after pick-up, snapping, the edit tap's hit area, the note chip and every colour and size stay as they are.

## Tests

As before: `npm test` and `npm run typecheck` clean, `node:test` driving `createTimelineBlockPanHandlers` directly (its fake timers, `mock.timers`, for the hold), no snapshot files. At least:

- No `holdToDrag`: every existing gesture test passes as written.
- Touch-down calls neither `onDragStart` nor `setIsDragging`; the timer firing calls each once.
- Before pick-up, `onPanResponderTerminationRequest` is `true`; after, `false`.
- A termination before pick-up calls nothing; after pick-up it springs back with no `onDrop`, as today.
- Moving past 10 pt before the timer: no `onDragStart` ever, and the release calls neither `onEdit` nor `onDrop`.
- A tap before the timer: `onEdit` only.
- Hold then let go without moving: `onDragEnd`, no `onEdit`, no `onDrop`.
- Hold, drift 4 pt, then drag 2 slots: `onDrop` gets the slot 2 below, not 2 plus the drift.
- With `holdToDrag`, `onMoveShouldSetPanResponder` is `false` for a moving touch.

Say how you checked that nothing changed without the prop.

## Handing back

- What changed, a sentence or two.
- The exact prop the app passes.
- What you did not do, and why.
- The version you'd give the package (0.12.0) and one changelog line.

## The last step, in the app

When the owner has published 0.12.0 and installed it, and only then (`npm install` of `@blacksands` needs the owner's registry token):

1. `components/itinerary/ItineraryDetailView.tsx`: `holdToDrag={350}` on `components.TimelineBlock` (tune on the phone), and a buzz on pick-up in its `onDragStart`: `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)`. `expo-haptics` is already in the app and the build: no new native package.
2. `components/itinerary/DriveBlock.tsx`: the same hold in its own PanResponder, by the same rules (350 ms, 10 pt, termination handed on before pick-up, the same buzz). Today it starts a drag on touch-down too.
3. `components/itinerary/EditItemModal.tsx`: one line under the duration, "To change the time, hold the place on the day and drag it." (A tap on a place opens this sheet, which has no time control, so it's where people look.)
4. Tests: `DriveBlock` hold, swipe and tap with Jest's fake timers; `itineraryDetailView.test.tsx` still passes with the prop.
5. `npx tsc --noEmit` and `npx jest` clean; the fingerprint still `4ad8daed3af046d5e0a1c71697c62ca51a0c227c` (`npx @expo/fingerprint fingerprint:generate --platform ios`). The engine is JavaScript only, so it must not move.
6. Don't commit, don't publish. Tell the owner it is ready for the `development` branch, with the phone check: on a day, a swipe up or down over a place scrolls; a sideways swipe over a place changes the day; hold, feel the buzz, then drag moves it; a quick tap opens it; hold and let go puts it back. The same for a drive block.

## Stop and ask

- A default would change: anything Rotorua or aklguide would notice with no new prop.
- The day's scroll or the day swipe still can't take an unpicked touch from the block (on the phone, or by reading how the responder system hands it on): say what you found before working round it.
- The hold would need a new dependency or anything native.
