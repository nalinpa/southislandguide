// What the site's trip builder is given: the day blocks of the suggested trips with their towns,
// the places a trip may use, and the copy of the drive tables the site's pack.js is built from.
// Same drive data as itineraryTemplates.test.ts (the real tables, not jest's fixed samples).
jest.mock("@/assets/data/area-drive-minutes.json", () => jest.requireActual("../../assets/data/area-drive-minutes.json"));
jest.mock("@/assets/data/area-hubs.json", () => jest.requireActual("../../assets/data/area-hubs.json"));
jest.mock("@/assets/data/far-place-minutes.json", () => jest.requireActual("../../assets/data/far-place-minutes.json"));
jest.mock("@/assets/data/leg-minutes.json", () => jest.requireActual("../../assets/data/leg-minutes.json"));
import abelTasman from "@/assets/data/abel_tasman_motueka_places.json";
import arthursPass from "@/assets/data/arthurs_pass_castle_hill_places.json";
import buller from "@/assets/data/buller_westport_places.json";
import catlins from "@/assets/data/catlins_places.json";
import centralOtago from "@/assets/data/central_otago_places.json";
import christchurch from "@/assets/data/christchurch_places_all.json";
import dunedin from "@/assets/data/dunedin_places.json";
import fiordland from "@/assets/data/fiordland_te_anau_places.json";
import glacierCountry from "@/assets/data/glacier_country_places.json";
import goldenBay from "@/assets/data/golden_bay_places.json";
import haast from "@/assets/data/haast_south_westland_places.json";
import hanmer from "@/assets/data/hanmer_springs_places.json";
import hokitika from "@/assets/data/hokitika_places.json";
import invercargill from "@/assets/data/invercargill_bluff_gore_places.json";
import kaikoura from "@/assets/data/kaikoura_places.json";
import mackenzie from "@/assets/data/mackenzie_mount_cook_places.json";
import marlborough from "@/assets/data/marlborough_places.json";
import marlboroughSounds from "@/assets/data/marlborough_sounds_places.json";
import nelson from "@/assets/data/nelson_places.json";
import nelsonLakes from "@/assets/data/nelson_lakes_murchison_places.json";
import oamaru from "@/assets/data/oamaru_north_otago_places.json";
import punakaiki from "@/assets/data/punakaiki_greymouth_places.json";
import midCanterbury from "@/assets/data/mid_canterbury_places.json";
import queenstown from "@/assets/data/queenstown_places.json";
import timaru from "@/assets/data/timaru_geraldine_places.json";
import waitaki from "@/assets/data/waitaki_valley_places.json";
import wanaka from "@/assets/data/wanaka_places.json";
import westernSouthland from "@/assets/data/western_southland_places.json";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";
import AREA_HUBS from "@/assets/data/area-hubs.json";
import { ITINERARY_TEMPLATES } from "@/lib/itineraryTemplates";
import { NOT_TRIP_STOPS } from "@/lib/notTripStops";
import { getLeg } from "@/lib/utils/transitMatrix";
import { dayLegs, packTrip, tripSummary } from "@/lib/utils/itineraryPhysics";
import { dateParts, routeLine } from "@/lib/utils/tripLines";
import { areaName } from "@/lib/areas";
import { tokens } from "@/lib/ui/tokens";
import { HAND_END_TOWN, OVERNIGHT_TOWNS, SITE_DAYS, START_CITIES, builderData, openHours, sourceHash } from "../../scripts/lib/builderData";

type Place = { slug: string; name: string; category: string[]; area?: string; active?: boolean; lat: number; lng: number };
const PLACES = ([...abelTasman, ...arthursPass, ...buller, ...catlins, ...centralOtago, ...christchurch, ...dunedin, ...fiordland, ...glacierCountry, ...goldenBay, ...haast, ...hanmer, ...hokitika, ...invercargill, ...kaikoura, ...mackenzie, ...marlborough, ...marlboroughSounds, ...nelson, ...nelsonLakes, ...oamaru, ...punakaiki, ...midCanterbury, ...queenstown, ...timaru, ...waitaki, ...wanaka, ...westernSouthland] as Place[]);
const byId = new Map(PLACES.map((p) => [p.slug, p]));
const lookup = (id: string) => byId.get(id);
const data = builderData(ITINERARY_TEMPLATES, PLACES.map((p) => ({ ...p, id: p.slug })));
const root = path.resolve(__dirname, "../..");
const site = path.resolve(root, "../kiwiguide-site/public/plan");

// tokens.ts needs react-native for pair(); the site's pack.js stubs it the same way (scripts/rn-stub.ts).
jest.mock("react-native", () => ({ Platform: { OS: "ios" }, DynamicColorIOS: (c: unknown) => c }));

