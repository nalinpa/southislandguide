// Each town's hub: the place its drive times are measured from (scripts/generate-drive-times.js
// areas and far). A place id, not coordinates: a place is somewhere people drive to, so the
// maps service can always route to it, and there are no numbers to get wrong.
//
// Picked by the owner on 2026-10-22 (prompts/fix-32-town-centres.md, step 1): where
// visitors are, not the middle of the town's places, which drifts out along a road or
// away from town. A town missing here, or whose place has gone or closed, falls back to
// the place nearest the middle (hubOf in driveMatrix.js); the dry run says which.
const HUBS = {
  "abel-tasman": "kaiteriteri-beach", // not the campground 40 m away: it snaps to the wrong road
  "aoraki-mount-cook": "glacier-explorers", // at the Hermitage, in the village
  arrowtown: "provisions-of-arrowtown",
  "arthurs-pass": "arthurs-pass-national-park-visitor-centre",
  "banks-peninsula": "akaroa-freedom-camping-area",
  blenheim: "original-marlborough-wine-tours", // no place is in central Blenheim
  catlins: "peakes-kitchen-papatowai", // the middle of the route; see NO_CENTRE
  "central-otago": "cromwell-heritage-precinct", // base town: Cromwell
  christchurch: "christchurch-art-gallery",
  dunedin: "dunedin-public-art-gallery", // on the Octagon
  "fox-glacier": "cafe-neve",
  "franz-josef": "snakebite-brewery",
  glenorchy: "glenorchy-lagoon-walkway",
  "golden-bay": "the-wholemeal-cafe", // base town: Tākaka
  gore: "eastern-southland-gallery",
  greymouth: "dp1-cafe",
  haast: "the-hard-antler-haast",
  "hanmer-springs": "hanmer-springs-thermal-pools-and-spa",
  hokitika: "hokitika-museum",
  invercargill: "classic-motorcycle-mecca",
  kaikoura: "encounter-kaikoura",
  "marlborough-sounds": "pelorus-mail-boat", // Havelock marina
  "mid-canterbury": "the-alpine-grind-methven", // base town: Methven
  "milford-sound": "milford-foreshore-walk", // the cruise's point may be on the water
  murchison: "murchison-district-museum",
  nelson: "nelson-provincial-museum",
  "nelson-lakes": "alpine-lodge-restaurant-st-arnaud", // base town: St Arnaud
  oamaru: "waitaki-museum", // Thames St
  picton: "edwin-fox-maritime-museum", // the foreshore
  punakaiki: "pancake-rocks-and-blowholes-walk",
  queenstown: "skyline-queenstown-gondola-and-luge",
  reefton: "the-strand-freedom-camping-reefton",
  riverton: "te-hikoi-museum-riverton",
  "te-anau": "sandfly-cafe-te-anau",
  tekapo: "church-of-the-good-shepherd",
  timaru: "south-canterbury-museum",
  tuatapere: "tui-base-camp-tuatapere",
  twizel: "foodelicious-twizel",
  "waitaki-valley": "waitaki-braids-cafe", // Kurow
  wanaka: "wanaka-bakpaka",
  westport: "museum-of-kawatiri",
};

// Towns that are a route, not a town: every place in one is far from any middle, so each
// gets its own times (driveMatrix.js farPlaces). The hub is used only for a place added
// before the next `far` run.
const NO_CENTRE = ["catlins"];

module.exports = { HUBS, NO_CENTRE };
