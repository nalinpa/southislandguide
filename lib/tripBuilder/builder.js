// COPIED from kiwiguide-site public/plan/builder.js at f2c29c9. Don't edit here: change it on the
// website, then run `node scripts/copy-site-builder.mjs`.
// The trip builder: a trip for the visitor's answers, strung together from the hand-checked day blocks.
// Pure functions, tested in test/builder.test.js. The page calls buildTrips(data, window.KiwiPack, answers)
// with data = /plan/builder-data.json.

var MAX_SLOT = 28; // 10 PM, the end of the app's day grid
// A stop the builder adds ends by 6 PM (owner, 2026-11-25: "doing bridle path at 6 makes no sense"; "empty time in the
// evenings is ok": outdoor stops ran to 8 PM, a walk past 6 PM on one day in ten), but one that may go later, to 8 PM: "only
// things that could go after 6 are restaurants, lookouts and west coast beaches" (lateOk). Always inside its place's opening
// hours when the app has them (opens, closes). The evenings the trip's own days plan stand.
// ponytail: Lots of walking keeps the old end for now, any outdoor stop (walks, scenic, nature, water only) to 8 PM: its long
// walks mostly go in late, and the owner looks at it afterwards (2026-11-25: "leave out lots of walking for now").
var ADD_END = 20, ADD_END_LATE = 24;
var WEST_COAST = ["westport", "punakaiki", "greymouth", "hokitika", "franz-josef", "fox-glacier", "haast"];
var OUTDOORS = ["Walks", "Scenic", "Nature", "Water"];
// A place's opening hours, from its note in the app (owner, 2026-11-25: "carry from app"; half-hour slots from 8 AM, null
// when the app has none: open any time): a stop the builder adds waits for its place to open and ends by its close, and a
// day's stops never move up to before they open (Fyffe House at 10 AM, not 8; Fat Pipi Pizza, dinner only, from 5 PM).
// The times the trip's own days give their stops stand.
function opens(p) { return p.open == null ? -Infinity : Math.ceil(p.open); }
function closes(p) { return p.close == null ? Infinity : p.close; }
// A day over the visitor's driving limit is allowed, each minute over it costing the route a little (owner, 2026-11-24: the
// whole-island route at 2 hours a day, its long days marked, rather than staying near the limit and padding the days).
var COST = { overMinute: 1, free: 60, reuse: 300, dupe: 25, dupeSight: 60, emptyDay: 200, revisit: 40, match: 3, template: 8, town: 30 };
// The towns a trip spends its spare days in, if it can (owner, 2026-11-25: "spare days should be in dunedin chch nelson qt or
// wanaka if possible"): a spare day there is allowed though the town has no town day (Nelson), and once the route is picked a
// spare day anywhere else moves to one of them on the trip (spareDays). Routes don't change for it: a cost in the search made
// 180 of 9,576 trips drive back and forth to dodge a spare day elsewhere.
var SPARE_TOWNS = ["dunedin", "christchurch", "nelson", "queenstown", "wanaka"];
var BEAM = 6; // routes kept per town per day
var TRIES = 6; // candidate places tried per add
// A built day's main attractions (featured places) go in while its sights are fewer than this, by pace
var TOP_UP = { easy: 4, some: 5, hikes: 6 };

// The owner's town ranking (2026-11-23), most to least preferred: a night in a town near the top counts for a route and one
// near the bottom against it (the Catlins over Invercargill, Dunedin over Timaru and Ōamaru), and among equal places the
// one in the better town goes in first. Every builder-data town, once (test/builder.test.js).
var TOWNS_RANKED = [
  "queenstown", "milford-sound", "aoraki-mount-cook", "wanaka", "tekapo", "franz-josef", "abel-tasman", "kaikoura", "te-anau",
  "christchurch", "dunedin", "catlins", "fox-glacier", "punakaiki", "arrowtown", "glenorchy", "hokitika", "marlborough-sounds", "hanmer-springs", "haast",
  "arthurs-pass", "banks-peninsula", "nelson", "golden-bay", "twizel", "picton", "blenheim", "central-otago", "nelson-lakes",
  "oamaru", "westport", "greymouth", "waitaki-valley", "mid-canterbury", "murchison", "reefton",
  "timaru", "tuatapere", "riverton", "invercargill",
];
// +1 for the top town down to -1 for the bottom; a town not in the list counts as the middle
function townPref(t) { var i = TOWNS_RANKED.indexOf(t); return i < 0 ? 0 : 1 - 2 * i / (TOWNS_RANKED.length - 1); }

function foodOnly(p) { return p.category.length === 1 && p.category[0] === "Food"; }
function longWalk(p) { return p.category.indexOf("Walks") >= 0 && p.slots >= 4; }
// A sight the builder may put in by itself: not food (food tips come with the day blocks), a long walk only for Lots of walking.
function mayAdd(p, ans) { return !foodOnly(p) && (ans.pace === "hikes" || !longWalk(p)); }
function overlaps(a, b) { for (var i = 0; i < a.length; i++) if (b.indexOf(a[i]) >= 0) return true; return false; }
// May run past 6 PM: somewhere to eat (Food among its categories; the builder adds none that is only food), a lookout (a
// half-hour stop named one, not a lookout track), a West Coast beach (named Beach or Bay there, not a walk: sunset is over the sea).
// ponytail: read from name and category, the app's data has no tag for these; add one there if the lists drift
function lateOk(p) {
  return p.category.indexOf("Food") >= 0 || (/lookout/i.test(p.name) && p.slots <= 1) ||
    (WEST_COAST.indexOf(p.area) >= 0 && /\b(beach|bay)\b/i.test(p.name) && p.category.indexOf("Walks") < 0);
}
function addEnd(p, pace) {
  if (pace === "hikes") return p.category.every(function (c) { return OUTDOORS.indexOf(c) >= 0; }) ? ADD_END_LATE : ADD_END;
  return lateOk(p) ? ADD_END_LATE : ADD_END;
}
function byId(a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; }

// Open one day a week: the builder doesn't know which weekday a trip day falls on, so it never adds these by itself
// (owner, 2026-11-23: Motueka Sunday Market). None is in a hand-checked day; one that was would stay there.
var ONE_DAY = ["motueka-sunday-market", "nelson-saturday-market"];
// A town's favourites (owner, 2026-11-24): a day ending there with no sight left goes back to them, in order, even ones the
// trip has been to: Kaiteriteri Beach in Abel Tasman (a beach day); Queenstown Gardens, then the lakefront at Queenstown Bay
// Beach. From 10 AM at the earliest when they open the day; the last fills the time to the day's next stop (less the drive)
// or to 6 hours after the first began, done by 6 PM like most stops the builder adds (half-hour slots from 8 AM).
var FAVOURITES = { "abel-tasman": ["kaiteriteri-beach"], queenstown: ["queenstown-gardens", "queenstown-bay-beach"] };
var FAVOURITE_DAY = { from: 4, most: 12 };
// A spare day in Kaikōura (owner, 2026-11-24: "they would stay in Hanmer between Kaikōura and Christchurch ... otherwise they
// should spend an extra day in Christchurch not Kaikōura"): a night in Hanmer, or a day in Christchurch (spareDays).
var SPARE = { town: "kaikoura", night: "hanmer-springs", instead: "christchurch" };
// The Doubtful Sound cruise once in a trip that stays in Te Anau (owner, 2026-11-24: "only 1 doubtful sound cruise per trip";
// "leave out pies"): a spare day goes there for the owner's Doubtful Sound day, without its food (doubtfulDay).
var DOUBTFUL = { town: "te-anau", day: "miles-better-pies..doubtful-sound-wilderness-cruise", cruise: "doubtful-sound-wilderness-cruise" };
// A trip from Christchurch that drives out on day 1 begins the day there (owner, 2026-11-24: "day 1 starts with botanic
// gardens and river walk, then drive to tekapo"): these, in order, each while it fits before the drive with none of the day's
// own stops more than an hour later (START_PUSH half-hours). They come on top of the day's own sights: the day's top-ups count
// without them.
var START_MORNING = { christchurch: ["christchurch-botanic-gardens", "avon-river-walk"] }, START_PUSH = 2;
// A day whose own stops end in its town, but whose stops left end before it (food off, Easy or a repeat took the ones there),
// arrives there after the drive in (owner, 2026-11-24: "back to chch riverside market, art gallery or other central chch
// things"): the town's places within ARRIVE.km of its middle, best fit, then featured, then the nearest; at least one, so the
// night is there, then while the day has fewer than 3 sights. A day that arrives after them all (they end by 6 PM, 8 PM
// the ones that may run late) ends at its town's evening place until ARRIVE.until (9 PM): Riverside Markets in Christchurch (owner, 2026-11-24:
// "assume that riverside market is an option always cos its more than just food"). A day the owner ends on the road into its
// town (the Sounds road into Picton) arrives too when its stops left end further back (2026-11-24: "reach Picton").
var ARRIVE = { km: 3, evening: { christchurch: "DXWpQTSPRQQKPt7SIcVi" }, until: 26 };
// An afternoon left empty (owner, 2026-11-24: "add some wanaka places", "add more in qt", "add another stop in each"): a day
// that ends in its town before AFTERNOON.before takes more there after its last stop, while it ends before AFTERNOON.until
// (half-hour slots from 8 AM: 4 PM, 5 PM): the town's favourites first, even ones the trip has been to (not twice in a day;
// Queenstown's gardens, then the lakefront: "like chilling in downtown QT"), then its places best fit, then featured, then
// the nearest to the day's last stop.
var AFTERNOON = { before: 16, until: 18 };

