# Store: the iPhone screenshots

Make the App Store screenshots for Kiwi Guide 1.0.0. Work in rounds: the owner takes the raw captures, you show caption styles, wait for the owner's pick, then build and export the full set.

Repo: south-island (Expo / React Native, iOS only). App name "Kiwi Guide"; internal ids stay "southislandguide". iPhone only (`supportsTablet: false`), portrait only, light and dark mode (`userInterfaceStyle: "automatic"`), so no iPad screenshots are needed.

## What App Store Connect asks for

- Get the sizes from Apple's screenshot specifications page (developer.apple.com, App Store Connect Help, "Screenshot specifications"), not from blogs. Check which iPhone display size is required (6.9" or 6.5") and which pixel sizes it accepts. Apple scales the required size down for the smaller iPhones.
- Up to 10 screenshots. The first three matter most: the product page shows them first, and they can show in search when the header and search image doesn't.
- PNG or JPEG, RGB, no transparency.
- Apple's rules from the header work apply here too: no prices, no awards or "#1" claims, no other platforms, and a 4+ rating.

## The raw captures (the owner takes these)

Take them on the iPhone, from a TestFlight or App Store build: no dev gear button, no debug overlays. Light mode first; dark mode only if the round 1 pick uses it. Full-size PNGs straight off the phone, not cropped. Save them in `C:\Users\User\Pictures\southisland\store-shots\raw\`.

| # | Screen | What to show |
|---|---|---|
| 1 | Map tab | Zoomed out to the whole South Island, pins spread across it, no sheet open |
| 2 | Suggested trip | "South Island in 7 Days": the route or stops on the map, or the day list with photos |
| 3 | Your own trip | The Trips tab with a few stops added |
| 4 | Place page | A place with a strong photo. No price in the visible text (admission prices like "$36.50" count) |
| 5 | Guide | One guide section, opened |
| 6 | Reviews | A place with reviews showing |
| 7 | Photo share card | The finished card |
| 8 | Explore | The list with photos, or a search |

No real people's emails or names on screen. A clean status bar helps (full battery, no notifications); 9:41 isn't needed.

Before designing, check each capture. Flag anything that says "Locations", "Plans", "Itinerary" or "South Island Guide", shows a price, shows the dev gear, or has a status bar that needs retaking. List what's usable and what to retake, and wait for the owner.

## The brand

Same as the header image (`prompts/store-header-search.md`):
- Brand teal `#095C65` (`accent` in `lib/ui/tokens.ts`), sign yellow `#FFC20E`, kiwi black `#0B0B0B`. The one warm colour, `#C2410C`, sparingly if at all.
- Headings in Bahnschrift SemiBold, as on the splash.
- The sign: `assets/icon-mark.svg` as is. Don't redraw the kiwi or recolour it.
- The header image went live with the kiwi sign on a roadside post and a teal plate reading "New Zealand / travel planner" (`store/header/`, commit a522eca). The screenshots should look like they belong with it.

## Words on the screenshots

A short caption per screenshot, readable at the size the screenshots show on the product page (check it at that size, not just full size). Each caption describes only what 1.0.0 does:
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
- "Itinerary" or "Plan(s)" (it's Trip/Trips), or "Location" for a place. "Travel planner" is allowed only as on the header plate (owner, 2026-10-30).

The owner chose "New Zealand" on the header plate while 1.0 covers only the South Island. Don't repeat "New Zealand" in the captions without asking: if App Review objects to the header, the captions shouldn't need redoing too.

## Hard rules

- Don't commit, push or deploy. Don't upload anything to App Store Connect: the owner does that.
- Change nothing in the app: no code, no `app.config.ts`, nothing under `assets/`.
- Draft in the session scratchpad. Install image tools (sharp, resvg) there, not in the repo. resvg ignores Bahnschrift's weight axis: cut a static SemiBold with fontTools first, as the header work did.
- Don't draw Apple hardware (iPhone frames from Apple's marketing resources) unless the owner asks. A plain rounded screen with a shadow is enough.
- Use PowerShell for npx/npm. Git Bash on this machine can't find node.
- After each round, stop. Show the preview page and wait for the owner's go. Answering your questions isn't a go.

## Round 1: caption styles

Using captures 1, 2 and 3, make three styles that look clearly different. Ways in, to start from:
- a teal background, the caption above, the screen below
- a landscape photo behind the screen (CC0 or Pexels only, as in `docs/photo-sources.md`'s "Store listing" section), the caption in a teal plate like the header's
- the screen full bleed, the caption in a band across the top

For each style, show the three screenshots:
- at full size
- at the size they show on an iPhone product page, in a row, on a light and a dark App Store page
- next to the header image (`store/header/kiwi-guide-search-3x2-3840x2560.png`), so the owner can see them together

Put all three styles on one preview page, published as an artifact. Then stop.

## Round 2: the full set

Build the style the owner picks, with the changes they ask for, for every usable capture, in the order the owner gives (default: the table above). Then:
- Export at the size Apple requires, as PNG, sRGB, no transparency.
- Keep the master SVG or source file for each.
- Save everything in `store/screenshots/` at the repo root. `.easignore` already keeps `store/` out of EAS builds.
- Check each file's pixel size with sharp, and report it.
- Record any new photo in the "Store listing" section of `docs/photo-sources.md`.
- Then stop, with:
  - the file list, in upload order
  - the caption on each
  - anything the owner has to check in App Store Connect when they upload
