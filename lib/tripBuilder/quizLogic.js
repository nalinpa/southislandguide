// COPIED from kiwiguide-site public/plan/quiz.js at 190334c. The web page half is left out. Don't edit here: change it on the
// website, then run `node scripts/copy-site-builder.mjs`.
// The trip quiz: where you start, how long, when, how you like to travel, then a trip built for the answers (builder.js).
// The pure functions at the top are tested (test/quiz.test.js); the page code at the bottom only runs in a browser.

var PHOTO = "https://api.blacksands.app/images/southislandguide/";
// fact: the first photo break's line, after "<Town>, <N> days." (the owner's words, 2026-11-23)
var TOWNS = [
  { id: "queenstown", out: "Fly out of Queenstown", name: "Queenstown", sub: "Fly in to the lakes and mountains, with Wānaka and Milford Sound close by.", fact: "Lake and mountains in every direction and more adventure than you could pack into a month.", img: PHOTO + "a6904a0d-2c8e-4f25-b533-e51241d6665e.webp" },
  { id: "christchurch", out: "Fly out of Christchurch", name: "Christchurch", sub: "Fly in to the Garden City, then inland to Tekapo and Mount Cook or up the coast to Kaikōura.", fact: "A garden city with fresh energy, great food and a lively bar scene, and the beach and the Port Hills both close by.", img: PHOTO + "2f5a12e0-dfbc-4fcd-a7bc-f86ca3e0e0dd.webp" },
  { id: "picton", out: "Take the ferry back to Wellington", name: "Picton", sub: "Off the ferry from Wellington, into the Marlborough Sounds, Nelson and Abel Tasman.", fact: "A laid-back harbour town at the edge of the Marlborough Sounds with boat trips, bush walks and wineries close by.", img: PHOTO + "7711e2f4-268e-4f3e-ab25-30d72a357cbe.webp" },
  // Larnach Castle, Moturoa / Rabbit Island, Stirling Point (Bluff): featured places in each town
  // more: behind the start screen's "Other towns" button (the owner, 2026-11-23)
  { id: "dunedin", out: "Fly out of Dunedin", name: "Dunedin", sub: "Wildlife, castles and steep streets, then south to the Catlins or inland to Central Otago.", fact: "A southern city with real character and a wild peninsula where albatross, penguins and seals live just out of town.", img: PHOTO + "6bdb19f2-c7e1-4601-bfd2-0c4265831f74.webp", more: true },
  { id: "nelson", out: "Fly out of Nelson", name: "Nelson", sub: "Golden beaches and Abel Tasman on the sunny top of the island.", fact: "The sunniest spot in the country with golden beaches and Abel Tasman a short drive away.", img: PHOTO + "8d44a03a-d3ba-4c71-ba59-a25faf23e4b5.webp", more: true },
  { id: "invercargill", out: "Fly out of Invercargill", name: "Invercargill", sub: "The far south: Bluff, the Catlins and Fiordland.", fact: "Friendly and unhurried and your way in to Bluff, the Catlins and the ferry across to Stewart Island.", img: PHOTO + "a2f24963-ec1c-4a10-a50c-31733b302595.webp", more: true },
];

var STEPS = ["start", "band", "days", "finish", "break1", "season", "month", "pace", "drive", "who", "age", "vibe", "break2", "into", "food", "heard", "account", "choice", "reveal", "done"];

// "How long have you got?", the first quiz's rough lengths: each opens the days picker on its top number (2 to 21 days).
var BANDS = [
  { id: "weekend", label: "A long weekend", hint: "Three or four days", days: 4 },
  { id: "week", label: "About a week", hint: "Five to seven days", days: 7 },
  { id: "ten", label: "Ten days or so", hint: "A good chunk of the island", days: 10 },
  { id: "fortnight", label: "A couple of weeks", hint: "Time to slow down", days: 14 },
  { id: "long", label: "Three weeks", hint: "The whole island", days: 21 },
];
function bandOf(id) { return BANDS.filter(function (b) { return b.id === id; })[0]; }