// One point each for a picked vibe, a picked category, a picked activity, and a long walk for big hikers.
function fitScore(p, ans) {
  if (!ans.food && foodOnly(p)) return 0;
  return (overlaps(ans.vibes, p.vibe) ? 1 : 0) + (overlaps(ans.into, p.category) ? 1 : 0) +
    (overlaps(ans.activities, p.activities) ? 1 : 0) + (ans.pace === "hikes" && longWalk(p) ? 1 : 0);
}

// What doesn't depend on the answers, worked out once per data object.
var prepared = typeof WeakMap !== "undefined" ? new WeakMap() : null;
function prepare(data) {
  var ctx = prepared && prepared.get(data);
  if (ctx) return ctx;
  var blocks = data.blocks.slice().sort(byId), food = [], stopIx = {}, nStops = 0, out = {}, stays = {}, pairs = {};
  blocks.forEach(function (b, i) {
    b = blocks[i] = { id: b.id, ix: i, startTown: b.startTown, endTown: b.endTown, driveMinutes: b.driveMinutes, minTripDays: b.minTripDays || 0, items: b.items, stops: [] };
    b.items.forEach(function (it) {
      if (!(it.siteId in stopIx)) { food[nStops] = foodOnly(data.places[it.siteId]); stopIx[it.siteId] = nStops++; }
      b.stops.push(stopIx[it.siteId]);
    });
    (out[b.startTown] = out[b.startTown] || []).push(b);
    if (b.startTown === b.endTown) stays[b.startTown] = true;
  });
  var ixOf = {};
  blocks.forEach(function (b) { ixOf[b.id] = b; });
  data.templates.forEach(function (t) {
    t.blockIds.forEach(function (id, i) { pairs[(i ? t.blockIds[i - 1] : "^" + t.start) + ">" + id] = true; });
  });
  ctx = { blocks: blocks, byId: ixOf, out: out, stays: stays, pairs: pairs, stopIx: stopIx, food: food, words: Math.ceil(nStops / 32), near: {} };
  if (prepared) prepared.set(data, ctx);
  return ctx;
}

// The fewest free days needed to reach a target town in exactly r more days (missing = can't), never two free days
// in a row: need.any[r][town] when today may be free, need.after[r][town] when yesterday was free (so today can't be).
// Only the blocks a trip of `days` days may use (a website-only day can be for longer trips: minTripDays).
function freeNeeded(ctx, towns, targets, days, freeOk) {
  var any = [{}], after = [{}];
  targets.forEach(function (t) { any[0][t] = after[0][t] = 0; });
  for (var r = 1; r <= days; r++) {
    any[r] = {}; after[r] = {};
    for (var i = 0; i < towns.length; i++) {
      var t = towns[i], drive = Infinity;
      (ctx.out[t] || []).forEach(function (b) {
        if (b.minTripDays <= days && any[r - 1][b.endTown] !== undefined) drive = Math.min(drive, any[r - 1][b.endTown]);
      });
      var best = freeOk(t) && after[r - 1][t] !== undefined ? Math.min(drive, after[r - 1][t] + 1) : drive;
      if (drive < Infinity) after[r][t] = drive;
      if (best < Infinity) any[r][t] = best;
    }
  }
  return { any: any, after: after };
}
function freeCap(days) { return Math.floor(days / 4); }

// The best route of exactly ans.days days from ans.start to one of `targets`, as a beam search over the blocks.
// mode 0: at most a quarter of the days free and never two in a row, in towns that have a town day; 1 (last resort): free
// days anywhere, no cap.
function search(ctx, ans, targets, mode, pts) {
  var n = ans.days, start = ans.start, cap = mode === 1 ? n : freeCap(n);
  var freeOk = function (t) { return mode === 1 || !!ctx.stays[t] || SPARE_TOWNS.indexOf(t) >= 0; };
  var towns = Object.keys(ctx.out).concat(targets, [start]);
  var need = freeNeeded(ctx, towns, targets, n, freeOk);
  var can = function (r, town, free, wasFree) {
    var t = (wasFree ? need.after : need.any)[r];
    return t[town] !== undefined && free + t[town] <= cap;
  };
  if (!can(n, start, 0, false)) return null;
  var states = [{ town: start, cost: 0, key: "", seq: [], uses: new Uint8Array(ctx.blocks.length), mask: new Uint32Array(ctx.words), seen: "|" + start + "|", last: null, prevBlock: null, home: 0, free: 0, wasFree: false }];
  for (var day = 0; day < n; day++) {
    var rem = n - day - 1, next = [];
    states.forEach(function (s) {
      var moves = [], fresh = false;
      (ctx.out[s.town] || []).forEach(function (b) {
        if (b.minTripDays > n || s.uses[b.ix] >= 2 || b === s.last || !can(rem, b.endTown, s.free, false)) return;
        // never a day on the road with no sight the route hasn't had (its day would be empty, yet the night move on: Te Anau
        // to Invercargill and straight back, 2026-11-24); a free day can still burn a day, and the last resort may
        if (mode === 0 && b.startTown !== b.endTown && !b.stops.some(function (i) { return !ctx.food[i] && !(s.mask[i >> 5] & (1 << (i & 31))); })) return;
        moves.push(b);
        if (!s.uses[b.ix]) fresh = true;
      });
      if (freeOk(s.town) && !s.wasFree && can(rem, s.town, s.free + 1, true)) { moves.push(null); fresh = true; } // never two free days in a row
      moves.forEach(function (b) {
        if (b && fresh && s.uses[b.ix]) return; // a block again only when nothing else is left
        next.push(step(ctx, ans, s, b, pts));
      });
    });
    var perTown = {};
    next.sort(cheaper);
    states = next.filter(function (s) { perTown[s.town] = (perTown[s.town] || 0) + 1; return perTown[s.town] <= BEAM; });
  }
  var loop = targets.length === 1 && targets[0] === start;
  states.forEach(function (s) { if (loop && s.home) s.cost -= COST.revisit; });
  states.sort(cheaper);
  var best = states[0];
  if (!best) return null;
  return { cost: best.cost, blocks: best.seq, end: best.town };
}

function cheaper(a, b) { return a.cost - b.cost || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0); }

// A night's town in the route's cost (the owner's ranking): a good town draws the route there once, on arrival, so a trip
// doesn't circle its best towns; a night in a poor one always counts against it, and so does a free day there.
// seen: the towns the route has been to, "|a|b|".
function townCost(town, seen, free) {
  var pref = townPref(town);
  if (free) return COST.town * Math.max(0, -pref);
  return pref < 0 || seen.indexOf("|" + town + "|") < 0 ? -COST.town * pref : 0;
}

function step(ctx, ans, s, b, pts) {
  var t = { town: s.town, cost: s.cost, key: s.key + "|" + (b ? b.id : "~"), seq: s.seq.concat([b]), uses: s.uses, mask: s.mask, seen: s.seen, last: b, prevBlock: s.prevBlock, home: s.home, free: s.free, wasFree: !b };
  if (!b) { t.cost += COST.free + townCost(s.town, s.seen, true); t.free++; return t; }
  t.town = b.endTown;
  t.cost += townCost(b.endTown, s.seen, false);
  t.uses = s.uses.slice(); t.uses[b.ix]++;
  if (s.uses[b.ix]) t.cost += COST.reuse;
  if (b.driveMinutes > ans.drive) t.cost += (b.driveMinutes - ans.drive) * COST.overMinute;
  if (b.endTown !== b.startTown && s.seen.indexOf("|" + b.endTown + "|") >= 0) {
    t.cost += COST.revisit;
    if (b.endTown === ans.start) t.home++;
  }
  t.seen = s.seen.indexOf("|" + b.endTown + "|") >= 0 ? s.seen : s.seen + b.endTown + "|";
  t.mask = s.mask.slice();
  var fresh = 0;
  b.stops.forEach(function (i) {
    var w = i >> 5, bit = 1 << (i & 31);
    if (t.mask[w] & bit) t.cost += ctx.food[i] ? COST.dupe : COST.dupeSight; // a repeated sight costs a free day
    else { fresh++; t.cost -= COST.match * pts[i]; t.mask[w] |= bit; }
  });
  if (!fresh) t.cost += COST.emptyDay; // every stop already done: a day of driving only
  if (ctx.pairs[(s.prevBlock ? s.prevBlock.id : "^" + ans.start) + ">" + b.id]) t.cost -= COST.template;
  t.prevBlock = b;
  return t;
}

