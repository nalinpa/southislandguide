# South Island Guide — Tasks

Build plan: `boilerplate/boilerplateplan/` (master plan + 9 phase docs).
Reference app for every port: `rotorua-guide`.

---

## Release plan

Each release is the smallest thing that lets the next one be built against real data.

| Release | Scope | Why this order |
|---|---|---|
| **1.0** | Christchurch places + photos. **Publish.** | Get a real app in the store; everything after is iteration |
| **1.1** | Itinerary: drive times + multi-day day view. A few more places *around* Christchurch | Drive times and multi-day only mean anything once places are more than a short hop apart — Christchurch-only data can't exercise them |
| **1.2** | The whole location list | Content drop once the planner handles distance properly |
| **1.3** | Free itineraries (templates) | Templates bake slot times against the transit matrix, so they wait for 1.1's drive times and 1.2's final place list |
| **1.4** | In-app purchases | See "Commerce" below — the api's premium behaviour makes this more than switching a flag |

---

## 1.0 — before publishing

### Bugs and gaps found on device
- [x] **Category filter on the map** — was already there, ported from rotorua-guide (filter button + chip row built from `SITE_CATEGORIES`). It only had one chip until the enum grew; now All + 9. Done 2026-09-28.
- [x] **Category filter on the list** — tabs under the search bar, All + each category that has places (rotorua-guide shows every category unconditionally, which leaves empty tabs once regions differ). Combines with search. Done 2026-09-29.
- [x] **"Add to itinerary" on every place except Stay** — map overlay and detail screen, both via `canAddToItinerary()` in `lib/models.ts` so the rule lives once. Detail screen uses rotorua-guide's floating button + TripChoiceSheet → CreateItineraryModal → AddToTripModal flow; signed-in only, like the map. No premium gate (v1 has no unlock). Done 2026-09-28. **Saving still 500s** until the api service-account case ships.
- [x] **Detail page keeps the previous page's scroll position, with a big gap between the photo and the title.** Verified fixed on device 2026-09-29. Root cause found 2026-09-29: `sites/[siteId]` is a TAB screen (the only layout under `app/(app)/(tabs)` is the Tabs one), so React Navigation reuses one instance and only swaps params — the ScrollView offset and the hero's parallax `scrollY` carried over. Cached place → same ScrollView kept → opened scrolled down. Uncached → loading state remounted the ScrollView at the top while `scrollY` kept its old value → hero slid up, gap above the title. **Fixed by keying the body on the site id** (`<SiteDetail key={id} />`). **Needs on-device verification** before ticking.
- [~] **Same root cause in two sibling routes:**
  - `itinerary/[itineraryId].tsx` — opening a second trip landed on a **blank day** (trip B inherited trip A's `activeDayId`). **Fixed 2026-09-30** with `key={itineraryId}`; safe because the view flushes unsaved edits on blur. **Needs on-device test with two trips.**
  - `sites/[siteId]/reviews.tsx` — FlashList scroll position carries over between places. Cosmetic; same fix.
  - rotorua-guide has the identical structure, so all three are presumably latent there too. Not touched: separate repo, and it's in App Store review.
- [~] **Detail page readability + info.** Done 2026-09-29: description in primary text at 16/25 (was the muted `hint` style); reading sheet near-white; `Local tip:` in a teal callout; button row pure white with a 2px `borderStrong` border; badges under the title — primary category (marker icon/colour), price (dollar icon, neutral), website (accent, tappable, http(s) only); `hoursNote` shown as a neutral "Good to know" box after the description, one line per clause. Sites tab renamed "Explore". **Still open:**
  - title size — `h1` is 34px / 900; waiting on shorter titles
  - "time to allow" from `recommendedDurationSlots` (46/53 have it) — not added
  - remaining "Locations" wording on the list screen etc. — deciding one by one
- [x] **Default photo per category** — `lib/categoryImages.ts` `siteImage()`: the place's own photo if it has one, else its primary category's bundled default. Real photos in since 2026-09-29. Used by list, saved places, detail hero, map Today's Plan cards. Not yet in the itinerary modals (`AddToTripModal`, `EditItemModal`) — their `imageUrl: string` prop can't carry a bundled image.
- [ ] **Place photos — via the admin panel.** Upload works now (`POST /admin/images` writes R2 only, no Firestore). Attaching the URL to a place does NOT work through the admin form until the api service-account case ships — so attach via `scripts/upload-places.js` (add `imageUrl`/`imageThumbnailUrl` to the JSON) or the Firestore console. Port `rotorua-guide/scripts/{resize-images,upload-images}.js` for the 1200px full / 400px thumb webp pipeline.

- [ ] **Share — ported from rotorua-guide 2026-09-30, needs a new EAS build + device check.** `app/share-frame.tsx`, `components/share/CaptureCanvas.tsx`, `lib/services/share/{shareService,types}.ts`. Card says "South Island" / "South Island Guide" and its gradient comes from `tokens.colors.text`. Added `react-native-view-shot`, `expo-image-picker`, `expo-sharing`, `expo-file-system`, `expo-linking` (via `expo install`) and the `expo-sharing` + `expo-image-picker` plugins (photo/camera permission strings) in `app.config.ts`. Typecheck clean.
- [ ] **Login page image** — wired 2026-10-01, needs a device check: Aoraki over Lake Pukaki (`assets/login.webp`) full-bleed under a top/bottom teal tint. The email form now starts closed behind a white "Sign in with email" button, so the photo isn't covered; it opens in place of the Apple/Google buttons, with "Other ways to sign in" to close it. The source is 1280×686, so it's upscaled 2–3× on a phone and may look soft; a larger original (≥2000px tall) would fix that.
- [x] **Reviews — reading works** (verified 2026-09-29: `collections.reviews` = `siteReviews`, the `locationId + reviewCreatedAt` index is built and a probe query runs). **Posting still fails** until the api service-account case ships — not an index problem.

- [ ] **Check every screen at 375×667pt (iPhone SE / the iPad compatibility window).** Rotorua build 15 was rejected under Guideline 4 on 2026-09-29: App Review runs iPhone-only apps on iPad in a 375×667 window, and a primary button sat under the tab bar at that height. Any screen holding a primary action must scroll or fit at 667pt. **Most at risk here: the login screen** — now scrolls (2026-10-01) and only one of the buttons or the email form shows at a time, but still check it with the keyboard up. Also check the itinerary modals and the saved-places screen. Test on an SE simulator.

- [x] **Guest "Sign In" went to the map instead of login** — fixed 2026-10-01. Both `(auth)/_layout.tsx` and `login.tsx` redirected guests to the map, so every Sign In button bounced. Removed both (rotorua-guide's fix); "Continue as Guest" now navigates explicitly. Also logged as a create-app scaffold bug in enginev1/TASKS.md.
- [~] **Two layout gaps** — confirmed from a screenshot 2026-10-01 and fixed; check on device (guest and signed-in):
  - band between the profile sheet and the tab bar was the dark `surf` container showing through — the sheet didn't fill the screen when content was short. Sheet now `flexGrow: 1`; the `insets.bottom + 80` bottom spacer (sized for a floating tab bar) cut to `tokens.space.xl`.
  - space under the tab labels was `insets.bottom + 20` → now `Math.max(insets.bottom, 12)` (floor keeps the labels off the edge on SE / the iPad compat window, where the inset is 0).
  - rotorua-guide has identical code for both — not changed there.

### Prerequisites the above depend on
- [x] **Category enum** — nine ids in `lib/models.ts`, matching the data. Done 2026-09-28.
- [x] **Marker icon + colour per category** — `components/map/SiteMarker.tsx`. Seven from the design palette, Attractions `#A0369A` and Culture `#7C2D12` chosen by measurement, Stay darkened to `#5E4331` (the palette's `#8A6448` matched `other`'s lightness). All ≥3.84:1 on the white circle; weakest pair dE 20.2. Done 2026-09-28.
- [x] **Api service-account case for `southislandguide`** — deployed 2026-09-30 (`1901c9f`, version `a691deb2`). Rotorua unaffected (90 places before and after). Verified on device: trip create, add to trip, post review, admin save.

### Sign-in
- [ ] **Apple Sign In: "Sign Up Not Completed"** — the Apple sheet opens (so the entitlement is in the build) but Apple refuses the sign-up. Shown by iOS, so it's the App ID config at Apple, not app/api code. Likely fix: developer.apple.com → Identifiers → `app.blacksands.southislandguide` → Sign In with Apple → Edit → group with `app.blacksands.rtrguide` as primary (also required for the api's Apple key to store/revoke this app's tokens). Temporary `[apple-signin]` console logs in `components/auth/SocialSignInButtons.tsx` — remove once working.
- [~] **Google web client ID** — was the iOS client. Real one read from the Firebase Google provider config: `317359472880-e6b6ncp7fjpjmbradr7am1kumbnjgrts…`. Fixed in local `.env` 2026-09-30. **Still to do:** the EAS `development` + `production` env vars.
- [~] **Apple revocation — launch blocker.** Code done 2026-09-30: `userService.deleteAccount()` now calls `DELETE /v1/southislandguide/account` (server revokes, then deletes the user); registry `appleSignIn.clientId` set to `app.blacksands.southislandguide`. **Untestable until Apple sign-in works** — then: sign in with Apple (tail shows `POST …/auth/apple/link - Ok`), delete the account (tail shows `DELETE …/account - Ok`, no "apple revoke skipped").

### Housekeeping
- [x] **Hand-entered test docs** `Aw1z3nHmSHxB2o4zNyR0` and `DXWpQTSPRQQKPt7SIcVi` — deactivated (`active: false`), so they're out of every listing. Still in Firestore; delete when convenient.
- [ ] **Commit.** One commit so far (`27615b4`, the scaffold); ~38 files changed since — categories, filters, detail page, images, scripts, rules, indexes, TASKS.
- [ ] **EAS `production` environment** needs the same env vars as `development` (the 8 `EXPO_PUBLIC_*` plus `GOOGLE_SERVICES_FILE`), or the first TestFlight build fails the way the first dev build did.
- [x] **Testing** — `npm test` runs jest 29 with the `jest-expo` preset (57.0.4, pinned to match react-native 0.86.2) and `@testing-library/react-native` 14, set up as rotorua-guide's (`jest.config.js`, `test/uiKitMock.tsx`, `__mocks__/lucide-react-native.js`, `"types": ["jest"]` in tsconfig). 2026-09-30: 38 suites, 406 tests — 388 passing, 18 `test.todo`. The todos are parked bugs (reviews title/report/block/guest/offline, login bouncing guests, account zero counts, raw Firebase error text, the two known tab-reuse bugs), 1.3 template cases, and one inherited from rotorua's NoteCard test; each bug names its file:line.
- [ ] **CI for tests** — no remote yet, so nothing to wire up. Once there is one, copy rotorua-guide's `test` job from `.github/workflows/cicd.yml` (`npm ci` then `npm test -- --ci`, after `typecheck`).
- [x] **Guide section bodies** — all 13 written and in `lib/guideContent.ts` (2026-09-29), 206–461 words each, 25 subheadings. Checked against the guide screen's heading rule before writing. The writer's "FACTS TO DOUBLE-CHECK" list wasn't pasted back — worth reviewing it for the safety sections.

---

## Later

### 1.1 — drive times and multi-day
- The transit matrix is `{}` today, so every leg defaults to 1 slot (30 min). Generate it with a port of `rotorua-guide/scripts/generate-transit-matrix.js`.
- **`durationToSlots()` caps at 4 slots (2 hours).** Fine for Christchurch; wrong the moment places are hours apart — Queenstown → Christchurch is ~12 slots. Uncap it before 1.2.
- **Distance Matrix cost is N².** 53 places ≈ 1,400 pairs ≈ $7. The whole island is ~$1,000+ without regional clustering (exact pairs within a region, hub-to-hub between regions).
- Day grid is 8am–10pm (28 slots); a long drive can eat most of a day. Start by rendering it as one tall transit block and see if that's usable before building anything structural.

### 1.4 — Commerce
- **Every place in `assets/data/christchurch_places_all.json` has `premium: true`.** It was deliberately NOT written to Firestore: enginev1/api's locations route (`routes/locations.ts:85`) strips any `isPremium` doc to a teaser for callers without an unlock, and that check is **not** gated on the app having commerce configured — so for this app it would blank every description, or 503 the whole list. When IAP lands, choose the premium set deliberately; all-premium means nothing is free.
- Swap the two stubs for rotorua-guide's real files: `lib/hooks/useEntitlementGate.ts`, `lib/iap/PurchaseProvider.tsx`. See their `ponytail:` comments.
- Firestore rules: flip `locations` to deny client reads — only AFTER the api reads with the service account. Order is in the comment in `firestore.rules`.

---

## Tooling

- **Load places:** `scripts/upload-places.js` — dry run by default, `--apply` to write. Doc id = slug, so re-runs overwrite rather than duplicate. Refuses a key for any project other than `southislandguide`. Credentials via `GOOGLE_APPLICATION_CREDENTIALS` (the key stays in `enginev1/api/scripts/`, not copied here).
- **Admin fields:** the registry's `locationFields` for this app now match the JSON (14 fields, 9 categories, 10 regions, price incl. `Free`, image fields). Previous 8-field value is in the 2026-09-28 session log if a rollback is ever needed. `isPremium` is deliberately absent — ticking it would blank the place (see Commerce).
- **Firestore:** `firestore.rules` and `firestore.indexes.json` are in the repo; deploy with `npx firebase deploy --only firestore`.
