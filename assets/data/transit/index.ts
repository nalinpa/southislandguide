// Written by scripts/generate-drive-times.js (towns). Don't edit by hand: run it again.
// One table per area of travel times between that area's own places, in half-hour
// slots, read by lib/utils/transitMatrix.ts.
type Transit = Record<string, Record<string, Record<string, number>>>;

export const TRANSIT: Transit = {};