describe("the builder's data", () => {
  it("blocks are the templates' distinct (day, start town) pairs, then the website-only days", () => {
    const days = new Set(ITINERARY_TEMPLATES.flatMap((t) => t.days));
    expect(days.size).toBe(51);
    const variants = data.blocks.filter((b) => b.id.includes("@"));
    expect(variants.map((b) => b.id.split("@")[0]).sort()).toEqual([
      "pancake-rocks-and-blowholes-walk..fat-pipi-pizza",
      "pancake-rocks-and-blowholes-walk..monteiths-brewery",
      "toad-hall-motueka..park-cafe-marahau",
      "toad-hall-motueka..star-tavern-cape-foulwind",
    ]);
    expect(data.blocks).toHaveLength(days.size + variants.length + SITE_DAYS.length);
    expect(new Set(data.blocks.map((b) => b.id)).size).toBe(data.blocks.length);
    for (const v of variants) {
      const plain = data.blocks.find((b) => b.id === v.id.split("@")[0])!;
      expect(v.items).toEqual(plain.items);
      expect(v.startTown).not.toBe(plain.startTown);
    }
    expect(builderData(ITINERARY_TEMPLATES, PLACES.map((p) => ({ ...p, id: p.slug }))).blocks.map((b) => b.id)).toEqual(data.blocks.map((b) => b.id));
    expect(data.templates).toHaveLength(ITINERARY_TEMPLATES.length);
  });

  it("a block's towns chain in every template", () => {
    const blocks = new Map(data.blocks.map((b) => [b.id, b]));
    for (const t of data.templates) {
      let at: string = t.start;
      for (const id of t.blockIds) {
        const b = blocks.get(id)!;
        expect({ key: t.key, id, startTown: b.startTown }).toEqual({ key: t.key, id, startTown: at });
        at = b.endTown;
      }
      expect({ key: t.key, end: t.end }).toEqual({ key: t.key, end: at });
    }
  });

  it("every block starts and ends in a town trips sleep in", () => {
    for (const b of data.blocks) {
      expect({ id: b.id, start: OVERNIGHT_TOWNS.includes(b.startTown), end: OVERNIGHT_TOWNS.includes(b.endTown) }).toEqual({ id: b.id, start: true, end: true });
    }
    for (const t of data.templates) expect({ key: t.key, end: OVERNIGHT_TOWNS.includes(t.end) }).toEqual({ key: t.key, end: true });
    for (const id of Object.keys(HAND_END_TOWN)) expect(data.blocks.some((b) => b.id === id)).toBe(true);
  });

  // Written by hand from the day sequences in lib/itineraryTemplates.ts, not from the chain.
  it.each([
    ["christchurch-botanic-gardens..avon-river-walk", "christchurch", "christchurch"],
    ["shotover-jet..arrowtown-chinese-settlement", "queenstown", "queenstown"],
    ["bobs-cove-track..eriks-fish-and-chips", "queenstown", "queenstown"],
    ["skyline-queenstown-gondola-and-luge..te-anau-glowworm-caves", "queenstown", "te-anau"],
    ["pancake-rocks-and-blowholes-walk..monteiths-brewery", "hokitika", "greymouth"],
    ["pancake-rocks-and-blowholes-walk..monteiths-brewery@westport", "westport", "greymouth"],
    ["toad-hall-motueka..park-cafe-marahau", "nelson", "abel-tasman"],
    ["toad-hall-motueka..park-cafe-marahau@abel-tasman", "abel-tasman", "abel-tasman"],
    ["toad-hall-motueka..star-tavern-cape-foulwind@abel-tasman", "abel-tasman", "westport"],
    ["the-grove-scenic-reserve..queen-charlotte-drive-cullen-point", "golden-bay", "picton"],
  ])("%s: sleeps from %s to %s", (id, startTown, endTown) => {
    const b = data.blocks.find((x) => x.id === id)!;
    expect({ startTown: b.startTown, endTown: b.endTown }).toEqual({ startTown, endTown });
  });

  it("driveMinutes: the between-town legs (getLeg drive) from the start town's hub through the stops", () => {
    const hubs = AREA_HUBS as Record<string, string>;
    for (const b of data.blocks) {
      let from = hubs[b.startTown];
      let slots = 0;
      for (const i of b.items) {
        const leg = getLeg(from, i.siteId, lookup);
        if (leg.drive) slots += leg.slots;
        from = i.siteId;
      }
      expect({ id: b.id, driveMinutes: b.driveMinutes }).toEqual({ id: b.id, driveMinutes: slots * 30 });
    }
  });

  it("driveMinutes: a walking day is 0, a day up the lake or to Te Anau is not", () => {
    const mins = (id: string) => data.blocks.find((b) => b.id === id)!.driveMinutes;
    expect(mins("christchurch-botanic-gardens..avon-river-walk")).toBe(0);
    expect(mins("bobs-cove-track..eriks-fish-and-chips")).toBeGreaterThan(0);
    expect(mins("skyline-queenstown-gondola-and-luge..te-anau-glowworm-caves")).toBeGreaterThan(120);
  });

  it("has no place a trip must not use", () => {
    for (const id of Object.keys(data.places)) {
      expect({ id, active: byId.get(id)?.active !== false, kept: NOT_TRIP_STOPS.includes(id) }).toEqual({ id, active: true, kept: false });
    }
    for (const b of data.blocks) for (const i of b.items) expect({ id: i.siteId, there: i.siteId in data.places }).toEqual({ id: i.siteId, there: true });
  });

  // Owner, 2026-11-24: "website only for now"; Dunedin to Te Anau for trips of 5 days or more. 2026-11-25: Westport to Nelson
  // through the Buller Gorge, Greymouth up the coast to Westport.
  it("website-only days: Dunedin to the Catlins, Invercargill to Te Anau, Dunedin to Te Anau from 5 days, Westport to Nelson, Greymouth to Westport, each the app's timing", () => {
    const site = data.blocks.slice(-SITE_DAYS.length);
    expect(site.map((b) => [b.id, b.startTown, b.endTown, b.minTripDays])).toEqual([
      ["surat-bay-beach-walk..curio-bay-petrified-forest", "dunedin", "catlins", undefined],
      ["howells-point-reserve..redcliff-te-anau", "invercargill", "te-anau", undefined],
      ["dunedin-railway-station..redcliff-te-anau", "dunedin", "te-anau", 5],
      ["buller-gorge-swingbridge..cable-bay-walkway-and-beach", "westport", "nelson", undefined],
      ["point-elizabeth-walkway..star-tavern-cape-foulwind", "greymouth", "westport", undefined],
    ]);
    expect(data.templates.some((t) => t.blockIds.some((id) => site.some((b) => b.id === id)))).toBe(false);
    // each as the app would leave it, timed after the start town's hub
    const hubs = AREA_HUBS as Record<string, string>;
    for (const b of site) {
      const out = packTrip([{ id: "0", date: "2027-01-01", items: [{ id: "h", siteId: hubs[b.startTown], siteName: "", slotIndex: 0, durationSlots: 1 }] }, { id: "1", date: "2027-01-02", items: b.items.map((i, k) => ({ ...i, id: String(k) })) }] as never, lookup as never)[1].items;
      expect({ id: b.id, at: out.map((i) => i.slotIndex) }).toEqual({ id: b.id, at: b.items.map((i) => i.slotIndex) });
    }
  });

  // Owner, 2026-11-25: "carry from app": the site's builder keeps the stops it adds inside these.
  it("opening hours: each trip place's main hours from its note, in half-hour slots from 8 AM", () => {
    expect(openHours("Daily 9am to 11pm, last booking 10pm; bookings essential; 60 min private pool $122 for one")).toEqual({ open: 2, close: 30 });
    expect(openHours("October to April: Wed to Mon 10am to 5pm, closed Tue; May to September: Fri to Mon 10am to 4pm")).toEqual({ open: 4, close: 18 });
    expect(openHours("Dinner only, 5pm to 8pm; closed Tue and Wed")).toEqual({ open: 18, close: 24 });
    expect(openHours("Summit road daily 9am to 4pm, $14 per vehicle; café daily 9am to 4pm, last orders 3.45pm")).toEqual({ open: 2, close: 16 });
    expect(openHours("Open daily 7am to 2.30am; Fergbaker next door 6am to 2am")).toEqual({ open: -2, close: 37 }); // past midnight
    expect(openHours("Daily from noon to 11pm; no bookings")).toEqual({ open: 8, close: 30 });
    expect(openHours("Nov to Apr daily: breakfast 8 to 10am, lunch 12 to 2pm")).toEqual({ open: 0, close: 4 }); // "8 to 10am": 8 AM
    // only an opening
    expect(openHours("Open daily 7.30am till late; breakfast 7.30am to 11am; main menu from 11am")).toEqual({ open: -1, close: null });
    expect(openHours("Daily from 11am; dinner 5pm to 9pm; closed Christmas Day")).toEqual({ open: 6, close: null });
    expect(openHours("Listed daily from 10.15am; tours by booking")).toEqual({ open: 4.5, close: null });
    // a first clause with no time: the next clause about the place itself
    expect(openHours("Reopens 1 Oct 2026; summer (Oct to Mar) 9am to 5pm daily; April and September 10am to 4pm")).toEqual({ open: 2, close: 18 });
    expect(openHours("Seasonal, 1 October to 31 March; Mon to Fri 6am to 7pm; Sat and Sun 7am to 7pm")).toEqual({ open: -4, close: 22 });
    // open any time, times for something else, or departure times only
    for (const n of ["Open daylight hours; free, donations welcome", "Open any time; café 8.30am to 4pm", "Open daily dawn to dusk, free; glasshouse 10am to 4pm",
      "Building open to walk through during the day; farmers market Saturdays 8am to 12.30pm", "Open year round; Aviemore Dam road closed 5 and 15 Oct 2026, 8.30am to 4pm",
      "Shops and cafes open daily with varied hours; ferry hourly 10am to 5pm daily", "Tide dependent departures from 6 Tasman Street; booking needed; office 8am to 5pm",
      "Daily at 10.45am and 1.30pm, plus 3.45pm Dec to Mar", "", undefined])
      expect({ n, h: openHours(n) }).toEqual({ n, h: null });
    // every trip place carries them, from its own note
    const notes = new Map(PLACES.map((p) => [p.slug, (p as { hoursNote?: string }).hoursNote]));
    for (const [id, p] of Object.entries(data.places) as [string, { open: number | null; close: number | null }][]) {
      const h = openHours(notes.get(id));
      expect({ id, open: p.open, close: p.close }).toEqual({ id, open: h ? h.open : null, close: h ? h.close : null });
    }
    expect((data.places as Record<string, { open: number | null }>)["onsen-hot-pools"].open).toBe(2);
  });

  it("the starts: the six start cities, each with a block starting there", () => {
    expect([...data.starts].sort()).toEqual(["christchurch", "dunedin", "invercargill", "nelson", "picton", "queenstown"]);
    expect(START_CITIES).toEqual(data.starts);
    for (const s of data.starts) expect({ s, n: data.blocks.filter((b) => b.startTown === s).length > 0 }).toEqual({ s, n: true });
  });
});