function bestRoute(ctx, ans, targets, pts) {
  for (var mode = 0; mode < 2; mode++) {
    var r = search(ctx, ans, targets, mode, pts);
    if (r && mode === 1) r.cost += 1e9; // free days in a town with no town day: worse than any long drive
    if (r) return r;
  }
  return null;
}

// Time one day after the previous day's last stop, as the app would.
function packDay(pack, look, prevLast, items) {
  return pack.packTrip([{ items: prevLast ? [prevLast] : [] }, { items: items }], look)[1].items;
}
// Fits: packTrip moves nothing and nothing ends after 10 PM.
function fits(pack, look, prevLast, items) {
  var out = packDay(pack, look, prevLast, items);
  return out.every(function (it, k) { return it.slotIndex === items[k].slotIndex && it.slotIndex + it.durationSlots <= MAX_SLOT; });
}

// Stops taken out of a day leave holes: the app's packer only ever pushes a stop later, so the stops after a hole kept
// their old times (owner, 2026-11-23: "big gaps"). Close each hole: the stop after it moves up behind the stop before it
// (plus the hop between them), and the rest of the day follows, every pause the day had kept as it was. `before` is the
// day with the stops still in, `kept` the stops that stay (the same objects, in order). Nothing moves later, and nothing
// moves where nothing was taken out. Held: a meal moves at most an hour earlier; a night stop (7 PM or later: the stars
// need the dark) keeps its time, while the stops before it close up like any day's (owner, 2026-11-24: "tekapo springs
// could be earlier"). When the day's first stops go, the next one starts when the day did (a sight no earlier than 9 AM).
var MEAL_EARLY = 2, NIGHT = 22, HOLE = 4; // a hole: two idle hours or more
function closeUp(pack, look, prevLast, before, kept) {
  if (kept.length === before.length || !kept.length) return packDay(pack, look, prevLast, kept);
  var out = [];
  kept.forEach(function (it, i) {
    var p = look(it.siteId), prev = kept[i - 1], at = before.indexOf(it), was = it.slotIndex, to = was;
    var hole = prev ? at - before.indexOf(prev) > 1 : at > 0; // a stop went from just before this one
    if (was < NIGHT || foodOnly(p)) {
      if (!prev) to = hole ? Math.min(was, Math.max(before[0].slotIndex, foodOnly(p) ? 0 : 2)) : was;
      else if (hole) to = Math.min(was, out[i - 1].slotIndex + prev.durationSlots + pack.getLeg(prev.siteId, it.siteId, look).slots);
      else to = was - (prev.slotIndex - out[i - 1].slotIndex); // the pause after the stop before, as the day has it
      if (foodOnly(p)) to = Math.max(to, was - MEAL_EARLY);
      if (to < opens(p)) to = Math.min(was, opens(p)); // never up to before its place opens
    }
    out.push({ siteId: it.siteId, siteName: it.siteName, slotIndex: to, durationSlots: it.durationSlots });
  });
  return packDay(pack, look, prevLast, out);
}

// The idle half-hours before a day's stop i: what is left between the stop before it and it, after the hop.
function idleBefore(pack, look, items, i) {
  var a = items[i - 1];
  return items[i].slotIndex - (a.slotIndex + a.durationSlots) - pack.getLeg(a.siteId, items[i].siteId, look).slots;
}

// A day's driving as the app shows it: the legs from `from` through the stops that cross from one area to another.
// (A block's driveMinutes is only the search's estimate: it counts from the start town's hub, before stops change.)
function driveOf(pack, look, from, items) {
  var slots = 0;
  items.forEach(function (it) { var leg = pack.getLeg(from, it.siteId, look); if (leg.drive) slots += leg.slots; from = it.siteId; });
  return slots * 30;
}

// Add the first candidate that goes in after a stop in its own area (or first thing, in the town the day starts in)
// without moving any other stop.
// Straight-line km between two places (near enough over the island).
function km(a, b) {
  var r = Math.PI / 180, x = (b.lng - a.lng) * r * Math.cos((a.lat + b.lat) * r / 2), y = (b.lat - a.lat) * r;
  return 6371 * Math.sqrt(x * x + y * y);
}
// Is place c on the way from a to b? The trip keeps heading one way (owner, 2026-11-23).
// - Going by c may add 10 km, or 15% of the straight run (slack km instead of 10 when a thin day is being filled).
// - c may not lie behind a or beyond b by more than 10 km, whatever the slack: no nipping back to the town just left.
// - A hop inside one town (a to b under 15 km) is out and back by nature: 40 km of extra run, c within 20 km of both.
// A place without a position, or no a or b to go by, passes.
function onWay(a, c, b, slack) {
  if (!a || !b || !c) return true;
  var direct = km(a, b), ac = km(a, c), cb = km(c, b), town = direct < 15;
  if (ac + cb - direct > Math.max(town ? 40 : slack || 10, 0.15 * direct)) return false;
  return !(ac > direct + (town ? 20 : 10) || cb > direct + (town ? 20 : 10)); // a missing lat or lng (NaN) passes
}
// Where a town is, for the rule: its hub place, or the middle of its places when the hub isn't in the data (Wānaka's).
function townSpot(data, pack, town) {
  var hub = data.places[pack.hubs[town]];
  if (hub && hub.lat != null && hub.lng != null) return hub;
  var ps = ((data.towns[town] || {}).placeIds || []).map(function (id) { return data.places[id]; }).filter(function (p) { return p && p.lat != null && p.lng != null; });
  if (!ps.length) return null;
  return { lat: ps.reduce(function (n, p) { return n + p.lat; }, 0) / ps.length, lng: ps.reduce(function (n, p) { return n + p.lng; }, 0) / ps.length };
}

// ahead: where the day leads on to (tomorrow's first stop, or a town); fromSpot: where the day's start town is; pace: the
// visitor's, for how late the stop may run (addEnd);
// at: the one position to try (before the stop now there; the place may then be in that stop's town too), else every position;
// arrive: the day's end town, whose places may also go where the day has arrived there (after the drive in).
function tryAdd(pack, look, prevLast, items, cands, from, tries, ahead, slack, fromSpot, at, arrive, pace) {
  for (var c = 0; c < cands.length && c < (tries || TRIES); c++) {
    var p = cands[c];
    for (var pos = at == null ? 0 : at; pos <= (at == null ? items.length : at); pos++) {
      var after = pos ? items[pos - 1] : items[0];
      var here = !after || look(after.siteId).area === p.area || (!pos && p.area === from)
        || (at != null && pos < items.length && look(items[pos].siteId).area === p.area)
        || (!!arrive && p.area === arrive && items.slice(pos).every(function (it) { return look(it.siteId).area === arrive; }));
      if (!here) continue;
      // on the way from the stop before (or where yesterday ended, or the day's start town) to the stop after (or ahead)
      if (!onWay(pos ? look(items[pos - 1].siteId) : prevLast ? look(prevLast.siteId) : fromSpot, p, pos < items.length ? look(items[pos].siteId) : ahead, slack)) continue;
      var trial = items.slice();
      // (from when its place opens, if later)
      trial.splice(pos, 0, { siteId: p.id, siteName: p.name, slotIndex: Math.max(pos ? after.slotIndex + after.durationSlots : 0, opens(p)), durationSlots: p.slots });
      var out = packDay(pack, look, prevLast, trial);
      var still = out.every(function (it, k) { return k === pos || it.slotIndex === trial[k].slotIndex; });
      if (still && out[pos].slotIndex + p.slots <= Math.min(addEnd(p, pace), closes(p)) && fits(pack, look, prevLast, out)) return out;
    }
  }
  return null;
}

