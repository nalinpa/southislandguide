# Kiwi Guide website

Build a small marketing website for Kiwi Guide in a new folder, `C:\Users\User\source\kiwiguide-site` (its own git repo). **Plan first:** show the owner the page outline, the design direction and the file list, and wait for an explicit go before writing the site. Answering your questions isn't a go.

## The app

- **What it is:** Kiwi Guide, a free iPhone app for planning a South Island road trip in New Zealand. No in-app purchases, no ads, iPhone only. It's in App Store review now; the App Store link and app id come when it's approved, so use a clearly marked placeholder.
- **What it does** (check each claim against the app repo, `C:\Users\User\source\south-island`, before using it):
  - over 500 places across about 40 towns, to explore town by town or on a map
  - place pages with photos and reviews
  - 26 suggested trips, including "South Island in 7, 10, 14 and 21 Days" (`lib/itineraryTemplates.ts`)
  - a day-by-day trip planner
  - a travel guide written by locals: driving, weather, safety and each region (`lib/guideContent.ts`)
  - a photo share card
- **Who it's for:** international visitors on a South Island road trip (campervan, rental car, backpackers), and New Zealanders on holiday.
- **App Store subtitle:** "New Zealand road trip planner".

## Brand and assets (in the app repo)

- **Icon:** `assets/icon.png` and `assets/icon.svg` (kiwi sign); `assets/icon-mark.svg`.
- **Colours:** brand teal `#095C65`, black kiwi.
- **App Store screenshots:** `store/screenshots/` (PNG and SVG). Keep their order: poster, map, explore, place, suggested trips, trip days, guide.
- **Header art:** `store/header/` (21:9, 3:2 and 16:9 PNGs), built from `store/header/source/road-towards-mount-cook-5184x2916.jpg` (CC0).
- **Use only these images.** Other photos in the app come from tourism libraries whose licences vary. If you want another photo, ask the owner first. It must be recorded in `docs/photo-sources.md` with a licence that allows it, and credited on the page.

## The site

- **One page to start:** a hero with the download button, what the app does, screenshots, suggested trips, the travel guide, and a final download button. Add more pages only if the plan makes a case for them.
- **Static HTML and CSS,** no framework or build step unless the plan shows a real need. Look at the existing company site (`C:\Users\User\source\blacksands\public`) for how pages are built there, but this site has its own look, made for travellers, not the agency.
- **Download button:** Apple's official "Download on the App Store" badge, following Apple's badge guidelines. Link to the App Store through a campaign link (`?pt=<provider token>&ct=website`) so downloads from the site show up in App Store Connect; the owner supplies the provider token.
- **Smart App Banner:** `<meta name="apple-itunes-app" content="app-id=...">` with the placeholder id.
- **Sharing and search:** title, description, Open Graph and Twitter card tags using the header art; a favicon from the icon; `sitemap.xml` and `robots.txt`.
- **Legal:** link to the existing privacy policy and terms at https://blacksands.app/kiwi-guide#privacy and #terms. Don't copy them; the app and App Store Connect point there. Contact: info@blacksandsdigital.nz.
- **Quality:** works on phones first, fast (compressed images, no heavy scripts), accessible (alt text, contrast, keyboard focus), light and dark if it fits the design.
- **Analytics:** none, unless the plan suggests a free cookie-less option (such as Cloudflare Web Analytics) and the owner agrees.

## Wording rules

- Never claim offline maps; they come after launch.
- No North Island, "coming soon", paid version or Android.
- Sharing is the photo share card only; there's no share link.
- Say "trip" or "trips" and "place". Never "itinerary", "plans", or "location" for a place.
- Plain, friendly NZ English (colour, centre, kilometres).

## Hosting

- Firebase Hosting, as a second site in the existing project `blacksands-a37aa`, unless the plan recommends otherwise. The domain is the owner's call; ask which one.
- **Don't deploy, buy a domain, or change DNS without the owner's go.** Commit locally as you go; push only when told.

## Done means

- The page opens locally and looks right at phone, tablet and desktop widths. Screenshot each and show the owner.
- Every claim is checked against the app repo.
- Every placeholder (App Store link, app id, provider token, domain) is listed for the owner.
