import {
  Car,
  CloudSun,
  Sun,
  Calendar,
  Users,
  Wallet,
  Plane,
  ShieldAlert,
  LifeBuoy,
  MapPin,
  Compass,
  type LucideIcon,
} from "lucide-react-native";

// Regions of the South Island, as a visitor divides it rather than as local
// government does. Shares its vocabulary with Site.region deliberately: one
// set of ids means a site can later be tied to the guide for its own region.
export const REGIONS = [
  { id: "canterbury", label: "Canterbury & Christchurch" },
  { id: "kaikoura", label: "Kaikōura" },
  { id: "marlborough", label: "Marlborough" },
  { id: "nelson-tasman", label: "Nelson & Tasman" },
  { id: "west-coast", label: "West Coast" },
  { id: "aoraki-mackenzie", label: "Aoraki & Mackenzie" },
  { id: "queenstown-wanaka", label: "Queenstown & Wānaka" },
  { id: "fiordland", label: "Fiordland" },
  { id: "dunedin-otago", label: "Dunedin & Otago Coast" },
  { id: "southland-catlins", label: "Southland & the Catlins" },
] as const;

export type RegionId = (typeof REGIONS)[number]["id"];

export const REGION_LABELS: Record<RegionId, string> = REGIONS.reduce(
  (acc, r) => ({ ...acc, [r.id]: r.label }),
  {} as Record<RegionId, string>,
);

export type GuideCategory = {
  slug: string;
  title: string;
  body: string;
  icon: LucideIcon;
  color: string;
  /** Omitted = island-wide. Set = specific to that region. */
  region?: RegionId;
};