// The towns a rest day may go out to and back (owner, 2026-11-24: Banks Peninsula from Christchurch, Wānaka from
// Queenstown): at most 90 minutes each way by the app's drive between the two towns' hubs, the owner's ranking first, then
// the nearer. A town's hub is its hub place, or (Wānaka's isn't in the data) its place nearest the middle of its places.
// A road out is a nearby town whatever its hub (owner, 2026-11-24: "a Milford road walk" from Te Anau); only its places within
// the 90 minutes go.
var DAY_OUT = { slots: 3, roads: { "te-anau": ["milford-sound"] } }; // half-hours each way, at most
function townHub(data, pack, town) {
  if (data.places[pack.hubs[town]]) return pack.hubs[town];
  var spot = townSpot(data, pack, town);
  return ((data.towns[town] || {}).placeIds || []).filter(function (id) { return data.places[id].lat != null && data.places[id].lng != null; })
    .sort(function (a, b) { return km(spot, data.places[a]) - km(spot, data.places[b]) || (a < b ? -1 : 1); })[0];
}
function nearbyTowns(data, pack, town) {
  var ctx = prepare(data), look = function (id) { return data.places[id]; }, key = town + ">" + DAY_OUT.slots;
  if (ctx.near[key]) return ctx.near[key];
  var from = townHub(data, pack, town);
  return (ctx.near[key] = Object.keys(data.towns).filter(function (t) { return t !== town; }).map(function (t) {
    var to = townHub(data, pack, t), leg = from && to ? pack.getLeg(from, to, look) : { drive: null };
    return { town: t, slots: (DAY_OUT.roads[town] || []).indexOf(t) >= 0 ? 1 : leg.drive ? leg.slots : 0 };
  }).filter(function (x) { return x.slots && x.slots <= DAY_OUT.slots; }).sort(function (a, b) {
    return townPref(b.town) - townPref(a.town) || a.slots - b.slots || (a.town < b.town ? -1 : 1);
  }).map(function (x) { return x.town; }));
}

// A rest day out to a nearby town and back, the way the owner's own Glenorchy and Milford days go: the nearby town's places
// (cands, best first) while the day has room, then one of the home town's (ends: the first that works) for the evening, so
// the next day starts there. The builder adds no food, so that last place is a sight; one that may run late (lateOk) can end
// as late as 8 PM. At most the pace's top-up of sights; over the visitor's driving limit too, as any day may be (owner, 2026-11-24).
function dayOut(pack, look, prevLast, ans, cands, ends) {
  for (var e = 0; e < ends.length; e++) {
    var end = { siteId: ends[e].id, siteName: ends[e].name, slotIndex: Math.max(0, opens(ends[e])), durationSlots: ends[e].slots }, trip = [];
    for (var c = 0; c < cands.length && trip.length + 1 < TOP_UP[ans.pace]; c++) {
      var p = cands[c], last = trip[trip.length - 1];
      var out = packDay(pack, look, prevLast, trip.concat([{ siteId: p.id, siteName: p.name, slotIndex: Math.max(last ? last.slotIndex + last.durationSlots : 0, opens(p)), durationSlots: p.slots }, end]));
      var k = trip.length;
      if (out[k].slotIndex + p.slots <= Math.min(addEnd(p, ans.pace), closes(p)) && out[k + 1].slotIndex + end.durationSlots <= Math.min(addEnd(ends[e], ans.pace), closes(ends[e])) && fits(pack, look, prevLast, out) &&
        trip.every(function (it, i) { return out[i].slotIndex === it.slotIndex; })) trip = out.slice(0, k + 1);
    }
    if (trip.length) return packDay(pack, look, prevLast, trip.concat([end]));
  }
  return null;
}

// Best fit first: answer matches, then featured, then the better town, then id.
function ranked(list, ans) {
  return list.map(function (p) { return { p: p, s: fitScore(p, ans) }; })
    .sort(function (a, b) { return b.s - a.s || (b.p.featured ? 1 : 0) - (a.p.featured ? 1 : 0) || townPref(b.p.area) - townPref(a.p.area) || (a.p.id < b.p.id ? -1 : 1); })
    .map(function (x) { return x.p; });
}