// The fewest days from each start (row) to each finish (column) from which every length up to 21 gets a trip. The builder's
// day blocks set these (test/quiz.test.js checks them against builder.js). From Invercargill, the website-only day to Te
// Anau (owner, 2026-11-24) reaches Queenstown, and back to Invercargill, in 2.
var MIN_DAYS = {
  queenstown: { queenstown: 2, christchurch: 4, picton: 6, dunedin: 3, nelson: 7, invercargill: 2 },
  christchurch: { queenstown: 4, christchurch: 2, picton: 2, dunedin: 7, nelson: 3, invercargill: 6 },
  picton: { queenstown: 6, christchurch: 2, picton: 2, dunedin: 9, nelson: 2, invercargill: 8 },
  dunedin: { queenstown: 3, christchurch: 2, picton: 3, dunedin: 2, nelson: 4, invercargill: 5 },
  nelson: { queenstown: 8, christchurch: 4, picton: 3, dunedin: 11, nelson: 2, invercargill: 10 },
  invercargill: { queenstown: 2, christchurch: 3, picton: 5, dunedin: 2, nelson: 6, invercargill: 2 },
};
function minDays(start, end) { return (MIN_DAYS[start] && MIN_DAYS[start][end]) || 2; }
// The days are asked before the finish (owner, 2026-11-23). The fewest days any trip from this start takes:
function leastFrom(start) { var row = MIN_DAYS[start]; return row ? Math.min.apply(null, Object.keys(row).map(function (k) { return row[k]; })) : 2; }
// and the finishes a trip of this many days can reach from it, in the towns' order (never none: test/quiz.test.js).
function endsFor(start, days) { return TOWNS.filter(function (t) { return minDays(start, t.id) <= days; }).map(function (t) { return t.id; }); }
// The finish screen for a start and a number of days: the loop card (when the days get back), the towns shown as cards,
// and the towns behind "Somewhere else?" (only when there are two or more of them and the screen would run past four cards;
// none once it is open). Towns the days can't reach are left off (owner, 2026-11-23).
function finishCards(start, days, open) {
  var ok = endsFor(start, days), can = function (id) { return ok.indexOf(id) >= 0; };
  var rest = TOWNS.filter(function (t) { return t.id !== start && can(t.id); }), more = rest.filter(function (t) { return t.more; });
  var all = open || more.length < 2 || (can(start) ? 1 : 0) + rest.length <= 4;
  return {
    home: can(start),
    towns: rest.filter(function (t) { return all || !t.more; }).map(function (t) { return t.id; }),
    behind: all ? [] : more.map(function (t) { return t.id; }),
  };
}

