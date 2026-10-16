// Written by scripts/generate-drive-times.js (towns). Don't edit by hand: run it again.
// One table per area of travel times between that area's own places, in half-hour
// slots, read by lib/utils/transitMatrix.ts.
type Transit = Record<string, Record<string, Record<string, number>>>;

export const TRANSIT: Transit = {
  "banks-peninsula": require("./banks-peninsula.json"),
  "christchurch": require("./christchurch.json"),
  "dunedin": require("./dunedin.json"),
  "hanmer-springs": require("./hanmer-springs.json"),
  "kaikoura": require("./kaikoura.json"),
  "mid-canterbury": require("./mid-canterbury.json"),
  "oamaru": require("./oamaru.json"),
  "timaru": require("./timaru.json"),
  "waitaki-valley": require("./waitaki-valley.json"),
};