// Turn a route into the trip: food off, pace, picked activities and interests, each day timed by packTrip.
// A built route also drops a non-Food place an earlier day already has; a suggested trip keeps its own repeats.
function personalise(data, pack, ans, route) {
  var places = data.places, look = function (id) { return places[id]; };
  var townPlaces = function (t) { return data.towns[t] ? data.towns[t].placeIds.map(look) : []; };
  var used = {}, planned = {}, days = [];
  // where the trip starts: the first day with stops is timed from there, as every later day is from where the one before
  // ended (owner, 2026-11-24: no stop before the drive out of the start town)
  var hub = townHub(data, pack, ans.start), home = hub ? { siteId: hub, siteName: "", slotIndex: 0, durationSlots: 1, start: true } : null;
  // the last stop of the nearest earlier day with stops, else home: where the traveller is before day bi
  var lastBefore = function (bi) {
    for (var k = bi - 1; k >= 0; k--) if (days[k] && days[k].items.length) return days[k].items[days[k].items.length - 1];
    return home;
  };
  // a place a day's own block has is kept for it until that day is filled (then it is the day's, or free: a place an earlier
  // day dropped may go in a later day, 2026-11-24: Edwin Fox for the last day back into Picton)
  route.blocks.forEach(function (b) { if (b) b.items.forEach(function (it) { planned[it.siteId] = (planned[it.siteId] || 0) + 1; }); });
  var ok = function (p) { return !used[p.id] && (ans.food || !foodOnly(p)); };
  var spare = function (p) { return ok(p) && !planned[p.id] && ONE_DAY.indexOf(p.id) < 0; }; // never add a place the trip already has, or a one-day one
  var inRoute = {};
  route.blocks.forEach(function (b) {
    if (b) b.items.forEach(function (it) { if (ok(places[it.siteId])) places[it.siteId].activities.forEach(function (a) { inRoute[a] = true; }); });
  });
  var pending = ans.activities.filter(function (a) { return !inRoute[a]; });
  // the towns the route goes to: a rest day doesn't go out to one of them
  var visited = {};
  route.blocks.forEach(function (b) {
    if (b && b.items.length) { visited[b.startTown] = visited[b.endTown] = true; b.items.forEach(function (it) { visited[places[it.siteId].area] = true; }); }
  });
  var dayOf = function (b, bi) {
    var prevLast = lastBefore(bi);
    // where this day leads on to: tomorrow's first stop (the first that stays when food is off), else tomorrow's town, else the
    // finish; none on a rest day, which is based in its town, not travelling, so the direction rule doesn't hold it (owner, 2026-11-24)
    var nb = route.blocks[bi + 1], nf = nb && nb.items.filter(function (it) { return ans.food || !foodOnly(places[it.siteId]); })[0];
    var ahead = b.rest ? null : nf ? look(nf.siteId) : townSpot(data, pack, nb ? nb.endTown : route.end);
    var whole = b.items.map(function (it) {
      return { siteId: it.siteId, siteName: it.siteName, slotIndex: it.slotIndex, durationSlots: it.durationSlots };
    });
    var items = whole.filter(function (it) {
      var p = places[it.siteId];
      return foodOnly(p) ? ans.food : !(route.kind === "built" && used[p.id]);
    });
    var walks = items.filter(function (it) { return places[it.siteId].category.indexOf("Walks") >= 0; });
    if (ans.pace === "easy" && items.length > 3 && walks.length > 1) {
      // Easy: drop the day's longest walk that isn't featured (never its only walk), a walk that matches nothing first.
      walks = walks.filter(function (it) { return !places[it.siteId].featured; }).sort(function (x, y) {
        return y.durationSlots - x.durationSlots || fitScore(places[x.siteId], ans) - fitScore(places[y.siteId], ans) || (x.siteId < y.siteId ? -1 : 1);
      });
      if (walks.length) items.splice(items.indexOf(walks[0]), 1);
    }
    if (items.length) items = closeUp(pack, look, prevLast, whole, items); // stops removed: time the day again, their holes closed
    var areas = {};
    areas[b.endTown] = true;
    items.forEach(function (it) { areas[places[it.siteId].area] = true; });
    var near = [];
    Object.keys(areas).sort().forEach(function (a) { if (data.towns[a]) near = near.concat(data.towns[a].placeIds.map(look)); });
    near = near.filter(spare);
    // A built trip from a town with a start morning that drives out on day 1 begins the day there (START_MORNING; a suggested
    // trip keeps the owner's day): each in order, first thing, while it fits with none of the day's own stops more than
    // START_PUSH later. (Its night stop, Dark Sky at 9:30 PM, can't move: half an hour later ends past 10 PM.)
    var morning = {}, own = {};
    whole.forEach(function (it) { own[it.siteId] = it.slotIndex; }); // later than the owner's own day has them
    if (route.kind === "built" && prevLast && prevLast.start && b.startTown === ans.start && b.endTown !== ans.start) (START_MORNING[ans.start] || []).forEach(function (id) {
      var p = places[id], at = Object.keys(morning).length;
      if (!p || !spare(p) || items.some(function (it) { return it.siteId === id; })) return;
      var trial = items.slice(0, at).concat([{ siteId: id, siteName: p.name, slotIndex: Math.max(at ? items[at - 1].slotIndex + items[at - 1].durationSlots : 0, opens(p)), durationSlots: p.slots }], items.slice(at));
      var out = packDay(pack, look, prevLast, trial);
      // (an hour's push at most, START_PUSH: Mt John, 1:30 to 3 in its day, still ends by its road's 4 PM close)
      if (fits(pack, look, prevLast, out) && out.every(function (it) { return !(it.siteId in own) || it.slotIndex - own[it.siteId] <= START_PUSH; })) {
        items = out; morning[id] = true;
      }
    });
    // A stop that belongs before last night's night stop (EARLIER) isn't added the morning after instead, on a day that drives
    // on: the day leaves early (owner, 2026-11-25). (Easy takes Mt John out of the Mount Cook to Tekapo day as its second walk.)
    var before = route.blocks[bi - 1], barred = {};
    if (before && b.startTown !== b.endTown) EARLIER.forEach(function (m) { if (before.items.some(function (x) { return x.siteId === m.before; })) barred[m.siteId] = true; });
    // (to: where the place leads on to instead of ahead: the arrival's is the town it arrives in)
    var add = function (cands, tries, slack, at, arrive, to) {
      cands = cands.filter(function (p) { return !barred[p.id] && !items.some(function (it) { return it.siteId === p.id; }); });
      var out = tryAdd(pack, look, prevLast, items, cands, b.startTown, tries, to || ahead, slack, townSpot(data, pack, b.startTown), at, arrive ? b.endTown : null, ans.pace);
      if (out) items = out;
      return !!out;
    };
    pending = pending.filter(function (a) {
      return !add(ranked(near.filter(function (p) { return p.activities.indexOf(a) >= 0; }), ans));
    });
    if (ans.pace === "hikes" && !items.some(function (it) { return longWalk(places[it.siteId]); }))
      add(ranked(near.filter(longWalk), ans));
    // A town day with room, or a drive day left with no stops, gets a place in town that fits the answers.
    if ((b.startTown === b.endTown && (ans.pace !== "easy" || items.length <= 3)) || !items.length) {
      add(ranked(townPlaces(b.endTown).filter(function (p) {
        return spare(p) && !foodOnly(p) && fitScore(p, ans) > 0; // food tips come with the day blocks
      }), ans));
    }
    // A built day left with fewer than 3 sights is topped up from its end town, then its start town. (The start morning's
    // places don't count: they come on top of the day's own.)
    var sights = function () { return items.filter(function (it) { return !foodOnly(places[it.siteId]) && !morning[it.siteId]; }).length; };
    if (route.kind === "built") {
      // (the morning after a night in Hanmer is spent there: its places first that day, owner 2026-11-24 "they would stay in Hanmer")
      var fillTowns = b.startTown === b.endTown ? [b.endTown] : b.half === 2 ? [b.startTown, b.endTown] : [b.endTown, b.startTown];
      var fill = [].concat.apply([], fillTowns.map(function (t) { return ranked(townPlaces(t).filter(spare), ans); })).filter(function (p) { return !foodOnly(p); });
      // a thin day may reach a little further off the way (40 km), never a long double back
      while (sights() < 3 && (add(fill, fill.length) || add(fill, fill.length, 40))) {}
      // A day left with no sight (every one it had was seen on an earlier day) takes its own towns' places (owner, 2026-11-24),
      // also one where the day has arrived in its end town, after the drive in.
      if (!sights()) while (sights() < 3 && (add(fill, fill.length) || add(fill, fill.length, 40) || add(fill, fill.length, undefined, undefined, true) || add(fill, fill.length, 40, undefined, true))) {}
      // The day's own towns' main attractions (featured; not food; a long walk only for Lots of walking) while the day has
      // room, best first (owner, 2026-11-23); then each one still out takes the place of a sight that is neither featured nor
      // a match for the answers, if it fits there.
      var feats = ranked(near.filter(function (p) { return p.featured && mayAdd(p, ans); }), ans);
      while (sights() < TOP_UP[ans.pace] && add(feats, feats.length)) {}
      // (never a travel day's only stop in the town it ends in: the night is there, 2026-11-24)
      var inEnd = function () { return items.filter(function (it) { return places[it.siteId].area === b.endTown; }).length; };
      feats.forEach(function (f) {
        if (items.some(function (it) { return it.siteId === f.id; })) return;
        var weak = items.filter(function (it) {
          var p = places[it.siteId];
          return !p.featured && !foodOnly(p) && fitScore(p, ans) === 0 && (b.startTown === b.endTown || p.area !== b.endTown || inEnd() > 1);
        });
        for (var w = 0; w < weak.length; w++) {
          var keep = items;
          items = closeUp(pack, look, prevLast, items, items.filter(function (it) { return it !== weak[w]; }));
          if (add([f], 1)) return;
          items = keep;
        }
      });
    }
    // A day whose own stops end in its town, but whose stops left end before it, arrives there after the drive in (ARRIVE):
    // the town's places near its middle, at least one so the night is there, then while the day has fewer than 3 sights.
    // They lead on to the town's middle, not to tomorrow: the night is in the town whichever way the trip goes on.
    var endsShort = function () { return !items.length || places[items[items.length - 1].siteId].area !== b.endTown; };
    var ownEnd = whole.length && places[whole[whole.length - 1].siteId].area;
    if (whole.length && endsShort() && (ownEnd === b.endTown || (items.length && places[items[items.length - 1].siteId].area !== ownEnd))) {
      var mid = townSpot(data, pack, b.endTown);
      var central = townPlaces(b.endTown).filter(function (p) { return spare(p) && mayAdd(p, ans) && (!mid || km(mid, p) <= ARRIVE.km); })
        .map(function (p) { return { p: p, s: fitScore(p, ans), k: mid ? km(mid, p) : 0 }; })
        .sort(function (x, y) { return y.s - x.s || (y.p.featured ? 1 : 0) - (x.p.featured ? 1 : 0) || x.k - y.k || (x.p.id < y.p.id ? -1 : 1); })
        .map(function (x) { return x.p; });
      while ((endsShort() || sights() < 3) && add(central, central.length, undefined, items.length, true, mid)) {}
      // (not held to its hours: "assume that riverside market is an option always")
    var ev = ARRIVE.evening[b.endTown] && places[ARRIVE.evening[b.endTown]];
      if (endsShort() && ev && spare(ev)) {
        var last = items[items.length - 1], late = packDay(pack, look, prevLast, items.concat([{ siteId: ev.id, siteName: ev.name, slotIndex: last ? last.slotIndex + last.durationSlots : 0, durationSlots: ev.slots }]));
        var k = late.length - 1, until = Math.min(late[k].slotIndex + ev.slots, ARRIVE.until);
        late[k] = { siteId: ev.id, siteName: ev.name, slotIndex: late[k].slotIndex, durationSlots: until - late[k].slotIndex };
        if (late[k].durationSlots >= 2 && late.slice(0, k).every(function (it, j) { return it.slotIndex === items[j].slotIndex; }) && fits(pack, look, prevLast, late)) items = packDay(pack, look, prevLast, late);
      }
    }
    // A meal is held near its time, so stops taken out before it can still leave two idle hours or more. A nearby place goes
    // in there if one fits (owner, 2026-11-23): from the town of the stop before the hole or the meal's own town, best fit
    // first, not food, a long walk only for Lots of walking, on the way to the meal (a thin day's 40 km reach if nothing closer
    // fits); no other stop moves. Then the same hole again if it is still one.
    for (var g = 1; g < items.length; g++) {
      if (!foodOnly(places[items[g].siteId]) || idleBefore(pack, look, items, g) < HOLE) continue;
      var t1 = places[items[g - 1].siteId].area, t2 = places[items[g].siteId].area;
      var into = ranked(townPlaces(t1).concat(t2 === t1 ? [] : townPlaces(t2)).filter(function (p) { return spare(p) && mayAdd(p, ans); }), ans);
      if (!add(into, into.length, undefined, g)) add(into, into.length, 40, g);
    }
    // A rest day its town can't fill (fewer than 3 sights) goes out to a nearby town and back instead if that makes a fuller
    // day (owner, 2026-11-24): a town the trip doesn't otherwise go to, the owner's ranking first; never the trip's first day.
    if (b.rest && prevLast && !prevLast.start && sights() < 3) {
      var stayed = sights(), spareSight = function (t) { return townPlaces(t).filter(function (p) { return spare(p) && mayAdd(p, ans); }); };
      var ends = ranked(spareSight(b.endTown), ans).sort(function (x, y) { return addEnd(y, ans.pace) - addEnd(x, ans.pace); }); // those that may run late first: they keep later
      var base = townHub(data, pack, b.endTown), reach = function (p) { var l = pack.getLeg(base, p.id, look); return !l.drive || l.slots <= DAY_OUT.slots; };
      nearbyTowns(data, pack, b.endTown).some(function (n) {
        var trip = !visited[n] && dayOut(pack, look, prevLast, ans, ranked(spareSight(n).filter(reach), ans), ends);
        if (!trip || trip.length <= stayed) return false; // every stop of a day out is a sight
        items = trip; visited[n] = true;
        return true;
      });
    }
    // A day in a town with favourites left with no sight goes back to them (FAVOURITES, owner 2026-11-24): each in the town's
    // order, the next right after the last; then they move to 10 AM if they open the day, and the last fills the time to the
    // next stop (less the drive) or to 6 hours after the first began, done by 6 PM. No other stop moves.
    var favs = !sights() && FAVOURITES[b.endTown];
    if (favs) {
      var fk = -1, ids = function () { return items.map(function (it) { return it.siteId; }); };
      favs.forEach(function (id) { if (add([places[id]], 1, undefined, fk < 0 ? undefined : fk + 1)) fk = ids().indexOf(id); });
      var on = ids().map(function (id, j) { return favs.indexOf(id) >= 0 ? j : -1; }).filter(function (j) { return j >= 0; });
      if (on.length) {
        var long = items.map(function (it) { return { siteId: it.siteId, siteName: it.siteName, slotIndex: it.slotIndex, durationSlots: it.durationSlots }; });
        if (!on[0]) long[0].slotIndex = Math.max(long[0].slotIndex, FAVOURITE_DAY.from);
        long = packDay(pack, look, prevLast, long);
        var fl = on[on.length - 1], lp = places[long[fl].siteId], nx = items[fl + 1];
        var till = Math.min(nx ? nx.slotIndex - pack.getLeg(lp.id, nx.siteId, look).slots : addEnd(lp, ans.pace), long[on[0]].slotIndex + FAVOURITE_DAY.most, closes(lp));
        long[fl] = { siteId: lp.id, siteName: long[fl].siteName, slotIndex: long[fl].slotIndex, durationSlots: Math.max(lp.slots, till - long[fl].slotIndex) };
        var timed = packDay(pack, look, prevLast, long);
        if (timed.every(function (it, j) { return it.slotIndex === (on.indexOf(j) >= 0 ? long[j] : items[j]).slotIndex; }) && fits(pack, look, prevLast, timed)) items = timed;
      }
    }
    // The one final check every returned day passes, whatever removed or added its stops: packTrip moves nothing
    // and nothing ends after 10 PM; otherwise drop the last stop and time the day again.
    while (items.length && !fits(pack, look, prevLast, items)) items = packDay(pack, look, prevLast, items.slice(0, -1));
    // Nothing left: the traveller stays put, as the app takes an empty day.
    if (!items.length) return { town: b.endTown, block: b.id, free: true, items: [] };
    items.forEach(function (it) { used[it.siteId] = true; });
    return { town: b.endTown, block: b.id, items: items.map(function (it) {
      return { siteId: it.siteId, siteName: it.siteName, slotIndex: it.slotIndex, durationSlots: it.durationSlots, timeLabel: it.timeLabel, durationLabel: it.durationLabel };
    }) };
  };
  // A rest day takes what the trip's other days leave (owner, 2026-11-24): every other day first, in order (a rest day still
  // empty then), then the rest days.
  route.blocks.forEach(function (b, bi) {
    if (b.rest) return;
    days[bi] = dayOf(b, bi);
    b.items.forEach(function (it) { planned[it.siteId]--; });
  });
  route.blocks.forEach(function (b, bi) { if (b.rest) days[bi] = dayOf(b, bi); });
  // An afternoon still empty then takes more in the day's town (AFTERNOON), in order, once every day has had its own (a whole
  // rest day before half a day). The night is in the town, so the places head for its middle. A favourite not twice in a day,
  // nor the day after it was had.
  route.blocks.forEach(function (b, bi) {
    var items = days[bi].items, prevLast = lastBefore(bi), last = items[items.length - 1];
    var lastEnd = function () { var l = items[items.length - 1]; return l.slotIndex + l.durationSlots; };
    if (!last || places[last.siteId].area !== b.endTown || lastEnd() >= AFTERNOON.before) return;
    var heart = townSpot(data, pack, b.endTown), had = items.concat(bi ? days[bi - 1].items : []);
    var favs0 = (FAVOURITES[b.endTown] || []).map(look).filter(function (p) { return p && mayAdd(p, ans) && !had.some(function (it) { return it.siteId === p.id; }); });
    var later = favs0.concat(townPlaces(b.endTown).filter(function (p) { return spare(p) && mayAdd(p, ans) && favs0.indexOf(p) < 0; })
      .map(function (p) { return { p: p, s: fitScore(p, ans), k: km(places[last.siteId], p) }; })
      .sort(function (x, y) { return y.s - x.s || (y.p.featured ? 1 : 0) - (x.p.featured ? 1 : 0) || x.k - y.k || (x.p.id < y.p.id ? -1 : 1); })
      .map(function (x) { return x.p; }));
    for (var out; lastEnd() < AFTERNOON.until; items = out) {
      var left = later.filter(function (p) { return !items.some(function (it) { return it.siteId === p.id; }); });
      out = tryAdd(pack, look, prevLast, items, left, b.startTown, left.length, heart, undefined, townSpot(data, pack, b.startTown), items.length, null, ans.pace);
      if (!out) break;
    }
    // still empty: one long walk, though the pace leaves them out, when nothing shorter fits (owner, 2026-11-24)
    if (lastEnd() < AFTERNOON.before) {
      var walks = townPlaces(b.endTown).filter(function (p) { return spare(p) && longWalk(p) && !mayAdd(p, ans) && !foodOnly(p); })
        .sort(function (x, y) { return fitScore(y, ans) - fitScore(x, ans) || (y.featured ? 1 : 0) - (x.featured ? 1 : 0) || km(places[last.siteId], x) - km(places[last.siteId], y) || (x.id < y.id ? -1 : 1); });
      items = tryAdd(pack, look, prevLast, items, walks, b.startTown, walks.length, heart, undefined, townSpot(data, pack, b.startTown), items.length, null, ans.pace) || items;
    }
    items.forEach(function (it) { used[it.siteId] = true; });
    days[bi] = { town: days[bi].town, block: days[bi].block, items: items.map(function (it) {
      return { siteId: it.siteId, siteName: it.siteName, slotIndex: it.slotIndex, durationSlots: it.durationSlots, timeLabel: it.timeLabel, durationLabel: it.durationLabel };
    }) };
  });
  // Each day timed and its driving counted from where the traveller really was before it, which a rest day filled after the
  // day that follows it can change: the final check again, then the day's drive against the limit.
  days.forEach(function (d, bi) {
    if (d.free) return;
    var from = lastBefore(bi), items = d.items;
    if (!fits(pack, look, from, items)) {
      items = packDay(pack, look, from, items); // timed again from there
      // a stop the builder added that this pushes past its end (6 PM, its close) goes: only the day's own stops and the
      // evening place run later (not for Lots of walking, left as it was for now)
      if (ans.pace !== "hikes") {
        var own = {};
        route.blocks[bi].items.forEach(function (it) { own[it.siteId] = true; });
        items = packDay(pack, look, from, items.filter(function (it) {
          return own[it.siteId] || it.siteId === ARRIVE.evening[d.town] || it.slotIndex + it.durationSlots <= Math.min(addEnd(places[it.siteId], ans.pace), closes(places[it.siteId]));
        }));
      }
    }
    while (items.length && !fits(pack, look, from, items)) items = packDay(pack, look, from, items.slice(0, -1));
    if (!items.length) { days[bi] = { town: d.town, block: d.block, free: true, items: [] }; return; }
    d.items = items;
    d.driveMinutes = driveOf(pack, look, from ? from.siteId : pack.hubs[route.blocks[bi].startTown], items);
    if (d.driveMinutes > ans.drive) d.overLimit = true;
  });
  var has = {};
  days.forEach(function (d) { d.items.forEach(function (it) { places[it.siteId].activities.forEach(function (a) { has[a] = true; }); }); });
  return { days: days, missing: ans.activities.filter(function (a) { return !has[a]; }) };
}

