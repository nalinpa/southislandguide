// Entry for the site's pack.js (bundled by export-site-trips.mjs): the app's own packTrip and
// slot labels, with the drive tables inlined. Set on window.KiwiPack; the export's footer
// also module.exports it under Node.
import { packTrip, slotIndexToTimeLabel, slotsToDurationLabel } from "../lib/utils/itineraryPhysics";

(globalThis as unknown as { KiwiPack: unknown }).KiwiPack = { packTrip, slotIndexToTimeLabel, slotsToDurationLabel };