// Jest would run pack.js through babel's module interop, so evaluate it as the browser (and Node) does.
const loadPack = () => {
  const m = { exports: {} as Record<string, any> }; // eslint-disable-line @typescript-eslint/no-explicit-any
  new Function("module", readFileSync(path.join(site, "pack.js"), "utf8"))(m);
  return m.exports;
};

describe("the site's copy", () => {
  const siteBuilder = path.join(site, "builder-data.json");
  const here = existsSync(siteBuilder);
  if (!here) console.warn("kiwiguide-site/public/plan not found next to this repo: the site's copy is not checked");
  const maybe = here ? it : it.skip;

  maybe("is current: the source hash matches (re-run scripts/export-site-trips.mjs if not)", () => {
    const want = sourceHash(root);
    expect(JSON.parse(readFileSync(siteBuilder, "utf8")).source).toBe(want);
    expect(readFileSync(path.join(site, "pack.js"), "utf8").split("\n")[0]).toContain(want);
  });

  maybe("loads in 300 KB gzipped: builder data, pack.js, trips.json and the quiz scripts", () => {
    const files = ["builder-data.json", "pack.js", "trips.json", ...readdirSync(site).filter((f) => f.endsWith(".js") && f !== "pack.js")];
    const total = files.reduce((n, f) => n + gzipSync(readFileSync(path.join(site, f))).length, 0);
    expect(total).toBeLessThanOrEqual(300 * 1024);
  });

  maybe("pack.js exposes the trip helpers, equal to the app's", () => {
    const pack = loadPack();
    for (const k of ["tripSummary", "dayLegs", "routeLine", "dateParts", "areaName", "tokens"]) expect(pack[k]).toBeDefined();
    const towns = ["Dunedin", "Aoraki / Mount Cook"];
    expect(pack.routeLine(towns)).toBe(routeLine(towns));
    expect(pack.dateParts("2026-12-25", "long")).toBe(dateParts("2026-12-25", "long"));
    expect(pack.areaName("queenstown")).toBe(areaName("queenstown"));
    const days = ITINERARY_TEMPLATES[0].days as unknown as Parameters<typeof tripSummary>[0]; // the helpers read no ids or dates
    expect(pack.tripSummary(days, lookup)).toEqual(tripSummary(days, lookup));
    expect(pack.dayLegs(days[0].items, lookup)).toEqual(dayLegs(days[0].items, lookup));
  });

  maybe("pack.js tokens are the app's { light, dark } colours", () => {
    const pack = loadPack();
    expect(pack.tokens.accent).toEqual(tokens.colors.accent);
    expect(pack.tokens.page).toEqual({ light: "#FFFFFF", dark: "#06191B" });
    expect(pack.tokens.highlightOnDark).toEqual({ light: "#FFB84D", dark: "#FFB84D" });
  });
});
