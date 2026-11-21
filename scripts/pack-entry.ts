// Entry for the site's pack.js (bundled by export-site-trips.mjs): the app's own packTrip, getLeg
// (for a day's driving, counted as the app counts it) and slot labels, with the drive tables
// inlined, and each area's hub (where a trip's first drive is counted from). Set on
// window.KiwiPack; the export's footer also module.exports it under Node.
import hubs from "../assets/data/area-hubs.json";
import { packTrip, slotIndexToTimeLabel, slotsToDurationLabel } from "../lib/utils/itineraryPhysics";
import { getLeg } from "../lib/utils/transitMatrix";

(globalThis as unknown as { KiwiPack: unknown }).KiwiPack = { packTrip, getLeg, hubs, slotIndexToTimeLabel, slotsToDurationLabel };
