# Engine: the variants the design sweep needs

Kiwi Guide (south-island) has been restyled screen by screen. Everything the app owns is built. What is left is in the shared engine: components that take no styling from the app, so they still show the old look inside new screens. This prompt adds what those components need, as opt-in variants, so the app can finish.

You are working in the engine, not the app.

- Engine: `C:\Users\User\source\enginev1`. Each package is its own git repo. The two that matter: `components` (`@blacksands/components`, 0.8.1) and `ui` (`@blacksands/ui`, 0.6.0).
- The app: `C:\Users\User\source\south-island`, branch `design`. Read it, don't change it, until the last step.

## Read first

- `south-island/docs/plans/design-sweep.md`: the look, its values, the rules that came out of the critic rounds, and "The engine list" under Open. That list is the scope of this job.
- `south-island/lib/ui/tokens.ts`: the tokens, including the new ones (`page`, `line`, `band`, `photoEdge`, `selected`) and the `pair()` helper for dark mode.
- How the app solved the same thing in its own code, so the engine's version matches:
  - a 12 pt orange button: `app/(app)/(tabs)/itinerary/index.tsx` (`signInButton`), `app/(app)/(tabs)/sites/[siteId]/index.tsx` (`itineraryButton`)
  - a sheet: `components/itinerary/AddToTripModal.tsx` (bottom edge, 20 pt top corners, close chip, sentence-case labels, the round stepper)
  - a block on the hours: `components/itinerary/DriveBlock.tsx`
  - the white sign-in sheet: `app/(auth)/login.tsx`
- The drawings and scores: the progress page linked from the plan doc is private to the owner. Ask for a screenshot if you need to see one. Reference screenshots are in `south-island/design-refs/` (git-ignored): `Too Good To Go iOS 107.png` (a review form), `Airbnb iOS 81.png` and `Airbnb iOS 97.png` (reviews).

## Hard rules

- **Opt-in only.** Rotorua Guide and aklguide use the same packages. With no new prop passed, every component must render exactly as it does today. Add a prop (a `variant`, a `tone`, a `colors` object, a `radius`), default it to today's look, and prove the default with a test.
- **Follow what is already there.** `AuthPanel` shows the house pattern: `tone`, a partial `colors`, `radius`, `labels`, small pure functions (`resolveAuthPanel`, `resolveAuthPanelColors`) with their own tests. Do it that way; don't invent a theme system.
- **No new dependencies, nothing native.** The app ships over the air; its build fingerprint must not move.
- **Colours may be iOS paired colours.** The app's `pair()` returns a `DynamicColorIOS` value when dark mode is switched on. Such a value can go in a style but cannot be glued into a string or measured. Two places do that today and must stop: `ui/src/AppIconButton.tsx` (`` `${tokens.colors.surf}20` ``) and `components/src/TransitBlock.tsx` (`tokens.colors.borderSubtle + "99"`). Where a see-through colour is needed, take it as its own value.
- **Don't publish, don't bump the app.** The owner publishes the packages. Commit in each package's repo only when the owner says so.
- **Check each repo before you start.** `components` has uncommitted work that is not yours (`src/TransitBlock.tsx` modified, `eas.json` and `app.json` added). Ask the owner what it is before touching `TransitBlock.tsx`.
- PowerShell for npm and npx on this machine; Git Bash can't find node.
- Stop after each numbered item below, say what changed and how the app would use it, and wait for the owner's go.

## The work, in order

Most seen first. For each: the component, what the app needs, and the values.

### 1. `AppButton` (ui)

The app draws its own button in two places because this one's corners and heights are fixed (`radius.md`, 48 / 56 / 64).

- A way to get the sweep's button: 12 pt corners, 50 pt tall (44 where the app asks for a compact one), label 16 or 17 pt semi-bold, no glow or shadow on `hero`.
- It must keep `loading`, `loadingLabel`, `disabled`, `icon`, `fullWidth`.
- Second buttons in the sweep are a 1.5 pt outline in the `selected` colour with a label in the same colour, or a pale fill with dark words (`bgSurface`). Check what `secondary` and `ghost` do today before adding a variant for these.

### 2. `AuthPanel` (components): Login

The app passes `tone="light"`, `radius={12}` and colours today. The picked drawing needs four more things:

- **An empty password box.** Today the placeholder is the label's word, so "Password" sits under "Password". A way to give no placeholder (and none for "Confirm password").
- **"Forgot password?" under the password box, on the right**, close to it, not in the row under the button.
- **The remaining links on one centre line**, one under the other: "Create an account", then "Continue as guest". On create-account: "I have an account", then the guest link.
- **The guest link as a plain link**: no underline, the other links' size and weight.
- Labels a step larger than the placeholder (15 pt against 15 pt lighter grey is what was drawn; the label is the darker one).

