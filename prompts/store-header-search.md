# Store: the "Header and Search Results" image

Make the App Store's new header and search results image for Kiwi Guide 1.0.0. Work in rounds: show concepts, wait for the owner's pick, then export the final images.

Repo: south-island (Expo / React Native, iOS only). App name "Kiwi Guide"; internal ids stay "southislandguide".

## What App Store Connect asks for

The asset goes in App Store Connect > the app > Product Page > **Header and Search Results**, next to App Previews and Screenshots. One asset can fill both places: the top of the product page and the app's row in search results.

The upload box says: "Drag and drop to add assets or choose from your Asset Library. Supported sizes include 5244 × 2950px, 3840 × 2560px and 1920 × 1280px. Explore templates".
- 5244 × 2950 is about 16:9. The other two are 3:2.
- The page doesn't say which size goes where, or what Apple lays over the image: the app icon, the name and the Get button on the product page, and the crop in search results.
- Get those from Apple, not from ASO blogs. The **Explore templates** link on that tab is the first place to look. If you can't open it, ask the owner to download the template into the scratchpad. Don't design until you know where the safe areas are.

Third-party write-ups (not Apple; check each claim against the template):
- An approved asset goes live from the Asset Library without an app review, so it can change after launch without a new version.
- Creative assets have to suit a 4+ rating.
- A video is allowed, and plays muted in search. Still image only for launch: no video.

## The brand

These come from the final icon and splash, chosen 2026-10-30:
- Tile and splash background: brand teal `#095C65`. It's also the app's accent (`lib/ui/tokens.ts`).
- Road-sign diamond: yellow `#FFC20E`.
- Kiwi: black `#0B0B0B`.
- The splash has the sign with a black border line inside its yellow edge, and "Kiwi Guide" below it in white Bahnschrift SemiBold.
- The sign artwork is in `assets/icon-mark.svg` (no tile) and `assets/icon.svg` (with the tile). Use it as it is. Don't redraw the kiwi or recolour it.
- The app's one warm colour is `#C2410C` (`highlight` in the tokens). Use it sparingly, if at all.

## Words on the image

Optional, and kept short. If there's a line, it describes only what version 1.0.0 does:
- places to go across the South Island, on a map
- suggested trips ("South Island in 7, 10, 14 or 21 days")
- making your own trip
- the guide sections
- reviews
- the photo share card

Never:
- offline maps, or "works without signal"
- the North Island, or "coming soon"
- prices, "free", or awards
- "Itinerary" or "Plan(s)" (it's Trip/Trips), or "Location" for a place

## Photos

The image is an advert, and there's nowhere on it to credit a photographer. So use only photos whose licence allows commercial use with no credit:
- Pexels
- Wikimedia Commons files marked CC0 or public domain
- the owner's own photos, if they offer some

`docs/photo-sources.md` sets out each library's terms. Tourism NZ, Great South, DOC and the other Brandkit libraries all need a credit, so they're out.

The app's copies in `C:\Users\User\Pictures\southisland\<area>\resized\full\` are made for phone screens, and are likely too small even for 1920 × 1280. Check the width, then get the original from the photo's source page.

Record every photo you use, with its source URL and licence, in a new short "Store listing" section at the end of `docs/photo-sources.md`.

## Hard rules

- Don't commit, push or deploy. Don't upload anything to App Store Connect: the owner does that.
- Change nothing in the app: no code, no `app.config.ts`, nothing under `assets/`.
- Draft in the session scratchpad. Install image tools (sharp, resvg) there, not in the repo.
- Use PowerShell for npx/npm. Git Bash on this machine can't find node.
- After each round, stop. Show the preview page and wait for the owner's go. Answering your questions isn't a go.

## Round 1: concepts

Make three concepts that look clearly different. Ways in, to start from:
- a South Island landscape with the sign
- the sign big on brand teal, with the app's map or a trip on a phone beside it
- a road through the landscape, with the sign as a road sign

For each concept, show it:
- at full size, with Apple's overlays from the template drawn on top
- cropped and shrunk to how it sits in a search result
- on a light and a dark App Store page
- in both the 16:9 and the 3:2 shape, if the two places use different shapes

Put all three on one preview page, published as an artifact. Then stop.

## Round 2: final

Build the concept the owner picks, with the changes they ask for, then:
- Export at the largest supported size the photo's resolution allows, in each shape the template needs.
- Save as PNG, sRGB, no transparency.
- Keep the master SVG or source file.
- Save everything in `store/header/` at the repo root. The app never imports that folder.
- Check each file's pixel size with sharp, and report it.
- Then stop, with:
  - the file list
  - the photo credits you added
  - anything the owner has to check in App Store Connect when they upload