// "Before You Go" — practical local knowledge, static and in-bundle so it works
// offline with no fetch. Reached from the account screen.
//
// Two levels: island-wide sections cover what doesn't change between regions;
// each region then gets the same five slots, so they stay predictable to write
// and to read rather than each becoming a different essay.
//
// House style, from rotorua-guide/Guide-Content.md: plain prose, two to four
// short paragraphs, no marketing voice, lead with whatever actually catches a
// visitor out. Draft in <City>-Content.md and transcribe here, so the writing
// happens in a document rather than a TypeScript literal.
//
// Slugs are globally unique (region sections are prefixed) because the detail
// route is a flat /guide/[slug].
//
// This ships as JS, so corrections go out via `eas update` — no store review.
export const GUIDE_CATEGORIES: GuideCategory[] = [
  // ---------------------------------------------------------------- island-wide
  {
    slug: "driving",
    title: "Driving the South Island",
    icon: Car,
    color: "#14607A",
    body: `Distances on a New Zealand map tell you very little about how long a drive will take. Most highways are one lane each way and wind through hills and river gorges, and NZTA itself warns visitors that trips take longer than they look. The 120km from Te Anau to Piopiotahi Milford Sound takes about two hours without a single stop, and you will want to stop.

Plan each day with the NZTA journey planner at journeys.nzta.govt.nz, which also shows road closures, then add time for stops. Keep the first day short after a long flight, and pull over somewhere safe to let a queue behind you pass.

Single-lane bridges

A sign before every one-lane bridge tells you who has priority. A round sign with a red border, showing a small red arrow for your direction and a bigger black arrow for oncoming traffic, means you give way. Stop at the painted line and wait until the bridge is clear, including any cars following the first one across. A blue rectangular sign with a large white arrow for your direction means oncoming traffic gives way to you, but slow down anyway and check nobody is already on the bridge.

Gravel roads and your rental agreement

Many scenic side roads are unsealed, and rental terms vary a lot. Some companies ban gravel altogether, many ban named roads such as Skippers Road near Queenstown and Ball Hut Road at Aoraki Mount Cook, and most ban beaches and riverbeds. Damage on a banned road is usually not covered by any insurance option, so read the prohibited roads clause before you plan a detour.

Snow, ice and chains

Snow and ice can close or restrict alpine roads such as Arthur's Pass, Lewis Pass, Lindis Pass, Haast Pass and the Crown Range, mostly in winter and early spring. On the Milford Road, signs from about June to November can require you to carry chains, and you can be fined for driving past them without a set. If your rental comes with chains, practise fitting them before you need them, and check road status on the NZTA site each morning.

Fuel and paperwork

On inland and West Coast routes, fill the tank whenever you pass through a town, because the gaps between fuel stops can be long. There is no fuel on the Milford Road between Te Anau and Milford Sound, so leave Te Anau with enough for the return trip. Carry your licence whenever you drive, and if it isn't in English, carry an approved English translation too. An International Driving Permit can count as one.`,
  },
  {
    slug: "weather-and-seasons",
    title: "Weather & Seasons",
    icon: CloudSun,
    color: "#5B4E9E",
    body: `Most visitors pack for the month on the calendar and get caught out by the mountains instead. In the South Island, which side of the Alps you're on, and how high you are, matters more than the season. Fiordland averages about 200 rain days a year, while Canterbury on the eastern side is one of the driest parts of the country.

Summer, from December to February, brings long days, the busiest roads and full bookings. Autumn, from March to May, is often calmer, with cooler nights and fewer people. Winter, from June to August, means snow on the passes, ski fields open, short days and frosty mornings. Spring, from September to November, is the most changeable season, often windy, with snow still possible on high ground.

What changes in winter

The Great Walks season runs from late October to late April. Outside it, huts on tracks like the Routeburn have no gas or wardens, some bridges are removed to avoid avalanche damage, and the alpine sections are for experienced, fully equipped parties only. Avalanche risk on some Fiordland tracks can last into December, and late snow has delayed track openings in recent seasons. The Milford Road can close at short notice when avalanche danger is high, and the Coastal Pacific train between Picton and Christchurch doesn't run over winter.

Alpine weather

In the mountains a clear morning can turn to rain, wind and snow by mid-afternoon, and snow can fall in any month. Check the MetService mountain forecast for the park you're heading into, not the forecast for the nearest town, and carry a warm, windproof layer even on a hot day.

The nor'wester

East of the Alps, a strong north-west wind brings hot, dry, gusty weather while the West Coast gets heavy rain. Locals call it the nor'wester, and a long arch of cloud over the mountains with clear sky beneath it often signals one on the way. It can push Christchurch past 30 degrees, and it usually ends with a cold southerly change, so a baking afternoon can turn into a cold, wet evening.`,
  },
  {
    slug: "sun-sandflies-water",
    title: "Sun, Sandflies & Water",
    icon: Sun,
    color: "#8F6310",
    body: `The sun here burns faster than most visitors expect, and the air temperature tells you nothing about it. On clear midsummer days New Zealand's UV index peaks at around 12, which NIWA classes as extreme, and at that level fair skin can start to burn in about 12 to 15 minutes. UV is already high in spring while it still feels cool, water and sand reflect it back at you, and snow and altitude make it stronger again.

Check the UV index on MetService before you head out, and protect yourself whenever it's 3 or higher. Cover up, wear a wide-brimmed hat and close-fitting sunglasses, use a broad-spectrum sunscreen and reapply it, and find shade in the middle of the day. A cloudy or windy day will burn you just as well.

Sandflies

On the West Coast and in Fiordland, sandflies arrive in clouds wherever you stop near water. They are a nuisance rather than a health risk and don't carry disease, but the bites can itch for days. Cover up when you're standing still, especially your ankles and feet, use a repellent containing DEET, and keep car doors and windows shut when you park. Try not to scratch, because broken skin can get infected, and an antihistamine cream helps.

Sandflies rarely bite indoors or after dark, and they aren't found above the bushline. They also go for still targets, so keep moving.

Rivers and cold water

Rivers are the outdoor hazard that kills people here every year. Drowning is New Zealand's leading cause of recreational death, and rivers account for roughly one in five drownings. Many South Island rivers come straight off the mountains, so they stay cold even in summer, and falling into cold water can make you gasp and breathe in water before you can swim. If you go in, lie back and float first to get through the shock.

On tramping tracks, many streams and rivers have no bridge, and they can rise within hours of rain, including rain in the mountains that you never see. DOC's advice is simple: if you're not sure a river is safe, don't cross. Warning signs include water moving faster than walking pace, murky water, floating debris and the sound of rocks rolling along the bed.

Rivers often drop again as fast as they rose. Carry extra food and an emergency shelter so that waiting it out, or turning back, is a real option rather than a hardship.

Drinking water

Don't drink straight from streams, lakes or hut water tanks, however clear the water looks. It can carry giardia, cryptosporidium and campylobacter, all of which cause diarrhoea. Boil it for at least one minute, or use a filter or purifier rated for these parasites. Household bleach does not deal with cryptosporidium.`,
  },
  {
    slug: "booking-ahead",
    title: "Booking Ahead",
    icon: Calendar,
    color: "#8C6410",
    body: `The mistake is leaving summer bookings until you arrive. Between December and March, the things most people come for sell out weeks or months ahead, and in small places there is often no fallback.

Great Walks

DOC opens Great Walk bookings once a year, usually in May, for the season that starts in late October. Each track opens on its own day through an online queue, and summer dates on the Milford Track have sold out within an hour, with other popular tracks like the Routeburn filling fast too. Create your DOC booking account beforehand, have two or three date options ready, and if you miss out, keep checking for cancellations. International visitors pay higher hut fees than New Zealanders on most Great Walks.

Other huts

Most DOC backcountry huts can't be booked at all. You pay with hut tickets or a Backcountry Hut Pass bought before your trip, bunks go to whoever arrives first, and you should carry a tent in case the hut is full. A few popular huts must be booked, such as Mueller Hut above Aoraki Mount Cook Village, which is in high demand through summer and keeps no spaces for walk-ins. Each hut's page on the DOC website tells you which system it uses.

Milford Sound, flights and small towns

Book Milford Sound cruises ahead from November to March, but choose an operator with a fair cancellation policy, because the weather or a road closure can stop you getting there. Scenic flights over the glaciers and Aoraki Mount Cook depend on the weather and can be cancelled in cloud and wind, so book one early in your stay and keep a spare day to rebook.

In small towns the same few restaurants and motels serve everyone passing through. In summer, book beds well ahead and reserve dinner that morning or the day before, especially in places like Franz Josef, Te Anau and Aoraki Mount Cook Village, where there are only a handful of places to eat.`,
  },
  {
    slug: "getting-there",
    title: "Getting There & Around",
    icon: Plane,
    color: "#3F5A7A",
    body: `Where you land decides how much backtracking you do, so choose the airport for the trip rather than the cheapest fare. Christchurch is the South Island's main international gateway and suits Canterbury, Kaikōura, Arthur's Pass and the road to Aoraki Mount Cook. Queenstown, which has daily flights to Melbourne, Sydney, Brisbane and the Gold Coast as well as domestic ones, is the base for Fiordland, Wānaka and Central Otago. Dunedin suits the Otago Peninsula and the Catlins, Nelson suits Abel Tasman and Golden Bay, and there are smaller airports at Blenheim, Hokitika and Invercargill.

The Interislander and Bluebridge ferries cross Cook Strait between Wellington and Picton in about three to three and a half hours. Book ahead for summer and school holidays, especially with a vehicle, and leave slack in your plans, because sailings can be cancelled in rough weather. Many rental companies don't let their cars on the ferry, so you drop one car in Wellington, cross on foot and collect another in Picton on the same booking. Some let you drive on, but then you pay the vehicle fare.

InterCity runs the main long-distance coach network, linking the cities with many small towns and the West Coast glaciers, and its buses meet the ferry at Picton. It works if you're not in a hurry: Christchurch to Queenstown takes about eight hours by coach. Services on remote stretches are infrequent, so check the timetable before you rely on a connection. The TranzAlpine train crosses from Christchurch to Greymouth, and the Coastal Pacific runs between Picton and Christchurch in the warmer months.

The one-way fee

The cost people forget is the one-way rental fee. Collecting a car at the top of the island and dropping it in Queenstown or Dunedin can add a sizeable fee, depending on the company, the season and how long you hire for. Some companies reduce or waive it on long hires, or when they need cars moved your way, so compare the total price, fee included, before you commit to a north-to-south route. Relocation deals, where you move a car for a company at low cost, are worth a look if your dates are flexible.`,
  },
  {
    slug: "ngai-tahu-and-custom",
    title: "Ngāi Tahu & Local Custom",
    icon: Users,
    color: "#2F6B4F",
    body: `Many visitors assume Māori culture is something they will meet in the North Island. In fact Ngāi Tahu are mana whenua, the people who hold customary authority, across most of Te Waipounamu, the South Island, from Kaikōura and the West Coast south to Rakiura Stewart Island. The iwi is made up of 18 papatipu rūnanga, each with its own area and people. At the top of the South Island, around Nelson, Marlborough and Golden Bay, other iwi are mana whenua.

The dual names on signs, such as Aoraki/Mount Cook and Franz Josef Glacier/Kā Roimata o Hine Hukatere, became official through the 1998 Ngāi Tahu Claims Settlement Act, which gave nearly 90 places dual names. They aren't decoration. They carry history that was here long before the English names. In Ngāi Tahu tradition, Aoraki is an ancestor who was turned to stone. Using the names is simple courtesy, and it helps you read local maps and signs.

You'll also see southern spellings such as Kāi Tahu and Kā instead of Ngāi and Ngā. The local dialect uses k where other regions use ng, so these aren't typos.

Ask before you photograph people, and ask before taking photos at a marae, inside a wharenui, or of carvings and other taonga. Some things may not be photographed at all, and your hosts will tell you.

If you're invited onto a marae

You don't simply walk onto a marae. Visitors are welcomed on with a pōwhiri, and every marae has its own kawa, or protocol, so the most important thing is to follow your hosts and ask when you're unsure. In general, expect a call of welcome, speeches and songs, the laying down of a koha (a gift, often money in an envelope), the hongi and a handshake, and then shared food.

Arrive on time, turn your phone off, take your shoes off before entering the wharenui, and don't eat or drink inside it or sit on tables. As the booking information for Takahanga Marae in Kaikōura puts it, a koha is a gift rather than payment for using the marae, and it can take many forms.`,
  },
  {
    slug: "money-and-connectivity",
    title: "Money & Connectivity",
    icon: Wallet,
    color: "#8A5CE6",
    body: `You don't need to tip in New Zealand. Not in restaurants, cafés, bars, taxis or on tours. Wages don't depend on tips, and nobody will think less of you for skipping the tip screen on a card machine. If service was exceptional and you want to leave something, that's fine, but it is never expected.

Displayed prices include GST, and service charges are rare. The exceptions are public holidays, when many cafés and restaurants add a percentage surcharge to cover higher wages, and card surcharges, where some businesses add a small percentage for credit or contactless payments. Both have to be shown clearly before you pay, so look for the sign at the counter or on the menu.

Cards work almost everywhere, including small-town shops, and tapping to pay is normal. Carry a little cash for honesty boxes at roadside stalls and the odd rural business, but you can go days without needing it. Some popular car parks now charge, including Milford Sound, where the machines take cards only, and the DOC car parks at Punakaiki, Franz Josef Glacier and White Horse Hill at Aoraki Mount Cook.

Phone signal and maps

Mobile coverage disappears quickly outside towns. Around 40 percent of New Zealand's land area has no cell-tower coverage, including much of the Milford Road and many remote roads. Before you leave town, download offline maps, save bookings and track notes to your phone, and tell anyone expecting to hear from you that you'll be out of touch. Some local mobile plans now include satellite texting on compatible phones, but you can't call 111 through it, so don't treat it as your safety net.

Groceries

Full-size supermarkets are only in the bigger towns. Inland, on the West Coast and around Fiordland you may be relying on small general stores with limited stock, higher prices and short hours, so stock up before heading into the Mackenzie Basin, down the coast or out to Milford Sound.`,
  },
  {
    slug: "emergencies",
    title: "Emergencies & Outdoor Safety",
    icon: LifeBuoy,
    color: "#A8322D",
    body: `Dial 111 for police, fire or ambulance. If you're lost or hurt in the outdoors, call 111 and ask for Police, who coordinate land search and rescue. The catch is that your phone may have no signal where you need it most, which is why the rest of this section matters.

For health advice that isn't an emergency, call Healthline free on 0800 611 116. The Police non-emergency number is 105.

Take a beacon

Carry a personal locator beacon on any overnight trip, and on day walks in remote country without coverage. You can hire one from outdoor shops, some i-SITEs and DOC visitor centres such as those at Arthur's Pass, Aoraki Mount Cook, Franz Josef and Queenstown, and the Mountain Safety Council keeps a list of hire outlets. A beacon sends your position by satellite, but help can still take many hours in bad weather, so pack as if you'll need to wait. If you bring your own beacon, check the registration rules on beacons.org.nz before you travel.

Leave your plans with someone

Before any overnight trip or remote day walk, give a trusted person your route, who's with you and when you'll be back, and agree a time after which they should call 111 and ask for Police. The Mountain Safety Council's Plan My Walk app and the AdventureSmart intentions form make this easy, but neither alerts anyone by itself. It only works if your contact acts. Sign the intentions book in every hut you pass, even if you're not staying.

Check before you go

Look up the DOC page for your track or area on the day and read the alerts, where closures, slips, damaged bridges and flooding are posted. Check the MetService mountain forecast and any weather warnings too, and the New Zealand Avalanche Advisory if there is snow about. If the forecast or the alerts don't suit your plans, change the plans.

In an earthquake

If the ground starts shaking, Drop, Cover and Hold: get down low, cover your head and neck, and hold on until the shaking stops. Expect aftershocks.

On the coast

If you're near the sea and an earthquake is long (lasting more than a minute) or strong (making it hard to stand), move straight away to high ground or as far inland as you can. Don't wait for sirens or an official warning, because a tsunami from a nearby quake can arrive within minutes. Walk, run or cycle if you can rather than getting stuck in traffic, and stay away until Civil Defence gives the all-clear. NEMA sums this up as Long or Strong, Get Gone, and the same applies beside large lakes.

Official warnings are also sent to phones as Emergency Mobile Alerts. Act on them straight away.`,
  },

  // ---------------------------------------------------------------- canterbury
  // Same five slots for every region. Copy this block per region.
  {
    slug: "canterbury-why",
    title: "Why Come to Canterbury",
    icon: Compass,
    color: "#14607A",
    region: "canterbury",
    body: `Be clear about what Canterbury is for. Christchurch is not where the big scenery is, and the Canterbury Plains between the city and the mountains are flat farmland that plenty of people find a long, dull drive. What the region does well is a city that has rebuilt itself, a volcanic peninsula on its doorstep, and a direct road into the Alps.

Central Ōtautahi Christchurch was largely rebuilt after the 2010 and 2011 earthquakes, and it is compact, walkable and still filling in. You'll find new public buildings such as Tūranga, the central library on Cathedral Square, and the covered Te Kaha stadium, which opened in 2026 as the last big project of the rebuild. You'll also see empty sites, car parks and old buildings still waiting on their future, and that unfinished feel is part of the city's story.

The food is the other reason to stay a few days. Much of the best eating is in small independent places in laneways and converted buildings, and there's a food hall at Riverside Market, a weekly farmers' market at Riccarton, and wine country about an hour north in the Waipara Valley.

Banks Peninsula, formed from two ancient volcanoes, is about an hour and a half from the city. Its harbours and bays shelter small settlements, the French-settled town of Akaroa, and Hector's dolphins, among the smallest dolphins in the world, which you can see on harbour cruises. The roads over the hills are steep and winding, so it works better as an overnight trip than a rushed day.

West of the city, State Highway 73 crosses the plains and climbs through Arthur's Pass to the West Coast, and the TranzAlpine train follows much of the same route. To the north are the Hanmer Springs thermal pools and the whales off Kaikōura, and inland to the south the region reaches Lake Tekapo and Aoraki Mount Cook.`,
  },
  {
    slug: "canterbury-getting-around",
    title: "Getting Around Canterbury",
    icon: Car,
    color: "#2466D6",
    region: "canterbury",
    body: `By New Zealand standards, Christchurch is an easy city to drive and park in. It's flat, the central city is laid out on a grid inside the Four Avenues, and outside the centre parking is usually easy to find. Most central parking is paid, either on the street or in parking buildings.

Metro buses don't work like a grid. Most routes run out from the Bus Interchange on Lichfield Street in the central city, so a trip between two suburbs often means changing there. Pay by tapping on with a contactless bank card or phone, and transfers within two hours are free. The Metro journey planner and real-time apps show when the next bus is due.

The airport is about 12km north-west of the centre, roughly 20 minutes by car. Several Metro routes, including the direct 29, leave from the northern end of the international arrivals hall, next to the Novotel, and reach the city in about half an hour. If you land late at night, check the last bus before relying on it. Taxis and shuttles wait outside the terminal.

Cycling is a genuine way to get around here, not a novelty. The city is flat, and a network of major cycle routes, many separated from traffic, links the suburbs with the central city, with shared paths through Hagley Park and along the rivers. What slows you down is a strong nor'wester or easterly headwind, and the steep climbs if you head up the Port Hills.

Beyond the city you'll want a car for most of the region, although InterCity coaches and shuttles reach the main towns. The small ferry from Lyttelton to Diamond Harbour is part of the Metro network.`,
  },
  {
    slug: "canterbury-when",
    title: "When to Come",
    icon: CloudSun,
    color: "#2E6B4F",
    region: "canterbury",
    body: `People expect summer to be the calm season, but in Christchurch the windiest months run from about October to January, and the calmest are April to August. On fine days the city's most common wind is a cool north-easterly sea breeze, welcome on a hot afternoon and chilly on the beach.

Then there is the nor'wester. It blows hot, dry and gusty off the mountains, can push the temperature past 30 degrees and fills the air with dust, and locals will tell you it puts everyone on edge. It usually ends with a southerly change that drops the temperature quickly, often with rain, so pack a warm layer even on the hottest day.

Summer, from December to February, is warm and dry, with long evenings and the busiest bookings. Autumn, from March to May, is often the best time to come: calmer, still mild, and the trees in Hagley Park and the Botanic Gardens turn gold. Winter brings frosty mornings, clear cold days and the ski season inland, with occasional snow on the plains when a southerly comes through. Spring means blossom and lambs, but also the most changeable and windy weather of the year.

If wind puts you off, aim for March to May and avoid October to December. Christchurch is also the driest of New Zealand's main cities, so rain is much less of a worry here than on the other side of the Alps.`,
  },
  {
    slug: "canterbury-hazards",
    title: "Local Hazards & Rules",
    icon: ShieldAlert,
    color: "#8F6310",
    region: "canterbury",
    body: `The Port Hills look like a gentle afternoon from the city, and that is what catches people out. The tracks cross open tussock and rock with little shade, the tops are exposed to every wind, and a nor'wester or southerly change can turn a warm walk into a cold, gusty one very quickly. Take water, sun protection and a warm layer, and check the council's track status page first, because tracks close for slips, for fire risk and, on some farmland tracks on the hills and Banks Peninsula, for lambing in spring.

Fire

Canterbury dries out badly in summer and autumn, and fires in 2017 and 2024 burned large areas of the Port Hills and destroyed homes. No fires are allowed anywhere on the hills. Across the region, Fire and Emergency sets the fire season: open, restricted (you need a permit) or prohibited, which is a total fire ban. Check checkitsalright.nz before you light any outdoor fire, including a campfire or brazier, and if you see smoke or flames, call 111.

Rivers

Canterbury holds about two-thirds of New Zealand's braided rivers, wide gravel beds with shallow-looking channels that shift from one flood to the next. The Waimakariri, whose name refers to its cold water, and rivers like the Rakaia and Rangitata come straight from the Alps. They are cold, faster than they look, and can rise after rain in the mountains while the sun is out on the plains, so don't try to wade across channels, and keep your rental car out of riverbeds.

In summer, Environment Canterbury tests more than 100 popular swimming spots for bacteria and toxic algae. Check Can I Swim Here on the LAWA website before you get in, avoid swimming for 48 hours after heavy rain, and stay clear of dark brown or black slimy mats on river rocks, which can kill dogs.

The earthquakes

The earthquakes are not a sight. They are something the people here lived through. The earthquake of 22 February 2011 killed 185 people, the central city was cordoned off for more than two years, and many families lived for years with damaged homes and disrupted schools and jobs. The Oi Manawa Canterbury Earthquake National Memorial beside the Ōtākaro Avon River carries all 185 names. Visit it quietly, don't treat damaged buildings or empty sites as photo props, and let locals decide whether they want to talk about it.

The ground here is still active. If it shakes, Drop, Cover and Hold, and expect aftershocks.`,
  },
  {
    slug: "canterbury-book-ahead",
    title: "Book Ahead in Canterbury",
    icon: MapPin,
    color: "#095C65",
    region: "canterbury",
    body: `The mistake is expecting big-city hours. Many kitchens stop taking orders earlier than visitors expect, often around 9pm in Christchurch and 8pm in small towns, and many cafés close in the mid-afternoon.

In Christchurch, book popular restaurants a few days ahead for Friday and Saturday nights, and further ahead when there's a big game or concert at Te Kaha, because event nights fill tables and beds across the central city. Plenty of independent restaurants close one or two days early in the week, commonly Monday and Tuesday, so check opening hours before you head out.

Outside the city, the same few places feed everyone. In Akaroa, Hanmer Springs, Kaikōura and the ski towns, reserve dinner in summer and during the July school holidays.

Some things are worth reserving well ahead in summer. The TranzAlpine to Greymouth runs daily apart from a couple of public holidays, and summer seats go early. Dolphin cruises and swims in Akaroa Harbour, whale watching at Kaikōura and stargazing tours at Lake Tekapo are all popular, and trips on the water can be cancelled for weather, so leave yourself a spare day. Over Christmas and New Year many small businesses close or shorten their hours, so check before you count on them.`,
  },
];

/** Island-wide sections, in declaration order. */
export const ISLAND_CATEGORIES = GUIDE_CATEGORIES.filter((c) => !c.region);

/** Regions that actually have sections written, in REGIONS order. */
export const REGIONS_WITH_CONTENT = REGIONS.filter((r) =>
  GUIDE_CATEGORIES.some((c) => c.region === r.id),
);
