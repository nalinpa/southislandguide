// Entry for the site's pack.js (bundled by export-site-trips.mjs): the app's own packTrip, getLeg
// (for a day's driving, counted as the app counts it) and slot labels, with the drive tables
// inlined, and each area's hub (where a trip's first drive is counted from). Set on
// window.KiwiPack, with the trip screen's helpers and colours; the export's footer also module.exports it under Node.
import hubs from "../assets/data/area-hubs.json";
import { packTrip, slotIndexToTimeLabel, slotsToDurationLabel } from "../lib/utils/itineraryPhysics";
import { getLeg } from "../lib/utils/transitMatrix";
import { dayLegs, tripSummary } from "../lib/utils/itineraryPhysics";
import { dateParts, routeLine } from "../lib/utils/tripLines";
import { areaName } from "../lib/areas";
import { tokens as appTokens } from "../lib/ui/tokens";

// The app's colours as { light, dark } (react-native is stubbed for this bundle, so pair() returns that);
// a plain string colour is the same in both.
const tokens = Object.fromEntries(
  Object.entries(appTokens.colors).map(([k, v]) => [k, typeof v === "string" ? { light: v, dark: v } : v]),
);

(globalThis as unknown as { KiwiPack: unknown }).KiwiPack = { packTrip, getLeg, hubs, slotIndexToTimeLabel, slotsToDurationLabel, tripSummary, dayLegs, routeLine, dateParts, areaName, tokens };