// A route's spare days (null) outside the owner's spare-day towns (SPARE_TOWNS). In Kaikōura (SPARE), when the stay there
// begins or ends with the day between Kaikōura and Christchurch through Hanmer, that day becomes two with the night in Hanmer
// between them, its stops up to its last one in Hanmer and then the rest. Otherwise the spare day moves to the nearest day the
// trip is in one of SPARE_TOWNS, never next to another spare day; else it stays.
function spareDays(data, ans, blocks) {
  var look = function (id) { return data.places[id]; }, out = blocks.slice();
  var townAt = function (p) { for (var k = p - 1; k >= 0; k--) if (out[k]) return out[k].endTown; return ans.start; };
  var inTown = function (b) { return !b || (b.startTown === SPARE.town && b.endTown === SPARE.town); };
  var through = function (b) {
    return !!b && [b.startTown, b.endTown].sort().join() === [SPARE.town, SPARE.instead].sort().join() &&
      b.items.some(function (it) { return look(it.siteId).area === SPARE.night; });
  };
  var split = function (b) {
    var k = 0;
    b.items.forEach(function (it, j) { if (look(it.siteId).area === SPARE.night) k = j + 1; });
    return [[b.startTown, SPARE.night, b.items.slice(0, k)], [SPARE.night, b.endTown, b.items.slice(k)]].map(function (h, j) {
      return { id: b.id + "|" + SPARE.night + "|" + (j + 1), startTown: h[0], endTown: h[1], items: h[2], half: j + 1 };
    });
  };
  for (var i = 0; i < out.length; i++) {
    if (out[i] || SPARE_TOWNS.indexOf(townAt(i)) >= 0) continue;
    var a = i - 1, z = i + 1;
    while (a >= 0 && inTown(out[a])) a--;
    while (z < out.length && inTown(out[z])) z++;
    if (a >= 0 && through(out[a])) { out.splice(i, 1); out.splice.apply(out, [a, 1].concat(split(out[a]))); }
    else if (z < out.length && through(out[z])) { out.splice.apply(out, [z, 1].concat(split(out[z]))); out.splice(i, 1); }
    else {
      out.splice(i, 1);
      var to = -1;
      for (var p = 0; p <= out.length; p++) {
        if (SPARE_TOWNS.indexOf(townAt(p)) >= 0 && !(p && !out[p - 1]) && !(p < out.length && !out[p]) && (to < 0 || Math.abs(p - i) < Math.abs(to - i))) to = p;
      }
      out.splice(to < 0 ? i : to, 0, null);
      if (to < 0) continue; // nowhere in those towns: it stays
    }
    i = -1; // the days moved: look again from the first
  }
  return out;
}

