# Launch plan: South Island Guide, the whole island, with the unlock

Written 2026-10-16. Replaces the staged release plan in `TASKS.md` (1.0 Christchurch, 1.1 drive times, 1.2 the full list, 1.4 in-app purchase).

## The decision (owner, 2026-10-16)

One launch, finished and ready to promote: every area of the South Island, all its content, and the paid unlock, all at once. No thin first release, no "it used to be free". The early-adopter grant planned on 2026-10-13 is no longer needed for the public; see question 5 for testers.

**Who does what:** *You* is the owner (content, Apple, store, money). *Me* is code, scripts, tests. Sizes for code are as in the other plans: small is one file and its test, medium one screen, large several.

## Questions for you first

Each blocks a workstream below; each has my recommended answer.

1. **Which places are premium?** Recommended: **each town's top 5 featured places free, everything else premium.** Every town shows real value to a free user, and the rest is the reason to buy. One rule, worked out from `featured`, so new towns follow it without hand-picking. (Alternatives: by category; by hand.)
2. **What can a free user do in the planner?** Recommended: **one trip of up to 3 days, built from free places; seeing the trip view, drives and town pictures free; more trips, longer trips, reordering, moving drives and Add Day with the unlock.** Close to Rotorua's free tier, but the trip view stays free because it sells the planner.
3. **One unlock or regional packs?** Recommended: **one unlock, "Full South Island"** (Rotorua's `full_guide_unlock` model). Packs can come later; going from packs back to one unlock is the hard direction.
4. **Price.** Yours. Rotorua's is a reference point.
5. **Testers who already have accounts.** Recommended: **grant the unlock to their accounts by hand** (a few Firestore writes, `apps/southislandguide/entitlements/{uid}`), not a script over every account.
6. **Tour stops and the review moment.** Recommended in workstream C below; change freely.

## Workstreams

### A. Content (you; me for scripts)

| # | What | Who | Notes |
|---|---|---|---|
| A1 | Every area's places, with `area` and `region` on each | You | Import with `scripts/upload-places.js`. The api's 300-place cap is fixed (2026-10-15). |
| A2 | Area labels for names capitals can't make (Wānaka, Ōamaru…) | Me, small | One line each in `lib/areas.ts`. |
| A3 | Photos for places | You | A bulk upload-and-attach script is worth writing first (`TASKS.md`). Me, medium, if you want it. |
| A4 | One photo per town | You | Into `C:\Users\User\Pictures\southisland\areas\`, named by area id; I wire them up (`lib/areaPhotos.ts`). |
| A5 | Opening hours and facts checked | You | 25 of the first 51 non-Christchurch places were medium confidence. |
| A6 | Guide: five sections per region | You | The guide screen shows a region once it has sections. |
| A7 | Suggested itineraries across the island | You (content), me (baking) | Fix "Christchurch in a Day" first: Quake City and Central City Street Art are no longer live. Multi-region templates need the drive times (B). |

### B. Drive times (me; your maps key)

| # | What | Size | Notes |
|---|---|---|---|
| B1 | Area-to-area matrix script | small | One time per pair of town centres, from a maps service; writes `assets/data/area-drive-minutes.json`, read by `lib/areas.ts`. Every pair must have a time (the test enforces it). |
| B2 | In-area matrices, one file per area | medium | `assets/data/transit/<area>.json`, only pairs within that area. Re-run one area at a time. Not a whole-island table. |
| B3 | Free fallback for in-area hops | small | Straight-line distance at town speed, rounded up to the half hour, minimum 30. Covers new places until their area is re-run. Replaces the flat 30 minutes. |
| B4 | Scaling by position between areas | small | Area time × (place-to-place ÷ centre-to-centre), floor 30 minutes. Handles places near the edge of a town, in the direction of travel. |
| B5 | Extra minutes for dead-end spurs | medium | One optional number per place; needs a new place field, the admin input, and the api's field list. Only for places that still read wrong after B4. |
| B6 | Long hops inside a town drawn as drives | small | A hop of an hour or more (Te Anau to Milford) gets the drive block, not the small connector. |

Cost: B1 is a few hundred lookups. B2 grows with each town's size squared: a 40-place town is 1,600. Check current maps pricing before running it island-wide.

### C. App (me)

| # | What | Size | Notes |
|---|---|---|---|
| C1 | The unlock: swap the stand-ins for Rotorua's real `useEntitlementGate` and `PurchaseProvider`, add `expo-iap` | medium | Native package: needs a new EAS build. |
| C2 | Free tier rules (question 2) | medium | The gated branches are already in the screens; this sets which ones are on. |
| C3 | Paywall and locked place card | medium | Ported from Rotorua; reworded. |
| C4 | Opening tour | medium | Rotorua's spotlight engine (`lib/tour/`), new steps: Explore's town sheet; adding a place to a trip; the Trip and Days switch; dragging a stop or a drive; swiping between days. Starts once, after sign-in. |
| C5 | Review prompt | small | `expo-store-review`, already installed. Asked once a trip first has three or more places, not on an app-open count. Apple limits how often it shows. |
| C6 | Map chips and Saved places by main category | small | Only if you want them to match Explore. |
| C7 | Town on the place page, and on Add to Trip's day buttons | small each | From the sweep; nice for a whole island. |
| C8 | Size and speed with the full list | measure | Load time and data use on a phone after A1. If it hurts: places stay fresh longer before a re-check. Loading by area only if that isn't enough. |

### D. Api (me; deploys on your go)

| # | What | Size |
|---|---|---|
| D1 | Keep `area` on locked places: add `"area"` to `TEASER_FIELDS` in `enginev1/api/src/routes/locations.ts` | small. **Must be live before any place is premium**, or locked places lose their town, drive times and trip-view towns. |
| D2 | South Island's storefront in the app registry, and the webhook URL | small. Rotorua's `scripts` has the registry script to follow. |

### E. Store, accounts and setup (mostly you)

| # | What | Notes |
|---|---|---|
| E1 | App icon and splash | Still placeholders. |
| E2 | Apple Sign In | Blocked on Apple's side. If Google sign-in ships without Apple, App Review rejects it. |
| E3 | Account deletion with Apple revocation | Code done; untestable until E2 works. |
| E4 | EAS production environment variables | Same as `development`. |
| E5 | Sentry organisation | `app.config.ts` still has `REPLACE_ME_SENTRY_ORG`. |
| E6 | Firestore rules for reports and blocks deployed | Not known whether they are live. |
| E7 | The listing | Rotorua's `docs/launch-checklist.md` section C, adapted: IAP product, privacy labels, privacy and terms URLs, screenshots, description, age rating, review notes with a demo account. |

## Rotorua's IAP lessons, as checks

From Rotorua's rejections and fixes (`rotorua-guide/TASKS.md`, 2026-09):

- [ ] The paid apps agreement is **Active**. If it lapses or goes pending, StoreKit returns no products for every app on the account, and the reviewer sees an error on the paywall (2.1(b)).
- [ ] The IAP product is complete (**Ready to Submit**, review screenshot included) and **attached to the version** on the version page. A first IAP goes in with an app version.
- [ ] Screenshots at **1320 × 2868** (6.9"). 828 × 1792 was rejected outright.
- [ ] Purchase tested in the sandbox **on a device**, with an Apple ID that has never bought it. An Apple ID that already owns the product gets no purchase sheet at all, which looks like a dead button.
- [ ] Restore Purchases works after a reinstall and on a second device.
- [ ] The "linked to another account" message can't appear on the paywall for the reviewer's demo account.
- [ ] Privacy labels match reality, with no tracking declared unless there's an ATT prompt (5.1.2(i)).
- [ ] Every screen with a main action works at 375 × 667 (Guideline 4: Rotorua's rejection).
- [ ] After approval, the production App Store Server API answers (Rotorua's probe script) before promoting.

## Order

1. **Now, in parallel:** A1 (import) with A2; B1 to B3 (once your maps key is ready); D1 (deploy before any place is flagged premium).
2. **Then:** C1 to C3 and D2 on a branch, with a new EAS build; C4 and C5.
3. **Content fills in while code runs:** A3 to A7.
4. **Flag premium places** (question 1) only after D1 and D2 are live and the real unlock code is in a build.
5. **E and the IAP checks**, TestFlight, then submit.

## Already done (2026-10-14 to 16)

Trip view with towns and town pictures; Trip and Days switch; movable drives (api deployed); long-trip navigation (open on today, tabs follow, swipe, 60 days); Explore by town with the region sheet; map opens on the nearest town; offline copy kept two weeks; the api's 300-place cap.