Order of what a screen reader meets must still make sense: email, password, forgot, sign in, create, guest.

### 3. `TimelineBlock` and `TransitBlock` (components): the Days view

The lowest-scoring screen of the sweep (0 of 5), and almost all of it is these two. Critics said the blocks are not one family: the app's drive block is white with a line, the place block is a solid colour with a shadow, and transit is a grey pill.

- `TimelineBlock`: a variant in the sweep's look. Drawn as a pale fill (`bgSurface`) with dark text, 12 pt corners, no shadow, title 16 pt bold, time line 13 pt. Critics found that pale fill too faint against white, so try it with a 1 pt outline in `border` as well and show the owner both. Text must start at the same inset as `DriveBlock`'s, and the drag grip must sit at the same right edge.
- `TransitBlock`: the same family: small grey text and icon on the page, no pill, or a pill in `page` with a `line` outline. Fix the string-built colour here.
- The note chip on a block uses `surf`; give it a colour the app can set.
- Dragging, snapping, editing and the hit areas must not change.

When this is in, the owner wants the Days view judged again against the app's own Explore.

### 4. `ReviewsSummaryCard`, `ReviewModal`, and the reviews screen's pieces (components)

Not drawn yet. Draw first (HTML mock-ups, as the sweep did), show the owner, build after.

- `ReviewsSummaryCard` on the Place screen: flat on the white page, a line above, no card or shadow. The rating and count as plain facts; "Write a review" or "See all" as the thing to tap.
- `ReviewModal`: a sheet in the sweep's look (see `AddToTripModal`), stars large enough to tap, an outlined note box with 12 pt corners, the main button from item 1.
- `ReviewsHeader`, `ReviewListItem`, `ReviewsEmptyState`, `ReviewOptionsMenu`: the reviews screen (`south-island/app/(app)/(tabs)/sites/[siteId]/reviews.tsx`). White page, a bare back arrow as on the Guide's section page, reviews as rows with a line between.

### 5. `EmptyItineraryState` and `TripChoiceSheet` (components)

- `EmptyItineraryState` (Trips tab, signed in, no trip): the white page, an icon in a pale circle, title 20 pt bold, one line, the orange main button and an outlined second button, both from item 1. The mock-up is in the sweep's scratch files; ask the owner for it.
- `TripChoiceSheet` ("Add to Trip": a new trip or an existing one): the sheet look, two rows with a line between.

### 6. `ErrorCard`, `LoadingState`, `CardShell`, `OfflineBanner`, `Screen` (ui)

Wherever these show, they are still the old mint and corners.

- `Screen`: a way to get the white `page` background without each screen overriding its style.
- `CardShell`: the app now passes per-corner radii and padding through `style`; check that still wins, and add a flat variant (no shadow, no border).
- `ErrorCard`: flat on the page, the button from item 1.
- `LoadingState`: the spinner in `selected`, the label in `textMuted`, on `page`.
- `OfflineBanner`: check its colours can be set; it sits over every screen.
- Fix the string-built colour in `AppIconButton`.

## Dark mode

The app has the colour pairs but its switch is off (`DARK_READY` in `lib/ui/tokens.ts`), because unconverted screens would show light text on hard-coded white. The engine has the same fault in miniature: any `"#FFFFFF"`, `"#000"` or `rgba(...)` written into a component is a colour the app cannot pair.

For each component you touch, list every hard-coded colour and say whether it is safe in dark (white text on the orange button: yes) or needs to come from tokens or a prop (a white card background: yes, it does). Fix the ones in the components above. Don't sweep the whole engine for this; note the rest.

## Tests

- Each package has its own runner (`npm test` runs `scripts/run-tests.mjs`) and `npm run typecheck`. Both clean before you say an item is done.
- For every new prop: one test that the default is unchanged, one that the variant does what it says.
- No snapshot files.

## Handing back

After each item, and again at the end:

- What changed, per component, in a sentence each.
- The exact props the app should pass to get the sweep's look, as a snippet.
- What you did not do, and why.
- The version you'd give each package and one changelog line.

When the owner has published, and only then, the last step is in the app: bump the two packages in `south-island/package.json`, pass the new props, delete the app's stand-ins (the two hand-made buttons, the notes marked `ponytail:` that name the engine), run the app's tests and typecheck, and check the fingerprint is still `4ad8daed…` (`npx @expo/fingerprint fingerprint:generate --platform ios`). A JavaScript-only package bump should not move it; if it does, stop and say so.

## Stop and ask

- A variant can't be added without changing what the component does for the other apps.
- A component needs a new package or anything native.
- The drawing and what the component can do pull apart (the sign-in form's link order, for one): say which, show both, the owner picks.
- You find uncommitted work in a package that isn't yours.