var PACES = [
  { id: "easy", label: "Easy", hint: "Short walks, mostly flat. Skips the longest walk on a busy day." },
  { id: "some", label: "Some walking", hint: "A mix: a few good walks, nothing all day." },
  { id: "hikes", label: "Lots of walking", hint: "Adds the long walks of two hours or more in each town." },
];
var DRIVES = [
  { id: 120, label: "A little", hint: "Up to 2 hours a day" },
  { id: 240, label: "Some", hint: "Up to 4 hours a day" },
  { id: 360, label: "Happy to drive", hint: "Up to 6 hours a day" },
];
// A long way in few days: the drive between the start's and the finish's hubs (the app's own, test/quiz.test.js checks it
// against pack.js), spread over the days, is over 2 hours a day. The driving isn't asked then: Happy to drive (owner,
// 2026-11-24: "dont ask them about it on those short long distance trips"). Each: the fewest days 2 hours a day covers.
var LONG_DRIVES = { christchurch: { picton: 3 }, picton: { christchurch: 3 }, dunedin: { christchurch: 3, picton: 5, nelson: 5 }, invercargill: { christchurch: 4, picton: 6, nelson: 7 } };
function longDrive(start, end, days) { return !!(LONG_DRIVES[start] && LONG_DRIVES[start][end] > days); }
// Who's travelling, their age and how they heard of the app (owner, 2026-11-24): kept with the quiz answers (analytics) only,
// the trip the same whatever they say. Age and how they heard can be skipped ("skip").
var WHO = [
  { id: "solo", label: "Solo", hint: "Just me" },
  { id: "couple", label: "Couple", hint: "The two of us" },
  { id: "family", label: "Family", hint: "With kids" },
  { id: "group", label: "Group", hint: "Friends travelling together" },
];
var AGES = [{ id: "18-29", label: "18–29" }, { id: "30-44", label: "30–44" }, { id: "45-59", label: "45–59" }, { id: "60+", label: "60+" }];
var HEARD = [{ id: "app-store", label: "App Store" }, { id: "google", label: "Google" }, { id: "social", label: "Instagram or TikTok" }, { id: "friend", label: "A friend" }, { id: "other", label: "Other" }];
var VIBES = [
  { id: "relax", label: "Relax", hint: "Beaches, cafés, a slower day" },
  { id: "sightseeing", label: "Sightseeing", hint: "Lookouts, towns and the famous views" },
  { id: "nature", label: "Nature", hint: "Forest, lakes, wildlife and quiet" },
  { id: "adventure", label: "Adventure", hint: "Jet boats, bungy and big days out" },
];
// The place categories, less Food (its own question)
var INTO = [
  { id: "Scenic", label: "Scenic", hint: "Lookouts and big views" },
  { id: "Walks", label: "Walks", hint: "From a short stroll to a day out" },
  { id: "Nature", label: "Nature", hint: "Wildlife, lakes and forest" },
  { id: "Water", label: "Water", hint: "Beaches, boats, swimming" },
  { id: "Culture", label: "Culture", hint: "Museums, history and local stories" },
  { id: "Attractions", label: "Attractions", hint: "Gondolas, castles and the famous things" },
  { id: "Adventure", label: "Adventure", hint: "Jet boats, bungy and big days out" },
];
// The activities a card can add to the trip, each line naming places or towns the data tags. No surfing or mountain biking
// until the owner has tracked them (2026-11-23); skiing needs a card of its own once a ski field is tagged (none yet).
var ACTIVITIES = [
  { id: "skiing", label: "Skiing", hint: "Only offered June to October" },
  { id: "hot-pools", label: "Hot pools", hint: "Hanmer Springs, Tekapo Springs and more" },
  { id: "kayaking", label: "Kayaking", hint: "Abel Tasman, Wānaka, Franz Josef and more" },
  { id: "wildlife", label: "Wildlife", hint: "Kaikōura, Ōamaru, Dunedin and more" },
  { id: "stargazing", label: "Stargazing", hint: "Mt John and the Dark Sky Project, Tekapo" },
  { id: "wine", label: "Wine", hint: "Wine tours around Blenheim" },
];
// "What are you into?": a swipe card per kind of place (into) and per activity (act), mixed (owner, 2026-11-23). Each shows one
// real place (site) in its full-size app photo, credited as the app repo's docs/photo-sources.md records. Nature's whale says
// yes to wildlife too, so wildlife has no card of its own.
var DECK = [
  { into: "Scenic", site: "devils-staircase-lookout", img: PHOTO + "b2e5ef81-cc95-4268-a0e1-49263665fa12.webp", alt: "Lake Wakatipu below a long range of snow-capped mountains, with scrub in the foreground", credit: "public domain, via Wikimedia Commons" },
  { into: "Walks", site: "routeburn-track-day-walk", img: PHOTO + "75144c4e-3c1c-47c3-b1c9-fbe3e9041c51.webp", alt: "A wooden swing bridge on a walking track, leading into misty beech forest", credit: "ShakyIsles, CC BY-SA 4.0, resized" },
  { into: "Nature", act: "wildlife", site: "whale-watch-kaikoura", img: PHOTO + "d07fe98e-0016-4bdd-addc-5f078dc4c73e.webp", alt: "A whale’s tail rising out of the sea, with mountains behind", credit: "Whale Watch Kaikoura" },
  { into: "Water", site: "cruise-milford-small-boat-cruise", img: PHOTO + "67aba220-6978-4ea7-9ea9-5c747da82491.webp", alt: "A small cruise boat on Milford Sound below a sheer, bush-covered mountain wall, with a waterfall to the left", credit: "Great South" },
  { act: "hot-pools", site: "onsen-hot-pools", img: PHOTO + "af2e0c60-d2be-4628-a5c8-72f8c7a89dd2.webp", alt: "A woman soaking in a cedar hot tub, looking out at mountains in evening light", credit: "Onsen Hot Pools" },
  { into: "Culture", site: "toitu-otago-settlers-museum", img: PHOTO + "c2dc5a91-bd45-4279-92eb-140446f5876e.webp", alt: "Two girls walking past a red wall covered in old framed portraits of settlers", credit: "DunedinNZ" },
  { act: "kayaking", site: "marahau-sea-kayaks", img: PHOTO + "bb7b4ee2-3468-46ed-a501-97df6aee549e.webp", alt: "Two people paddling an orange sea kayak past granite boulders in clear green water", credit: "Nelson Tasman" },
  { into: "Attractions", site: "west-coast-treetop-walk", img: PHOTO + "7e5886dd-76f1-4bf9-9c26-883d1b354eb2.webp", alt: "Two people walking along a steel walkway high above the rainforest canopy", credit: "BareKiwi" },
  { act: "stargazing", site: "dark-sky-project-summit-experience", img: PHOTO + "442f673d-dc53-45e3-bc73-30136399e184.webp", alt: "The Milky Way over Lake Tekapo, with the town’s lights below", credit: "Ekant Veer" },
  { into: "Adventure", site: "franz-josef-glacier-heli-hike", img: PHOTO + "ff1293cd-b943-48ed-b68f-d7324dcfe48d.webp", alt: "Five hikers in helmets with ice axes standing on Franz Josef Glacier among towering blue-white ice", credit: "Franz Josef Glacier Guides" },
  { act: "wine", site: "wine-tours-by-bike", img: PHOTO + "4be2fd1c-491d-45fa-8c71-344cd6c7d1cb.webp", alt: "Two cyclists riding a lane between rows of golden autumn vines", credit: "Only Marlborough" },
];
// The second photo break: the first picked vibe in this order, else the last. The site's own photos (docs/photo-sources.md).
var VIBE_PHOTOS = [
  { vibe: "adventure", img: "/img/photo-shotover-jet-1200.webp", credit: "Photo: Shotover Jet, CC0, via Wikimedia Commons" },
  { vibe: "nature", img: "/img/photo-diamond-lake-1200.webp", credit: "Photo: Diamond Lake, public domain, via Wikimedia Commons" },
  { vibe: "relax", img: "/img/photo-gore-bay-1200.webp", credit: "Photo: Cathedral Cliffs, Gore Bay, Michal Klajban, CC BY-SA 4.0, resized" },
  { vibe: "sightseeing", img: "/img/photo-pukaki-1200.webp", credit: "Photo: Lake Pukaki, Francis Vallance (Heritage Warrior), CC BY 2.0, resized" },
];

