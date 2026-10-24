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
// House style, from prompts/content-guide-regions.md: plain prose, two to five
// short paragraphs, no marketing voice, lead with whatever actually catches a
// visitor out. Draft in docs/guide/<id>.md, which also keeps each section's
// sources, and transcribe here, so the writing happens in a document rather
// than a TypeScript literal.
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
    body: `Distances on a New Zealand map tell you very little about how long a drive will take. Most highways are one lane each way and wind through hills and river gorges, and NZTA itself warns visitors that trips take longer than they look. The 120km from Te Anau to Milford Sound takes about two hours without a single stop, and you will want to stop.

Plan each day with the NZTA journey planner at journeys.nzta.govt.nz, which also shows road closures, then add time for stops. Keep the first day short after a long flight, and pull over somewhere safe to let a queue behind you pass.

Single-lane bridges

A sign before every one-lane bridge tells you who has priority. A round sign with a red border, showing a small red arrow for your direction and a bigger black arrow for oncoming traffic, means you give way. Stop before the bridge and wait until it's clear, including any cars following the first one across. A blue rectangular sign with a large white arrow for your direction means oncoming traffic gives way to you, but slow down anyway and check nobody is already on the bridge.

Gravel roads and your rental agreement

Many scenic side roads are unsealed, and rental terms vary a lot. Some companies ban gravel altogether, many ban named roads such as Skippers Road near Queenstown and Ball Hut Road at Aoraki Mount Cook, and most ban beaches and riverbeds. Damage on a banned road is usually not covered by any insurance option, so read the prohibited roads clause before you plan a detour.

Snow, ice and chains

Snow and ice can close or restrict alpine roads such as Arthur's Pass, Lewis Pass, Lindis Pass, Haast Pass and the Crown Range, mostly in winter and early spring. On the Milford Road, signs from May to November can require you to carry chains, and you can be fined for driving past them without a set. If your rental comes with chains, practise fitting them before you need them, and check road status on the NZTA site each morning.

Fuel and paperwork

On inland and West Coast routes, fill the tank whenever you pass through a town, because the gaps between fuel stops can be long. There is no fuel on the Milford Road between Te Anau and Milford Sound, so leave Te Anau with enough for the return trip. Carry your licence whenever you drive, and if it isn't in English, carry an approved English translation too. An International Driving Permit can count as one.

Drinking and driving

The limit is lower than many visitors expect. For drivers aged 20 and over it is 250 micrograms of alcohol per litre of breath, or 50 milligrams per 100 millilitres of blood. For drivers under 20 it is zero, so a single drink can put a young driver over.

Freedom camping

Since 7 June 2026, only vehicles with a green self-containment warrant can freedom camp where the rules ask for a self-contained vehicle; the old blue warrants no longer count, and campers without one can be fined. A green-warrant vehicle has a fixed toilet, a 24-litre wastewater tank, fresh water for three days and a rubbish bin. Each council still decides where you can stay and for how many nights, so read the signs, and use a campsite when in doubt.`,
  },
  {
    slug: "weather-and-seasons",
    title: "Weather & Seasons",
    icon: CloudSun,
    color: "#5B4E9E",
    body: `Most visitors pack for the month on the calendar and get caught out by the mountains instead. In the South Island, which side of the Alps you're on, and how high you are, matters more than the season. Fiordland averages about 200 rain days a year, while Canterbury on the eastern side is one of the driest parts of the country.

Summer, from December to February, brings long days, the busiest roads and full bookings. Autumn, from March to May, is often calmer, with cooler nights and fewer people. Winter, from June to August, means snow on the passes, ski fields open, short days and frosty mornings. Spring, from September to November, is the most changeable season, often windy, with snow still possible on high ground.

What changes in winter

The Great Walks season runs from late October or early November to the end of April. Outside it, huts on tracks like the Routeburn have no gas or wardens, some bridges are removed to avoid avalanche damage, and the alpine sections are for experienced, fully equipped parties only. Avalanche risk on Fiordland's alpine tracks can last into December, and avalanche damage and late snow have delayed the Milford Track's opening by weeks in recent seasons. The Milford Road can close at short notice when avalanche danger is high, and the Coastal Pacific train between Picton and Christchurch doesn't run over winter.

Alpine weather

In the mountains a clear morning can turn to rain, wind and snow by mid-afternoon, and snow can fall in any month. Check the MetService mountain forecast for the park you're heading into, not the forecast for the nearest town, and carry a warm, windproof layer even on a hot day.

The nor'wester

East of the Alps, a strong north-west wind brings hot, dry, gusty weather while the West Coast gets heavy rain. Locals call it the nor'wester, and a long arch of cloud over the mountains with clear sky beneath it often signals one on the way. It can push Christchurch past 30 degrees, and it often ends with a cold southerly change, so a baking afternoon can turn into a cold, wet evening.`,
  },
  {
    slug: "sun-sandflies-water",
    title: "Sun, Sandflies & Water",
    icon: Sun,
    color: "#8F6310",
    body: `The sun here burns faster than most visitors expect, and the air temperature tells you nothing about it. On clear midsummer days the UV index in the South Island peaks at around 11 to 12, which counts as extreme, and at that level fair skin can start to burn in about 12 to 15 minutes. UV is already high in spring while it still feels cool, water and sand reflect it back at you, and snow and altitude make it stronger again.

Check the UV index on MetService before you head out, and protect yourself whenever it's 3 or higher. Cover up, wear a wide-brimmed hat and close-fitting sunglasses, use a broad-spectrum sunscreen and reapply it, and find shade in the middle of the day. A cloudy or windy day will burn you just as well.

Sandflies

On the West Coast and in Fiordland, sandflies arrive in clouds wherever you stop near water. They are a nuisance rather than a health risk and don't carry disease, but the bites can itch for days. Cover up when you're standing still, especially your ankles and feet, use a repellent containing DEET, and keep car doors and windows shut when you park. Try not to scratch, because broken skin can get infected, and an antihistamine cream helps.

Unlike mosquitoes, sandflies rarely follow you indoors or bite at night. They go for still targets, so keep moving.

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

Most DOC backcountry huts can't be booked at all. You pay with hut tickets or a Backcountry Hut Pass bought before your trip, bunks go to whoever arrives first, and you should carry a tent in case the hut is full. A few popular huts must be booked, such as Mueller Hut above Aoraki Mount Cook Village, which from November to early May keeps no spaces for walkers without a booking. Each hut's page on the DOC website tells you which system it uses.

Milford Sound, flights and small towns

Book Milford Sound cruises ahead from November to March, but choose an operator with a fair cancellation policy, because the weather or a road closure can stop you getting there. Scenic flights over the glaciers and Aoraki Mount Cook depend on the weather and can be cancelled in cloud and wind, so book one early in your stay and keep a spare day to rebook.

In small towns the same few restaurants and motels serve everyone passing through. In summer, book beds well ahead and reserve dinner that morning or the day before, especially in places like Franz Josef, Te Anau and Aoraki Mount Cook Village, where there are only a handful of places to eat.`,
  },
  {
    slug: "getting-there",
    title: "Getting There & Around",
    icon: Plane,
    color: "#3F5A7A",
    body: `Where you land decides how much backtracking you do, so choose the airport for the trip rather than the cheapest fare. Christchurch is the South Island's main international gateway and suits Canterbury, Kaikōura, Arthur's Pass and the road to Aoraki Mount Cook. Queenstown, which has direct flights from several Australian cities as well as domestic ones, is the base for Fiordland, Wānaka and Central Otago. Dunedin suits the Otago Peninsula and the Catlins, Nelson suits Abel Tasman and Golden Bay, and there are smaller airports at Blenheim, Hokitika and Invercargill.

The Interislander and Bluebridge ferries cross Cook Strait between Wellington and Picton in about three and a half hours. Book ahead for summer and school holidays, especially with a vehicle, and leave slack in your plans, because sailings can be cancelled in rough weather. Some rental companies don't let their cars on the ferry, so you drop one car in Wellington, cross on foot and collect another in Picton. Many others let you take the car across, and depending on the company, you either pay the vehicle fare yourself or find it included in the daily rate.

InterCity runs the main long-distance coach network, linking the cities with many small towns and the West Coast glaciers, and its buses meet the ferry at Picton. It works if you're not in a hurry: Christchurch to Queenstown takes about eight hours by coach. Services on remote stretches are infrequent, so check the timetable before you rely on a connection. The TranzAlpine train crosses from Christchurch to Greymouth, and the Coastal Pacific runs between Picton and Christchurch in the warmer months.

The one-way fee

The cost people forget is the one-way rental fee. Collecting a car at the top of the island and dropping it in Queenstown or Dunedin can add a sizeable fee, depending on the company, the season and how long you hire for. Some companies reduce or waive it on long hires, or when they need cars moved your way, so compare the total price, fee included, before you commit to a north-to-south route. Relocation deals, where you move a car for a company at low cost, are worth a look if your dates are flexible.`,
  },
  {
    slug: "ngai-tahu-and-custom",
    title: "Ngāi Tahu & Local Custom",
    icon: Users,
    color: "#2F6B4F",
    body: `Many visitors assume Māori culture is something they will meet in the North Island. In fact Ngāi Tahu are mana whenua, the people who hold customary authority, across most of Te Waipounamu, the South Island, from Te Parinui o Whiti (White Bluffs) south of Blenheim and Kahurangi Point on the West Coast down to Rakiura Stewart Island. The iwi is made up of 18 papatipu rūnanga, each with its own area and people. At the top of the South Island, around Nelson, Marlborough and Golden Bay, other iwi are mana whenua.

The dual names on signs, such as Aoraki/Mount Cook and Franz Josef Glacier/Kā Roimata o Hine Hukatere, became official through the 1998 Ngāi Tahu Claims Settlement Act, which gave nearly 90 places dual names. They aren't decoration. They carry history that was here long before the English names. In Ngāi Tahu tradition, Aoraki is an ancestor who was turned to stone. Using the names is simple courtesy, and it helps you read local maps and signs.

You'll also see southern spellings such as Kāi Tahu and Kā instead of Ngāi and Ngā. The local dialect uses k where other regions use ng, so these aren't typos.

Ask before you photograph people, and ask before taking photos at a marae, inside a wharenui, or of carvings and other taonga. Some things may not be photographed at all, and your hosts will tell you.

If you're invited onto a marae

You don't simply walk onto a marae. Visitors are welcomed on with a pōwhiri, and every marae has its own kawa, or protocol, so the most important thing is to follow your hosts and ask when you're unsure. In general, expect a call of welcome, speeches and songs, the laying down of a koha (a gift, often money in an envelope), the hongi and a handshake, and then shared food.

Arrive on time, turn your phone off, take your shoes off before entering the wharenui, and don't eat or drink inside it or sit on tables. A koha is a gift to your hosts rather than a fee for using the marae, and it doesn't have to be money.`,
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

Mobile coverage disappears quickly outside towns. Around 40 percent of New Zealand's land area has no cell-tower coverage, including much of the Milford Road and many remote roads. Before you leave town, download offline maps, save bookings and track notes to your phone, and tell anyone expecting to hear from you that you'll be out of touch. Some local mobile plans now let compatible phones send texts by satellite where there's no signal, but you generally can't reach 111 that way, so don't treat it as your safety net.

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

Before any overnight trip or remote day walk, give a trusted person your route, who's with you and when you'll be back, and agree a time after which they should call 111 and ask for Police. The Mountain Safety Council's Plan My Walk app and the Outdoors Intentions form make this easy, but neither alerts anyone by itself. It only works if your contact acts. Sign the intentions book in every hut you pass, even if you're not staying.

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

Banks Peninsula, formed from two ancient volcanoes, begins close to the city, with Akaroa about an hour and a half's drive away. Its harbours and bays shelter small settlements, the French-settled town of Akaroa, and Hector's dolphins, among the smallest dolphins in the world, which you can see on harbour cruises. The roads over the hills are steep and winding, so it works better as an overnight trip than a rushed day.

West of the city, State Highway 73 crosses the plains, passes the limestone boulders of Kura Tāwhiti Castle Hill and climbs through Arthur's Pass to the West Coast, and the TranzAlpine train follows much of the same route. To the north, the Hanmer Springs thermal pools sit just off the Lewis Pass road. To the south-west, roads from Mount Somers, turning to gravel near the park, lead to the high-country lakes of Hakatere Conservation Park, and further south, Timaru and Geraldine are the last towns before the road climbs inland to the Mackenzie Country.`,
  },
  {
    slug: "canterbury-getting-around",
    title: "Getting Around Canterbury",
    icon: Car,
    color: "#2466D6",
    region: "canterbury",
    body: `By New Zealand standards, Christchurch is an easy city to drive and park in. It's flat, the central city is laid out on a grid inside the Four Avenues, and outside the centre parking is usually easy to find. Most central parking is paid, either on the street or in parking buildings.

Metro buses don't work like a grid. Most routes run out from the Bus Interchange on Lichfield Street in the central city, so a trip between two suburbs often means changing there. Pay by tapping on with a contactless bank card or phone, and transfers within two hours are free. The Metro journey planner and real-time apps show when the next bus is due.

The airport is about 12km north-west of the centre, roughly 20 minutes by car. Metro buses, including the direct route 29, leave from the northern end of the international arrivals hall, next to the Novotel, and the 29 reaches the city in about half an hour. If you land late at night, check the last bus before relying on it. Taxis and shuttles wait outside the terminal.

Cycling is a genuine way to get around here, not a novelty. The city is flat, and a network of major cycle routes, many separated from traffic, links the suburbs with the central city, with shared paths through Hagley Park and along the rivers. What slows you down is a strong nor'wester or easterly headwind, and the steep climbs if you head up the Port Hills.

Beyond the city you'll want a car for most of the region, although InterCity coaches and shuttles reach the main towns, and the small ferry from Lyttelton to Diamond Harbour is part of the Metro network. State Highway 73 over Porters Pass and Arthur's Pass is steep and winding, and in snow it can need chains and close to vehicles towing trailers or caravans. The Acheron Road through Molesworth, between Hanmer Springs and Blenheim, is gravel, open only from 1 October to mid-April between 7am and 7pm, and closed to caravans and vehicles over 7 metres long.`,
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
    body: `The Port Hills look like a gentle afternoon from the city, and that is what catches people out. The tracks cross open tussock and rock with little shade, the tops are exposed to every wind, and a nor'wester or southerly change can turn a warm walk into a cold, gusty one very quickly. Take water, sun protection and a warm layer, and check the council's track status page first, because tracks close for slips and for fire risk. In lambing season, until mid-October, keep dogs on a lead where signs ask you to.

Fire

Canterbury dries out badly in summer and autumn, and fires in 2017 and 2024 burned large areas of the Port Hills and destroyed homes. No fires are allowed anywhere on the hills. Across the region, Fire and Emergency sets the fire season: open, restricted (you need a permit) or prohibited, which is a total fire ban. Check checkitsalright.nz before you light any outdoor fire, including a campfire or brazier, and if you see smoke or flames, call 111.

Rivers

Canterbury holds about two-thirds of New Zealand's braided rivers, wide gravel beds with shallow-looking channels that shift from one flood to the next. The Waimakariri, whose name refers to its cold water, and rivers like the Rakaia and Rangitata come straight from the Alps. They are cold, faster than they look, and can rise after rain in the mountains while the sun is out on the plains, so don't try to wade across channels, and keep your rental car out of riverbeds.

In summer, Environment Canterbury tests about 100 popular swimming spots for bacteria and toxic algae. Check Can I Swim Here on the LAWA website before you get in, avoid swimming for 48 hours after heavy rain, and stay clear of dark brown or black slimy mats on river rocks, which can kill dogs.

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

Outside the city, the same few places feed everyone. In Akaroa and Hanmer Springs, reserve dinner in summer and during the July school holidays. In the ski season, beds in Methven, the closest town to Mt Hutt, go early, especially in the July holidays.

Some things are worth reserving well ahead in summer. The TranzAlpine to Greymouth runs daily apart from a couple of public holidays, and summer seats go early. Dolphin cruises and swims in Akaroa Harbour are popular too, and trips on the water can be cancelled for weather, so book early in your stay and leave yourself a spare day. Over Christmas and New Year many small businesses close or shorten their hours, so check before you count on them.`,
  },

  // ---------------------------------------------------------------- kaikoura
  {
    slug: "kaikoura-why",
    title: "Why Come to Kaikōura",
    icon: Compass,
    color: "#14607A",
    region: "kaikoura",
    body: `Kaikōura is a sea town, and the sea makes the plans. Most of what people come for happens on the water, yet many visitors give it a single night between Picton and Christchurch, and a southerly swell can cancel the whale trip they came for. Two nights give the boats a second chance and leave time for the peninsula.

The reason the wildlife is here lies offshore. The Kaikōura Canyon, a deep undersea trench, runs close in to the coast, so animals that feed in deep water come within sight of land. Male sperm whales live here all year, dusky dolphins travel in pods that can number in the hundreds, and albatross and other seabirds follow the boats. Whale Watch, which takes most people out to the whales, is owned by Ngāti Kurī, the hapū of Ngāi Tahu whose home this is, and they started it in 1987 to create work for their people.

On land, the Kaikōura Peninsula Walkway follows clifftops above reefs where fur seals haul out, with the Seaward Kaikōura Range rising almost straight from the sea behind the town. Fyffe House, the oldest surviving building in town, stands partly on piles made from whale vertebrae, a relic of the whaling days. The name means a meal of crayfish, and crayfish is still on menus all over town.

The 2016 earthquake

Just after midnight on 14 November 2016, a magnitude 7.8 earthquake ruptured more than 20 faults between North Canterbury and Marlborough. Along this coast the seabed rose by up to six and a half metres in places, and some of the reef you walk past today was under the sea before that night. Slips buried the coast road and the railway, the town was cut off for days, and the highway north stayed closed until December 2017.

Two people died, homes and businesses were damaged, and the town spent more than a year waiting for its main road north to be rebuilt. The raised reefs are worth seeing, but the earthquake isn't a curiosity to the people who lived through it, so let locals decide whether they want to talk about it.

Beyond the town

North on SH1, the lookout at Ōhau Point looks down on one of the coast's biggest seal colonies. To the south, a short detour off SH1 near Cheviot, the fluted clay Cathedral Cliffs stand above Gore Bay in the Hurunui.`,
  },
  {
    slug: "kaikoura-getting-around",
    title: "Getting Around Kaikōura",
    icon: Car,
    color: "#2466D6",
    region: "kaikoura",
    body: `Only three roads reach Kaikōura, and heavy rain can close all three at once. When it does, the town is cut off, as it was in July 2026, when floods closed State Highway 1 in both directions and the inland road as well. After a wet spell, check the NZTA journey planner and the Kaikōura District Council's road closures page before you drive in or out, and if there's a red heavy rain warning, stay put.

State Highway 1

North of town, SH1 runs much of the way to the Clarence River on a narrow strip between steep hills and the sea, beside the railway. Road and rail were both rebuilt after the earthquake, and slips and flooding still close them from time to time. Fur seals lie on the rocks just below the road. Stop only at the marked stopping places, such as the lookout at Ōhau Point, never on the roadside, and watch for seals on the road itself, especially young ones in winter. Picton is about 154km away.

South of town, SH1 follows the coast past Goose Bay and Oaro, then climbs inland over the Hundalee hills to Cheviot. Christchurch is about 183km away.

The Inland Road

Route 70, the Inland Kaikōura Road, leaves SH1 just south of town and runs about 97km through hill country, past Mt Lyford and Waiau, to State Highway 7 north of Culverden. It's a council road, not a state highway: slower, winding, with one-lane bridges, and it floods too. It's the natural route between Kaikōura and Hanmer Springs, and the way around when SH1 south is closed. The July 2026 floods washed out the approach to its Cribb Creek bridge, and in mid-October the council was still aiming to reopen it before Christmas, so check the road is open before you count on it. If SH1 north is closed, the detour to Picton goes over Lewis Pass and adds many hours.

In town

The town stretches along the Esplanade, and Point Kean, where the peninsula walkway starts, is about 4km from the centre. Seals sometimes lie in the Point Kean car park itself, so drive in slowly and keep your distance when you park. InterCity coaches stop in Kaikōura, and so does the Coastal Pacific train from September to late April, but you'll want a car for Ōhau Point and Gore Bay.`,
  },
  {
    slug: "kaikoura-when",
    title: "When to Come",
    icon: CloudSun,
    color: "#2E6B4F",
    region: "kaikoura",
    body: `The whales don't have a season here, but the sea does. Sperm whales feed off Kaikōura all year, so the real question isn't which month to come but how much slack to leave. The boats go out only when the swell and wind allow, and a southerly can stop them for a day or more, so build in a spare day whatever the month.

What changes through the year is the supporting cast. Orca turn up most often in summer, and from November to March a rest period keeps tour boats away from the dusky dolphins from 11.30am to 1.30pm, so trip times shift around it. In summer the fur seals are nursing young pups, and a mother disturbed at this time can abandon her pup. In autumn and winter the dusky dolphin pods can be bigger, sometimes thousands strong, and humpback whales pass on their migration, mostly from June to August. Blue whales and southern right whales are seen now and then.

From about May to September, young seals leave the colonies and wander, and that's when you'll find them on footpaths, in car parks and on the highway.

The weather

The coast is milder than inland Canterbury. Frost is almost unknown in town, and a day over 30 degrees comes about once a year, so summer is warm rather than hot. It is windy, though: Kaikōura gets gusts over 61km/h on about 97 days a year, nearly twice as many as Christchurch. Rain, about 720mm a year, peaks in winter, and July is the wettest month. It comes mostly in heavy bursts rather than on more days, and those bursts are what close the roads.

Summer is busiest, with the most boat departures and the hardest bookings. Winter is quieter, and snow often sits on the ranges behind the town, but there are fewer departures, so a cancelled trip is harder to rebook.`,
  },
  {
    slug: "kaikoura-hazards",
    title: "Local Hazards & Rules",
    icon: ShieldAlert,
    color: "#8F6310",
    region: "kaikoura",
    body: `Kaikōura's fur seals lie where people walk and park, and they look sleepy until they aren't. The big males in the Point Kean car park can turn aggressive if disturbed and give a nasty, infectious bite. DOC asks you to stay at least 20 metres from any seal, never to get between a seal and the sea, and never to touch or feed one. Keep children close and dogs on a lead and well away. Kekeno are protected, and disturbing or harassing them is an offence.

A young seal alone on a footpath, in a car park or on the roadside isn't necessarily in trouble. Leave it where it is and never try to move it. If a seal is injured, in danger or being harassed, call 0800 DOC HOT (0800 362 468). At Ōhau Point, the shore below the lookout is a seal sanctuary closed to the public, and the old Ōhau Stream walk to the waterfall where pups once gathered has been closed since the earthquake. Don't climb the fence.

The peninsula walkway

The clifftop track has unfenced edges, so stay on the formed track and keep hold of children. DOC doesn't maintain the shoreline route back to Point Kean and advises against it, because the tide or seals can cut you off, so return along the clifftops. Dogs aren't allowed on most of the walkway or on the reef platforms, and fires aren't allowed anywhere on it. The tops are exposed, and a southerly can arrive fast.

Fishing and shellfish

Te Tai o Marokura, the Kaikōura Marine Area, has its own rules. The Hikurangi Marine Reserve, south of the peninsula towards Goose Bay, is no-take: don't remove any marine life, shells or stones. Recreational pāua gathering is closed for most of the year, including all of summer, and some reefs, including those around the peninsula, are closed to it all year. Bull kelp may not be taken, the reef off Wakatu Quay is closed to all fishing, and crayfish have had temporary closures. The rules change, so check the current Kaikōura rules on the NZ Fishing Rules app before you take anything.

Tsunami

Warnings here can be very short. In 2016 the first wave arrived within about ten minutes and ran nearly 7 metres up the shore at Goose Bay. If a quake is long or strong, head for high ground on foot straight away.`,
  },
  {
    slug: "kaikoura-book-ahead",
    title: "Book Ahead in Kaikōura",
    icon: MapPin,
    color: "#095C65",
    region: "kaikoura",
    body: `In summer the boat trips often sell out, and the weather still cancels some of the ones people have booked. Book whale, dolphin and seal trips before you arrive, pick a day early in your stay, and keep the next day free in case the sea says no.

Read the terms before you pay. Whale Watch refunds the full fare if it cancels a trip, and 80 percent if your trip sees no whale, but rebooking is up to you and depends on there being space, and you lose the fare if you cancel less than 48 hours before check-in. Dolphin Encounter also refunds in full if it cancels for the weather, and if the dolphins are found but you can't swim with them, it refunds the difference to the watching fare.

DOC isn't issuing any new permits to swim with or view dusky dolphins off Kaikōura until 2031, so the number of swim places isn't growing, and summer trips often sell out.

Campervans

Kaikōura District's freedom camping rules are stricter than most. Only certified self-contained vehicles may freedom camp, only at the council's designated sites, and only for one night in the same spot in any four weeks. Tents aren't allowed. The council also requires your toilet to be usable inside the van with the bed made up, and fines campers whose toilet is stowed away, whatever sticker the van carries. The town's urban area, including the Esplanade, Point Kean and South Bay, and the coast south to the Kōwhai River are off limits.

The designated sites are small, and the South Bay site closes from mid-August to the end of February while banded dotterel nest there. If your van doesn't meet the rules, book a campground, and do it ahead in summer. DOC's Puhi Puhi campsite, in a valley north of town, must be booked online, and DOC keeps no spaces for campers who turn up without a booking.`,
  },

  // ---------------------------------------------------------------- marlborough
  {
    slug: "marlborough-why",
    title: "Why Come to Marlborough",
    icon: Compass,
    color: "#14607A",
    region: "marlborough",
    body: `Most visitors see Marlborough through a windscreen. The ferry docks at Picton, the highway runs straight on through Blenheim, and plenty of people cross the region in an hour on their way somewhere else. What they miss is the Marlborough Sounds, a maze of drowned river valleys where many bays have no road at all and the easiest way in is by boat.

Waitohi Picton is a small harbour town built around the ferry. On the waterfront you can go aboard the Edwin Fox, a sailing ship whose first ocean voyage was in 1853 and which went on to carry troops to the Crimean War, convicts to Australia and migrants to New Zealand. The Snout Track follows the ridge above the harbour, and from October to April boats run out to Motuara Island, a predator-free bird sanctuary, and to Meretoto/Ship Cove, where James Cook anchored.

Beyond Picton lies Queen Charlotte Sound/Tōtaranui and the Queen Charlotte Track, 73.5km of ridges and bays from Meretoto/Ship Cove to Anakiwa. Walking the whole track takes three to five days, but many people walk one section as a day trip, with a water taxi out and back. Queen Charlotte Drive winds west from Picton through the bays to Havelock, which calls itself the green-lipped mussel capital of the world. From Havelock the mail boat spends the day delivering to homes in Pelorus Sound/Te Hoiere that have no road access, and on State Highway 6 towards Nelson, Pelorus Bridge has old forest and clear river pools.

South of the Sounds, the Wairau Valley around Blenheim is flat, dry and covered in vines. Marlborough is New Zealand's largest wine region, with about two-thirds of the country's vineyards, and it made its name with Sauvignon Blanc. Cellar doors cluster around Renwick, close enough together to visit by bike. At Omaka, on the edge of Blenheim, an aviation museum shows World War One aircraft from Sir Peter Jackson's collection in film-quality scenes.

The coast is close too. At the northern end of Rārangi Beach a short walk leads round to Monkey Bay, and over the hill Pukatea/Whites Bay is one of the region's best swimming beaches. Heading south, State Highway 1 crosses dry hill country past the salt works at Lake Grassmere/Kapara Te Hau and reaches Kekerengu, on the coast north of Kaikōura.`,
  },
  {
    slug: "marlborough-getting-around",
    title: "Getting Around Marlborough",
    icon: Car,
    color: "#2466D6",
    region: "marlborough",
    body: `The roads into the Sounds are much slower than the map suggests, and many places have no road at all. Water taxis are the Sounds' buses. They leave from the Picton waterfront, drop walkers at points along the Queen Charlotte Track and pick them up again, and will carry your pack between places to stay so you walk with a day pack. Buses link Anakiwa, at the track's southern end, with Picton.

Off the ferry

Picton's two ferry companies use different terminals. Interislander foot passengers check in at the terminal on Auckland Street, in the town centre, while drivers check in separately on Lagoon Road, and vehicle check-in closes 60 minutes before sailing. Bluebridge has its own terminal on Lagoon Road, less than a kilometre from the centre, and runs a free shuttle for foot passengers from the i-SITE. Blenheim, about half an hour south on State Highway 1, has the region's airport and its bigger shops.

Sounds roads

Queen Charlotte Drive, the coastal road between Picton and Havelock, is narrow and winding, and between Picton and Linkwater, vehicles over 12.6 metres long, including long towing combinations, need a permit. The Kenepuru Road, the way to Portage and the middle of the Queen Charlotte Track, is under 6 metres wide for most of its length, and storm repairs since 2021 have brought planned weekday closures. The road to French Pass leaves State Highway 6 north of Rai Valley and runs about 70km, partly unsealed, narrow and winding. Before driving any of them, check the council's road alerts and its map of planned closures, and expect slips to close roads after heavy rain.

Wine country

The Wairau Valley is flat and the cellar doors are close together, which makes it easy to taste more than you meant to. If you plan to drink, let someone else drive. Guided minibus tours pick up from Blenheim and Picton, and bike hire in Renwick puts many cellar doors within a short, flat ride. Some cellar doors are small and keep short or seasonal hours, so check before you go rather than counting on a walk-in tasting.`,
  },
  {
    slug: "marlborough-when",
    title: "When to Come",
    icon: CloudSun,
    color: "#2E6B4F",
    region: "marlborough",
    body: `Marlborough has two climates about 30km apart. Blenheim and the Wairau Valley are among the sunniest and driest places in New Zealand, with about 2,500 hours of sunshine and around 650mm of rain a year, while the Marlborough Sounds get roughly 1,600 to 1,800mm. A grey, wet day at Picton can be a fine one in Blenheim, so if the weather spoils a plan in one, try the other.

Summer, from December to February, is hot and dry in the valley, where Blenheim averages more than 30 days a year above 25 degrees. It's also when New Zealanders take their own holidays, and from Christmas through January the Sounds' campsites, lodges and water taxis are at their busiest. Autumn, from March to May, often brings warm, calm days and cool evenings, and it's a good time for the Queen Charlotte Track once the holiday crowds have gone.

Winter, from June to August, brings clear, frosty mornings in Blenheim and more rain in the Sounds, where the clay on the Queen Charlotte Track gets slippery. It's quiet, and on a fine day the walking is good, but some boat trips run only in the warmer months, such as the Motuara Island cruise, which runs from 1 October to 30 April. The Pelorus mail boat runs all year.

Spring, from September to November, brings flowering bush and quieter tracks, but it is generally the windiest season across the region. Blenheim sits in the shelter of the Wairau Valley, and on warm days it often gets an easterly sea breeze in the afternoon. The outer Sounds are a different matter: they catch the gales that funnel through Cook Strait, and a southerly can be blowing at storm force in the strait while Blenheim, about 30km away, is calm. Keep that in mind for boat trips, kayaking and the ferry crossing as well as the track.`,
  },
  {
    slug: "marlborough-hazards",
    title: "Local Hazards & Rules",
    icon: ShieldAlert,
    color: "#8F6310",
    region: "marlborough",
    body: `Wine country catches people out. A few tastings at each of several cellar doors adds up, and the drink-driving limit is lower than many visitors expect, with none at all allowed for drivers under 20. The limits are in Driving the South Island.

On the water

The inner Sounds look sheltered, and often are, but wind can rise quickly and the outer Sounds get Cook Strait weather. Under Marlborough's navigation bylaw, which took effect in late 2025, everyone on a boat under 6 metres long must wear a lifejacket. If you're new to sea kayaking, go with a guide, who will pick the day's route around the wind. In the Long Island-Kokomohua Marine Reserve, at the entrance to Queen Charlotte Sound, you may not take or disturb anything. Elsewhere, check the NZ Fishing Rules app before you fish or gather shellfish, because limits and closures vary by area.

On the Queen Charlotte Track

You need a Queen Charlotte Track Land Cooperative pass for the sections on private land between Kenepuru Saddle and Anakiwa, whether you walk or ride. It's sold online, at the Picton and Blenheim i-SITEs and on the Picton waterfront, and it doesn't cover campsite fees. Bikes can use the whole track all year, but from 1 December to 28 February riders starting at Meretoto/Ship Cove must catch the 8am water taxi from Picton. No open fires are allowed anywhere on the track, and DOC may close it in extreme drought. Dogs are allowed only between Anakiwa and Davies Bay, on a lead and with a permit. Treat all water, including campsite taps, and carry enough for the day. Wasps are common in late summer and autumn, especially in beech forest, so carry antihistamines if you're allergic.

Fire

Fire and Emergency splits Marlborough at the Wairau River, and the two zones can have different rules at once. In a dry summer the country south of the river can be under a total fire ban, fireworks included, while the north needs a permit for any open fire. Check checkitsalright.nz before you light anything.

Freedom camping

On council land you can freedom camp only in a certified self-contained vehicle, and only at the council's designated sites, which have limits on how many nights you stay. Most are around Blenheim and Renwick, so around Picton and in the Sounds, plan on a booked DOC campsite or a holiday park.`,
  },
  {
    slug: "marlborough-book-ahead",
    title: "Book Ahead in Marlborough",
    icon: MapPin,
    color: "#095C65",
    region: "marlborough",
    body: `The crunch is Christmas and January, when New Zealanders head for the Sounds and the small number of beds along the Queen Charlotte Track and in the bays fill months ahead. Book those first, then the boats to match.

There are no DOC huts on the Queen Charlotte Track, only lodges, homestays and DOC campsites, and the campsites must be booked at any time of year. Once your beds are fixed, book water taxis and pack transfers for the same days, and buy your track pass before you set off. For a day walk in summer, book the water taxi at least the day before.

The DOC campsites near Picton, such as Whatamango Bay, Aussie Bay and Pukatea/Whites Bay, keep no spaces for walk-ins, so book online. DOC treats December to February and public holiday weekends as the peak, and same-day online bookings stay open until 8pm if there's space. Whites Bay's gate is locked overnight in the busy season, so if you're coming off an evening ferry, DOC suggests Whatamango Bay, about 15 minutes from the terminal, instead. The Pelorus Bridge campground has a three-night minimum over Christmas week.

Boat trips are worth booking ahead in summer. The Motuara Island cruise runs only from October to April, and the Pelorus mail boat sails on Mondays, Wednesdays and Fridays, so a missed day can mean a two-day wait.

In wine country, check hire bike availability in Renwick before you arrive, especially from Christmas to the end of February. Guided wine tours, some of which are for over-18s only, are best booked a few days ahead. Blenheim's beds also fill at Easter in the years the Classic Fighters airshow is held at Omaka.

If you're catching an early ferry, or arriving on a late one, book a bed in Picton rather than planning to drive to or from Blenheim or Nelson in the dark.`,
  },

  // ---------------------------------------------------------------- nelson-tasman
  {
    slug: "nelson-tasman-why",
    title: "Why Come to Nelson & Tasman",
    icon: Compass,
    color: "#14607A",
    region: "nelson-tasman",
    body: `The region looks compact on a map, but its best parts sit at the ends of separate roads. Nelson city, the Abel Tasman coast, Golden Bay and the Nelson Lakes lie in different directions, and Golden Bay is over a slow, winding hill, so most people need more days here than they first planned. Base yourself in each part in turn rather than trying to see it all from Nelson.

Nelson itself is a small, sunny city on Tasman Bay/Te Tai-o-Aorere. The Saturday market fills Montgomery Square every week, Tāhunanui Beach is a few minutes from the centre, and a short, steep climb up Botanical Hill reaches the Centre of New Zealand monument. It marks the point used for the country's first survey in the 1870s rather than the true geographic centre, but the view over the city and the bay is the real reward. On hot days locals cool off in the swimming holes of the Maitai River on the edge of town. West of Richmond, Moturoa/Rabbit Island has a long beach backed by pine forest, and a small ferry from Māpua Wharf links the two halves of Tasman's Great Taste Trail, a mostly flat cycle trail.

Past Motueka, Kaiteriteri and Mārahau are the gateways to Abel Tasman National Park, the reason many people come: golden beaches, granite headlands, clear water and fur seals on the rocks. There's no road along the coast, so you walk the Coast Track, paddle a sea kayak or ride a water taxi, and plenty of people do all three in one day. Split Apple Rock sits just off a small beach between Kaiteriteri and Mārahau, and up the Riuwaka Valley a river flows out from under Tākaka Hill at the Riuwaka Resurgence, a wāhi tapu, or sacred place, for Te Ātiawa, Ngāti Rārua and Ngāti Tama.

Golden Bay/Mohua is slower and quieter again. Te Waikoropupū Springs push out about 14,000 litres of water a second, among the clearest water ever measured. Further north, Wharariki Beach has dunes, rock arches and seal pups in its pools, and Farewell Spit, the country's longest sand spit, is an internationally important bird sanctuary. The Heaphy Track starts at the head of the Aorere Valley beyond Collingwood.

Inland, St Arnaud sits beside Lake Rotoiti in Nelson Lakes National Park, among beech forest and alpine tops. Further down State Highway 6, Murchison is a small river town, and just to the south, Maruia Falls were created by the 1929 Murchison earthquake.`,
  },
  {
    slug: "nelson-tasman-getting-around",
    title: "Getting Around Nelson & Tasman",
    icon: Car,
    color: "#2466D6",
    region: "nelson-tasman",
    body: `The road that matters most is State Highway 60 over Tākaka Hill, the only road into Golden Bay. It climbs and drops through tight bends between Riwaka and the Tākaka valley, so it's slower than the distance suggests. Heavy rain brings slips, and when the hill closes there's no other way in or out. Storm repairs on the hill also bring short night closures, so check NZTA's journey planner before you cross, especially after heavy rain.

There's no road along the Abel Tasman coast. Roads reach the park only at its ends, at Mārahau in the south and at Tōtaranui and Wainui in the north, and in between you walk, paddle or go by boat. Water taxis run all year from Mārahau and Kaiteriteri to set stops up the coast as far as Tōtaranui, but not beyond it, and they must be booked in advance. To hire a sea kayak without a guide you need at least two people and some sea kayaking experience, and DOC doesn't recommend paddling north of Onetahuti Bay, where the coast is remote and exposed. The last 12km of road to Tōtaranui, over the hill from Pōhara, is narrow, winding and unsealed.

Out at Farewell Spit, cars and bikes aren't allowed on the beach past the Triangle Flat car park, and the spit beyond its base is reached only on a guided tour from Collingwood.

Nelson and nearby towns

The eBus network links Nelson, Richmond, Wakefield and Motueka, and one route runs to Nelson Airport. Pay with a Bee Card or cash, not a bank card, and note that the Motueka bus doesn't run at weekends or on public holidays. For cycling, the Great Taste Trail runs from Nelson through Richmond and Māpua towards Motueka on a mix of cycle paths and quiet roads. On Moturoa/Rabbit Island, the gates are locked each evening at the time shown on the signs at the entrance, and a car left inside stays there until they open the next day.

Nelson Lakes and Murchison

St Arnaud is on State Highway 63, roughly one to two hours' drive from Nelson. The gate at the bottom of Mount Robert Road, which leads to the Mount Robert car park, is locked when the road is icy. Murchison is on State Highway 6 at the top of the Buller Gorge, and State Highway 65 runs south past Maruia Falls to Springs Junction and the Lewis Pass road.`,
  },
  {
    slug: "nelson-tasman-when",
    title: "When to Come",
    icon: CloudSun,
    color: "#2E6B4F",
    region: "nelson-tasman",
    body: `Nelson's sunshine reputation is earned. NIWA puts the city's average at about 2,400 hours a year, among the highest in New Zealand, and it's often one of the four sunniest places in the country. What catches people out is the other side of it. The region takes the brunt of storms arriving from the north, including ex-tropical cyclones between November and April, and when rain does come it can be very heavy. Those are the storms that bring slips down on Tākaka Hill and flood the rivers.

Summer, from December to February, is warm rather than hot on the coast. Afternoons are typically 20 to 23 degrees, and days over 30 are rare, although inland Murchison gets much hotter and holds the region's record of 36.8 degrees. February and March are usually the driest months. The Abel Tasman Coast Track is busiest from October to April, and the summer school holidays fill Kaiteriteri, Mārahau and Golden Bay.

Autumn, from March to May, keeps much of summer's settled weather, and the sea is still warm after the holiday crowds have gone. It's a good time for the Coast Track and for Golden Bay.

Winter, from June to August, brings shorter days, but NIWA notes that the drop in sunshine hours comes from the low sun rather than more cloud, so clear, crisp days are common. Nights are cold, with frosts inland, and St Arnaud is much colder again, with frequent frosts and about eight days of snow a year. Higher up, Lake Angelus beside Angelus Hut is usually frozen and snow covers the routes to it from May to October. The Coast Track can be walked all year, and from May to September its huts cost less and you can stay longer at each one.

Spring, from September to November, is often wetter, since the wettest months here fall in winter or spring. It's also lambing season on the farmland that some walks cross. The Cable Bay Walkway near Nelson can close for lambing from early August to early October, and Pūponga Farm Park, which you cross to reach Wharariki Beach, can close for lambing or calving.`,
  },
  {
    slug: "nelson-tasman-hazards",
    title: "Local Hazards & Rules",
    icon: ShieldAlert,
    color: "#8F6310",
    region: "nelson-tasman",
    body: `On the Abel Tasman, the tide decides your day. Awaroa Inlet can only be crossed from 1.5 hours before low tide to 2 hours after it, in daylight, and there's no other route around it. The estuaries at Torrent Bay and Bark Bay can be crossed within about two hours either side of low tide, and otherwise you take the longer all-tide track. Check a tide table before you book huts and water taxis, and plan each day around it.

Golden Bay

The water at Te Waikoropupū Springs, including Fish Creek and the Springs River, is closed to all contact. That means no swimming, wading or touching the water, and no filling bottles. The springs are wāhi tapu, and the rule protects both the water and its cultural significance. Wharariki Beach is not a swimming beach, because of strong currents and rips. Keep at least 20 metres from the seals, and don't follow or chase the pups in the pools, since harassing seals is an offence. On Farewell Spit you can walk the base on your own, but beyond that the nature reserve is open only on a licensed tour or with a DOC permit. Pūponga Farm Park can close at short notice for lambing, calving or extreme fire risk.

Nelson Lakes

The Mount Robert circuit crosses an open, steep face and an exposed ridge, and DOC warns that freezing conditions can occur at any time of year, so carry warm and waterproof layers. Wasps are common in the beech forest from December to April, so carry antihistamine if you react to stings. The big longfin eels under the Kerr Bay jetty are decades old, and the species is in decline. Don't feed them, touch them or throw anything at them. At Maruia Falls people have drowned swimming, so stay out of the water both above and below the falls.

Fire and dogs

In a dry late summer, Fire and Emergency can put most of Nelson and Tasman, including Abel Tasman and Nelson Lakes national parks, under a total fire ban. In 2019 the Pigeon Valley fire near Wakefield forced about 3,000 people from their homes. Check checkitsalright.nz before lighting anything, and note that fires aren't allowed at the Kerr Bay campsite. Dogs aren't allowed in either national park, at Te Waikoropupū Springs, at Pūponga Farm Park, Wharariki or Farewell Spit, or on Moturoa/Rabbit Island.`,
  },
  {
    slug: "nelson-tasman-book-ahead",
    title: "Book Ahead in Nelson & Tasman",
    icon: MapPin,
    color: "#095C65",
    region: "nelson-tasman",
    body: `What catches people out is that Abel Tasman's huts and campsites must be booked all year round, not just in summer. Bookings for the year ahead open in May along with the other Great Walks, and in a recent summer the huts were about 95 percent full. From October to April you can stay no more than two nights at any one hut or campsite, and only one at Tōtaranui. Book your water taxis and any kayak hire at the same time, so they fit the tides. Operators cancel boats and kayak trips in bad weather, so keep a spare day if the coast is the main reason for your trip.

Other huts and campsites

The Heaphy Track's huts and campsites must also be booked all year. Its northern end is at Brown Hut, about 28km up the Aorere Valley from Collingwood, and its southern end is near Karamea on the West Coast, so arrange transport between the two before you start, because some operators don't run in winter. In Nelson Lakes, Angelus Hut must be booked all year, and no spaces are kept for walkers who turn up without a booking. Kerr Bay campsite in St Arnaud also needs a booking all year, and well ahead for Christmas and Easter. Tōtaranui Campground keeps no spaces for walk-ins, so book it online.

Tours and beaches

Farewell Spit tours leave from Collingwood at times set by the tides, and they're the only way to see most of the spit, so book ahead in summer. Kaiteriteri is one of the busiest beaches in the region over Christmas and January, so get there early if you're driving.

Campervans

Both councils changed their freedom camping rules in late 2025. In Nelson city, certified self-contained vehicles can stay at a handful of signposted car parks, for up to two nights. Vehicles that aren't self-contained can use only a few spaces at the Buxton car park. In Tasman District, tents aren't allowed on public land at all, and freedom camping is limited to a few signposted sites, most of them only for certified self-contained vehicles, and you must leave by 8am. In both districts, breaking the rules can bring a $400 fine. If your van isn't certified self-contained, book a campground.`,
  },

  // ---------------------------------------------------------------- west-coast
  {
    slug: "west-coast-why",
    title: "Why Come to the West Coast",
    icon: Compass,
    color: "#14607A",
    region: "west-coast",
    body: `The West Coast is a long, narrow strip between the Tasman Sea and the Southern Alps, and the usual mistake is to treat it as the drive between Nelson and Wānaka. Most of what's good here deserves a day of its own, and the weather decides which day. Give it longer than you think, and expect at least one wet one.

The glaciers are the big draw, and they aren't what older photos show. Franz Josef Glacier/Kā Roimata o Hine Hukatere and Fox Glacier/Te Moeka o Tuawe have retreated a long way up their valleys. The valley walks now end at viewpoints well back from the ice, and the only way to stand on either glacier is to fly there by helicopter. The valleys are still worth the walk, scraped bare by the ice and lined with waterfalls. Nearby, Lake Matheson reflects Aoraki Mount Cook and Mount Tasman on a still morning, Gillespies Beach has old gold workings at the end of a gravel road, and at Ōkārito you can paddle a tidal lagoon beside the forest that holds the only natural population of rowi, the rarest kiwi.

Halfway up the Coast, the limestone of Paparoa National Park forms the Pancake Rocks and blowholes at Punakaiki, which are at their best around high tide. The Paparoa Track, a Great Walk shared by walkers and mountain bikers, crosses the range from near Blackball to Punakaiki, and it links with the Pike29 Memorial Track, which remembers the 29 men killed in the Pike River Mine explosion in 2010.

This coast was built on gold, coal and pounamu. Hokitika grew from the gold rush of the 1860s and is now a hub for pounamu carvers, and Ross, Reefton, Shantytown and the ghost town of Waiuta all tell the gold story. North of Westport, the Denniston Plateau holds the remains of a coal town and the top of the Denniston Incline, where loaded coal wagons were lowered down the hillside.

At both ends of the road it gets quieter again. Karamea, in the far north, is the way to the Ōpārara Arches, huge limestone arches in the forest of Kahurangi National Park, and to Kōhaihai, where the Heaphy Track meets the sea among nīkau palms. The Old Ghost Road, an 85km walking and riding trail, runs from the Upper Buller Gorge to the Mōkihinui River, and Cape Foulwind near Westport has a fur seal colony all year. South of the glaciers, the highway runs for long stretches through rainforest to Haast, past short walks at Ship Creek and Monro Beach, and a side road ends at the fishing wharf at Jackson Bay.`,
  },
  {
    slug: "west-coast-getting-around",
    title: "Getting Around the West Coast",
    icon: Car,
    color: "#2466D6",
    region: "west-coast",
    body: `One highway does nearly all the work. State Highway 6 runs the length of the Coast, through the Buller Gorge to Westport, down the coast road past Punakaiki to Greymouth and Hokitika, on to the glaciers and Haast, then over the Haast Pass to Wānaka. When a slip or a flood closes part of it, there's often no other way round.

Getting in

From Canterbury, State Highway 7 crosses Lewis Pass to Reefton and State Highway 73 crosses Arthur's Pass to the coast near Kumara, and the TranzAlpine train ends in Greymouth. From Nelson, State Highway 6 comes through Murchison and the Buller Gorge. Hokitika and Westport have small airports with domestic flights.

How far it is

The Coast is longer than it looks. Hokitika to Franz Josef is about 135km, or an hour and three-quarters, and Fox Glacier is about 24km further on. From Fox Glacier to Haast is about 120km of forest and coast with no town on the way, and mobile coverage has long gaps on this stretch and over the pass. Fill the tank and buy food in Fox Glacier or Haast before you set off. In the north, State Highway 67 runs about 95km from Westport to Karamea and ends there.

When the road closes

Slips close the coast road between Westport and Greymouth from time to time, often near Punakaiki. When it shuts, the detour inland through Reefton on State Highways 69 and 7 adds about an hour and a half. Between Fox Glacier and Haast there is no detour at all. On a wet day, check the NZTA journey planner before you leave, carry food and water, and be ready to wait or turn back.

Bridges and side roads

The highway crosses many one-lane bridges, and the Haast River bridge, at 737 metres, is the longest one-lane bridge in the country, with passing bays along it. Several side roads need care. McCallums Mill Road to the Ōpārara Arches is narrow, steep gravel, with a height barrier to keep large vehicles out, and DOC says it isn't suitable for campervans. The last 8km to Waiuta is narrow, winding gravel, and about half the road to Gillespies Beach is narrow gravel that isn't suitable for towing. The road up to Denniston is sealed but steep and winding.

If you'd like a break from driving, the West Coast Wilderness Trail between Greymouth and Ross and the Kawatiri Coastal Trail south of Westport are easy rides with bikes for hire in the towns.`,
  },
  {
    slug: "west-coast-when",
    title: "When to Come",
    icon: CloudSun,
    color: "#2E6B4F",
    region: "west-coast",
    body: `The West Coast is wet in every season, but it isn't wet all the time, and winter is the surprise. NIWA's records show that long dry spells here come most often in winter and autumn and least often in spring, so June to August can bring runs of clear, still, frosty days, with fresh snow on the Alps behind the coast.

This is still the wettest region in the country. Rain falls on more than half the days of the year at Hokitika and Franz Josef, it's spread fairly evenly through the year, and spring brings the most rainy days, with October usually the worst. Rain from the north-west can be torrential, especially in the mountains, but a wild night is often followed by a clear morning, because the south-westerly change behind a front tends to clear the sky quickly.

Down on the coast the temperatures are mild. Summer afternoons are usually 18 to 22 degrees, winter nights fall to around 1 to 6 degrees, and snow at sea level is very rare. Higher up it's another matter: on the Paparoa Track, DOC warns that heavy rain, snow, ice, fog and strong winds are possible at any time of year.

The seasons

Summer, from December to February, is the busiest time, when the glacier villages fill and the evenings are long, and February is usually the driest month. Autumn is often settled and quieter. In winter the days are short and some small businesses close or shorten their hours, but it's the only season you can ride the Heaphy Track, which is open to mountain bikers from 1 May to 30 November. Spring has the most rainy days, and it's the time to see fur seal pups at Cape Foulwind, from September, and tawaki, the Fiordland crested penguin, coming ashore at Monro Beach from September to November.

Whatever the season, spend at least two nights near the glaciers, so that a clear day has a good chance of falling inside your stay.`,
  },
  {
    slug: "west-coast-hazards",
    title: "Local Hazards & Rules",
    icon: ShieldAlert,
    color: "#8F6310",
    region: "west-coast",
    body: `Heavy rain is the hazard that shapes everything here. Rivers rise within hours, slips close roads, and a downpour can flood the glacier valleys within minutes. Falling ice can also dam a glacier river and then release a sudden surge of water and ice down the valley. At Franz Josef and Fox Glacier, check the daily glacier access update first, because floods and rockfall close the roads and tracks, stay behind the barriers, and turn back if it starts to pour. At Hokitika Gorge, DOC warns that the river is swift, cold and dangerous in all conditions, and people have drowned there.

The coast

These are wild surf beaches on the open Tasman Sea. DOC strongly advises against swimming anywhere along the Heaphy coast because of extreme tidal currents and rips, so treat the other surf beaches with the same caution and swim in the lakes instead. Parts of the Heaphy Track near Kōhaihai can be cut off by high tides and rough seas, so check the tide times before you go. Keep at least 20 metres away from fur seals and from tawaki, and keep dogs well away from both.

The Alpine Fault

The Alpine Fault runs along the western foot of the Southern Alps, and Franz Josef sits on it. It last ruptured in 1717 and has done so about every 300 years. Scientists put the chance of a major earthquake on it in the next 50 years at 75 percent, with a four in five chance that it would be magnitude 8 or more. You can't plan around it, but if it happens while you're here, follow Civil Defence instructions and expect slips to close roads for some time.

Pounamu

All natural pounamu here belongs to Ngāi Tahu, under the Ngāi Tahu (Pounamu Vesting) Act 1997. Anyone may pick it up by hand on designated West Coast beaches. Ngāi Tahu limits this to what one person can carry, and Police say the limit is a piece you can carry in one hand, so keep to small stones. Fossicking in rivers is for Ngāi Tahu whānau with a permit from the local rūnanga, and taking pounamu from a river without a permit is theft.

Freedom camping

Each district sets its own rules, and Buller is reviewing its bylaw, so read the signs where you stop. In Buller, only certified self-contained vehicles may freedom camp, and it's banned between the Punakaiki and Fox rivers and along the road to Kōhaihai. Westland, from Kumara south to Haast, also allows only certified self-contained vehicles and bans camping on council reserves. If your campervan isn't certified, book a campground.`,
  },
  {
    slug: "west-coast-book-ahead",
    title: "Book Ahead on the West Coast",
    icon: MapPin,
    color: "#095C65",
    region: "west-coast",
    body: `A single closed road can upset every booking further along the Coast, so where you can, book beds and tours you're able to move or cancel, especially in Franz Josef, Fox Glacier and Haast.

Glacier heli-hikes need a clear spell of several hours and a minimum number of people, and Franz Josef Glacier Guides advise planning at least two days in the area. Book one for your first full day there, and read the cancellation terms before you pay, because some operators refund a weather cancellation while others may offer a different flight instead.

Campsites

Many DOC campsites on the Coast, from Kōhaihai to Lake Paringa, must be booked online all year, and they keep no spaces for anyone who turns up without a booking. Same-day bookings close at 8pm, and mobile coverage is patchy, so book while you still have signal.

Paparoa Track

All three huts on the Paparoa Track, Ces Clark, Moonlight Tops and Pororari, must be booked, and bookings open in May or June for the year starting in July. Walkers take about three days, with two nights in huts, and mountain bikers two, with one night. The Smoke-ho car park at the Blackball end is small and for day use only, and cars have been broken into at the track's car parks, so leave your car where you're staying and book a shuttle.

Heaphy Track

The Heaphy's huts and campsites must be booked all year. The Kōhaihai end is 15km past Karamea, about an hour and three-quarters from Westport, and the other end is in Golden Bay, a long way round by road. Arrange transport or a flight back before you start. Small operators fly into Karamea and Tākaka, and some transport businesses don't run in winter.

The Old Ghost Road has its own booking system for its huts, separate from DOC's. In Karamea, Haast and the glacier villages the choice of places to eat is limited, so book dinner ahead in summer.`,
  },

  // ---------------------------------------------------------------- aoraki-mackenzie
  {
    slug: "aoraki-mackenzie-why",
    title: "Why Come to Aoraki Mount Cook & the Mackenzie",
    icon: Compass,
    color: "#14607A",
    region: "aoraki-mackenzie",
    body: `The mistake is treating Aoraki Mount Cook as a day trip. From Queenstown it's about three and a half hours each way, and from Christchurch about four and a half, so you spend the day driving to see a mountain that is often hidden in cloud. Aoraki Mount Cook Village gets about seven times as much rain as Takapō Lake Tekapo, an hour and a half away. Stay at least one night, two if you can, so you get a second chance at a clear morning.

The Mackenzie Basin is wide, dry tussock country ringed by mountains. Its big lakes, Takapō, Pukaki and Ōhau, are milky turquoise from rock flour, fine sediment ground up by glaciers and carried down in the meltwater. Takapō has the small stone Church of the Good Shepherd on its shore, the Mt John observatory above the town and the Tekapo Springs hot pools. Since 2012 the basin and the national park have formed the Aoraki Mackenzie International Dark Sky Reserve, where outdoor lighting is kept low and shielded, so on a clear night the stars are the main event.

Aoraki Mount Cook National Park is ice and rock rather than forest. It has 19 peaks over 3,000 metres, including Aoraki itself at 3,724 metres, and glaciers cover about 40 percent of it. To Ngāi Tahu, Aoraki is the most sacred of ancestors. The Hooker Valley Track leads to a lake under the mountain, often with icebergs, and the second of its three swing bridges is now a 189-metre bridge, the longest of its kind in the country. Short walks also lead to Kea Point and to a view over Haupapa Tasman Glacier, the country's longest glacier, and its growing lake.

South of the lakes, Twizel was built in 1968 to house the workers on the hydro scheme, and it's now the practical base, with supermarkets and quieter beds. Salmon farmed in the hydro canals is sold beside Lake Pukaki. Omarama, further south, is known for gliding, the eroded Clay Cliffs and private hot tubs, and from there the road climbs over the tussock of the Lindis Pass towards Wānaka, or runs down the chain of hydro lakes at Benmore and Aviemore. The Alps 2 Ocean Cycle Trail starts at the foot of Aoraki and crosses the basin on its way to the sea at Oamaru.

The braided riverbeds are home to the kakī, or black stilt, one of the rarest birds in the world. DOC raises chicks at a breeding centre near Twizel to keep the wild population going.`,
  },
  {
    slug: "aoraki-mackenzie-getting-around",
    title: "Getting Around the Mackenzie",
    icon: Car,
    color: "#2466D6",
    region: "aoraki-mackenzie",
    body: `There's only one road to Aoraki Mount Cook Village. State Highway 80 leaves State Highway 8 at the southern end of Lake Pukaki and runs about 55km up the lake and the Tasman Valley to the village, where it ends. The nearest supermarkets are in Twizel, about an hour away, and Takapō, about an hour and a half. The village has a single self-service fuel pump, and it's expensive, so fill up before you go. Snow can close or limit the road between June and September, so check NZTA before you drive in.

State Highway 8 is the spine of the region. It climbs from Fairlie over Burkes Pass into the basin, runs past Takapō and Lake Pukaki to Twizel and Omarama, then crosses the Lindis Pass, at 971 metres, towards Tarras and Wānaka. Snow closes both passes from time to time, usually for hours rather than days. Takapō has frost on about 100 days a year, so expect ice on shaded corners on winter mornings. InterCity coaches run along the highway and up to the village.

Stopping on the way

The basin roads are long, straight and fast, and the views make people stop in odd places. Use Peters Lookout on State Highway 80 and the lakeside car parks rather than the road shoulder, and don't step onto the highway for the classic road photo.

At the national park

From November to March, the White Horse Hill car park at the start of the Hooker Valley Track can fill between about 10am and 4pm. Start early or late, or walk up from the village on the Kea Point Track, which starts on Terrace Road and adds about half an hour each way.

At Takapō, the road up Mt John is open only in the daytime and charges a toll per vehicle. Stargazing tours take you up by coach at night, and a walking track climbs from beside Tekapo Springs.

The Alps 2 Ocean trail

The full trail runs about 315km to Oamaru, over five to seven days. The official start, at White Horse Hill, includes a helicopter hop across the Tasman River, which depends on the weather and is best booked ahead. Otherwise, start at Takapō and ride 54km to Twizel. From Lake Ōhau Lodge the trail climbs to about 900 metres, its highest point, before dropping to Omarama, and beyond Omarama a narrow stretch above the Ahuriri arm of Lake Benmore needs extra care in strong wind. Shuttles and bag transfers run from Takapō, Twizel and Omarama. In winter, snow can make parts of the trail impassable.`,
  },
  {
    slug: "aoraki-mackenzie-when",
    title: "When to Come",
    icon: CloudSun,
    color: "#2E6B4F",
    region: "aoraki-mackenzie",
    body: `The basin and the mountains have different climates. Takapō gets about 590mm of rain a year and is often one of the sunniest places in New Zealand. Aoraki Mount Cook Village, an hour and a half away beside the main divide, gets about 4,300mm, and has some rain on about 171 days a year. A blue sky over the lake in the morning doesn't mean the mountain will be clear, so keep a spare day in your plans.

The wind is the other surprise. The windiest months run from about October to January, and spring brings the most strong-wind days at Takapō. The wind usually builds through the day and peaks in mid-afternoon, so mornings are often the calmest time for walking, flying, boat trips and photos.

Summer, from December to February, is warm and dry in the basin, with days that can pass 30 degrees and cool nights. It's the busiest season, and the long evenings mean the sky isn't fully dark until late, so stargazing tours start late too. Lupins colour the roadsides and riverbeds from around late November into December.

Autumn, from March to May, is often more settled, with fewer people, cold mornings and darker evenings that suit stargazing.

Winter, from June to August, is cold and mostly clear in the basin. Frost is almost nightly at Takapō in midwinter, and Tara Hills, near Omarama, recorded minus 21 degrees in June 2015, the lowest temperature on record in Canterbury. Snow falls in Aoraki Mount Cook Village on about 24 days a year, and the Hooker Valley Track gets icy. In return you get the longest nights for stargazing, small ski fields at Roundhill near Takapō and at Ōhau, and snow play at Tekapo Springs.

Spring, from September to November, is the windiest and most changeable season. Late snow is common in the mountains, and on the alpine routes above the village the avalanche danger lasts until mid-November.`,
  },
  {
    slug: "aoraki-mackenzie-hazards",
    title: "Local Hazards & Rules",
    icon: ShieldAlert,
    color: "#8F6310",
    region: "aoraki-mackenzie",
    body: `The glacier lakes look calm, and that's the catch. The water in Hooker Lake is typically around 3 degrees, cold enough to cause hypothermia quickly. Icebergs are unstable and can roll without warning, so don't climb on them, and stay off the lakes when they freeze, because the ice can be thin. Tasman Lake didn't exist before the 1970s and is growing fast as the glacier melts, and the loose moraine walls around it are dangerous, so stay at the viewpoint unless you know what you're doing.

Tracks in snow and ice

In winter the Hooker Valley Track gets very icy in the shade, and DOC recommends microspikes and poles. Beyond the outlet of Hooker Lake is avalanche terrain. The Sealy Tarns Track climbs about 2,200 steps, and in winter it can be so icy that you need an ice axe and crampons to reach the tarns, with avalanche risk too. Above the tarns, the Mueller Hut Route has considerable avalanche danger from April to mid-November and needs mountaineering skills and avalanche gear. Bad weather usually comes from the north-west, and there's no shelter on the way up, so turn back early. Check with the visitor centre and the New Zealand Avalanche Advisory first.

Park and village rules

There's a permanent fire ban in the national park, and no dogs. Recreational drones aren't allowed anywhere in the park, and drones are banned over Takapō village too, because it's close to the airfield. At the Church of the Good Shepherd, photography isn't allowed inside, and there's no access inside the fence at night.

Freedom camping

The Mackenzie District bans freedom camping in Takapō township and in parts of Twizel and Fairlie, doesn't allow freedom camping in tents on council land anywhere in the district, and bans open fires. At Lake Pukaki the only freedom camping is at Pines Camp, at the southern end, for certified self-contained vehicles only, with no tents and a limit of three nights a month. If your vehicle isn't certified self-contained, book a campground.

Fire, rivers and lupins

In October 2020 a wind-driven fire at Lake Ōhau destroyed 48 houses. Check checkitsalright.nz before lighting anything. Don't drive in the braided riverbeds from August to December, when kakī and other birds are nesting. The lupins are an introduced pest that gives predators cover near those nests, so enjoy them, but don't spread their seed.`,
  },
  {
    slug: "aoraki-mackenzie-book-ahead",
    title: "Book Ahead in the Mackenzie",
    icon: MapPin,
    color: "#095C65",
    region: "aoraki-mackenzie",
    body: `The crunch is beds. Takapō is a small village that takes in a great many visitors, and Aoraki Mount Cook Village has only a handful of places to stay, so both can book out months ahead for summer and the school holidays. Twizel has more beds and is an hour from the national park, and Fairlie and Omarama are fallbacks too. Book before you set your route, not after.

Stargazing tours

Stargazing is the reason many people stay the night, and the tours have small groups and often sell out, so book before you arrive. Book one early in your stay, because cloud cancels the outdoor part. The main operator at Takapō offers an indoor session, a rebooking or a refund when it's cloudy, and with a spare night you can simply go again. In summer it gets dark late, so the tours run late at night, and it's cold on Mt John at night in any season, so bring warm layers. At Aoraki Mount Cook Village, the Hermitage runs stargazing with telescopes and a planetarium. Evening slots at the Takapō hot pools and the Omarama hot tubs are worth booking ahead in summer too.

At the national park

The White Horse Hill campsite at the start of the Hooker Valley Track is booked on the DOC website and is often full in summer. Mueller Hut needs a booking for the summer season, as the island-wide booking section explains. Boat and kayak trips among the icebergs on Tasman Lake depend on the weather, so book them early in your stay.

The village has no supermarket, just a small convenience store in the hotel and a handful of places to eat and drink, so book dinner, or bring food from Twizel or Takapō.

On the trail

For the Alps 2 Ocean in summer, book the helicopter crossing, shuttles, bag transfers and beds along the route before you start. Beds along the route are limited, and some places close for the winter.`,
  },

  // ---------------------------------------------------------------- queenstown-wanaka
  {
    slug: "queenstown-wanaka-why",
    title: "Why Come to Queenstown & Wānaka",
    icon: Compass,
    color: "#14607A",
    region: "queenstown-wanaka",
    body: `Queenstown is a small town that takes in a city's worth of visitors, and it shows. The centre is crowded for much of the year, beds and meals cost more than in most of the country, and much of what the town sells is paid adventure: jet boats, bungy jumps, the gondola, lake cruises and scenic flights. If that's what you came for, nowhere does it better. If you came for quiet mountains, plan to spend most of your days out of town.

The setting is the reason it's all here. Queenstown sits on Lake Wakatipu, a long, deep lake carved by glaciers, with the Remarkables rising straight from its shore. The sealed road west along the lake reaches Glenorchy in about 45 minutes, and beyond it are the valleys where the Routeburn Track begins. Arrowtown, about 20 minutes the other way, is a gold-rush town whose restored settlement tells the story of the Chinese miners who came to the Otago goldfields from 1866, and the hostility many of them faced.

Wānaka, an hour or so north over the Crown Range, is smaller and slower. Life there centres on the lake, good walks start minutes from the main street, and up the valley a long gravel road leads into Mount Aspiring National Park. Lake Hāwea, just beyond, is quieter again.

East of both towns is Central Otago, the driest part of the country, with hot summers and hard, frosty winters. It is gold-rush country that became orchard and vineyard country. Cherries and apricots are sold at roadside stalls in summer, and wineries cluster around Gibbston, Bannockburn and Cromwell. The old railway line between Clyde and Middlemarch is now the Otago Central Rail Trail, about 150km of easy riding that most people spread over three or four days, and the Lake Dunstan Trail links Clyde with Cromwell through the Cromwell Gorge.`,
  },
  {
    slug: "queenstown-wanaka-getting-around",
    title: "Getting Around Queenstown & Wānaka",
    icon: Car,
    color: "#2466D6",
    region: "queenstown-wanaka",
    body: `The distances here are short, and the roads are what slow you down. Nearly all traffic into central Queenstown comes along one road, State Highway 6A from Frankton, so it queues at busy times, and roadworks around Frankton have added delays in recent years. The airport is at Frankton, about 8km from the town centre, so allow extra time to get there at peak hours.

Parking in the town centre is limited and paid, and if you're staying out of town the bus is often easier. Orbus runs the public buses, including a route between the airport and the centre, but you pay with cash or a Bee Card, a prepaid card sold at the airport, not with a bank card. The Bee Card fare is lower and includes a free transfer to a second bus within 45 minutes. A small public ferry also crosses the lake between Queenstown Bay and Frankton, and it takes a Bee Card or a bank card but not cash.

Queenstown to Wānaka

There are two routes. The Crown Range Road is the shorter, at about 70km, climbing a steep zigzag above Arrowtown to a summit of 1,076 metres, the highest sealed through road in the country. In winter it often needs chains, the council closes its gates in severe weather, and you can now be fined for not fitting chains when a sign or road staff tell you to. The other route, State Highway 6 through the Kawarau Gorge and Cromwell, is about 113km and takes around an hour and a half. It's lower, and it's the usual choice when there's snow about.

Beyond the towns

The road from Glenorchy to the start of the Routeburn Track is partly unsealed. The Mount Aspiring Road from Wānaka is gravel for its last 30km and crosses several fords that heavy rain can make impassable, so check DOC's updates and your rental agreement first. North of Wānaka, State Highway 6 crosses the Haast Pass to the West Coast. Slips and flooding close it from time to time, and there's no detour, so check NZTA before you set off.

Ski field roads are steep and can need chains, and rental cover for them varies, so many people take the ski shuttles from town instead.`,
  },
  {
    slug: "queenstown-wanaka-when",
    title: "When to Come",
    icon: CloudSun,
    color: "#2E6B4F",
    region: "queenstown-wanaka",
    body: `Queenstown has two busy seasons, not one. Summer and the ski season both fill the town, and the quieter months, often with the most settled weather, are autumn and late spring.

Summer, from December to February, is warm and mostly dry. Afternoons average the low twenties in Queenstown and a little warmer in Wānaka, while Central Otago can get much hotter, with days close to 39 degrees on record. On a bike or a bare ridge, carry more water than you think you'll need. The evenings are long, Central Otago's cherries ripen around Christmas, and apricots follow in January.

Autumn, from March to May, brings clear, still days and cold mornings. The trees around Arrowtown turn gold from around mid to late April, when the town holds its autumn festival, and it's a good time to walk and cycle without the summer crowds.

Winter, from June to August, is cold, with frequent frosts. Queenstown's average July overnight low is below freezing. The ski fields usually open in mid to late June and close between late September and mid October, depending on snow, and the July school holidays, in both New Zealand and Australia, are the busiest weeks of the ski season. Low cloud, fog and snow sometimes stop flights landing at Queenstown, and diverted passengers can end up finishing the trip by bus, so leave a spare day before an international flight home.

Spring, from September to November, is the most changeable season, when a warm day, late snow and strong wind can all come in the same week. Spring skiing carries on into early October, and the Roys Peak Track closes for lambing from 1 October to 10 November.`,
  },
  {
    slug: "queenstown-wanaka-hazards",
    title: "Local Hazards & Rules",
    icon: ShieldAlert,
    color: "#8F6310",
    region: "queenstown-wanaka",
    body: `The lakes look inviting on a hot day, but they're cold all year. Lake Wakatipu stays at around 8 to 10 degrees, cold enough to make you gasp and to sap your strength within minutes, and wind can turn a flat lake rough very quickly. The council's navigation rules require everyone on a boat 6 metres long or less, including kayaks, to wear a lifejacket while it's moving, and paddleboarders to wear a lifejacket or a full wetsuit.

Lagarosiphon, an invasive lake weed, is established in Lake Wānaka and Lake Dunstan, while Lake Wakatipu is largely free of it. Before you move a kayak, paddleboard or fishing gear between lakes or rivers, Check, Clean, Dry it: remove any plant fragments, keep it wet with a 10 percent detergent solution for ten minutes, and let it dry completely.

Mountain day walks

Roys Peak and Ben Lomond are mountain climbs, not strolls. Roys Peak climbs more than 1,200 metres to its 1,578-metre summit with no shade or water on the way, and Ben Lomond is a six to eight hour return trip from town. Rain, snow and cold can reach the tops in any month, so carry water, sun protection and warm layers, and turn back if the weather turns. On the Rob Roy Glacier Track, avalanche paths cross the track beyond the lower lookout, and DOC advises not going past it from May to November.

Fire

Queenstown and its hills, including Ben Lomond and Queenstown Hill, have a fire ban all year: no fires or fireworks at any time. Elsewhere the fire season changes through the year, so check checkitsalright.nz before lighting anything. On extreme fire days the council may close Ben Lomond, Queenstown Hill and Mount Iron altogether.

Freedom camping

The Queenstown Lakes District's freedom camping rules changed in December 2025. Camping is banned in urban areas, including in roadside parking spaces, and elsewhere it's allowed only in certified self-contained vehicles, at designated sites or on rural roads where the rules permit. Fines start at $400. If your campervan isn't certified self-contained, book a campground.`,
  },
  {
    slug: "queenstown-wanaka-book-ahead",
    title: "Book Ahead in Queenstown & Wānaka",
    icon: MapPin,
    color: "#095C65",
    region: "queenstown-wanaka",
    body: `The crunch comes twice a year, in the summer holidays and the ski season, when the July school holidays are the hardest weeks to find a bed. Book accommodation months ahead for either. Wānaka also fills at Easter in the years the Warbirds over Wānaka airshow is on, which is every second year.

The Routeburn Track is a Great Walk, so in the Great Walks season, from November to April, you must book its huts and campsites, and bookings open in May for the whole season. Arrange transport at both ends before you start, because the two ends are about 325km apart by road. You don't need a booking to walk in from the Routeburn Shelter for the day.

Milford Sound is about 290km from Queenstown, roughly four hours each way by road, so a day trip makes for a day of 11 hours or more. If you can, stay in Te Anau and go from there. Coach and fly-cruise trips from Queenstown are worth booking ahead in summer, and both can be cancelled for weather or a road closure, so check the operator's cancellation terms.

Weather-dependent trips such as scenic flights, skydives and paragliding are best booked early in your stay, so there's time to rebook. Popular slots can fill well ahead in summer. The Onsen Hot Pools, for example, takes bookings months in advance and runs a waitlist.

In the ski season, buy lift passes and book ski hire, lessons and ski shuttle seats online before you arrive, especially for the July holidays. In peak season, book dinner in Queenstown, Arrowtown and Wānaka rather than counting on a walk-in table.`,
  },

  // ---------------------------------------------------------------- fiordland
  {
    slug: "fiordland-why",
    title: "Why Come to Fiordland",
    icon: Compass,
    color: "#14607A",
    region: "fiordland",
    body: `Most people meet Fiordland on a day trip from Queenstown, and most of that day is spent in a coach seat. Milford Sound is about four hours by road from Queenstown but two from Te Anau, so the simplest way to improve a visit is to sleep in Te Anau and go from there, with time to stop for the short walks along the way.

Fiordland National Park is the largest national park in the country, and almost all of it is roadless: steep granite mountains, rainforest, and a coastline cut by fiords. Only one road from the rest of the country reaches its coast, State Highway 94 to Milford. Everywhere else is reached by boat, on foot or from the air, and that is what has kept it this way.

Te Anau sits on Lake Te Anau, the largest lake in the South Island. The Kepler Track starts at the edge of town and the Milford Track at the head of the lake, and there are glowworm caves on the far shore. The bird sanctuary on the lakefront is the easiest place in the country to see takahē, birds thought extinct until 1948, when they were found again in the Murchison Mountains across the lake.

The Milford Road is part of the trip, not just the way there. It runs up the open Eglinton Valley past Mirror Lakes, climbs to The Divide, where the Key Summit walk and the Routeburn Track begin, and goes through the Homer Tunnel before dropping steeply to the sea. Milford Sound is best seen from the water, under Mitre Peak, and on a wet day with waterfalls pouring off every wall.

About 20km south of Te Anau, Manapōuri is the way in to Doubtful Sound, which is bigger and much quieter than Milford and has no road to it. Lake Manapōuri has its own place in the country's history. A public campaign around 1970 stopped plans to raise the lake for the power station at West Arm, and it was the first environmental campaign to be organised across the whole country.

From Manapōuri the Southern Scenic Route heads south to the coast, past the old Clifden suspension bridge and limestone caves, Lake Hauroko, the deepest lake in the country, and Tuatapere, where the Hump Ridge Track starts. It then follows Te Waewae Bay, where you may see Hector's dolphins, past Monkey Island, Te Puka o Takitimu, and the surf at Colac Bay Ōraka, to Riverton, which began as a whaling station. Inland, the Mavora Lakes sit in open tussock country at the end of a long gravel road.`,
  },
  {
    slug: "fiordland-getting-around",
    title: "Getting Around Fiordland",
    icon: Car,
    color: "#2466D6",
    region: "fiordland",
    body: `Fiordland has very few roads, and most of them are long dead ends. Te Anau is about two hours from Queenstown and about two hours from Invercargill. It's the base for nearly everything, and the last town before Milford.

The Milford Road

DOC suggests allowing about eight hours for the return trip to Milford on State Highway 94 if you want to stop at the viewpoints and do a few short walks. It also suggests heading back to Te Anau afterwards rather than on to Queenstown, which turns the day into 12 to 14 hours. The road is busiest from October to April, when cars, campervans and coaches share it, and many of the day coaches from Queenstown reach Milford around the middle of the day, so leaving Te Anau early, or going in the afternoon, misses the worst of it. In winter, when traffic is light, DOC advises leaving from about 9am.

The Homer Tunnel is about 1.2km long and drops towards Milford at a gradient of about 1 in 10. In the summer peak, traffic lights let one direction through at a time, and the wait can be up to 20 minutes.

If you'd rather not drive it, coaches run to Milford from Te Anau and from Queenstown, and in the Great Walks season shuttles serve the Kepler, Milford and Routeburn track ends from Te Anau.

Side roads

The Hollyford Road, which leaves the Milford Road at Marian Corner, is unsealed. The Mavora Lakes are 39km up a gravel road off State Highway 94, and Lake Hauroko is reached from Clifden on a road with about 20km of gravel. Check your rental agreement before you take any of them.

Doubtful Sound

There's no road to Doubtful Sound from the rest of the country, so you can't drive yourself. Trips leave from Pearl Harbour in Manapōuri, cross Lake Manapōuri by boat to West Arm, then go by coach over the 671-metre Wilmot Pass to Deep Cove, where the fiord cruise starts. Allow most of a day.

The Southern Scenic Route

From Manapōuri the road runs south through Blackmount to Clifden. There State Highway 99 takes over for about 92km, through Tuatapere, Orepuki, Colac Bay and Riverton, towards Invercargill.`,
  },
  {
    slug: "fiordland-when",
    title: "When to Come",
    icon: CloudSun,
    color: "#2E6B4F",
    region: "fiordland",
    body: `Rain is the thing to plan around here, and also one of the things worth seeing. Milford Sound gets around six and a half metres of rain a year, while Te Anau, two hours away, gets less than a fifth of that, so a wet morning at Milford can be a dry one in town. When it pours, hundreds of short-lived waterfalls run down the walls of the fiords, and many locals think the sounds are at their best on a wet day. Very heavy rain can also bring flooding and slips that close the Milford Road, so check its status before you set off.

Spring, from September to November, is the most unsettled season, with more wind and rain. Avalanche danger on the Milford Road and the alpine tracks peaks from late August to early November, and late snow can still close the road. The Kepler and Milford tracks open for the Great Walks season in late October and early November.

Summer, from December to February, has longer spells of settled weather and long evenings, and it's the busiest time on the road, the tracks and the lake.

Autumn, from March to May, is often pleasant and calmer, with frosty mornings and mist lying on the lakes, and it's quieter than summer. The Great Walks season ends on 30 April.

Winter is cold, with temperatures from around 1 to 9 degrees, but it's often the most settled time of year in Fiordland. Clear, still days, snow down to low levels and quiet roads are common, and on clear nights you may see the aurora australis, the southern lights. Days are short, chains can be required on the Milford Road, and the Milford and Kepler tracks are out of season, which means they are suitable only for experienced, well-equipped parties. The Hump Ridge Track closes altogether, and some Te Anau businesses close or cut their hours.`,
  },
  {
    slug: "fiordland-hazards",
    title: "Local Hazards & Rules",
    icon: ShieldAlert,
    color: "#8F6310",
    region: "fiordland",
    body: `The Milford Road

The upper Milford Road runs under avalanche paths, and the danger is greatest in winter and spring, especially from late August to early November. Between Marian Corner and The Chasm, signs mark a no-stopping zone: don't stop, park or get out of the car there, even for a photo. NZTA closes the road when the avalanche hazard is high, sometimes at short notice, so check the road status on the morning you go.

Kea, the endangered alpine parrot, are common along the road, especially around the Homer Tunnel. DOC asks you not to feed them, and keep your car and bags closed, because they can damage cars and any gear left lying around. Dogs aren't allowed anywhere in Fiordland National Park, including on the walks along the road.

Gertrude Saddle

On a map, the route from the Gertrude Valley near the Homer Tunnel looks like a short day walk. It isn't. It climbs steep granite slabs, with steel cables in places, that are treacherous when wet or frosty, and there are no markers above the bushline. Two experienced walkers died on the way down, in 2016 and 2017, after missing the stream crossing. DOC says the route needs tramping and alpine experience, that you shouldn't go if there's rain or snow, and that it isn't recommended in winter because of avalanche danger.

Milford Sound

Milford Sound sits in steep, active country. A large earthquake could send landslides into the fiord and start a tsunami that reaches the shore within minutes, and signs now mark the hazard zone. If an earthquake there is long or strong, move away from the water and uphill as soon as the shaking lets you, without waiting for a warning. Do the same if you see or hear a landslide hit the water, or the water suddenly rises or drops, and follow any staff instructions.

The water along the northern side of the sound is a marine reserve, where nothing may be taken, and blue cod can't be taken anywhere inside the sound.

Further south

Clifden Caves can flash flood. Don't go in if rain is forecast for the day, if it's raining, or if it has rained in the past 24 hours. Lake Hauroko is deep and cold, and wind funnelled down the surrounding hills can raise big waves within minutes, so think twice before putting a kayak or small boat on it. Monkey Island can only be reached on foot at low tide, so check the tide times before you cross.`,
  },
  {
    slug: "fiordland-book-ahead",
    title: "Book Ahead in Fiordland",
    icon: MapPin,
    color: "#095C65",
    region: "fiordland",
    body: `Te Anau has most of the beds near Milford, and in summer it fills with trampers and day-trippers, so book accommodation months ahead from December to March. Milford Sound itself has one place to stay, Milford Sound Lodge, and no shops or cash machine, just a café at the cruise terminal.

Tracks

The Milford Track is walked in one direction only, over four days and three nights, staying in huts, with no camping allowed. There's no road to either end, so as well as the huts you book a boat from Te Anau Downs to Glade Wharf at the start and another from Sandfly Point to Milford at the finish. DOC doesn't recommend it for children under 10.

The Kepler Track is a loop that starts 5km from Te Anau. Its huts and campsites must be booked in the Great Walks season, and Luxmore Hut must be booked all year round. You don't need a booking for day walks to Brod Bay or up to Luxmore Hut and back.

The Tuatapere Hump Ridge Track, a three-day loop near Tuatapere, is run by a community trust. Book it directly with the trust, and check the trust's notices for track changes before you go. It's closed in winter.

Trips

Doubtful Sound and glowworm cave trips are worth booking ahead in summer. For Milford, early and late cruises tend to be less crowded than the ones in the middle of the day.

Camping

Freedom camping isn't allowed within 200 metres of the Milford Road. The DOC campsites along it, and at the Mavora Lakes, must be booked online, and no spaces are kept for walk-ins, though same-day bookings stay open until 8pm. There's little coverage up the valley, so book before you leave Te Anau. Freedom camping is also largely banned in and around Te Anau and at the DOC car parks near Te Anau and Manapōuri, so plan on a campground or a DOC site. Further south, the council has free sites at Lumsden, Colac Bay and Monkey Island. Check the signs for who can stay and for how long, since the district's rules are being reviewed.

All Fiordland campsites are pack in, pack out, so take your rubbish with you.`,
  },

  // ---------------------------------------------------------------- dunedin-otago
  {
    slug: "dunedin-otago-why",
    title: "Why Come to Dunedin & the Otago Coast",
    icon: Compass,
    color: "#14607A",
    region: "dunedin-otago",
    body: `Plenty of visitors give Dunedin just one night on the way through, and that's a common regret. The wildlife here keeps its own hours. Albatrosses circle the tip of the Otago Peninsula, and penguins come ashore in the late afternoon and after dark, so seeing them means staying into the evening. Dunedin is also a cool, often grey university city rather than a beach resort, and it rewards a slower look.

Ōtepoti Dunedin grew rich on the Otago gold rush of the 1860s, and the stone buildings of that boom still line its centre. The railway station is worth a look even without a train ticket, Olveston is a grand Edwardian family home, and Toitū Otago Settlers Museum and Tūhura Otago Museum tell the stories of the city and the region. Toitū is free, and so is Tūhura for New Zealand residents, but international visitors now pay for a gallery pass there. Add the Chinese Garden, the murals scattered through the central city, the Saturday morning farmers market beside the railway station, and Baldwin Street, which Guinness World Records lists as the steepest street in the world. Green space is close: the Botanic Garden, the bush walks around the Ross Creek reservoir and the lookout on Signal Hill. South of the centre, St Clair has a surf beach and a heated saltwater pool, and the cliffs and historic tunnel of Tunnel Beach are a short drive away.

The Otago Peninsula runs out along the harbour from the city. At its tip, Pukekura/Taiaroa Head holds the only mainland breeding colony of royal albatrosses in the world. On the way are Larnach Castle, the village of Portobello and ocean beaches such as Sandfly Bay and Allans Beach, where sea lions, fur seals and yellow-eyed penguins/hoiho come ashore. North of the city, Orokonui Ecosanctuary protects 307 hectares of forest inside a predator-proof fence, and Warrington has a long, quiet beach. Inland, the Taieri Gorge train follows the river through its gorge.

North Otago begins at the Moeraki Boulders/Kaihinaki, scattered along the beach south of Hampden, with fur seals and hoiho at nearby Kātiki Point and Shag Point/Matakaea. Ōamaru's harbourside precinct of Victorian limestone buildings now holds workshops, galleries and Steampunk HQ, and little penguins come home each evening to a colony at the harbour's edge. Inland, the Waitaki Valley is part of the Waitaki Whitestone Geopark, New Zealand's first UNESCO Global Geopark. Around Duntroon are the fossils of the Museum of the Vanished World, the limestone outcrops of Elephant Rocks and Māori rock art at Takiroa, and the lower Alps 2 Ocean cycle trail runs from Kurow down the valley to the sea.

South of Dunedin, the coast carries on to the Catlins, which have their own tab.`,
  },
  {
    slug: "dunedin-otago-getting-around",
    title: "Getting Around Dunedin & the Otago Coast",
    icon: Car,
    color: "#2466D6",
    region: "dunedin-otago",
    body: `The distances are short, and it's the hills and the narrow roads that slow you down. Dunedin climbs steeply from the harbour, and streets in the hill suburbs can be steep and narrow, with cars parked on both sides. On a hill, park with the handbrake firmly on and your front wheels turned towards the kerb facing downhill or away from it facing uphill. Expect frost and ice on shaded streets on winter mornings. Baldwin Street is best walked, not driven.

Dunedin Airport is on the Taieri Plain about 30km from the city, roughly 25 minutes by car, and no public bus runs between the two. Shuttles and taxis meet flights, and InterCity coaches to Queenstown and Invercargill stop there. Orbus runs the city buses, and until the national Motu Move system reaches Otago you pay with cash or a prepaid Bee Card, not a bank card.

The Otago Peninsula

Two roads lead out along the Peninsula: Portobello Road, which hugs the harbour edge, and Highcliff Road along the ridge. Both are winding and narrow in places, so Taiaroa Head, about 30km from the city, takes around 45 minutes. Past Hoopers Inlet, Allans Beach Road is gravel and needs care when you pass oncoming cars, and sea lions often rest on the roads around the inlet, so slow down and give them room. Bus 18 runs along the harbour to Portobello, and a couple of trips a day go on towards Harington Point, but no public transport goes to Larnach Castle.

North and inland

State Highway 1 leaves the city to the north over the Northern Motorway and the Leith Saddle, which snow and ice close for a few hours in some winters. Ōamaru is about an hour and a half north. The Moeraki Boulders are signposted from State Highway 1 just south of Hampden, and Kātiki Point is off Lighthouse Road at Moeraki. From just north of Ōamaru, State Highway 83 follows the Waitaki Valley inland to Duntroon and Kurow. The lower Alps 2 Ocean trail mixes off-road sections with country roads, and the old railway tunnel near Rakis is long and dark enough to need a light.

The Taieri Gorge train leaves Dunedin Railway Station in the morning for Pukerangi and is back about five hours later. It runs on set days that change through the year, so check the timetable before you plan around it. You can also ride one way and connect with transport to the Otago Central Rail Trail, which the Queenstown & Wānaka tab covers. The Seasider runs north along the coast, and on selected dates it goes through to Ōamaru.`,
  },
  {
    slug: "dunedin-otago-when",
    title: "When to Come",
    icon: CloudSun,
    color: "#2E6B4F",
    region: "dunedin-otago",
    body: `Dunedin's summer is cooler than most visitors expect. January afternoons in the city typically reach only the high teens, a cool easterly sea breeze often blows in off the water, and cold, showery south-westerlies can arrive at any time of year. Pack a warm layer and a rain jacket whatever the season. Hot days come mainly with a north-westerly, and they don't last.

Rain is spread fairly evenly through the year. It falls on around 170 days a year, but often lightly, and the yearly total is modest. The windiest months are October to January. Winter, from June to August, is milder in the city than inland, with frosts and the odd dusting of snow on the hills. Fog often settles over the Taieri Plain around the airport between March and August, so leave some slack around flights.

The wildlife year

The wildlife matters as much as the weather. Royal albatrosses nest at Taiaroa Head for most of the year. Their chicks leave in September and the new season's nests are built from late October, so in between, check what's on view before you book. Yellow-eyed penguins moult from February to April, when they can't go to sea and are especially vulnerable, so give them extra room then. Fur seals can turn up on almost any Otago beach in winter. At Ōamaru, the little penguins come ashore after sunset, which means a late night in midsummer and an earlier evening in winter.

Seasonal hours

St Clair's hot saltwater pool is open for the warmer months, from about October to the end of March. The Tunnel Beach car park closes at 5pm from April to August and at 9pm the rest of the year, so on a winter afternoon make sure you're back before it shuts. Orokonui Ecosanctuary's night tours run only in some seasons.

Spring and autumn are good times to come, with fewer people than in summer. If you want an easy bed, avoid the start of the university year in late February and the big concert and graduation weekends, and see Book Ahead for the details.`,
  },
  {
    slug: "dunedin-otago-hazards",
    title: "Local Hazards & Rules",
    icon: ShieldAlert,
    color: "#8F6310",
    region: "dunedin-otago",
    body: `The wildlife here is close enough to walk up to, and that's the problem. New Zealand sea lions/pakake haul out on Peninsula beaches, and sometimes on city beaches, roads, golf courses and even backyards. They look sleepy, but they are powerful wild animals and can move fast on sand. DOC asks you to stay at least 20 metres from sea lions and fur seals, and if you have to pass one on a beach, to keep as wide a berth as you can and not linger.

Penguins

Yellow-eyed penguins/hoiho are endangered, and people on the beach can stop them coming ashore. Stay at least 50 metres away, never stand between a penguin and the sea, and don't use flash. At Sandfly Bay, volunteer rangers are often there from late afternoon in the warmer months to explain how to behave around the wildlife, so follow their lead. At Bushy Beach in Ōamaru, DOC asks you to keep off the beach between 3pm and 9am, and dogs aren't allowed in the reserve. At Ōamaru's little penguin colony, no photography or filming is allowed during evening viewing, and penguins can be on the roads around the harbour after dark, so drive slowly there at night.

Dogs are banned from most hoiho breeding sites. Elsewhere, when you see wildlife ahead, put your dog on a lead and pass at least 20 metres away. Flying a drone within 150 metres of a marine mammal is an offence.

Cliffs, tides and surf

Tunnel Beach has high, unfenced cliffs with unstable edges, and the beach is unsafe at high tide and in rough seas. The track is steep, about an hour return, and the tunnel is dark, low and slippery, with no handrail. Slips have closed the track for long spells, so check DOC's alerts after heavy rain. At the Moeraki Boulders, go near low tide and watch for rogue waves.

St Clair and St Kilda are surf beaches with strong rips, especially at each end, and at times deep troughs where knee-deep water can drop over your head in a step. Swim between the flags when lifeguards are on duty, and if there are none, stay in your depth.

Freedom camping

In Dunedin, tents are allowed only in the designated area at Warrington Domain, and vehicles that aren't certified self-contained can stay only at Warrington Domain, Ocean View Recreation Reserve and, from November to April, the Thomas Burns Street car park. Certified self-contained vehicles can also use other sealed or gravel council parking, but not scenic reserves, cemeteries or the banned zones on the Peninsula. In the Waitaki District, only certified self-contained vehicles may freedom camp, for up to three nights in any four weeks, and much of the coast south of Ōamaru is off limits. Both councils fine campers in the wrong place.`,
  },
  {
    slug: "dunedin-otago-book-ahead",
    title: "Book Ahead in Dunedin & on the Otago Coast",
    icon: MapPin,
    color: "#095C65",
    region: "dunedin-otago",
    body: `The wildlife trips are what fill first. Tours at the Royal Albatross Centre take limited numbers, and the centre itself recommends booking. The guided penguin tours on the Peninsula are worth booking too. In summer, book both a few days ahead, and further ahead for weekends and school holidays, and take warm clothes, because evenings on the headland are cold even in January.

At Ōamaru, evening viewing at the little penguin colony needs a ticket, which you can buy online or at the colony. Doors open about half an hour before viewing starts, so arrive early.

Larnach Castle doesn't need booking for the castle or gardens, and you can buy tickets at the gate. Its high tea must be booked at least 24 hours ahead, and the castle dinner is booked online. Olveston is shown by guided tour, so book a time. Orokonui Ecosanctuary is closed on Tuesdays and Wednesdays, its last entry is at 3.30pm, and its guided tours need booking. The Taieri Gorge train runs on set days that vary through the year, so book once you know your dates.

When beds run out

Dunedin is a university city, and the student calendar shapes it. Beds get scarce when students arrive for the start of the academic year in late February, and again on graduation weekends. Big concerts and major matches at the covered Forsyth Barr Stadium can fill nearly every bed in the city, so check the stadium's calendar before you fix your dates. Ōamaru gets busy for its Victorian Heritage Celebrations in mid-November.

Cruise ships call at Port Chalmers through the warmer months, and on those days the Peninsula's attractions are busier, so start early.`,
  },

  // ---------------------------------------------------------------- southland-catlins
  {
    slug: "southland-catlins-why",
    title: "Why Come to Southland & the Catlins",
    icon: Compass,
    color: "#14607A",
    region: "southland-catlins",
    body: `Most people who come this far south are on their way somewhere else, and Southland doesn't try hard to keep them. Much of it is flat farmland, the weather is cool and often windy, and there's little of the paid adventure that Queenstown sells. What it has instead is a wild coast where you can watch rare wildlife from the beach, an island national park an hour's sail away, and very few crowds.

The Catlins, the forested hills and coast between Invercargill and Balclutha, are the main reason to come. A sealed road winds through them, and short walks off it lead to waterfalls such as Purakaunui and McLean Falls, to Cathedral Caves at low tide, and to the view over Tautuku Bay from Florence Hill. At Curio Bay a Jurassic forest has turned to stone on the rock platform, and at low tide you can walk among the fossil stumps. Next door at Porpoise Bay, Hector's dolphins, among the smallest dolphins in the world, often play in the surf close to the beach. New Zealand sea lions sleep on beaches such as Surat Bay, hoiho, the yellow-eyed penguins, come ashore in the evening, and fur seals crowd the rocks below the lighthouse at Nugget Point/Tokata. Slope Point is the southernmost tip of the South Island, and the lighthouse at Waipapa Point stands above the reef where the SS Tararua was wrecked in 1881, one of the country's worst shipwrecks.

Waihōpai Invercargill, the southernmost city, is a practical base with a soft spot for speed. Burt Munro, the local motorcyclist whose story became the film The World's Fastest Indian, practised his speed runs on the hard sand of Oreti Beach, and Classic Motorcycle Mecca and Bill Richardson Transport World hold big collections of bikes, cars and trucks. Half an hour south, State Highway 1 ends at Stirling Point in Bluff, where Te Araroa, the trail along the length of the country, finishes too. The lookout on Motupōhue Bluff Hill looks across Foveaux Strait to Rakiura, and Bluff is the home of the Bluff oyster. An hour north-east, Gore's Old Hokonui Museum & Distillery tells the story of the illegal whisky once distilled in the Hokonui Hills.

Rakiura Stewart Island is the country's third-largest island, and most of it is national park. Oban, its only town, sits on Halfmoon Bay, and from there the Rakiura Track Great Walk loops through forest and along beaches. A few minutes away by boat, Ulva Island/Te Wharawhara is free of predators and full of birds that are rare on the mainland, and kiwi live wild on the main island. Rakiura is also an International Dark Sky Sanctuary, and on a clear winter night you might see the aurora australis.`,
  },
  {
    slug: "southland-catlins-getting-around",
    title: "Getting Around Southland & the Catlins",
    icon: Car,
    color: "#2466D6",
    region: "southland-catlins",
    body: `The Catlins take far longer than the map suggests. The main road through them, part of the Southern Scenic Route between Invercargill and Balclutha, is sealed, but nearly every place worth stopping at is down a side road, and many of those are gravel. The road to McLean Falls is partly unsealed, and the 2km private road to Cathedral Caves doesn't allow towing vehicles. Parts of the coastal road between Otara and Curio Bay are gravel, and so is the road to Slope Point. Check your rental agreement before you plan the coastal loop, and give the Catlins at least a night rather than an afternoon.

Farmers move sheep and cattle along these roads, so slow down and stay in your car until the stock has passed. Fuel is sold only at Ōwaka, Tokanui and Fortrose, with none at Papatōwai, and opening hours vary, so fill up in Invercargill or Balclutha before you set off. There are electric vehicle chargers at Ōwaka, Papatōwai and Fortrose. Phone coverage is limited to the main villages, Ōwaka, Papatōwai and Tokanui, so load the day's maps before you leave.

From Invercargill, State Highway 1 runs south to Bluff in about half an hour and north-east to Gore in about an hour.

Getting to Rakiura

The ferry from Bluff to Oban takes about an hour across Foveaux Strait, which is often rough, especially in winter. If you get seasick, take something before you board rather than waiting until you feel ill. The ferry carries foot passengers, bikes and kayaks, not cars. Leave your car in the paid car park beside the Bluff terminal, which can't be booked ahead, or take the coach from Invercargill that meets each sailing, and check in 30 minutes before departure.

Stewart Island Flights crosses from Invercargill Airport to Oban in about 20 minutes, with a small baggage allowance, and can also drop trampers at Mason Bay and Doughboy Bay. Weather can delay both the boat and the plane.

On the island there are only a few roads around Oban, where you can hire a car or an e-bike. Water taxis cross to Ulva Island. The Rakiura Track starts at Lee Bay, about 5km from Oban, and ends about 2km from town, so you can walk to and from it.`,
  },
  {
    slug: "southland-catlins-when",
    title: "When to Come",
    icon: CloudSun,
    color: "#2E6B4F",
    region: "southland-catlins",
    body: `Summer here is cooler than most visitors expect. Afternoons in Invercargill average around 19 degrees in January, the Catlins are much the same, and a southerly can bring a cold, wet day at any time of year, so pack a warm layer and a raincoat in every season. It rarely rains hard for long, but it rains often: Invercargill records rain on about 160 days a year, spread fairly evenly across the seasons. Westerly winds are funnelled through Foveaux Strait, which makes Invercargill one of the country's windier places, and spring is usually the windiest season.

Summer, from December to February, is the main season. Days are long, and the sun doesn't set until after 9.30pm around midsummer. Cathedral Caves are open from about mid-October to April, hoiho are feeding their chicks, and Hector's dolphins are most often seen at Porpoise Bay. Many Catlins cafés, galleries and attractions open only from spring to autumn.

Autumn, from March to May, is when the wind usually starts to ease. The Bluff oyster season runs from 1 March to the end of August, and the Bluff Oyster and Food Festival is held in May. Hoiho moult from about February to April, when they stay ashore and are easily stressed, so give them extra room.

Winter, from June to August, is cold and short. At midwinter the sun rises around 8.30am and sets around 5pm, frosts are common, and a southerly can bring snow to low levels. Cathedral Caves and many seasonal businesses close. In return, the long, dark nights are the best time to look for the aurora australis. You need a clear sky, a dark view to the south and some luck, because it's never guaranteed. Rakiura has viewing spots around Oban, but much of the Southland coast is dark enough too.

Spring, from September to November, is the windiest and most changeable season. Lambing closes some walks over farmland, such as the track to Slope Point, so check the signs before you set out.`,
  },
  {
    slug: "southland-catlins-hazards",
    title: "Local Hazards & Rules",
    icon: ShieldAlert,
    color: "#8F6310",
    region: "southland-catlins",
    body: `The wildlife here is close, wild and protected, and the commonest mistake is getting too near it.

Sea lions

New Zealand sea lions haul out on Catlins beaches such as Surat Bay and Cannibal Bay, and they also sleep in the dunes, beside tracks and in car parks, where they're easy to walk into. They look sleepy, but they're powerful wild animals and move faster on sand than you'd think. DOC asks you to stay at least 20 metres away and to keep dogs on a lead. If one comes towards you, back away slowly and avoid eye contact. Disturbing a sea lion is an offence under the Marine Mammals Protection Act.

Penguins and dolphins

Hoiho, the yellow-eyed penguins, are endangered, and only a pair or so still nest at Curio Bay, so a sighting isn't guaranteed. They come ashore from the late afternoon. Keep at least 50 metres away, never block their path between the sea and the bush, keep out of any roped-off part of the rock platform, and don't use a flash. At Roaring Bay near Nugget Point/Tokata, DOC asks you to keep off the beach after 3pm and watch from the hide.

At Porpoise Bay, if Hector's dolphins are about, enter the water at least 50 metres from them and let them come to you. Don't chase, touch or feed them. Taking fossils from the Curio Bay forest is illegal, and drones aren't allowed at the fossil forest or at Roaring Bay.

Tides

You can only get into Cathedral Caves around low tide, and Surat Bay can only be reached at low tide. Check tide times before you walk out.

Freedom camping

In both districts, freedom camping is for certified self-contained vehicles only, and only the newer green warrant counts. On the Clutha side it's banned on the foreshore from Kākā Point to the Nuggets, at Tautuku Beach car park and Florence Hill Lookout, at Cannibal Bay and Long Point, and on the Catlins Lake foreshore. On the Southland side, use the council's designated sites, such as Waikawa, and check the signs for how long you can stay. Camping at Curio Bay is allowed only in the campground.

Rakiura

Ulva Island is predator-free, and Rakiura is working towards it. Before you cross, check your bags for rodents, especially any stored in a garage or shed, clean soil and seeds off boots and gear, and pack food in sealed containers. Dogs aren't allowed on Ulva Island. On the Rakiura Track, mud between Port William and North Arm can come over your boots after a long spell of rain.`,
  },
  {
    slug: "southland-catlins-book-ahead",
    title: "Book Ahead in Southland & the Catlins",
    icon: MapPin,
    color: "#095C65",
    region: "southland-catlins",
    body: `The Catlins have few beds and fewer kitchens, and in summer they fill. Book accommodation months ahead for the Christmas holidays through February, and don't count on finding a bed when you arrive.

Camping takes planning too. DOC's Catlins campsites, such as Papatōwai and Purakaunui Bay, must be booked and keep no spaces for walk-ins, though you can book online on the day if there's room. The campground at Curio Bay, the main place to stay there, has been closed since April 2026 while the council sorts out its lease, and the Curioscape café closed with it, so check it has reopened before you plan on it.

Food is the other gap. There's a Four Square in Ōwaka and a handful of cafés, takeaways and pubs scattered through the villages, but their hours are short and many close over winter. Stock up in Invercargill, Gore or Balclutha, and phone ahead if you're counting on dinner.

Cathedral Caves can't be booked. Their opening hours are set each day by the tide, so look them up on the caves' website and plan your day around them.

Rakiura

The Rakiura Track's huts and campsites must be booked all year, not just in the Great Walks season. Bookings open in May for the year from July, and you can stay at most two nights at each hut or campsite. Book the ferry or flight and a bed in Oban too, because the island has few places to stay and the summer sailings are busy. Leave a spare day at either end, since Foveaux Strait weather can delay a crossing.

Events

Invercargill and Bluff fill up for the Bluff Oyster and Food Festival in May and for the Burt Munro Challenge motorcycle rally in February, so check the dates before you book.`,
  },
];

/** Island-wide sections, in declaration order. */
export const ISLAND_CATEGORIES = GUIDE_CATEGORIES.filter((c) => !c.region);

/** Regions that actually have sections written, in REGIONS order. */
export const REGIONS_WITH_CONTENT = REGIONS.filter((r) =>
  GUIDE_CATEGORIES.some((c) => c.region === r.id),
);
