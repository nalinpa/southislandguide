// Written by scripts/generate-drive-times.js (towns). Don't edit by hand: run it again.
// One table per area of travel times between that area's own places, in half-hour
// slots, read by lib/utils/transitMatrix.ts.
type Transit = Record<string, Record<string, Record<string, number>>>;

export const TRANSIT: Transit = {
  "banks-peninsula": require("./banks-peninsula.json"),
  "blenheim": require("./blenheim.json"),
  "catlins": require("./catlins.json"),
  "central-otago": require("./central-otago.json"),
  "christchurch": require("./christchurch.json"),
  "dunedin": require("./dunedin.json"),
  "fox-glacier": require("./fox-glacier.json"),
  "franz-josef": require("./franz-josef.json"),
  "golden-bay": require("./golden-bay.json"),
  "greymouth": require("./greymouth.json"),
  "hanmer-springs": require("./hanmer-springs.json"),
  "kaikoura": require("./kaikoura.json"),
  "marlborough-sounds": require("./marlborough-sounds.json"),
  "mid-canterbury": require("./mid-canterbury.json"),
  "nelson": require("./nelson.json"),
  "oamaru": require("./oamaru.json"),
  "picton": require("./picton.json"),
  "punakaiki": require("./punakaiki.json"),
  "timaru": require("./timaru.json"),
  "waitaki-valley": require("./waitaki-valley.json"),
  "westport": require("./westport.json"),
};
