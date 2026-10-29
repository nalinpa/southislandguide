# Launch plan: South Island Guide, the whole island

Written 2026-10-16. Replaces the staged release plan in `TASKS.md` (1.0 Christchurch, 1.1 drive times, 1.2 the full list, 1.4 in-app purchase).

**Updated 2026-10-20: the launch is free.** The owner decided on 2026-10-19 that the app launches with no paid unlock. Everything about the unlock (decisions 1–5, C1–C3, D1, D2, the IAP part of the listing, and Rotorua's IAP checks) has moved to [After launch: the paid unlock](#after-launch-the-paid-unlock) at the end, unchanged, for when it comes back.

## The decision (owner, 2026-10-16; free since 2026-10-19)

One launch, finished and ready to promote: every area of the South Island and all its content, at once. No thin first release. Everything is free at launch; the paid unlock comes after.

**Who does what:** *You* is the owner (content, Apple, store, money). *Me* is code, scripts, tests. Sizes for code are as in the other plans: small is one file and its test, medium one screen, large several.

## Decisions

| Question | Decision |
|---|---|
| Paid unlock at launch | **No: free at launch** (owner, 2026-10-19). The unlock's own decisions (1–5) are in [After launch](#after-launch-the-paid-unlock). |
| 6. Tour stops and the review moment | **Done.** Worked through together: the opening tour (2026-10-20, `docs/plans/opening-tour.md`) and the review prompt (2026-10-19, `docs/plans/review-prompt.md`). |

## Workstreams

### A. Content (you; me for scripts)

| # | What | Who | Notes |
|---|---|---|---|
| A1 | Every area's places, with `area` and `region` on each | You | Import with `scripts/upload-places.js`. The api's 300-place cap is fixed (2026-10-15). |
| A2 | Area labels for names capitals can't make (Wānaka, Ōamaru…) | Me, small | One line each in `lib/areas.ts`. |
| A3 | Photos for places | You | **Done 2026-10-29:** 313 place photos with credits, and type photos for 186 Food and Stay places (`TASKS.md`). |
| A4 | One photo per town | You | Into `C:\Users\User\Pictures\southisland\areas\`, named by area id; I wire them up (`lib/areaPhotos.ts`). |
| A5 | Opening hours and facts checked | You | **Done 2026-10-29:** ten rounds, a final pass and your hand check of 450 items; all 558 places match live. |
| A6 | Guide: five sections per region | You | **Done 2026-10-21:** every region, 58 sections. Device check and a few open questions left (`TASKS.md`). |
| A7 | Suggested itineraries across the island | You (content), me (baking) | **Done 2026-10-22:** 21 trips from Christchurch, Queenstown and Picton, picked by start town. Device check left (`TASKS.md`). |

### B. Drive times (me; your maps key)

**B1 to B3 built 2026-10-16** (`scripts/generate-drive-times.js`, tested against a fake maps service) **and run.** As of 2026-10-20: in-town times (B2) for 36 towns in `assets/data/transit/`, and town-to-town times (B1) for 25 towns (300 pairs) in `assets/data/area-drive-minutes.json`. The remaining town pairs come from one `areas --apply` once every town is in (owner's call).

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
| C1–C3 | The unlock, free tier rules, paywall | | Moved to [After launch](#after-launch-the-paid-unlock). |
| C4 | Opening tour | medium | **Done 2026-10-20** (`lib/tour/`, plan in `docs/plans/opening-tour.md`). |
| C5 | Review prompt | small | **Done 2026-10-19.** Asked on the first trip and on the fifth app open (owner's choice, `docs/plans/review-prompt.md`), not on a trip's third place as first planned. |
| C6 | Map chips and Saved places by main category | small | Only if you want them to match Explore. |
| C7 | Town on the place page, and on Add to Trip's day buttons | small each | From the sweep; nice for a whole island. The day buttons are in fix-27 (`prompts/`); the place page still shows no town. |
| C8 | Size and speed with the full list | measure | Load time and data use on a phone after A1. If it hurts: places stay fresh longer before a re-check. Loading by area only if that isn't enough. |

### D. Api (me; deploys on your go)

D1 and D2 were for the unlock and have moved to [After launch](#after-launch-the-paid-unlock). The one api change the launch needs is the account-deletion fix (`TASKS.md`, Sign-in, found 2026-10-20).

### E. Store, accounts and setup (mostly you)

| # | What | Notes |
|---|---|---|
| E1 | App icon and splash | **Done 2026-10-20** (`TASKS.md`). |
| E2 | Apple Sign In | **Decided 2026-10-25 (owner): not in the first release, and Google neither.** Apple's server still answered `invalid_client` for the App ID that day (Rotorua's: `invalid_request`), a fault only Apple can repair, and App Review rejects Google sign-in without an equal privacy-minded option. The first release signs in by email only, which the login screen already does (`61a18ac`). Bringing both back: [After launch: Apple and Google sign-in](#after-launch-apple-and-google-sign-in). |
| E3 | Account deletion with Apple revocation | Not needed for the first release: with no Apple sign-in there is no token to revoke. Code done; tested with the sign-in's return (after launch). |
| E4 | EAS production environment variables | **Done 2026-10-30**: all twelve, including the Sentry DSN and auth token. |
| E5 | Sentry | **Done 2026-10-30**: org `patel-td`, project `kiwi-guide`, version 1.0.0 (`TASKS.md`). |
| E6 | Firestore rules for reports and blocks deployed | **Done**: the console's rules matched `firestore.rules` exactly on 2026-10-30. |
| E7 | The listing | Rotorua's `docs/launch-checklist.md` section C, adapted: privacy labels, privacy and terms URLs, screenshots, description, age rating, review notes with a demo account. (The IAP product moved to After launch.) |

## Rotorua's review lessons, as checks

From Rotorua's rejections and fixes (`rotorua-guide/TASKS.md`, 2026-09). These three apply to any launch; the IAP-only ones are in [After launch](#after-launch-the-paid-unlock).

- [ ] Screenshots at **1320 × 2868** (6.9"). 828 × 1792 was rejected outright.
- [ ] Privacy labels match reality, with no tracking declared unless there's an ATT prompt (5.1.2(i)).
- [ ] Every screen with a main action works at 375 × 667 (Guideline 4: Rotorua's rejection).

## Order

Recommended 2026-10-16, brought up to date 2026-10-20. Content (A) is the long pole and is mostly yours, so it runs alongside everything else; the code is ordered by risk.

1. ~~**Push.**~~ Done 2026-10-25: all thirteen enginev1 repos and south-island.
2. ~~**B1 to B3, drive times.**~~ Done, and since 2026-10-22 town-to-town times cover all 41 towns, from hubs you picked, with far-out places timed on their own (fix-32).
3. ~~**A1 (you): import areas.**~~ 41 towns in by 2026-10-22, Queenstown, Arrowtown and Glenorchy last.
4. ~~**Account deletion (D).**~~ Fixed and deployed 2026-10-23 (fix-25). Its phone check goes with step 7.
5. ~~**The UX sweep prompts.**~~ All in (2026-10-20). Their device checks go with step 7.
6. ~~**A7, suggested itineraries.**~~ 21 trips (2026-10-22).
6a. **Before the build (added 2026-10-29):**
    - Done 2026-10-30: the place-list cache (api live 2026-10-29; the app half reaches phones with the build), the version to 1.0.0, Sentry, the EAS production variables, the rename to Kiwi Guide, and the Firestore rules (E6, already live).
    - All in `TASKS.md`.
7. **One EAS build, then every device check** in `TASKS.md`, size and speed with the full list (C8), and a look at the drives: **B4 to B6** only for places that read wrong. A production build on TestFlight covers all of them; a dev build can't check speed or opening offline.
8. ~~**C4 tour and C5 review prompt**~~ Done (2026-10-20 and 2026-10-19).
9. **E, the store checklist and Rotorua's review checks, TestFlight, submit.** Screenshots after the sweep's wording (fix-24) and the photos are in. E2 is decided: email sign-in only (2026-10-25).

## Already done

2026-10-14 to 16: trip view with towns and town pictures; Trip and Days switch; movable drives (api deployed); long-trip navigation (open on today, tabs follow, swipe, 60 days); Explore by town with the region sheet; map opens on the nearest town; offline copy kept two weeks; the api's 300-place cap.

2026-10-19 to 20: the review prompt (C5) and the opening tour (C4).

By 2026-10-20: places and in-town drive times for 36 towns; the first UX sweep (fix-1 to fix-15); the app icon and splash (E1).

2026-10-20 to 22: the second UX sweep (fix-16 to fix-31); the guide for every region (A6); Queenstown, Arrowtown and Glenorchy (A1 complete at 41 towns); town hubs, town-to-town times for every pair, and far-out places' own times (fix-32); 21 suggested trips with a start-town picker (A7).

## After launch: Apple and Google sign-in

Left out of the first release (owner, 2026-10-25; E2). The buttons (`components/auth/SocialSignInButtons.tsx`) and `lib/auth` are untouched, and `usesAppleSignIn` stays in `app.config.ts` so builds keep the capability.

1. **Wait for Apple.** GET `https://appleid.apple.com/auth/authorize?client_id=app.blacksands.southislandguide`: `invalid_client` means still broken; `invalid_request` (what Rotorua's App ID gets) means Apple knows the app. Feedback FB25131402 and forum thread 837986 are already filed; nothing more to chase.
2. **Test on the phone:** a fresh Apple sign-up, a sign-in, then account deletion with the token revoked (E3: the api log shows `POST …/auth/apple/link - Ok`, then `DELETE …/account - Ok` with no "apple revoke skipped"). Google sign-in too, with the EAS web client ID set (TASKS.md, Sign-in).
3. **Ship both together**, never Google alone (App Store guideline 4.8): render `<SocialSignInButtons>` above the email button on the login screen again (`app/(auth)/login.tsx` says where), in a new store version rather than an over-the-air update, since it changes how people sign in.
4. Update the privacy labels and the review notes for the two new sign-ins.

## After launch: the paid unlock

Moved here 2026-10-20 from the sections above, unchanged: the launch is free (owner, 2026-10-19). Picks up from here if the unlock comes back.

### Its decisions (owner, 2026-10-16)

| Question | Decision |
|---|---|
| 1. Which places are premium | Roughly: each town's top few featured places free, the rest premium. **Christchurch may be free entirely.** To settle before places are flagged. |
| 2. What a free user can do in the planner | **As Rotorua: free users can use the suggested itineraries but not change them.** Building or editing a trip is the unlock. So the suggested itineraries are the free product: they need to exist across the island (A7), and to be useful without the unlock their stops should be free places or read well when locked. |
| 3. One unlock or packs | **One full unlock for now.** |
| 4. Price | **About US$20.** |
| 5. Testers with accounts | **Unlocked by hand.** |

Turning the unlock on after a free launch means people who used the app free would lose features. Decide how to treat them first (the 2026-10-13 plan was an early-adopter grant to existing accounts).

### Its work

| # | What | Size | Notes |
|---|---|---|---|
| C1 | The unlock: swap the stand-ins for Rotorua's real `useEntitlementGate` and `PurchaseProvider`, add `expo-iap` | medium | Native package: needs a new EAS build. |
| C2 | Free tier rules (decision 2) | medium | Free users open suggested itineraries but can't add, remove, move or retime stops, add days or make their own trips. The gated branches are already in the screens (Rotorua's model); this switches them on and checks every edit path. |
| C3 | Paywall and locked place card | medium | Ported from Rotorua; reworded. |
| D1 | Keep `area` on locked places: add `"area"` to `TEASER_FIELDS` in `enginev1/api/src/routes/locations.ts` | small | **Must be live before any place is premium**, or locked places lose their town, drive times and trip-view towns. |
| D2 | South Island's storefront in the app registry, and the webhook URL | small | Rotorua's `scripts` has the registry script to follow. |
| E7 | The IAP product in the listing | | At about US$20, with its review screenshot. |

Order, as planned 2026-10-16: D1 first (harmless, must precede any premium flag); then C1 to C3 and D2 on a branch with a new EAS build, into TestFlight's sandbox early (the riskiest part, given Rotorua's review history), with the paid apps agreement, the IAP product and its screenshot in parallel; then decide question 1 and flag premium places.

### Rotorua's IAP lessons, as checks

- [ ] The paid apps agreement is **Active**. If it lapses or goes pending, StoreKit returns no products for every app on the account, and the reviewer sees an error on the paywall (2.1(b)).
- [ ] The IAP product is complete (**Ready to Submit**, review screenshot included) and **attached to the version** on the version page. A first IAP goes in with an app version.
- [ ] Purchase tested in the sandbox **on a device**, with an Apple ID that has never bought it. An Apple ID that already owns the product gets no purchase sheet at all, which looks like a dead button.
- [ ] Restore Purchases works after a reinstall and on a second device.
- [ ] The "linked to another account" message can't appear on the paywall for the reviewer's demo account.
- [ ] After approval, the production App Store Server API answers (Rotorua's probe script) before promoting.
