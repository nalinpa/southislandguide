# A map of the trip on the quiz — design (later, not in the trip view build)

Owner, 2026-11-22: "plan the map and find the best map api to use … but leave it out of this build". The map goes on the trip view (`trip-view-design.md`) later, likely with the paywall.

## Why

The trip screen is what visitors will pay to keep. A map of their route — the towns they sleep in, numbered by day, joined in order — is the strongest "I want this" moment, and it's the shape of the trip at a glance.

## What the visitor sees

```
 ┌───────────────────────────────┐
 │   [map of the South Island]   │   ● numbered nights (1, 2, 3 …) by day
 │      ●5 Nelson                │   ─ the route in trip order; loop closes, one-way ends with a flag
 │  ●4 Hokitika    ●… Kaikōura   │   tap a day (map or list): its stretch lights up, the rest fades
 │ ●3 Franz Josef  ●1 Christchurch
 │   Wānaka ●──── ●2 Tekapo      │
 │  ● Queenstown   ● Dunedin     │
 └───────────────────────────────┘
```

- Phone: at the top of the Trip view. iPad: its own column beside the days.
- Only the trip's towns and its line; no other places, no search, no directions (that's the app).
- Pan and zoom only if the provider gives it for free; the first view fits the whole trip.

## Approaches

| | Map look | Cost at ad volume | Site rules (self-hosted scripts, CSP) | Effort |
|---|---|---|---|---|
| **A. Our own drawn map (SVG)** — LINZ coastline outline, our towns' coordinates | A designed poster in the site's colours; no roads, no zoom | None | Fits as is: one small self-hosted file | Lowest |
| **B. MapLibre GL JS + LINZ Basemaps vector tiles** | Real NZ topographic map, restyled to the site's colours; zoom and pan | Free (NZ government open data, CC BY 4.0, credit "© Toitū Te Whenua – CC BY 4.0"); a Developer key from LINZ (standard keys expire after 90 days) | MapLibre is open source and self-hostable; CSP adds `basemaps.linz.govt.nz` | Medium |
| C. MapLibre + Protomaps PMTiles on Cloudflare R2 | As B, from OpenStreetMap data, fully ours | Storage + reads on R2 only; no per-view fee | Self-hosted on our own Cloudflare; CSP adds the R2 host | Highest (build and upload an NZ extract) |
| D. Mapbox GL JS | Polished styles (Mapbox Studio) | 50,000 map loads a month free, then about $5 per 1,000; no spending cap | Needs a public token and `api.mapbox.com` in the CSP; proprietary licence | Medium |
| E. Apple MapKit JS | Apple Maps, familiar to iPhone users | Free up to 250,000 map views a day with the Apple Developer membership you already pay for | Script must load from Apple's CDN (breaks the self-hosted-scripts rule) and needs a signed token (a small worker route) | Medium |
| (Google Maps JS) | Familiar | Paid after the free credit; quota already ran out once (Oct 2026) | Google's CDN script | Not considered |

**Picked: E, Apple MapKit JS (owner, 2026-11-22: "it aligns with the app").** The app's map is Apple Maps (`react-native-maps` with no provider, `components/map/SitesMapView.tsx`), so the site's map is the one visitors meet again in the app.
- Free up to 250,000 map views a day on the owner's Apple Developer membership.
- An exception to the site's self-hosted-scripts rule (owner's call): the CSP adds Apple's MapKit script host and its map and tile hosts (exact list from Apple's MapKit JS docs at build time).
- Token: the owner creates a Maps ID and a MapKit JS key (.p8) in the Apple Developer account; the site's worker (`src/worker.js`) gets one route that signs a short-lived, origin-restricted token with that key, kept as a `wrangler secret` (the same pattern as the api's Apple sign-in key). On the owner's go.
- Loads only when the trip screen opens; never blocks Save; the 300 KB budget excludes Apple's script (not ours, loaded on demand).
- Fallback if MapKit JS is unavailable or over quota: B (MapLibre + LINZ Basemaps), then A.

Claude's earlier pick was B (free, self-hosted, restylable), kept as the fallback.

## Constraints

- Nothing loads before the trip screen; the map never blocks Save.
- Credits shown on the map as the licence needs.
- The CSP widens only by Apple's MapKit hosts.
- Works in light and dark (two map styles).

## Open for the owner

- Create the Maps ID and MapKit JS key in the Apple Developer account when this is scheduled.
- With the paywall: the map in full before paying, or blurred?
- (Fallback only) a LINZ Developer key (email basemaps@linz.govt.nz).

Sources: Mapbox pricing (mapbox.com/pricing; docs.mapbox.com GL JS pricing), Apple MapKit JS limits (developer.apple.com/maps/mapkitjs), LINZ Basemaps docs (linz.govt.nz LINZ Basemaps documentation, "How to use LINZ Basemaps APIs"), MapTiler plans (maptiler.com/cloud/plans), Protomaps on Cloudflare (docs.protomaps.com/deploy/cloudflare). Checked 2026-11-22.