// A filled trip (personalise's result) that drives more over the visitor's limit than another: more days over it, or more
// minutes over it in all (a day already over can't get longer either).
function drivesMore(q, than, ans) {
  var over = function (x) {
    var n = { days: 0, mins: 0 };
    x.days.forEach(function (d) { if (d.overLimit) { n.days++; n.mins += d.driveMinutes - ans.drive; } });
    return n;
  };
  var a = over(q), b = over(than);
  return a.days > b.days || a.mins > b.mins;
}

// A trip that stays in Te Anau without the Doubtful Sound cruise but with a spare day (DOUBTFUL): a spare day becomes the
// owner's Doubtful Sound day, without its food, the day after the trip first arrives there; the nearest spare day first, each
// tried in turn. The trip is filled again (p: personalise's result) and kept only with the cruise in it, no more empty days,
// and no more driving over the limit.
function doubtfulDay(data, pack, ans, r, p) {
  var day = prepare(data).byId[DOUBTFUL.day];
  if (!day) return p;
  var cruise = { id: day.id + "|no-food", startTown: day.startTown, endTown: day.endTown, driveMinutes: day.driveMinutes, items: day.items.filter(function (it) { return !foodOnly(data.places[it.siteId]); }) };
  return soundDay(data, pack, ans, r, p, DOUBTFUL.cruise, cruise, function (b) { return b.rest; }, true);
}

// The owner's Milford day (owner, 2026-11-25: "the Invercargill trips should include Milford sound"; "pick (a) for trips of 7
// days or more, and (b) for shorter ones"): in a trip that stays in Te Anau without the Milford cruise, the first day there
// is the Milford day (before Doubtful Sound, which goes second: doubtfulDay runs after), in place of a spare day there, else
// another day there, Doubtful Sound last. A trip of 7 days or more that only passes through takes a spare day from
// elsewhere for it (the nearest first), over the spare-day towns (SPARE_TOWNS). Kept only with the cruise in it and no more
// empty days; more driving over the limit is allowed (owner, 2026-11-24: days over the limit are OK): the Milford road is
// 3 hours there and back.
var MILFORD = { day: "miles-better-pies..redcliff-te-anau", cruise: "cruise-milford-small-boat-cruise", pullDays: 7 };
function milfordDay(data, pack, ans, r, p) {
  var day = prepare(data).byId[MILFORD.day], town = DOUBTFUL.town;
  if (!day) return p;
  var here = function (b) { return b.startTown === town && b.endTown === town; };
  var rank = function (b) { return b.rest ? 0 : b.items.some(function (it) { return it.siteId === DOUBTFUL.cruise; }) ? 2 : 1; };
  return soundDay(data, pack, ans, r, p, MILFORD.cruise, day, function (b, i, at) {
    var stay = at >= 0 && i >= at && r.blocks.slice(at, i + 1).every(here);
    return stay || (b.rest && ans.days >= MILFORD.pullDays);
  }, false, function (k, at) { return r.blocks.slice(at, k + 1).every(here) ? rank(r.blocks[k]) : 3; });
}

// A sound's day (`cruise`, the place id; `day`, the block) the day after the trip first arrives in Te Anau, after any Milford
// day there, in place of a day `may(block, index, at)` allows: in `order(index, at)` (lowest first), then the nearest. Kept
// only with the cruise in it, no more empty days, and (`noMoreOver`) no more driving over the limit.
function soundDay(data, pack, ans, r, p, cruise, day, may, noMoreOver, order) {
  var has = function (q) { return q.days.some(function (d) { return d.items.some(function (it) { return it.siteId === cruise; }); }); };
  var free = function (q) { return q.days.filter(function (d) { return d.free; }).length; };
  // the first time the trip arrives there to stay (a day in Te Anau after), else the first time it arrives
  var at = -1, here = function (b) { return !!b && b.startTown === DOUBTFUL.town && b.endTown === DOUBTFUL.town; };
  r.blocks.forEach(function (b, i) { if (b.endTown === DOUBTFUL.town && b.startTown !== DOUBTFUL.town && (at < 0 || (!here(r.blocks[at]) && here(r.blocks[i + 1])))) at = i + 1; });
  if (at < 0 || has(p)) return p;
  var to = at;
  while (to < r.blocks.length && r.blocks[to].items.some(function (it) { return it.siteId === MILFORD.cruise; })) to++;
  var spots = r.blocks.map(function (b, i) { return may(b, i, at) && b.id !== day.id ? i : -1; }).filter(function (i) { return i >= 0 && (i < at || i >= to); });
  if (!spots.length) return p;
  var by = order || function () { return 0; };
  spots.sort(function (x, y) { return by(x, at) - by(y, at) || Math.abs(x - to) - Math.abs(y - to) || x - y; });
  for (var s = 0; s < spots.length; s++) {
    var k = spots[s], blocks = r.blocks.slice();
    blocks.splice(k, 1);
    blocks.splice(k < to ? to - 1 : to, 0, day);
    var np = personalise(data, pack, ans, { kind: r.kind, end: r.end, blocks: blocks });
    if (has(np) && free(np) <= free(p) && (!noMoreOver || !drivesMore(np, p, ans))) { r.blocks = blocks; return np; }
  }
  return p;
}

// A day its town can't fill moves (owner, 2026-11-24, the Kaikōura rule for any town: "an extra day in Christchurch not
// Kaikōura"): a spare day left with nothing, or a day in town left with nothing by repeats, becomes a spare day in another town
// of the trip that fills it, the best town first (the owner's ranking) and the nearest point there, never next to another spare
// day. The trip is filled again (p: personalise's result) and kept only with fewer empty days (so the loop ends), even with
// more driving over the limit (owner, 2026-11-24: days over the limit are OK, "it may not always be possible"; an empty day
// is not).
function moveEmpty(data, pack, ans, r, p) {
  var tried = [], count = function (q) { return q.days.filter(function (d) { return d.free; }).length; };
  for (;;) {
    var k = -1;
    p.days.forEach(function (d, i) { var b = r.blocks[i]; if (k < 0 && d.free && b.startTown === b.endTown && tried.indexOf(b) < 0) k = i; });
    if (k < 0) return p;
    var b = r.blocks[k], left = r.blocks.slice(0, k).concat(r.blocks.slice(k + 1)), empty = count(p);
    tried.push(b);
    if (k && k < left.length && left[k - 1].rest && left[k].rest) continue; // its two neighbours are spare days
    var order = [], townOf = function (q) { return q ? left[q - 1].endTown : ans.start; };
    for (var q = 0; q <= left.length; q++) order.push(q);
    order.sort(function (x, y) { return townPref(townOf(y)) - townPref(townOf(x)) || Math.abs(x - k) - Math.abs(y - k) || x - y; });
    for (var o = 0; o < order.length; o++) {
      var at = townOf(order[o]);
      if (at === b.endTown || (order[o] && left[order[o] - 1].rest) || (order[o] < left.length && left[order[o]].rest)) continue;
      var blocks = left.slice(0, order[o]).concat([{ id: "rest-" + at, startTown: at, endTown: at, driveMinutes: 0, items: [], rest: true }], left.slice(order[o]));
      var np = personalise(data, pack, ans, { kind: r.kind, end: r.end, blocks: blocks });
      if (count(np) < empty) { r.blocks = blocks; p = np; break; }
    }
  }
}

