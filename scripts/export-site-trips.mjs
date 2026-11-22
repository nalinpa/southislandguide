// Writes the app's suggested trips as data for the website's trip quiz.
// Usage: node --no-warnings scripts/export-site-trips.mjs [../kiwiguide-site/public/plan/trips.json]
// Fetches the live place list once (a KV cache: no Firestore reads) for each stop's
// area, category and thumbnail.
// Also writes the trip builder's data (builder-data.json) and its timing code (pack.js) beside it.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { ITINERARY_TEMPLATES } from "../lib/itineraryTemplates.ts";
import { slotIndexToTimeLabel, slotsToDurationLabel } from "../lib/utils/slotLabels.ts";
import { areaName } from "../lib/areaNames.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const alias = { "@": root };
const RN_STUB = "scripts/rn-stub.ts"; // pack.js's only non-app input: tokens.ts needs react-native for pair()

// builderData imports the app with "@/" paths, which Node can't resolve: bundle it to a temp file.
const tmp = mkdtempSync(path.join(tmpdir(), "builder-data-"));
let builderMod;
try {
  await build({ entryPoints: [path.join(here, "lib/builderData.ts")], bundle: true, platform: "node", format: "esm", outfile: path.join(tmp, "builderData.mjs"), alias, logLevel: "warning" });
  builderMod = await import(pathToFileURL(path.join(tmp, "builderData.mjs")).href);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
const { builderData, sourceHash, sourceFiles, fallbackOf } = builderMod;

const out = process.argv[2] ?? "../kiwiguide-site/public/plan/trips.json";
const res = await fetch("https://api.blacksands.app/v1/southislandguide/locations");
if (!res.ok) throw new Error(`places list: HTTP ${res.status}`);
const places = new Map((await res.json()).data.locations.map((p) => [p.id, p]));

const missing = [];
const trips = ITINERARY_TEMPLATES.map((t) => {
  const days = t.days.map((d) => {
    const towns = [];
    const items = d.items.map((i) => {
      const p = places.get(i.siteId);
      if (!p) {
        missing.push(`${t.key}: ${i.siteId}`);
        return null;
      }
      const town = areaName(p.area);
      if (towns.at(-1) !== town) towns.push(town);
      return {
        siteId: i.siteId,
        siteName: i.siteName,
        slotIndex: i.slotIndex,
        durationSlots: i.durationSlots,
        timeLabel: slotIndexToTimeLabel(i.slotIndex),
        durationLabel: slotsToDurationLabel(i.durationSlots),
        category: p.category ?? [],
        thumb: p.imageThumbnailUrl ?? null,
        fallback: fallbackOf(i.siteId, p.category),
      };
    });
    return { town: towns.join(" → "), lastTown: towns.at(-1), items };
  });
  return {
    key: t.key,
    start: t.start,
    label: t.label,
    description: t.description,
    ends: days.at(-1).lastTown,
    days: days.map(({ town, items }) => ({ town, items })),
  };
});

if (missing.length) throw new Error(`Template stops missing from the live list:\n${missing.join("\n")}`);
const outDir = path.dirname(out);
const source = sourceHash(root);
writeFileSync(out, JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), trips }, null, 2) + "\n");
console.log(`${trips.length} trips -> ${out}`);

// Builder data: vibe and activities from the live list when it has them, else from the owner-checked tags file.
const tags = JSON.parse(readFileSync(path.join(root, "docs/plans/trip-builder-tags.json"), "utf8"));
const list = [...places.values()].map((p) => ({ ...p, vibe: p.vibe ?? (tags[p.id] ?? tags[p.slug])?.vibe, activities: p.activities ?? (tags[p.id] ?? tags[p.slug])?.activities }));
const data = { source, ...builderData(ITINERARY_TEMPLATES, list) };
writeFileSync(path.join(outDir, "builder-data.json"), JSON.stringify(data));
console.log(`${data.blocks.length} blocks, ${Object.keys(data.places).length} places -> builder-data.json`);

// pack.js: the app's packTrip with the drive tables inlined. Nothing but the app's own code may go in.
const r = await build({ entryPoints: [path.join(here, "pack-entry.ts")], bundle: true, minify: true, format: "iife", platform: "browser", target: "es2019", outfile: path.join(outDir, "pack.js"), alias: { ...alias, "react-native": path.join(here, "rn-stub.ts") }, metafile: true, banner: { js: `/* Kiwi Guide pack.js, source ${source} */` }, footer: { js: "if(typeof module!==\"undefined\")module.exports=globalThis.KiwiPack;" }, logLevel: "warning" });
const inputs = Object.keys(r.metafile.inputs);
const outside = inputs.filter((f) => f.includes("node_modules") || (/react-native|expo/.test(f) && f !== RN_STUB));
if (outside.length) throw new Error(`pack.js pulled in code outside the app's timing files:\n${outside.join("\n")}`);
// The drift hash must cover every input of pack.js.
const unhashed = inputs.filter((f) => !sourceFiles(root).includes(f));
if (unhashed.length) throw new Error(`pack.js inputs missing from the source hash (scripts/lib/builderData.ts):
${unhashed.join(", ")}`);
console.log(`pack.js <- ${inputs.join(", ")}`);
