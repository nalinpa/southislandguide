# App Store search result asset — design (short)

Status: draft for owner approval, 2026-11-21. Nothing built.

## Why

Someone searching "NZ road trip" sees our row in App Store search before anything else. Today
search shows the first three portrait screenshots at thumbnail size: the "Places. Trips. Guides."
poster and two teal phone shots, none readable. Apple now lets an app set a separate **search
result asset** (App Store Connect → Creative assets, live Oct 2026) that replaces those three
in search. Apple's advice: make the purpose obvious at a glance, show the real app.

Who it's for (owner): someone looking to plan or get ideas for a trip to NZ, early in planning.
Their question: "where do I start?"

## Goals / non-goals

- Goal: one landscape image that answers "where do I start?" in under a second.
- Non-goal: changing the screenshot set (order locked, 2026-11-12) or the portrait poster. Both stay.
- Non-goal: search ranking (only name, subtitle and keywords count).
- Anti-goal: small text nobody can read at search size.

## Approaches

- **A. Photo + headline + day chips + kiwi sign** — picked by owner.
- B. Photo + phone showing suggested trips — repeats frame 4, loses the sign.
- C. Photo + chips only — generic, no brand.

Adapted to the landscape asset (owner chose the separate asset over editing the poster).

## Design

```
┌──────────────────────────────────────────────┐
│                                   ┌────────┐ │
│  Plan your dream trip to          │ phone: │ │
│  New Zealand                      │ ready- │ │
│                                   │ made   │ │
│  [7] [10] [14] [21] days          │ trips  │ │
│                                   └────────┘ │
│        (road photo backdrop, as poster)      │
└──────────────────────────────────────────────┘
```

- Headline (owner, 2026-11-21): **"Plan your dream trip to New Zealand"**. "New Zealand" in
  yellow on its own line, the rest white, Bahnschrift as the set.
- No "South Island" on the asset (owner, 2026-11-21). Claude flagged Apple rule 2.3 (accurate
  metadata) and the risk of 1-star reviews from North Island planners; owner's call stands. Scope
  stays visible in the subtitle/description and screenshots 2–8.
- Day chips 7 / 10 / 14 / 21 + "days": large, readable at search size.
- Backdrop: `store/screenshots/source/road-towards-mount-cook-5184x2916.jpg`, darkened behind text
  as the poster.
- A phone on the right instead of the big kiwi sign: the app icon (the sign) sits right beside the
  asset in search, and Apple says to show the real app. Screen: `source/trip-days-capture-1320x2868.png`
  (owner picked it over suggested trips on 2026-11-21: that screen listed 2–6 day trips and said "South Island").
- Type style (owner, 2026-11-21): all the words as an old airport departures board. Each word sits
  on its own split-flap board, one flap per letter, in capitals: "PLAN YOUR" / "DREAM TRIP TO" (white,
  two rows), "NEW ZEALAND" (yellow, bigger flaps), "7/10/14/21 DAYS" (white, slashes on their own flaps). The boards sit below the peak so
  Aoraki / Mount Cook stays in view. This replaces the plain headline and the teal day chips.
- Judges round 1 (owner's picks): phone 25% bigger, running off the bottom edge so the day cards read at
  search size; top line 1.4× bigger, split over two rows to fit beside the phone. The judges' "7–21 day road
  trips" wording was turned down; the slashes stay.
- Round 3 (owner): photo lifted about 0.3 stops; "NEW ZEALAND" on one board with a blank flap for the
  space; phone as big as fits whole (tab bar in view), after judges flagged the cropped device.

## Specs

- 3840 × 2560 PNG (3:2), no alpha channel. Confirm sizes on Apple's
  [Creative assets specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/creative-assets-specifications/)
  page before upload; most numbers came from third-party write-ups.

## Left to the builder

- New `store/screenshots/search/build.js` from `ipad/build.js` (same resvg render, font, `framed`,
  `rgbPng`). Output: `.svg` master + `.png` beside it.
- Exact layout, chip styling, shadow. Owner reviews the render before anything else; upload to
  App Store Connect is the owner's.