// A stop of a suggested trip moved to another of its days on the website (owner, 2026-11-24, Picton to Christchurch via
// Kaikōura: "add seal colony to day 2? ... moving ohau point"): out of its day (closed up), after the last stop of day `to`
// (0 is day 1) and the hop there. The app's trip keeps its own days.
var MOVES = { "picton-to-christchurch-via-kaikoura": [{ siteId: "ohau-point-seal-colony", to: 1 }] };
function moveStops(key, blocks, pack, look) {
  (MOVES[key] || []).forEach(function (m) {
    var from = -1;
    blocks.forEach(function (b, i) { if (from < 0 && b.items.some(function (it) { return it.siteId === m.siteId; })) from = i; });
    if (from < 0 || from === m.to || !blocks[m.to]) return;
    blocks = blocks.slice();
    var src = blocks[from], it = src.items.filter(function (x) { return x.siteId === m.siteId; })[0], dst = blocks[m.to], last = dst.items[dst.items.length - 1];
    var slim = function (x) { return { siteId: x.siteId, siteName: x.siteName, slotIndex: x.slotIndex, durationSlots: x.durationSlots }; };
    blocks[from] = Object.assign({}, src, { items: closeUp(pack, look, null, src.items, src.items.filter(function (x) { return x !== it; })).map(slim) });
    blocks[m.to] = Object.assign({}, dst, { items: dst.items.concat([{ siteId: it.siteId, siteName: it.siteName, slotIndex: last.slotIndex + last.durationSlots + pack.getLeg(last.siteId, it.siteId, look).slots, durationSlots: it.durationSlots }]) });
  });
  return blocks;
}

// A stop a trip has the morning after a night stop, moved to before that night stop (owner, 2026-11-25: "move mt john to
// before the dark sky and then bring the next day down so travel happens earlier"): Mt John Summit goes in ahead of the
// first sight of the Dark Sky day in Tekapo (its road shuts at 4 PM, so before Tekapo Springs, which moves back for it),
// and the day after closes up behind it. Only when it ends by its close with the night stop still at its time. Both kinds
// of trip, on the website only: the app's trip keeps its own days. A built trip (`add`) that has it on no day takes it
// there too (the owner's 3 days from Christchurch, 2026-11-24: "tekapo springs then summit mt st john and dark sky"; the
// builder used to add it after the springs, past the road's close).
var EARLIER = [{ siteId: "mt-john-summit-astro-cafe", before: "dark-sky-project-summit-experience" }];
function moveEarlier(blocks, pack, look, add) {
  var slim = function (x) { return { siteId: x.siteId, siteName: x.siteName, slotIndex: x.slotIndex, durationSlots: x.durationSlots }; };
  EARLIER.forEach(function (m) {
    var p = look(m.siteId), has = function (b) { return !!b && b.items.some(function (x) { return x.siteId === m.siteId; }); };
    for (var k = 0; p && k < blocks.length; k++) {
      var a = blocks[k], b = blocks[k + 1];
      var night = a && a.items.filter(function (x) { return x.siteId === m.before; })[0];
      if (!night || has(a)) continue;
      var it = has(b) ? b.items.filter(function (x) { return x.siteId === m.siteId; })[0] : null;
      if (!it && (!add || blocks.some(has))) continue;
      var town = look(night.siteId).area, at = -1;
      a.items.forEach(function (x, j) { if (at < 0 && look(x.siteId).area === town && !foodOnly(look(x.siteId))) at = j; });
      var tried = packDay(pack, look, null, a.items.slice(0, at).map(slim).concat(
        [{ siteId: p.id, siteName: p.name, slotIndex: Math.max(a.items[at].slotIndex, opens(p)), durationSlots: it ? it.durationSlots : p.slots }], a.items.slice(at).map(slim)));
      if (tried[at].slotIndex + tried[at].durationSlots > closes(p) || tried[a.items.indexOf(night) + 1].slotIndex !== night.slotIndex) continue;
      blocks = blocks.slice();
      blocks[k] = Object.assign({}, a, { items: tried.map(slim) });
      if (it) blocks[k + 1] = Object.assign({}, b, { items: closeUp(pack, look, null, b.items, b.items.filter(function (x) { return x !== it; })).map(slim) });
    }
  });
  return blocks;
}

// buildTrips(data, pack, answers) -> up to three trip options, best first.
// Suggested trips with the same start and length always come first (over-limit days marked); then the best loop
// and the best one-way built from the blocks, the one-way only when it scores at least as well as the loop.
// answers.end, when given, is where the trip finishes: the start for a loop only, another start town for a one-way there only.
function buildTrips(data, pack, ans) {
  var ctx = prepare(data), pts = new Array(ctx.words * 32);
  Object.keys(ctx.stopIx).forEach(function (id) { pts[ctx.stopIx[id]] = fitScore(data.places[id], ans); });
  var loopOk = !ans.end || ans.end === ans.start;
  var ends = !ans.end ? data.starts.filter(function (s) { return s !== ans.start; }) : loopOk ? [] : [ans.end];
  var loop = loopOk ? bestRoute(ctx, ans, [ans.start], pts) : null, oneWay = ends.length ? bestRoute(ctx, ans, ends, pts) : null;
  var built = [];
  if (loop) built.push(loop);
  if (oneWay && (!loop || oneWay.cost <= loop.cost)) built.push(oneWay);
  built.sort(function (a, b) { return a.cost - b.cost; });
  built = built.filter(function (r, i) { return !i || r.cost < 1e9; }); // free days anywhere only when nothing else goes
  // No loop of this length at all (Nelson in 2 days: its one block out leads away): every day in the start town, which
  // personalise fills from the town's own places as it tops up any town day; kept only if every day gets places.
  if (!built.length && loopOk) {
    var stay = { id: "stay-" + ans.start, startTown: ans.start, endTown: ans.start, driveMinutes: 0, items: [] };
    built.push({ cost: 0, end: ans.start, blocks: new Array(ans.days).fill(stay), stay: true });
  }
  // Every free day of a built route (a last-resort route's too: Dunedin and back in 3 days, review 2026-11-23) is a rest day
  // ("rest-<town>", owner 2026-11-24), spent in the town it is in and filled from the town's places like any town day, or
  // out to a nearby town and back; one in Kaikōura is a night in Hanmer or a day in Christchurch first (spareDays).
  built.forEach(function (r) {
    var at = ans.start;
    r.blocks = spareDays(data, ans, r.blocks).map(function (b) {
      if (b) { at = b.endTown; return b; }
      return { id: "rest-" + at, startTown: at, endTown: at, driveMinutes: 0, items: [], rest: true };
    });
    r.blocks = moveEarlier(r.blocks, pack, function (id) { return data.places[id]; }, true);
  });
  built.forEach(function (r) {
    r.kind = "built";
    r.key = "built-" + ans.start + "-" + ans.days + "-" + (r.end === ans.start ? "loop" : "oneway");
    r.label = "South Island in " + ans.days + " Days";
  });
  var suggested = data.templates.filter(function (t) { return t.start === ans.start && t.blockIds.length === ans.days; }).map(function (t) {
    var look = function (id) { return data.places[id]; };
    var blocks = moveEarlier(moveStops(t.key, t.blockIds.map(function (id) { return ctx.byId[id]; }), pack, look), pack, look);
    return { kind: "suggested", key: t.key, label: t.label, blocks: blocks, end: blocks[blocks.length - 1].endTown };
  }).filter(function (r) { return !ans.end || r.end === ans.end; });
  return suggested.concat(built).slice(0, 3).map(function (r) {
    var p = personalise(data, pack, ans, r);
    if (r.stay && p.days.some(function (d) { return d.free; })) return null; // the town ran out of places
    if (r.kind === "built" && !r.stay) p = moveEmpty(data, pack, ans, r, doubtfulDay(data, pack, ans, r, milfordDay(data, pack, ans, r, p)));
    return { kind: r.kind, key: r.key, label: r.label, start: ans.start, end: r.end, days: p.days, missing: p.missing };
  }).filter(Boolean);
}

if (typeof module !== "undefined") module.exports = { buildTrips: buildTrips, TOWNS_RANKED: TOWNS_RANKED, townCost: townCost, TOP_UP: TOP_UP, onWay: onWay, townSpot: townSpot, closeUp: closeUp, mayAdd: mayAdd, ONE_DAY: ONE_DAY, nearbyTowns: nearbyTowns, DAY_OUT: DAY_OUT, FAVOURITES: FAVOURITES, START_MORNING: START_MORNING, START_PUSH: START_PUSH, ARRIVE: ARRIVE, AFTERNOON: AFTERNOON, MOVES: MOVES, moveStops: moveStops, SPARE_TOWNS: SPARE_TOWNS, MILFORD: MILFORD, EARLIER: EARLIER, moveEarlier: moveEarlier, dayOut: dayOut, lateOk: lateOk };
