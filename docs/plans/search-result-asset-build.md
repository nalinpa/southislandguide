# Search Result Asset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One landscape App Store search result image, 3840 × 2560 RGB PNG: road photo, "Plan your dream trip to / New Zealand", 7/10/14/21-day chips, a phone showing ready-made trips.

**Architecture:** A new one-frame build script, `store/screenshots/search/build.js`, copied from `store/screenshots/ipad/build.js` (same resvg render, Bahnschrift SemiBold, `caption`, `framed`, `rgbPng`, data-URI inlining). It writes an `.svg` master and a `.png` beside itself.

**Tech Stack:** Node, `@resvg/resvg-js@2.6.2` in a scratch folder (not an app dependency), Bahnschrift SemiBold instance. Setup is in the header of `store/screenshots/duo/build.js`.

**Spec:** [docs/plans/search-result-asset.md](search-result-asset.md)

## Global Constraints

- Canvas 3840 × 2560 (3:2). PNG, 8-bit RGB, no alpha channel.
- Headline copy exactly: line 1 `Plan your dream trip to` (white), line 2 `New Zealand` (yellow `#FFC20E`).
- No "South Island" anywhere on the image (owner, 2026-11-21).
- Chips exactly `7`, `10`, `14`, `21`, followed by `days`.
- Phone shows `store/screenshots/source/trip-days-capture-1320x2868.png` (owner, 2026-11-21). No kiwi sign and no "Kiwi Guide" plate: the app icon sits beside the asset in search.
- Backdrop `store/screenshots/source/road-towards-mount-cook-5184x2916.jpg`. Keep the credit in the SVG comment: `Photo: "Road towards Mount Cook", Jean-Pierre Brungs, CC0, Wikimedia Commons.`
- Colours `TEAL = "#095C65"`, `YELLOW = "#FFC20E"`. Font Bahnschrift weight 600, as the set.
- No new dependency in the app's `package.json`. No change to the existing screenshot files.

## Review Focus

- **Readable at search size:** the row shows the image roughly 390 px wide (about 1/10 scale). Headline glyphs at least 180 px and chip numbers at least 140 px, so both stay readable at that size.
- **White gaps:** `rgbPng` composites on white, so any area the photo doesn't cover renders white. The photo must cover the whole 3840 × 2560.
- **Contrast:** the headline sits over the sky and clouds. Keep the iPad poster's `sky` and `left` darkening gradients and the `tsh` text shadow.
- **Edge safety:** keep the headline, chips and phone at least 160 px from every edge, in case of rounding or cropping in the search row.
- **Alpha:** App Store Connect rejects alpha. The PNG's IHDR colour type must be 2 (RGB).

---

### Task 1: Search result asset build script and render

**Files:**
- Create: `store/screenshots/search/build.js`
- Output: `store/screenshots/search/kiwi-guide-search.svg`, `store/screenshots/search/kiwi-guide-search.png`

**Interfaces:**
- Consumes: from `ipad/build.js`, copied into the new file (do not import it): `esc`, `caption(parts, x, y, size, anchor, extra)`, `DEFS`, `framed(href, x, y, w, h, rScreen, bezel)`, `rgbPng(rgba, w, h)`, and the render and inlining loop.
- Produces: `node store/screenshots/search/build.js`, run from the scratch folder holding resvg and `bahnschrift-semibold.ttf`. It writes the two output files.

- [ ] **Step 1: Set up the render folder.** Reuse an existing scratch folder that already has `node_modules/@resvg/resvg-js` and `bahnschrift-semibold.ttf`. If there is none, follow the setup in the header of `duo/build.js`.

- [ ] **Step 2: Write `search/build.js`.**
  - Header comment: what it builds, the size, the spec link, and "setup as in `../duo/build.js`". Add `// ponytail: fourth copy of caption/framed/rgbPng (phone, duo, ipad, search); lift into one shared file if a fifth set comes.`
  - `W = 3840, H = 2560`. Image paths are relative to the script: `../source/road-towards-mount-cook-5184x2916.jpg` and `../source/suggested-trips-capture-1320x2868.png`.
  - Widen the inlining regex so it matches `../source/…`.
  - Layout starting values (tune by eye, keeping the Review Focus limits):
    - **Photo:** cover the canvas. Height 2700, width `round(5184 * 2700 / 2916)` = 4800, at `x = -480, y = -70`. Add the `sky` and `left` gradients from the iPad poster.
    - **Headline:** `start` anchor at x 220. "Plan your dream trip to" at size 190, baseline about 760. At about 0.5 em per glyph it spans roughly 2200 px, ending around x 2420, clear of the phone's left bezel at about 2590. If it hits the phone, shrink it (down to 180) before moving the phone. "New Zealand" at size 300, baseline about 1080. Both with the `tsh` filter.
    - **Chips:** four rounded rects at `rx` 40, filled TEAL with a white stroke at 0.25 opacity, about 300 × 240, gap 40, top about 1400, from x 220. Number centred in white at size 160. Then `days` in white at size 140, after the last chip on the same baseline.
    - **Phone:** `framed(...)` with screen height 2080, width `round(2080 * 1320 / 2868)` = 957, at `x = 3840 - 260 - 957`, `y = 240`, `rScreen = 120`, `bezel = 30`.
  - Output one frame, base name `kiwi-guide-search`. Drop the frame-number argument handling.

- [ ] **Step 3: Render.**
  Run, from the scratch folder: `node <repo>/store/screenshots/search/build.js`
  Expected output: `wrote kiwi-guide-search`

- [ ] **Step 4: Check the PNG header.**
  Run: `node -e "const b=require('fs').readFileSync(process.argv[1]);console.log(b.readUInt32BE(16),b.readUInt32BE(20),b[25])" <repo>/store/screenshots/search/kiwi-guide-search.png`
  Expected: `3840 2560 2`

- [ ] **Step 5: Look at it.** Open the PNG at full size, then mentally at about 390 px wide. Check every Review Focus line: no white edges, headline and chips readable, contrast holds over the clouds, 160 px margins. Adjust the layout values and re-render until all pass.

- [ ] **Step 6: Stop for the owner.** Show the PNG. Do not commit before the owner's go. The owner may still flip the phone back to the kiwi sign.

- [ ] **Step 7: Commit (after the owner's go)**

```bash
git add store/screenshots/search/build.js store/screenshots/search/kiwi-guide-search.svg store/screenshots/search/kiwi-guide-search.png
git commit -m "feat(store): App Store search result asset"
```

Upload to App Store Connect (Creative assets → Search results) is the owner's. Check the size on Apple's spec page first.