var SEASONS = [
  { id: "summer", feel: "Warm days for swimming and long evenings. Peak season, so book ahead.", label: "Summer", hint: "December to February", months: [11, 0, 1], line: "Summer: book the popular stays and cruises early. It’s the busiest time of year." },
  { id: "autumn", feel: "Quieter roads, settled weather and gold trees in Central Otago.", label: "Autumn", hint: "March to May", months: [2, 3, 4], line: "Autumn: quieter roads and gold trees in Central Otago. Nights get cold." },
  { id: "winter", feel: "Snow on the mountains and the ski fields. Cold nights, and some passes close.", label: "Winter", hint: "June to August", months: [5, 6, 7], line: "Winter: check the passes for snow before you drive, and carry chains." },
  { id: "spring", feel: "Lambs, waterfalls in full flow and fewer crowds. The weather changes fast.", label: "Spring", hint: "September to November", months: [8, 9, 10], line: "Spring: lambs and long days. Some walks close for lambing." },
];
var MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function seasonOf(month) {
  return SEASONS.filter(function (s) { return s.months.indexOf(month) >= 0; })[0].id;
}
function seasonLine(season) {
  var s = SEASONS.filter(function (x) { return x.id === season; })[0];
  return s ? s.line : null;
}
function monthsOf(season, today) {
  var s = SEASONS.filter(function (x) { return x.id === season; })[0];
  if (!s) return [];
  return s.months.map(function (m) {
    return { month: m, year: today.getFullYear() + (m >= today.getMonth() ? 0 : 1) };
  }).sort(function (a, b) { return a.year - b.year || a.month - b.month; });
}
function iso(y, m, d) {
  var dt = new Date(y, m, d);
  return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
}
function startDateFor(answer, today) {
  var m = answer.month;
  if (!m && answer.season) m = monthsOf(answer.season, today)[0];
  if (!m) { // no season: three months from today (the owner, 2026-11-23), the same day or, in a shorter month, its last
    var y = today.getFullYear(), mo = today.getMonth() + 3;
    return iso(y, mo, Math.min(today.getDate(), new Date(y, mo + 1, 0).getDate()));
  }
  if (m.year === today.getFullYear() && m.month === today.getMonth()) return iso(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  return iso(m.year, m.month, 1);
}

// One separator everywhere: a dot with a space each side. Every screen is written with " · " and its dots swapped on render (see dots),
// because Overpass draws its middle dot (U+00B7) off to the left, so it reads as "·a"; U+2219 is centred.
var SEP = " ∙ ";

// A stop's picture: its own photo, else the app's default for it (self-hosted), else "".
function stopPhoto(i) { return i.thumb || (i.fallback ? "/img/places/" + i.fallback + ".webp" : ""); }
function plainStop(i) { return i.thumb && i.category.indexOf("Food") < 0 && i.category.indexOf("Stay") < 0; }
// A card photo for each trip: a stop that is not Food or Stay, from day 2 on when there is one, and not one an earlier card used.
// Falls back to any such stop, then any stop with a photo, then "" (a plain tile).
function tripPhotos(list) {
  var used = {};
  return list.map(function (t) {
    var days = t.days.length > 1 ? t.days.slice(1).concat(t.days.slice(0, 1)) : t.days;
    var items = [];
    days.forEach(function (d) { items = items.concat(d.items); });
    var pick = items.filter(function (i) { return plainStop(i) && !used[i.thumb]; })[0] || items.filter(plainStop)[0] || items.filter(function (i) { return i.thumb; })[0];
    if (!pick) { pick = items.filter(stopPhoto)[0]; return pick ? stopPhoto(pick) : ""; }
    used[pick.thumb] = true;
    return pick.thumb;
  });
}

// Every middle dot in a screen becomes the centred one (the font's own sits off to the left).
function dots(html) { return html.split("·").join(SEP.trim()); }

function blankState() { return { start: null, end: null, band: null, days: null, season: null, month: null, pace: null, drive: null, who: null, age: null, vibes: null, into: null, food: null, activities: null, heard: null, pick: null }; }
function oneOf(list, v) { return list.some(function (x) { return x.id === v; }); }
function someOf(list, v) { return Array.isArray(v) && v.every(function (x) { return oneOf(list, x); }); }

// The answers in the order they're asked, each with the step that asks it. (The month is optional: "Not sure which month".)
var ASKED = [["start", "start"], ["band", "band"], ["days", "days"], ["end", "finish"], ["season", "season"], ["pace", "pace"], ["drive", "drive"], ["who", "who"], ["age", "age"], ["vibes", "vibe"], ["into", "into"], ["activities", "into"], ["food", "food"], ["heard", "heard"], ["pick", "choice"]];
// The earliest step whose answer is missing, so a reload or a typed hash can't land past it.
function firstOpenStep(st, step) {
  for (var i = 0; i < ASKED.length; i++) {
    var at = STEPS.indexOf(ASKED[i][1]);
    if (step <= at) break;
    if (st[ASKED[i][0]] === null || st[ASKED[i][0]] === undefined) return at;
  }
  if (STEPS[step] === "month" && st.season === "unsure") return STEPS.indexOf("season");
  return step;
}

// Drops any saved answer that doesn't fit (including today's old quiz shape), and every answer after it.
function cleanState(saved, today) {
  var out = blankState(), s = saved;
  if (!s || typeof s !== "object") return out;
  if (!oneOf(TOWNS, s.start)) return out;
  out.start = s.start;
  var least = leastFrom(s.start);
  if (!oneOf(BANDS, s.band) || bandOf(s.band).days < least) return out;
  out.band = s.band;
  if (typeof s.days !== "number" || !(s.days >= least && s.days <= 21 && s.days % 1 === 0)) return out;
  out.days = s.days;
  // a finish the days can't reach is asked again
  if (!oneOf(TOWNS, s.end) || minDays(s.start, s.end) > s.days) return out;
  out.end = s.end;
  if (s.season !== "unsure" && !oneOf(SEASONS, s.season)) return out;
  out.season = s.season;
  var m = s.month;
  if (m && s.season !== "unsure" && monthsOf(s.season, today).some(function (x) { return x.month === m.month && x.year === m.year; })) out.month = { month: m.month, year: m.year };
  else if (m) return out;
  if (!oneOf(PACES, s.pace)) return out;
  out.pace = s.pace;
  if (!oneOf(DRIVES, s.drive)) return out;
  out.drive = s.drive;
  if (!oneOf(WHO, s.who)) return out;
  out.who = s.who;
  if (s.age !== "skip" && !oneOf(AGES, s.age)) return out;
  out.age = s.age;
  if (!someOf(VIBES, s.vibes)) return out;
  out.vibes = s.vibes.slice();
  if (!someOf(INTO, s.into)) return out;
  out.into = s.into.slice();
  if (!someOf(ACTIVITIES, s.activities)) return out;
  out.activities = s.activities.slice();
  if (typeof s.food !== "boolean") return out;
  out.food = s.food;
  if (s.heard !== "skip" && !oneOf(HEARD, s.heard)) return out;
  out.heard = s.heard;
  if (typeof s.pick === "string") out.pick = s.pick; // checked against the trips once they're built
  return out;
}

// The activities worth asking about: those the data has somewhere; skiing only for a June to October start.
function activitiesFor(data, startMonth) {
  var have = Object.create(null);
  Object.keys(data.places).forEach(function (k) { data.places[k].activities.forEach(function (a) { have[a] = true; }); });
  return ACTIVITIES.filter(function (a) { return have[a.id] && (a.id !== "skiing" || (startMonth >= 5 && startMonth <= 9)); });
}

// The cards on offer: every kind of place, and the activities the data has for this start month. A card whose activity
// isn't on offer keeps only its kind of place (Nature without wildlife); a card that is only an activity goes.
function cardsFor(data, startMonth) {
  var acts = activitiesFor(data, startMonth).map(function (a) { return a.id; });
  return DECK.filter(function (c) { return c.into || acts.indexOf(c.act) >= 0; }).map(function (c) {
    var of = c.into ? INTO.filter(function (x) { return x.id === c.into; })[0] : ACTIVITIES.filter(function (x) { return x.id === c.act; })[0];
    return Object.assign({}, c, { id: c.into || c.act, label: of.label, hint: of.hint, act: acts.indexOf(c.act) >= 0 ? c.act : undefined });
  });
}

// The quiz answers in buildTrips' shape (builder.js).
function answersFor(st) {
  return { start: st.start, end: st.end, days: st.days, pace: st.pace, drive: st.drive, vibes: st.vibes, into: st.into, food: st.food, activities: st.activities };
}

// What the trip screens show: "loading" until the builder's data and pack.js are in, "error" if they failed, else the trips.
function revealState(load, ans, build) {
  if (load.status === "error") return "error";
  if (load.status !== "ready") return "loading";
  return build(load.data, load.pack, ans);
}

// The photo breaks: 1 after "Where does your trip finish?" (the start town's card photo), 2 after the vibe.
function breakLine(n, st) {
  if (n === 1) {
    var t = TOWNS.filter(function (x) { return x.id === st.start; })[0];
    // the photo is a thumbnail, so it shows as a card at its own size, not full screen
    var head = t.name + ", " + st.days + " days.";
    return { line: head + " " + t.fact, head: t.name + ", " + st.days + "\u00a0days.", body: t.fact, img: t.img, credit: "", card: true };
  }
  var vibes = st.vibes || [];
  var p = VIBE_PHOTOS.filter(function (x) { return vibes.indexOf(x.vibe) >= 0; })[0] || VIBE_PHOTOS[VIBE_PHOTOS.length - 1];
  return { line: "Over 500 places on the island. Picking the ones that fit you.", img: p.img, credit: p.credit };
}

// Back never lands on a photo break: from the screen after one it goes to the question before it. Nor on the driving
// question when the way in skipped it (longDrive; owner, 2026-11-27). st: the answers so far.
function backStep(step, st) {
  var p = Math.max(0, step - 1);
  if (/^break/.test(STEPS[p])) p = p - 1;
  if (st && STEPS[p] === "drive" && longDrive(st.start, st.end, st.days)) p = p - 1;
  return p;
}

// The cards: a new deck opens on card 1; coming back to a finished one shows its last card again, that card's yes taken back.
function deckStart(ids, picked) {
  if (!picked) return { idx: 0, yes: [] };
  var last = ids[ids.length - 1];
  return { idx: Math.max(0, ids.length - 1), yes: picked.filter(function (id) { return id !== last && ids.indexOf(id) >= 0; }) };
}
// What the yes cards answer: their kinds of place and their activities, each in its own list's order.
function deckAnswers(cards, yes) {
  var on = cards.filter(function (c) { return yes.indexOf(c.id) >= 0; });
  var pick = function (list, key) { return list.map(function (x) { return x.id; }).filter(function (id) { return on.some(function (c) { return c[key] === id; }); }); };
  return { into: pick(INTO, "into"), activities: pick(ACTIVITIES, "act") };
}
// The yes cards behind answers already given (back to a finished deck), or null before the deck is done.
function deckYes(cards, st) {
  if (!st.into || !st.activities) return null;
  return cards.filter(function (c) { return c.into ? st.into.indexOf(c.into) >= 0 : st.activities.indexOf(c.act) >= 0; }).map(function (c) { return c.id; });
}
// One card answered: the deck on its next card, or, after the last, the answers in the state (and no trip picked: the trips change).
function deckAnswer(deck, cards, yes, st) {
  var next = { idx: deck.idx + 1, yes: yes ? deck.yes.concat([cards[deck.idx].id]) : deck.yes.slice(), key: deck.key };
  if (next.idx < cards.length) return { deck: next, st: st };
  var got = deckAnswers(cards, next.yes);
  return { deck: null, st: Object.assign({}, st, { into: got.into, activities: got.activities, pick: null }) };
}
// A key on the cards: the right arrow says yes, the left arrow no; a key held down (its repeats) or with a modifier, nothing.
function deckKey(e) {
  if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return null;
  return e.key === "ArrowRight" ? true : e.key === "ArrowLeft" ? false : null;
}

function labelOf(list, id) { return list.filter(function (x) { return x.id === id; })[0].label; }
function and(list, word) { return list.length < 2 ? list.join("") : list.slice(0, -1).join(", ") + " " + (word || "and") + " " + list[list.length - 1]; }

// The reveal's summary: the visitor's own answers, nothing more.
function summaryLine(option, st) {
  var parts = [labelOf(PACES, st.pace).toLowerCase(), "up to " + st.drive / 60 + " hours of driving a day"];
  if (st.vibes.length) parts.push(and(st.vibes.map(function (v) { return labelOf(VIBES, v).toLowerCase(); })));
  parts.push(st.food ? "food tips" : "no food tips");
  st.activities.forEach(function (a) { parts.push(labelOf(ACTIVITIES, a).toLowerCase()); });
  return (option.kind === "built" ? "Built for you: " : "Hand-checked trip: ") + parts.join(", ") + ".";
}

// "Try again" after a failed load: back to idle, so the next render loads again. Anything else stays as it is.
function retryLoad(load) { return load.status === "error" ? { status: "idle" } : load; }
// What the trip screens show while the builder's data loads, or when it failed.
function waitScreen(state) {
  return state === "error" ? '<h1 tabindex="-1">Something went wrong</h1><p>The trips would not load. <button type="button" class="q-link" data-act="reload">Try again</button>, or <a href="/#trips">see the suggested trips</a>.</p>'
    : '<p class="q-kicker">One moment</p><h1 tabindex="-1">Picking the places that fit you…</h1>';
}

// The extra Google Analytics params on quiz_reveal and trip_saved: fixed ids and numbers only, nothing typed.
function measureParams(option, st) {
  return { kind: option.kind, days: option.days.length, start: option.start, end: option.end, pace: st.pace, drive: st.drive };
}

// The line on a drive day over the visitor's limit.
function driveLine(minutes, limit) {
  var h = Math.floor(minutes / 60), m = minutes % 60;
  return "About " + h + " h" + (m ? " " + String(m).padStart(2, "0") : "") + " of driving. Over your " + limit / 60 + " h limit.";
}

function stepFromHash(hash) {
  var n = parseInt(String(hash).replace("#", ""), 10);
  return n >= 0 && n < STEPS.length ? n : 0;
}

if (typeof module !== "undefined") {
  module.exports = { STEPS: STEPS, TOWNS: TOWNS, BANDS: BANDS, MIN_DAYS: MIN_DAYS, minDays: minDays, leastFrom: leastFrom, endsFor: endsFor, finishCards: finishCards, PACES: PACES, WHO: WHO, AGES: AGES, HEARD: HEARD, LONG_DRIVES: LONG_DRIVES, longDrive: longDrive, backStep: backStep, deckStart: deckStart, cardsFor: cardsFor, deckAnswers: deckAnswers, deckYes: deckYes, deckAnswer: deckAnswer, deckKey: deckKey, ACTIVITIES: ACTIVITIES, monthsOf: monthsOf, startDateFor: startDateFor, seasonOf: seasonOf, seasonLine: seasonLine, stepFromHash: stepFromHash, tripPhotos: tripPhotos, stopPhoto: stopPhoto, SEP: SEP, dots: dots, firstOpenStep: firstOpenStep, cleanState: cleanState, activitiesFor: activitiesFor, answersFor: answersFor, revealState: revealState, breakLine: breakLine, measureParams: measureParams, driveLine: driveLine, summaryLine: summaryLine, retryLoad: retryLoad, waitScreen: waitScreen };
}

// Added by the copy script: lists the site's export line leaves out.
if (typeof module !== "undefined") Object.assign(module.exports, { VIBES: VIBES, INTO: INTO, DRIVES: DRIVES, SEASONS: SEASONS, MONTH_NAMES: MONTH_NAMES });
