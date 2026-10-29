# Photo sources

Where every photo in the app came from, and the licence it was downloaded under. Apple asks that an app has the rights to everything in it (App Store guideline 5.2.1), and both image libraries below say the terms that apply are the ones shown on the day of download, so the record is kept from that day.

One row per photo in use. Delete a row when its photo comes out of the app, and delete the downloaded file too: Great South's terms (6.4) don't allow keeping a collection for later.

## How a photo goes in

1. Download it from the library when you attach it, not ahead of time. Fill in the download form with the real use: *photos for place pages in South Island Guide, a free iPhone travel guide to South Island destinations, and in its App Store screenshots.*
2. Save the licence as shown beside the photo (a screenshot is fine) next to the file.
3. Resize it with `node scripts/resize-images.js` and attach it in the admin panel: `full/<name>.webp` as the photo, `thumb/<name>.webp` as the thumbnail.
4. Type the credit, worded as the licence gives it, into **Photo credit** on the same place. The app shows it over the place page's photo and on Account → Photo credits.
5. Add a row below.

A town photo is bundled with the app (`lib/areaPhotos.ts`); its credit goes in `AREA_PHOTO_CREDITS` there, by area id.

Re-uploading a place file with `scripts/upload-places.js` replaces the whole place but keeps the photo and credit added in the admin panel (`imageUrl`, `imageThumbnailUrl`, `imageCredit`), unless the file sets its own.

## The libraries

| Library | Licence used | Allows | Must | Not allowed |
|---|---|---|---|---|
| Tourism New Zealand (Brandkit) | Paid Activity License | Paid and unpaid media, worldwide | Promote New Zealand as a visitor destination; credit the photographer where the photo's page names one | Other licence types in the same library (unpaid only, editorial, trade); Tourism NZ's logos and trade marks; a paid app without asking first |
| Great South, Southland (Brandkit) | Worldwide Public Use - All Uses | Commercial or non-commercial use, worldwide | Promote the Southland region (Invercargill, Bluff, Riverton, Tuatapere, Gore, Fiordland, Stewart Island, the Southland side of the Catlins); credit the photographer | Otago places, such as Nugget Point, Purakaunui Falls and Owaka; bulk downloads; changes beyond what the licence allows (ask before relying on resizing and cropping) |
| Wikimedia Commons | Per file, as its page shows: CC0, public domain, CC BY or CC BY-SA (any version) | Commercial use, worldwide; resizing and cropping | Credit the author and licence as the file page words them, and say it was changed ("Schwede66, CC BY-SA 4.0, resized"); a changed CC BY-SA photo stays under CC BY-SA | Files marked NC (non-commercial), ND (no changes), GFDL only, or with no licence; suggesting the author backs the app; using a recognisable person or a logo in it as if the licence covered them |
| Department of Conservation (doc.govt.nz) | CC BY 4.0, for images whose caption credits DOC ("Image: Sarah Haughey \| DOC") | Commercial use, worldwide; resizing and cropping | Credit the photographer where named plus the Department of Conservation, the licence, and the change ("Sarah Haughey, Department of Conservation, CC BY 4.0, resized") | Images captioned © or "Creative Commons" (some DOC pages carry CC BY-NC photos); DOC's logos; suggesting DOC backs the app |

| Pexels | Pexels License | Commercial use, worldwide; changes; no credit needed | Nothing beyond the licence | Selling a photo unchanged; suggesting a person or brand in it backs the app |

Tourism NZ or Great South can ask for a photo to stop being used; a Creative Commons licence can't be withdrawn.

Unpaid-media-only licences (Tourism NZ's WorldWide Licence, ChristchurchNZ's Restricted Licence) are kept while the app is free (owner, 2026-10-29). Before the app charges for anything, find each photo under one and replace it or get the library's written OK.

The type defaults bundled in `assets/images/types` (camping, carcamp, dorm, coffee, bakery, pizza, beer, steak, ice-cream; which places use them is in `lib/placeImageTypes.ts`) are all from Pexels. A place photo comes out in the admin panel, with no app update; a town photo needs an update.

## Photos

Filled in 2026-10-29 from the photo folders in `C:\Users\User\Pictures\southisland` (paths below are relative to it); "not recorded" means no source was written down when the photo was saved. Christchurch's photos, uploaded earlier in the admin panel, still need their rows.

| Place (or town) | File | Library | Licence | Credit | Released / downloaded | Licence copy | Written OKs |
|---|---|---|---|---|---|---|---|
| Abel Tasman AquaTaxi and Coast Track Day Walk | `abeltasman/resized/full/aquataxi.webp` | Nelson Tasman (Brandkit) | Nelson Tasman Standard with Attribution | Abel Tasman Aqua Taxi | Oct 2026 | `abeltasman/credits.txt` | |
| Anchorage Campsite | `abeltasman/resized/full/anchorage.webp` | Nelson Tasman (Brandkit) | Nelson Tasman Standard with Attribution | Tamzin Henderson | Oct 2026 | `abeltasman/credits.txt` | |
| Kaiteriteri Beach | `abeltasman/resized/full/kaiteriteri.webp` | Nelson Tasman (Brandkit) | Nelson Tasman Standard (credit where possible) | none needed | Oct 2026 | `abeltasman/credits.txt` | |
| Marahau Sea Kayaks | `abeltasman/resized/full/kayaks.webp` | Nelson Tasman (Brandkit) | Nelson Tasman Standard (credit where possible) | none needed | Oct 2026 | `abeltasman/credits.txt` | |
| Motueka Saltwater Baths | `abeltasman/resized/full/motuekasaltwaterbaths.webp` | Nelson Tasman (Brandkit) | Nelson Tasman Standard (credit where possible) | none needed | Oct 2026 | `abeltasman/credits.txt` | |
| Motueka Sunday Market | `abeltasman/resized/full/market.webp` | Nelson Tasman (Brandkit) | Nelson Tasman Standard with Attribution | NelsonTasman.nz | Oct 2026 | `abeltasman/credits.txt` | |
| Port Motueka Beach Reserve Freedom Camping | `abeltasman/resized/full/portmotueka.webp` | Nelson Tasman (Brandkit) | Nelson Tasman Standard with Attribution | abeltasman.com | Oct 2026 | `abeltasman/credits.txt` | |
| Split Apple Rock | `abeltasman/resized/full/splitapplerock.webp` | Nelson Tasman (Brandkit) | Nelson Tasman Standard (credit where possible) | none needed | Oct 2026 | `abeltasman/credits.txt` | |
| Te Puna Wai o Riuwaka / Riuwaka Resurgence | `abeltasman/resized/full/riuwaka.webp` | Nelson Tasman (Brandkit) | Nelson Tasman Standard with Attribution | NelsonTasman.nz & @barekiwi | Oct 2026 | `abeltasman/credits.txt` | |
| TOAD Hall | `abeltasman/resized/full/toadhall.webp` | Nelson Tasman (Brandkit) | Nelson Tasman Standard (credit where possible) | none needed | Oct 2026 | `abeltasman/credits.txt` | |
| Glacier Explorers | `mtcook/resized/full/glacier-explorers.webp` | Wikimedia Commons | CC BY 2.0 | David Briody, CC BY 2.0, resized | Oct 2026 | `mtcook/credits.txt` | |
| Hooker Valley Track | `mtcook/resized/full/hooker-valley-track.webp` | Wikimedia Commons | CC BY-SA 4.0 | Bonito Coquito, CC BY-SA 4.0, resized | Oct 2026 | `mtcook/credits.txt` | |
| Kea Point Track | `mtcook/resized/full/kea-point-track.webp` | Wikimedia Commons | CC BY-SA 4.0 | Krzysztof Golik, CC BY-SA 4.0, resized | Oct 2026 | `mtcook/credits.txt` | |
| Sealy Tarns Track | `mtcook/resized/full/sealy-tarns-track.webp` | Wikimedia Commons | CC BY-SA 4.0 | Michal Klajban, CC BY-SA 4.0, resized | Oct 2026 | `mtcook/credits.txt` | |
| Tasman Glacier View and Blue Lakes | `mtcook/resized/full/tasman-glacier-view-blue-lakes.webp` | Tourism New Zealand (Brandkit) | WorldWide Licence | Miles Holden | Oct 2026 | `mtcook/credits.txt` | |
| Arrowtown Chinese Settlement | `arrowtown/resized/full/chinatown.webp` | Destination Queenstown (Brandkit) | not recorded | Destination Queenstown | Oct 2026 | `arrowtown/credits.txt` | |
| Crown Range Summit Lookout | `arrowtown/resized/full/crown-range-summit-lookout.webp` | Wikimedia Commons | CC BY-SA 2.0 | BriYYZ, CC BY-SA 2.0, resized | Oct 2026 | `arrowtown/credits.txt` | |
| Lakes District Museum and Gold Panning | `arrowtown/resized/full/museum.webp` | Destination Queenstown (Brandkit) | not recorded | Destination Queenstown | Oct 2026 | `arrowtown/credits.txt` | |
| Arthur's Pass Walking Track and Bridal Veil | `arthurspass/resized/full/arthurs-pass-walking-track-bridal-veil.webp` | Wikimedia Commons | CC BY-SA 4.0 | Michal Klajban (Podzemnik), CC BY-SA 4.0, resized | Oct 2026 | `arthurspass/credits.txt` | |
| Cave Stream Scenic Reserve | `arthurspass/resized/full/cave-stream-scenic-reserve.webp` | Wikimedia Commons | CC BY-SA 4.0 | Thomas Booker (CoderThomasB), CC BY-SA 4.0, resized | Oct 2026 | `arthurspass/credits.txt` | |
| Devils Punchbowl Falls | `arthurspass/resized/full/devils-punchbowl-falls.webp` | Wikimedia Commons | CC BY-SA 4.0 | Michal Klajban (Podzemnik), CC BY-SA 4.0, resized | Oct 2026 | `arthurspass/credits.txt` | |
| Kura Tāwhiti Castle Hill | `arthurspass/resized/full/castle-hill.webp` | Selwyn (Brandkit) | Selwyn, Attribution Required | Lilia Alexander | Oct 2026 | `arthurspass/credits.txt` | |
| Lake Pearson (Moana Rua) | `arthurspass/resized/full/lakepearson.webp` | not recorded | not recorded | none needed | Oct 2026 | `arthurspass/credits.txt` | |
| Otira Viaduct Lookout | `arthurspass/resized/full/otiraviaduct.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Cint Trehan | Oct 2026 | `arthurspass/credits.txt` | |
| Springfield Doughnut | `arthurspass/resized/full/springfielddonut.webp` | not recorded | not recorded | none needed | Oct 2026 | `arthurspass/credits.txt` | |
| Akaroa Harbour Lookout | `bankspeninsula/resized/full/akaroa-harbour-lookout.webp` | ChristchurchNZ (Brandkit) | ChristchurchNZ Restricted (must credit the listed credit) | ChristchurchNZ | Oct 2026 | `bankspeninsula/credits.txt` | |
| Akaroa Harbour Nature Cruise | `bankspeninsula/resized/full/akaroa-harbour-nature-cruise.webp` | ChristchurchNZ (Brandkit) | ChristchurchNZ Standard (no credit listed) | none needed | Oct 2026 | `bankspeninsula/credits.txt` | |
| Akaroa Lighthouse and Garden of Tāne | `bankspeninsula/resized/full/akaroa-lighthouse-and-garden-of-tane.webp` | Wikimedia Commons | Public domain | none needed | Oct 2026 | `bankspeninsula/credits.txt` | |
| Akaroa Museum | `bankspeninsula/resized/full/akaroa-museum.webp` | Wikimedia Commons | CC BY 4.0 | Mike Dickison, CC BY 4.0, resized | Oct 2026 | `bankspeninsula/credits.txt` | |
| Hinewai Reserve | `bankspeninsula/resized/full/hinewai-reserve.webp` | Wikimedia Commons | CC BY-SA 4.0 | Angulidayaaluta, CC BY-SA 4.0, resized | Oct 2026 | `bankspeninsula/credits.txt` | |
| Le Bons Bay | `bankspeninsula/resized/full/le-bons-bay.webp` | Wikimedia Commons | CC BY-SA 4.0 | Schwede66, CC BY-SA 4.0, resized | Oct 2026 | `bankspeninsula/credits.txt` | |
| Little River Rail Trail and Village | `bankspeninsula/resized/full/little-river-rail-trail.webp` | Wikimedia Commons | Public domain | none needed | Oct 2026 | `bankspeninsula/credits.txt` | |
| Okains Bay Māori and Colonial Museum | `bankspeninsula/resized/full/okains-bay-maori-and-colonial-museum.webp` | Wikimedia Commons | CC BY 4.0 | Mike Dickison, CC BY 4.0, resized | Oct 2026 | `bankspeninsula/credits.txt` | |
| Monkey Bay Walk, Rārangi | `blenheim/resized/full/monkey-bay-walk-rarangi.webp` | Department of Conservation | CC BY 4.0 | Sarah Haughey, Department of Conservation, CC BY 4.0, resized | Oct 2026 | `blenheim/credits.txt` | |
| Omaka Aviation Heritage Centre | `blenheim/resized/full/omaka-aviation-heritage-centre.webp` | Marlborough (Brandkit) | Royalty Free with Credit | MarlboroughNZ | Oct 2026 | `blenheim/credits.txt` | |
| Pukatea / Whites Bay | `blenheim/resized/full/pukatea-whites-bay.webp` | Department of Conservation | CC BY 4.0 | Department of Conservation, CC BY 4.0, resized | Oct 2026 | `blenheim/credits.txt` | |
| Taylor Dam Reserve Freedom Camping | `blenheim/resized/full/taylor-dam-reserve-freedom-camping.webp` | Marlborough (Brandkit) | Royalty free | none needed | Oct 2026 | `blenheim/credits.txt` | |
| Wine Tours by Bike | `blenheim/resized/full/wine-tours-by-bike.webp` | Marlborough (Brandkit) | Royalty Free with Credit | Only Marlborough | Oct 2026 | `blenheim/credits.txt` | |
| Cathedral Caves | `catlins/resized/full/cathedral-caves.webp` | Great South (Brandkit) | Worldwide Public Use | Great South | Oct 2026 | `catlins/credits.txt` | |
| Catlins Cafe | `catlins/resized/full/catlins-cafe-owaka.webp` | Great South (Brandkit) | Worldwide Public Use | Pink Penguin Studio | Oct 2026 | `catlins/credits.txt` | |
| Curio Bay Petrified Forest | `catlins/resized/full/curio-bay-petrified-forest.webp` | Great South (Brandkit) | Worldwide Public Use | Great South | Oct 2026 | `catlins/credits.txt` | |
| Florence Hill Lookout | `catlins/resized/full/florence-hill-lookout.webp` | Great South (Brandkit) | Worldwide Public Use | Chris McLennan | Oct 2026 | `catlins/credits.txt` | |
| McLean Falls | `catlins/resized/full/mclean-falls.webp` | Great South (Brandkit) | Worldwide Public Use | Great South | Oct 2026 | `catlins/credits.txt` | |
| Nugget Point Lighthouse | `catlins/resized/full/nugget-point-lighthouse.webp` | Great South (Brandkit) | Worldwide Public Use | Liz Carlson | Oct 2026 | `catlins/credits.txt` | |
| Peake's Kitchen, Papatowai | `catlins/resized/full/peakes-kitchen-papatowai.webp` | Great South (Brandkit) | Worldwide Public Use | Peake's Kitchen | Oct 2026 | `catlins/credits.txt` | |
| Porpoise Bay | `catlins/resized/full/porpoise-bay.webp` | Great South (Brandkit) | Worldwide Public Use | Jeremy Pierce | Oct 2026 | `catlins/credits.txt` | |
| Purakaunui Falls | `catlins/resized/full/purakaunui-falls.webp` | Great South (Brandkit) | Worldwide Public Use | Liz Carlson | Oct 2026 | `catlins/credits.txt` | |
| Slope Point Walk | `catlins/resized/full/slope-point-walk.webp` | Great South (Brandkit) | Worldwide Public Use | Great South | Oct 2026 | `catlins/credits.txt` | |
| Surat Bay Beach Walk | `catlins/resized/full/surat-bay-beach-walk.webp` | not recorded | not recorded | none needed | Oct 2026 | `catlins/credits.txt` | |
| Temple of Tinkering | `catlins/resized/full/the-lost-gypsy-gallery.webp` | Great South (Brandkit) | Worldwide Public Use | Great South | Oct 2026 | `catlins/credits.txt` | |
| Waipapa Point Lighthouse | `catlins/resized/full/waipapa-point-lighthouse.webp` | Great South (Brandkit) | Worldwide Public Use | Great South | Oct 2026 | `catlins/credits.txt` | |
| Bannockburn Sluicings | `centralotago/resized/full/bannockburn-sluicings.webp` | Central Otago (Brandkit) | Digital and Print with no paid advertising | none needed | Oct 2026 | `centralotago/credits.txt` | |
| Clyde Dam Lookout and Historic Clyde | `centralotago/resized/full/clyde-dam-lookout-historic-clyde.webp` | not recorded | Default Licence | none needed | Oct 2026 | `centralotago/credits.txt` | |
| Cromwell Heritage Precinct | `centralotago/resized/full/cromwell-heritage-precinct.webp` | Central Otago (Brandkit) | Digital and Print with no paid advertising | none needed | Oct 2026 | `centralotago/credits.txt` | |
| Goldfields Mining Centre | `centralotago/resized/full/goldfields-mining-centre.webp` | Wikimedia Commons | CC BY-SA 3.0 | Andre Richard Chalmers, CC BY-SA 3.0, resized | Oct 2026 | `centralotago/credits.txt` | |
| Lake Dunstan Trail with CHP Bike Rentals | `centralotago/resized/full/lake-dunstan-trail-chp-bike-rentals.webp` | Central Otago (Brandkit) | Digital and Print with no paid advertising | none needed | Oct 2026 | `centralotago/credits.txt` | |
| Ophir Post Office and Daniel O'Connell Bridge | `centralotago/resized/full/ophir-post-office-bridge.webp` | Wikimedia Commons | CC BY-SA 4.0 | Schwede66, CC BY-SA 4.0, resized | Oct 2026 | `centralotago/credits.txt` | |
| Otago Central Rail Trail Day Ride | `centralotago/resized/full/otago-central-rail-trail-day-ride.webp` | Central Otago (Brandkit) | Digital and Print with no paid advertising | none needed | Oct 2026 | `centralotago/credits.txt` | |
| Shaky Bridge and Alexandra Clock on the Hill | `centralotago/resized/full/shaky-bridge-alexandra-clock.webp` | not recorded | Default Licence | none needed | Oct 2026 | `centralotago/credits.txt` | |
| St Bathans Blue Lake | `centralotago/resized/full/st-bathans-blue-lake.webp` | Wikimedia Commons | Public domain | none needed | Oct 2026 | `centralotago/credits.txt` | |
| Allans Beach | `dunedin/resized/full/allans-beach.webp` | Dunedin NZ (Brandkit) | Royalty Free | DunedinNZ | Oct 2026 | `dunedin/credits.txt` | |
| Baldwin Street | `dunedin/resized/full/baldwin-street.webp` | Dunedin NZ (Brandkit) | Royalty Free | DunedinNZ | Oct 2026 | `dunedin/credits.txt` | |
| Dunedin Botanic Garden | `dunedin/resized/full/dunedin-botanic-garden.webp` | Dunedin NZ (Brandkit) | Royalty Free | DunedinNZ | Oct 2026 | `dunedin/credits.txt` | |
| Dunedin Public Art Gallery | `dunedin/resized/full/dunedin-public-art-gallery.webp` | Dunedin NZ (Brandkit) | Royalty Free | DunedinNZ | Oct 2026 | `dunedin/credits.txt` | |
| Dunedin Railway Station | `dunedin/resized/full/dunedin-railway-station.webp` | Dunedin NZ (Brandkit) | Royalty Free | DunedinNZ | Oct 2026 | `dunedin/credits.txt` | |
| Emerson's Brewery | `dunedin/resized/full/emersons-brewery.webp` | Dunedin NZ (Brandkit) | Royalty Free | Dunedin NZ | Oct 2026 | `dunedin/credits.txt` | |
| Lan Yuan, Dunedin Chinese Garden | `dunedin/resized/full/dunedin-chinese-garden.webp` | Dunedin NZ (Brandkit) | Royalty Free | Roady | Oct 2026 | `dunedin/credits.txt` | |
| Larnach Castle | `dunedin/resized/full/larnach-castle.webp` | Wikimedia Commons | CC BY-SA 2.0 | Christoph Strässler, CC BY-SA 2.0, resized | Oct 2026 | `dunedin/credits.txt` | |
| Olveston Historic Home | `dunedin/resized/full/olveston-historic-home.webp` | Dunedin NZ (Brandkit) | Royalty Free | DunedinNZ | Oct 2026 | `dunedin/credits.txt` | |
| Orokonui Ecosanctuary | `dunedin/resized/full/orokonui-ecosanctuary.webp` | Dunedin NZ (Brandkit) | Royalty Free | DunedinNZ | Oct 2026 | `dunedin/credits.txt` | |
| Otago Farmers Market | `dunedin/resized/full/otago-farmers-market.webp` | Dunedin NZ (Brandkit) | Royalty Free | DunedinNZ | Oct 2026 | `dunedin/credits.txt` | |
| Ross Creek Reservoir | `dunedin/resized/full/ross-creek-reservoir.webp` | Wikimedia Commons | CC BY-SA 3.0 | Benchill, CC BY-SA 3.0, resized | Oct 2026 | `dunedin/credits.txt` | |
| Royal Albatross Centre | `dunedin/resized/full/royal-albatross-centre.webp` | Dunedin NZ (Brandkit) | Royalty Free | Dunedin NZ | Oct 2026 | `dunedin/credits.txt` | |
| Sandfly Bay Track | `dunedin/resized/full/sandfly-bay-track.webp` | Dunedin NZ (Brandkit) | Royalty Free | DunedinNZ | Oct 2026 | `dunedin/credits.txt` | |
| Signal Hill Lookout | `dunedin/resized/full/signal-hill-lookout.webp` | Wikimedia Commons | CC BY-SA 3.0 | Schwede66, CC BY-SA 3.0, resized | Oct 2026 | `dunedin/credits.txt` | |
| St Clair Beach | `dunedin/resized/full/st-clair-beach.webp` | Dunedin NZ (Brandkit) | Royalty Free | DunedinNZ | Oct 2026 | `dunedin/credits.txt` | |
| St Clair Hot Salt Water Pool | `dunedin/resized/full/st-clair-hot-salt-water-pool.webp` | Dunedin NZ (Brandkit) | Royalty Free | DunedinNZ | Oct 2026 | `dunedin/credits.txt` | |
| Starfish Cafe & Bar | `dunedin/resized/full/starfish-cafe-st-clair.webp` | Dunedin NZ (Brandkit) | Royalty Free | DunedinNZ | Oct 2026 | `dunedin/credits.txt` | |
| Sutton Salt Lake | `dunedin/resized/full/sutton-salt-lake.webp` | Wikimedia Commons | Public domain | none needed | Oct 2026 | `dunedin/credits.txt` | |
| Taieri Gorge Railway | `dunedin/resized/full/taieri-gorge-railway.webp` | Dunedin NZ (Brandkit) | Royalty Free | DunedinNZ | Oct 2026 | `dunedin/credits.txt` | |
| Toitū Otago Settlers Museum | `dunedin/resized/full/toitu-otago-settlers-museum.webp` | Dunedin NZ (Brandkit) | Royalty Free | DunedinNZ | Oct 2026 | `dunedin/credits.txt` | |
| Tūhura Otago Museum | `dunedin/resized/full/tuhura-otago-museum.webp` | Wikimedia Commons | CC BY-SA 4.0 | Rosi Crane, CC BY-SA 4.0, resized | Oct 2026 | `dunedin/credits.txt` | |
| Tunnel Beach Track | `dunedin/resized/full/tunnel-beach-track.webp` | Dunedin NZ (Brandkit) | Royalty Free | DunedinNZ | Oct 2026 | `dunedin/credits.txt` | |
| Vogel St Kitchen | `dunedin/resized/full/vogel-st-kitchen.webp` | Dunedin NZ (Brandkit) | Royalty Free | DunedinNZ | Oct 2026 | `dunedin/credits.txt` | |
| Fox Glacier South Side Walk | `foxglacier/resized/full/fox-glacier-south-side-walk.webp` | not recorded | not recorded | none needed | Oct 2026 | `foxglacier/credits.txt` | |
| Gillespies Beach | `foxglacier/resized/full/gillespies-beach.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Clint Trahan | Oct 2026 | `foxglacier/credits.txt` | |
| Lake Matheson Walk | `foxglacier/resized/full/lake-matheson-walk.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Clint Trahan | Oct 2026 | `foxglacier/credits.txt` | |
| Matheson Cafe | `foxglacier/resized/full/matheson-cafe.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | RoadyNZ | Oct 2026 | `foxglacier/credits.txt` | |
| Mountain Helicopters Scenic Flights | `foxglacier/resized/full/mountain-helicopters-scenic-flights.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | probably Stewart Nimmo | Oct 2026 | `foxglacier/credits.txt` | |
| Franz Josef Glacier Heli Hike | `franzjosef/resized/full/franz-josef-glacier-heli-hike.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Franz Josef Glacier Guides | Oct 2026 | `franzjosef/credits.txt` | |
| Franz Josef Glacier Valley Walk | `franzjosef/resized/full/franz-josef-glacier-valley-walk.webp` | not recorded | not recorded | none needed | Oct 2026 | `franzjosef/credits.txt` | |
| Glacier Country Scenic Flights | `franzjosef/resized/full/glacier-country-scenic-flights.webp` | not recorded | not recorded | none needed | Oct 2026 | `franzjosef/credits.txt` | |
| Lake Mapourika | `franzjosef/resized/full/lake-mapourika.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Liz Carlson | Oct 2026 | `franzjosef/credits.txt` | |
| Ōkārito Campground | `franzjosef/resized/full/okarito-campground.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Petr Hlavacek or Wade McClelland | Oct 2026 | `franzjosef/credits.txt` | |
| Ōkārito Kayaks | `franzjosef/resized/full/okarito-kayaks.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Petr Hlavacek or Wade McClelland | Oct 2026 | `franzjosef/credits.txt` | |
| Ōkārito Trig Walk | `franzjosef/resized/full/okarito-trig-walk.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Geoff Marks | Oct 2026 | `franzjosef/credits.txt` | |
| SnakeBite Brewery | `franzjosef/resized/full/snakebite-brewery.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Development West Coast | Oct 2026 | `franzjosef/credits.txt` | |
| Waiho Hot Tubs | `franzjosef/resized/full/glacier-hot-pools.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Clint Trahan | Oct 2026 | `franzjosef/credits.txt` | |
| West Coast Wildlife Centre | `franzjosef/resized/full/west-coast-wildlife-centre.webp` | not recorded | not recorded | none needed | Oct 2026 | `franzjosef/credits.txt` | |
| Dart River Wilderness Jet | `glenorchy/resized/full/dart-river-wilderness-jet.webp` | Wikimedia Commons | CC BY-SA 4.0 | André Richard Chalmers, CC BY-SA 4.0, resized | Oct 2026 | `glenorchy/credits.txt` | |
| Glenorchy Lagoon Walkway | `glenorchy/resized/full/glenorchy-lagoon-walkway.webp` | Destination Queenstown (Brandkit) | not recorded | Destination Queenstown | Oct 2026 | `glenorchy/credits.txt` | |
| Glenorchy Wharf and Red Shed | `glenorchy/resized/full/glenorchy-wharf-and-red-shed.webp` | Destination Queenstown (Brandkit) | not recorded | Destination Queenstown | Oct 2026 | `glenorchy/credits.txt` | |
| Lake Sylvan Track and Campsite | `glenorchy/resized/full/lake-sylvan-track-and-campsite.webp` | Wikimedia Commons | Public domain | none needed | Oct 2026 | `glenorchy/credits.txt` | |
| Routeburn Track Day Walk | `glenorchy/resized/full/routeburn-track-day-walk.webp` | Wikimedia Commons | CC BY-SA 4.0 | ShakyIsles, CC BY-SA 4.0, resized | Oct 2026 | `glenorchy/credits.txt` | |
| Anatoki Salmon | `goldenbay/resized/full/anatoki-salmon.webp` | Nelson Tasman (Brandkit) | Standard with Attribution License | Kane Hartill | Oct 2026 | `goldenbay/credits.txt` | |
| Farewell Spit Eco Tours | `goldenbay/resized/full/farewell-spit-eco-tours.webp` | Nelson Tasman (Brandkit) | Standard with Attribution License | Neat Places | Oct 2026 | `goldenbay/credits.txt` | |
| Labyrinth Rocks Park | `goldenbay/resized/full/labyrinth-rocks-park.webp` | Wikimedia Commons | CC BY-SA 4.0 | Wildman NZ, CC BY-SA 4.0, resized | Oct 2026 | `goldenbay/credits.txt` | |
| Ngarua Caves | `goldenbay/resized/full/ngarua-caves.webp` | Nelson Tasman (Brandkit) | Standard with Attribution License | NelsonTasman.nz & @barekiwi | Oct 2026 | `goldenbay/credits.txt` | |
| Pōhara Beach | `goldenbay/resized/full/pohara-beach.webp` | Wikimedia Commons | CC BY 4.0 | Michal Klajban, CC BY 4.0, resized | Oct 2026 | `goldenbay/credits.txt` | |
| Rawhiti Cave | `goldenbay/resized/full/rawhiti-cave.webp` | Nelson Tasman (Brandkit) | Standard License | none needed | Oct 2026 | `goldenbay/credits.txt` | |
| Te Waikoropupū Springs | `goldenbay/resized/full/te-waikoropupu-springs.webp` | Nelson Tasman (Brandkit) | Standard with Attribution License | Neat Places | Oct 2026 | `goldenbay/credits.txt` | |
| The Courthouse Café | `goldenbay/resized/full/the-courthouse-cafe.webp` | Nelson Tasman (Brandkit) | Standard with Attribution License | Neat Places | Oct 2026 | `goldenbay/credits.txt` | |
| The Grove Scenic Reserve | `goldenbay/resized/full/the-grove-scenic-reserve.webp` | Nelson Tasman (Brandkit) | Standard License | none needed | Oct 2026 | `goldenbay/credits.txt` | |
| The Mussel Inn | `goldenbay/resized/full/the-mussel-inn.webp` | Nelson Tasman (Brandkit) | Standard License | none needed | Oct 2026 | `goldenbay/credits.txt` | |
| The Wholemeal Café | `goldenbay/resized/full/the-wholemeal-cafe.webp` | Nelson Tasman (Brandkit) | Standard License | none needed | Oct 2026 | `goldenbay/credits.txt` | |
| Wainui Falls | `goldenbay/resized/full/wainui-falls.webp` | Nelson Tasman (Brandkit) | Standard with Attribution License | NelsonTasman.nz | Oct 2026 | `goldenbay/credits.txt` | |
| Wharariki Beach | `goldenbay/resized/full/wharariki-beach.webp` | Nelson Tasman (Brandkit) | Standard with Attribution License | Cape Farewell Horse Treks | Oct 2026 | `goldenbay/credits.txt` | |
| Eastern Southland Gallery | `gore/resized/full/eastern-southland-gallery.webp` | Great South (Brandkit) | Worldwide Public Use | Great South | Oct 2026 | `gore/credits.txt` | |
| Old Hokonui Moonshine Museum | `gore/resized/full/old-hokonui-moonshine-museum.webp` | Great South (Brandkit) | Worldwide Public Use | Great South | Oct 2026 | `gore/credits.txt` | |
| Cobden Aromahana Lagoon Freedom Camping | `greymouth/resized/full/cobden-aromahana-lagoon-freedom-camping.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Development West Coast | Oct 2026 | `greymouth/credits.txt` | |
| Formerly the Blackball Hilton | `greymouth/resized/full/formerly-the-blackball-hilton.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | DWC | Oct 2026 | `greymouth/credits.txt` | |
| Iveagh Bay Freedom Camping | `greymouth/resized/full/iveagh-bay-freedom-camping.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Stewart Nimmo | Oct 2026 | `greymouth/credits.txt` | |
| Moana Lakefront, Lake Brunner | `greymouth/resized/full/moana-lakefront-lake-brunner.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Nimmo Photography | Oct 2026 | `greymouth/credits.txt` | |
| Monteith's Brewery | `greymouth/resized/full/monteiths-brewery.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Monteith's Brewery | Oct 2026 | `greymouth/credits.txt` | |
| Point Elizabeth Walkway | `greymouth/resized/full/point-elizabeth-walkway.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Development West Coast | Oct 2026 | `greymouth/credits.txt` | |
| Shantytown Heritage Park | `greymouth/resized/full/shantytown-heritage-park.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Stewart Nimmo | Oct 2026 | `greymouth/credits.txt` | |
| Blue Pools Track | `haast/resized/full/blue-pools-track.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | BareKiwi | Oct 2026 | `haast/credits.txt` | |
| Bruce Bay | `haast/resized/full/bruce-bay.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Clint Trahan | Oct 2026 | `haast/credits.txt` | |
| Knights Point Lookout | `haast/resized/full/knights-point-lookout.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Clint Trahan | Oct 2026 | `haast/credits.txt` | |
| Monro Beach Track | `haast/resized/full/monro-beach-track.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Dr Gerry McSweeney | Oct 2026 | `haast/credits.txt` | |
| Roaring Billy Falls Walk | `haast/resized/full/roaring-billy-falls-walk.webp` | Wikimedia Commons | CC BY 2.0 | itravelNZ, CC BY 2.0, resized | Oct 2026 | `haast/credits.txt` | |
| Ship Creek Tauparikākā Walks | `haast/resized/full/ship-creek-tauparikaka-walks.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Clint Trahan | Oct 2026 | `haast/credits.txt` | |
| The Craypot, Jackson Bay | `haast/resized/full/the-craypot-jackson-bay.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Stewart Nimmo | Oct 2026 | `haast/credits.txt` | |
| Thunder Creek and Fantail Falls | `haast/resized/full/thunder-creek-and-fantail-falls.webp` | not recorded | not recorded | none needed | Oct 2026 | `haast/credits.txt` | |
| Conical Hill Walk | `hanmersprings/resized/full/conical-hill-walk.webp` | Wikimedia Commons | CC BY-SA 4.0 | FutureKiwi, CC BY-SA 4.0, resized | Oct 2026 | `hanmersprings/credits.txt` | |
| Hanmer Springs Bungy, Waiau Ferry Bridge | `hanmersprings/resized/full/hanmer-springs-bungy.webp` | Wikimedia Commons | CC BY 2.5 | Leyo, CC BY 2.5, resized | Oct 2026 | `hanmersprings/credits.txt` | |
| Hanmer Springs Thermal Pools & Spa | `hanmersprings/resized/full/hanmer-springs-thermal-pools-and-spa.webp` | Wikimedia Commons | CC BY-SA 4.0 | FutureKiwi, CC BY-SA 4.0, resized | Oct 2026 | `hanmersprings/credits.txt` | |
| Heritage Forest and Woodland Walks | `hanmersprings/resized/full/heritage-forest-and-woodland-walks.webp` | Wikimedia Commons | CC0 | none needed | Oct 2026 | `hanmersprings/credits.txt` | |
| Lewis Pass Alpine Nature Walk | `hanmersprings/resized/full/lewis-pass-alpine-nature-walk.webp` | Wikimedia Commons | Public domain | none needed | Oct 2026 | `hanmersprings/credits.txt` | |
| Maruia Hot Springs | `hanmersprings/resized/full/maruia-hot-springs.webp` | Wikimedia Commons | CC BY-SA 2.0 | masa osada, CC BY-SA 2.0, resized | Oct 2026 | `hanmersprings/credits.txt` | |
| Molesworth Road (Acheron Road) | `hanmersprings/resized/full/molesworth-acheron-road.webp` | Department of Conservation | CC BY 4.0 | Paul Mahoney, Department of Conservation, CC BY 4.0, resized | Oct 2026 | `hanmersprings/credits.txt` | |
| Waterfall Track to Dog Stream Waterfall | `hanmersprings/resized/full/waterfall-track-dog-stream-waterfall.webp` | Department of Conservation | CC BY 2.0 | Thomas Sobek, CC BY 2.0, resized | Oct 2026 | `hanmersprings/credits.txt` | |
| Bonz 'N' Stonz Carving Studio | `hokitika/resized/full/bonz-n-stonz-carving-studio.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Development West Coast | Oct 2026 | `hokitika/credits.txt` | |
| Dorothy Falls | `hokitika/resized/full/dorothy-falls.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Clint Trahan | Oct 2026 | `hokitika/credits.txt` | |
| Glow Worm Dell | `hokitika/resized/full/glow-worm-dell.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Liz Carlson | Oct 2026 | `hokitika/credits.txt` | |
| Hans Bay Campsite, Lake Kaniere | `hokitika/resized/full/hans-bay-campsite-lake-kaniere.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | RoadyNZ | Oct 2026 | `hokitika/credits.txt` | |
| Hokitika Beach | `hokitika/resized/full/hokitika-beach-driftwood-sign.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Driftwood & Sand | Oct 2026 | `hokitika/credits.txt` | |
| Hokitika Cycles and Sports Bike Hire | `hokitika/resized/full/hokitika-cycles-bike-hire.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | BareKiwi | Oct 2026 | `hokitika/credits.txt` | |
| Hokitika Gorge | `hokitika/resized/full/hokitika-gorge.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | BareKiwi | Oct 2026 | `hokitika/credits.txt` | |
| Hokitika Museum | `hokitika/resized/full/hokitika-museum.webp` | Wikimedia Commons | CC BY-SA 4.0 | Schwede66, CC BY-SA 4.0, resized | Oct 2026 | `hokitika/credits.txt` | |
| Lake Kaniere and Canoe Cove | `hokitika/resized/full/lake-kaniere-canoe-cove.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Development West Coast | Oct 2026 | `hokitika/credits.txt` | |
| Lake Mahinapua Campsite | `hokitika/resized/full/lake-mahinapua-campsite.webp` | not recorded | not recorded | none needed | Oct 2026 | `hokitika/credits.txt` | |
| Lake Mahinapua Hotel | `hokitika/resized/full/lake-mahinapua-hotel.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Clint Trahan | Oct 2026 | `hokitika/credits.txt` | |
| Ross Goldfields Heritage Centre and Water Race Walk | `hokitika/resized/full/ross-goldfields-water-race-walk.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Clint Trahan | Oct 2026 | `hokitika/credits.txt` | |
| The Hokitika Sandwich Company | `hokitika/resized/full/hokitika-sandwich-company.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Clint Trahan | Oct 2026 | `hokitika/credits.txt` | |
| West Coast Treetop Walk | `hokitika/resized/full/west-coast-treetop-walk.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | BareKiwi | Oct 2026 | `hokitika/credits.txt` | |
| Bluff Hill Lookout (Motupōhue) | `invercargill/resized/full/bluff-hill-lookout.webp` | Great South (Brandkit) | Worldwide Public Use | Great South | Oct 2026 | `invercargill/credits.txt` | |
| Classic Motorcycle Mecca | `invercargill/resized/full/classic-motorcycle-mecca.webp` | Great South (Brandkit) | Worldwide Public Use | Tourism New Zealand | Oct 2026 | `invercargill/credits.txt` | |
| Oreti Beach | `invercargill/resized/full/oreti-beach.webp` | Great South (Brandkit) | Worldwide Public Use | Tourism New Zealand | Oct 2026 | `invercargill/credits.txt` | |
| Stewart Island Ferry, Bluff | `invercargill/resized/full/stewart-island-ferry-bluff.webp` | Great South (Brandkit) | Worldwide Public Use | Jeremy Pierce | Oct 2026 | `invercargill/credits.txt` | |
| Stirling Point and Foveaux Walkway, Bluff | `invercargill/resized/full/stirling-point-bluff.webp` | Great South (Brandkit) | Worldwide Public Use | Great South | Oct 2026 | `invercargill/credits.txt` | |
| The Batch Cafe | `invercargill/resized/full/the-batch-cafe-invercargill.webp` | Great South (Brandkit) | Worldwide Public Use | Great South | Oct 2026 | `invercargill/credits.txt` | |
| Cathedral Cliffs, Gore Bay | `kaikoura/resized/full/cathedral-cliffs-gore-bay.webp` | Wikimedia Commons | CC BY-SA 4.0 | Michal Klajban, CC BY-SA 4.0, resized | Oct 2026 | `kaikoura/credits.txt` | |
| Encounter Kaikōura (Dolphin and Albatross Tours) | `kaikoura/resized/full/encounter-kaikoura.webp` | Kaikōura (Brandkit) | Royalty Free Worldwide | none needed | Oct 2026 | `kaikoura/credits.txt` | |
| Fyffe House | `kaikoura/resized/full/fyffe-house.webp` | Wikimedia Commons | Public domain | none needed | Oct 2026 | `kaikoura/credits.txt` | |
| Kaikōura Lookout | `kaikoura/resized/full/kaikoura-lookout.webp` | Kaikōura (Brandkit) | Royalty Free Worldwide | none needed | Oct 2026 | `kaikoura/credits.txt` | |
| Nin's Bin | `kaikoura/resized/full/nins-bin.webp` | Kaikōura (Brandkit) | Royalty Free Worldwide | Lisa Bond | Oct 2026 | `kaikoura/credits.txt` | |
| Seal Swim Kaikōura | `kaikoura/resized/full/seal-swim-kaikoura.webp` | Kaikōura (Brandkit) | Royalty Free Worldwide | Whale Watch Kaikoura | Oct 2026 | `kaikoura/credits.txt` | |
| The Pier Hotel | `kaikoura/resized/full/the-pier-hotel-kaikoura.webp` | Kaikōura (Brandkit) | Royalty Free Worldwide | @barekiwi | Oct 2026 | `kaikoura/credits.txt` | |
| Whale Watch Kaikōura | `kaikoura/resized/full/whale-watch-kaikoura.webp` | Kaikōura (Brandkit) | Royalty Free Worldwide | Whale Watch Kaikoura | Oct 2026 | `kaikoura/credits.txt` | |
| Pelorus Bridge Scenic Reserve | `marlboroughsounds/resized/full/pelorus-bridge-scenic-reserve.webp` | Marlborough (Brandkit) | Royalty Free with Credit | MarlboroughNZ | Oct 2026 | `marlboroughsounds/credits.txt` | |
| Pelorus Mail Boat | `marlboroughsounds/resized/full/pelorus-mail-boat.webp` | Marlborough (Brandkit) | Royalty Free with Credit | none needed | Oct 2026 | `marlboroughsounds/credits.txt` | |
| Queen Charlotte Drive and Cullen Point Lookout | `marlboroughsounds/resized/full/queen-charlotte-drive-cullen-point.webp` | Marlborough (Brandkit) | Royalty Free with Credit | none needed | Oct 2026 | `marlboroughsounds/credits.txt` | |
| Hidden Valleys Rafting, Rangitata Gorge | `midcanterbury/resized/full/rangitata-rafts.webp` | Wikimedia Commons | CC BY-SA 4.0 | Charlie Mitchell, CC BY-SA 4.0, resized | Oct 2026 | `midcanterbury/credits.txt` | |
| Lake Clearwater | `midcanterbury/resized/full/lake-clearwater.webp` | Wikimedia Commons | CC BY-SA 4.0 | Michal Klajban, CC BY-SA 4.0, resized | Oct 2026 | `midcanterbury/credits.txt` | |
| Mt Sunday (Edoras) Track | `midcanterbury/resized/full/mt-sunday-edoras-track.webp` | Wikimedia Commons | CC BY 4.0 | Mike Dickison, CC BY 4.0, resized | Oct 2026 | `midcanterbury/credits.txt` | |
| Ōpuke Thermal Pools | `midcanterbury/resized/full/opuke-thermal-pools.webp` | Wikimedia Commons | CC BY-SA 4.0 | Schwede66, CC BY-SA 4.0, resized | Oct 2026 | `midcanterbury/credits.txt` | |
| Peak Hill, Lake Coleridge | `midcanterbury/resized/full/peak-hill-lake-coleridge.webp` | Wikimedia Commons | CC BY-SA 4.0 | Michal Klajban, CC BY-SA 4.0, resized | Oct 2026 | `midcanterbury/credits.txt` | |
| Rakaia Gorge Walkway | `midcanterbury/resized/full/rakaia-gorge-walkway.webp` | Wikimedia Commons | CC BY 4.0 | Mrastron, CC BY 4.0, resized | Oct 2026 | `midcanterbury/credits.txt` | |
| Rakaia Salmon Statue | `midcanterbury/resized/full/rakaia-salmon-statue.webp` | Wikimedia Commons | CC BY-SA 4.0 | Michal Klajban, CC BY-SA 4.0, resized | Oct 2026 | `midcanterbury/credits.txt` | |
| Sharplin Falls Track | `midcanterbury/resized/full/sharplin-falls-track.webp` | Wikimedia Commons | CC BY-SA 2.0 | Mark Law, CC BY-SA 2.0, resized | Oct 2026 | `midcanterbury/credits.txt` | |
| Cascade Creek Campsite | `milfordsound/resized/full/cascade-creek-campsite.webp` | Great South (Brandkit) | Worldwide Public Use | Great South | Oct 2026 | `milfordsound/credits.txt` | |
| Key Summit Track | `milfordsound/resized/full/key-summit-track.webp` | Great South (Brandkit) | Worldwide Public Use | Great South | Oct 2026 | `milfordsound/credits.txt` | |
| Lake Gunn Nature Walk | `milfordsound/resized/full/lake-gunn-nature-walk.webp` | Great South (Brandkit) | Worldwide Public Use | Great South | Oct 2026 | `milfordsound/credits.txt` | |
| Lake Marian Track | `milfordsound/resized/full/lake-marian-track.webp` | Great South (Brandkit) | Default Licence | none needed | Oct 2026 | `milfordsound/credits.txt` | |
| Milford Foreshore Walk | `milfordsound/resized/full/milford-foreshore-walk.webp` | Great South (Brandkit) | Worldwide Public Use | Great South | Oct 2026 | `milfordsound/credits.txt` | |
| Milford Sound Cruise with Cruise Milford | `milfordsound/resized/full/cruise-milford-small-boat-cruise.webp` | Great South (Brandkit) | Worldwide Public Use | Great South | Oct 2026 | `milfordsound/credits.txt` | |
| Mirror Lakes | `milfordsound/resized/full/mirror-lakes.webp` | Great South (Brandkit) | Worldwide Public Use | Great South | Oct 2026 | `milfordsound/credits.txt` | |
| Buller Gorge Swingbridge Adventure and Heritage Park | `murchison/resized/full/buller-gorge-swingbridge.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Stewart Nimmo | Oct 2026 | `murchison/credits.txt` | |
| Maruia Falls | `murchison/resized/full/maruia-falls.webp` | not recorded | Standard License | none needed | Oct 2026 | `murchison/credits.txt` | |
| Murchison District Museum | `murchison/resized/full/murchison-district-museum.webp` | Wikimedia Commons | CC BY-SA 4.0 | Michal Klajban, CC BY-SA 4.0, resized | Oct 2026 | `murchison/credits.txt` | |
| Black Hole, Maitai River | `nelson/resized/full/black-hole-maitai-river.webp` | Nelson Tasman (Brandkit) | Standard with Attribution License | Grant Stirling Images | Oct 2026 | `nelson/credits.txt` | |
| Cable Bay Walkway and Beach | `nelson/resized/full/cable-bay-walkway-and-beach.webp` | Nelson Tasman (Brandkit) | Standard with Attribution License | @cjmaddock | Oct 2026 | `nelson/credits.txt` | |
| Centre of New Zealand Walk | `nelson/resized/full/centre-of-new-zealand-walk.webp` | Nelson Tasman (Brandkit) | Standard with Attribution License | Nelson City Council | Oct 2026 | `nelson/credits.txt` | |
| Cycle Nelson Bike Hire | `nelson/resized/full/cycle-nelson-bike-hire.webp` | Nelson Tasman (Brandkit) | Standard License | none needed | Oct 2026 | `nelson/credits.txt` | |
| Founders Heritage Park | `nelson/resized/full/founders-heritage-park.webp` | Nelson Tasman (Brandkit) | Standard with Attribution License | NelsonTasman.nz & @barekiwi | Oct 2026 | `nelson/credits.txt` | |
| Māpua Wharf | `nelson/resized/full/mapua-wharf.webp` | Nelson Tasman (Brandkit) | Standard with Attribution License | Neat Places | Oct 2026 | `nelson/credits.txt` | |
| Moturoa / Rabbit Island | `nelson/resized/full/moturoa-rabbit-island.webp` | Nelson Tasman (Brandkit) | Standard License | none needed | Oct 2026 | `nelson/credits.txt` | |
| Nelson Classic Car Museum | `nelson/resized/full/nelson-classic-car-museum.webp` | Nelson Tasman (Brandkit) | Standard License | none needed | Oct 2026 | `nelson/credits.txt` | |
| Nelson Provincial Museum | `nelson/resized/full/nelson-provincial-museum.webp` | Wikimedia Commons | CC BY-SA 3.0 | Schwede66, CC BY-SA 3.0, resized | Oct 2026 | `nelson/credits.txt` | |
| Nelson Saturday Market | `nelson/resized/full/nelson-saturday-market.webp` | Nelson Tasman (Brandkit) | Standard License | none needed | Oct 2026 | `nelson/credits.txt` | |
| Pic's Peanut Butter World | `nelson/resized/full/pics-peanut-butter-world.webp` | Nelson Tasman (Brandkit) | Standard with Attribution License | NelsonTasman.nz & @barekiwi | Oct 2026 | `nelson/credits.txt` | |
| Tāhunanui Beach | `nelson/resized/full/tahunanui-beach.webp` | Nelson Tasman (Brandkit) | Standard License | none needed | Oct 2026 | `nelson/credits.txt` | |
| The Suter Art Gallery | `nelson/resized/full/the-suter-art-gallery.webp` | Nelson Tasman (Brandkit) | Standard with Attribution License | Neat Places | Oct 2026 | `nelson/credits.txt` | |
| Kawatiri Historic Railway Walk | `nelsonlakes/resized/full/kawatiri-historic-railway-walk.webp` | Wikimedia Commons | CC BY-SA 4.0 | André Brett, CC BY-SA 4.0, resized | Oct 2026 | `nelsonlakes/credits.txt` | |
| Kerr Bay Short Walks (Bellbird, Honeydew, Brunner Peninsula) | `nelsonlakes/resized/full/kerr-bay-short-walks.webp` | Wikimedia Commons | CC0 | none needed | Oct 2026 | `nelsonlakes/credits.txt` | |
| Lake Rotoiti Jetty, Kerr Bay | `nelsonlakes/resized/full/lake-rotoiti-jetty-kerr-bay.webp` | Nelson Tasman (Brandkit) | Standard License | none needed | Oct 2026 | `nelsonlakes/credits.txt` | |
| Lake Rotoroa | `nelsonlakes/resized/full/lake-rotoroa.webp` | Nelson Tasman (Brandkit) | Standard with Attribution License | NelsonTasman.nz | Oct 2026 | `nelsonlakes/credits.txt` | |
| Mount Robert Circuit | `nelsonlakes/resized/full/mount-robert-circuit.webp` | Nelson Tasman (Brandkit) | Standard with Attribution License | NelsonTasman.nz & @barekiwi | Oct 2026 | `nelsonlakes/credits.txt` | |
| Bushy Beach Penguin Hide | `oamaru/resized/full/bushy-beach-penguin-hide.webp` | Wikimedia Commons | Public domain | none needed | Oct 2026 | `oamaru/credits.txt` | |
| Kātiki Point Lighthouse | `oamaru/resized/full/katiki-point-lighthouse.webp` | Wikimedia Commons | Public domain | none needed | Oct 2026 | `oamaru/credits.txt` | |
| Moeraki Boulders | `oamaru/resized/full/moeraki-boulders.webp` | Wikimedia Commons | Public domain | none needed | Oct 2026 | `oamaru/credits.txt` | |
| Ōamaru Blue Penguin Colony | `oamaru/resized/full/oamaru-blue-penguin-colony.webp` | Wikimedia Commons | CC BY-SA 3.0 | Avenue, CC BY-SA 3.0, resized | Oct 2026 | `oamaru/credits.txt` | |
| Oamaru Public Garden | `oamaru/resized/full/oamaru-public-garden.webp` | Wikimedia Commons | CC0 | none needed | Oct 2026 | `oamaru/credits.txt` | |
| Oamaru Victorian Precinct | `oamaru/resized/full/oamaru-victorian-precinct.webp` | Wikimedia Commons | Public domain | none needed | Oct 2026 | `oamaru/credits.txt` | |
| Shag Point / Matakaea | `oamaru/resized/full/shag-point-matakaea.webp` | Wikimedia Commons | CC0 | none needed | Oct 2026 | `oamaru/credits.txt` | |
| Steampunk HQ | `oamaru/resized/full/steampunk-hq.webp` | Wikimedia Commons | Public domain | none needed | Oct 2026 | `oamaru/credits.txt` | |
| Waitaki Museum & Archive | `oamaru/resized/full/waitaki-museum.webp` | Wikimedia Commons | CC BY-SA 3.0 | Andy king50, CC BY-SA 3.0, resized | Oct 2026 | `oamaru/credits.txt` | |
| Edwin Fox Maritime Museum | `picton/resized/full/edwin-fox-maritime-museum.webp` | Marlborough (Brandkit) | Royalty free | none needed | Oct 2026 | `picton/credits.txt` | |
| Motuara Island Bird Sanctuary Cruise | `picton/resized/full/motuara-island-bird-sanctuary-cruise.webp` | Marlborough (Brandkit) | Royalty Free with Credit | MarlboroughNZ | Oct 2026 | `picton/credits.txt` | |
| Queen Charlotte Track Day Walk | `picton/resized/full/queen-charlotte-track-day-walk.webp` | Marlborough (Brandkit) | Royalty Free with Credit | none needed | Oct 2026 | `picton/credits.txt` | |
| The Snout Track | `picton/resized/full/snout-track-picton.webp` | Marlborough (Brandkit) | Royalty free | none needed | Oct 2026 | `picton/credits.txt` | |
| Toastie Lords | `picton/resized/full/toastie-lords-picton.webp` | Marlborough (Brandkit) | Royalty Free with Credit | MarlboroughNZ | Oct 2026 | `picton/credits.txt` | |
| Pancake Rocks and Blowholes Walk | `punakaiki/resized/full/pancake-rocks-and-blowholes-walk.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Clint Trahan or Nomad Audio & Video | Oct 2026 | `punakaiki/credits.txt` | |
| Pororari River Track | `punakaiki/resized/full/pororari-river-track.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Clint Trahan or Nomad Audio & Video | Oct 2026 | `punakaiki/credits.txt` | |
| Punakaiki Cavern | `punakaiki/resized/full/punakaiki-cavern.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | West Coast New Zealand | Oct 2026 | `punakaiki/credits.txt` | |
| Truman Track | `punakaiki/resized/full/truman-track.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | BareKiwi | Oct 2026 | `punakaiki/credits.txt` | |
| Around the Basin Bike Hire | `queenstown/resized/full/around-the-basin-bike-hire.webp` | Destination Queenstown (Brandkit) | not recorded | Destination Queenstown | Oct 2026 | `queenstown/credits.txt` | |
| Ben Lomond Track | `queenstown/resized/full/ben-lomond-track.webp` | Destination Queenstown (Brandkit) | not recorded | Destination Queenstown | Oct 2026 | `queenstown/credits.txt` | |
| Bob's Cove Track | `queenstown/resized/full/bobs-cove-track.webp` | Destination Queenstown (Brandkit) | not recorded | Destination Queenstown | Oct 2026 | `queenstown/credits.txt` | |
| Deer Park Heights | `queenstown/resized/full/deer-park-heights.webp` | Wikimedia Commons | CC BY 3.0 | Jeff Hitchcock, CC BY 3.0, resized | Oct 2026 | `queenstown/credits.txt` | |
| Devil's Staircase Lookout | `queenstown/resized/full/devils-staircase-lookout.webp` | Wikimedia Commons | Public domain | none needed | Oct 2026 | `queenstown/credits.txt` | |
| Frankton Track and Frankton Beach | `queenstown/resized/full/frankton-track-and-frankton-beach.webp` | Destination Queenstown (Brandkit) | not recorded | Destination Queenstown | Oct 2026 | `queenstown/credits.txt` | |
| Kawarau Bridge Bungy | `queenstown/resized/full/kawarau-bridge-bungy.webp` | not recorded | not recorded | none needed | Oct 2026 | `queenstown/credits.txt` | |
| Kiwi Park Queenstown | `queenstown/resized/full/kiwi-park-queenstown.webp` | Destination Queenstown (Brandkit) | not recorded | Destination Queenstown | Oct 2026 | `queenstown/credits.txt` | |
| Moke Lake Campsite | `queenstown/resized/full/moke-lake-campsite.webp` | not recorded | not recorded | none needed | Oct 2026 | `queenstown/credits.txt` | |
| Nevis Bungy | `queenstown/resized/full/nevis-bungy.webp` | Wikimedia Commons | CC BY-SA 3.0 | Che010, CC BY-SA 3.0, resized | Oct 2026 | `queenstown/credits.txt` | |
| Onsen Hot Pools | `queenstown/resized/full/onsen-hot-pools.webp` | not recorded | not recorded | none needed | Oct 2026 | `queenstown/credits.txt` | |
| Queenstown Bay Beach | `queenstown/resized/full/queenstown-bay-beach.webp` | not recorded | not recorded | none needed | Oct 2026 | `queenstown/credits.txt` | |
| Queenstown Gardens | `queenstown/resized/full/queenstown-gardens.webp` | Destination Queenstown (Brandkit) | not recorded | Destination Queenstown | Oct 2026 | `queenstown/credits.txt` | |
| Queenstown Hill Time Walk | `queenstown/resized/full/queenstown-hill-time-walk.webp` | Destination Queenstown (Brandkit) | not recorded | Destination Queenstown | Oct 2026 | `queenstown/credits.txt` | |
| Shotover Jet | `queenstown/resized/full/shotover-jet.webp` | Wikimedia Commons | CC0 | none needed | Oct 2026 | `queenstown/credits.txt` | |
| Skippers Canyon | `queenstown/resized/full/skippers-canyon.webp` | not recorded | not recorded | none needed | Oct 2026 | `queenstown/credits.txt` | |
| Skyline Queenstown Gondola and Luge | `queenstown/resized/full/skyline-queenstown-gondola-and-luge.webp` | not recorded | not recorded | none needed | Oct 2026 | `queenstown/credits.txt` | |
| The Remarkables Road and Lake Alta Track | `queenstown/resized/full/remarkables-road-lake-alta.webp` | Wikimedia Commons | CC BY 2.5 | Onco p53, CC BY 2.5, resized | Oct 2026 | `queenstown/credits.txt` | |
| TSS Earnslaw Cruise | `queenstown/resized/full/tss-earnslaw-cruise.webp` | not recorded | not recorded | none needed | Oct 2026 | `queenstown/credits.txt` | |
| Yonder | `queenstown/resized/full/yonder.webp` | Destination Queenstown (Brandkit) | not recorded | Destination Queenstown | Oct 2026 | `queenstown/credits.txt` | |
| Blacks Point Museum | `reefton/resized/full/blacks-point-museum.webp` | Wikimedia Commons | CC BY-SA 4.0 | Tom Ackroyd, CC BY-SA 4.0, resized | Oct 2026 | `reefton/credits.txt` | |
| Bottled Lightning Powerhouse Walk | `reefton/resized/full/bottled-lightning-powerhouse-walk.webp` | Wikimedia Commons | CC BY-SA 4.0 | Stewart Nimmo, CC BY-SA 4.0, resized | Oct 2026 | `reefton/credits.txt` | |
| Reefton Heritage Walk and Visitor Centre | `reefton/resized/full/reefton-heritage-walk-and-visitor-centre.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Nimmo Photography | Oct 2026 | `reefton/credits.txt` | |
| The Bearded Miners | `reefton/resized/full/the-bearded-miners.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Development West Coast | Oct 2026 | `reefton/credits.txt` | |
| The Future Dough Co | `reefton/resized/full/broadway-tearooms-and-bakery.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Tess Row | Oct 2026 | `reefton/credits.txt` | |
| Waiuta Ghost Town | `reefton/resized/full/waiuta-ghost-town.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Clint Trahan | Oct 2026 | `reefton/credits.txt` | |
| Colac Bay / Ōraka | `riverton/resized/full/colac-bay-oraka.webp` | Great South (Brandkit) | Worldwide Public Use | Sam Deuchrass | Oct 2026 | `riverton/credits.txt` | |
| Colac Bay Freedom Camping | `riverton/resized/full/colac-bay-freedom-camping.webp` | Great South (Brandkit) | Worldwide Public Use | Pink Penguin Studio | Oct 2026 | `riverton/credits.txt` | |
| Howells Point Reserve | `riverton/resized/full/howells-point-reserve.webp` | Great South (Brandkit) | Worldwide Public Use | Sam Deuchrass | Oct 2026 | `riverton/credits.txt` | |
| Te Hikoi Museum | `riverton/resized/full/te-hikoi-museum-riverton.webp` | Great South (Brandkit) | Worldwide Public Use | Great South | Oct 2026 | `riverton/credits.txt` | |
| The Crib Cafe | `riverton/resized/full/the-crib-cafe-riverton.webp` | Great South (Brandkit) | Worldwide Public Use | Great South | Oct 2026 | `riverton/credits.txt` | |
| Doubtful Sound Wilderness Cruise | `te anau/resized/full/doubtful-sound-wilderness-cruise.webp` | Great South (Brandkit) | Worldwide Public Use | Liz Carlson | Oct 2026 | `te anau/credits.txt` | |
| Frasers Beach, Lake Manapōuri | `te anau/resized/full/frasers-beach-manapouri.webp` | Great South (Brandkit) | Worldwide Public Use | Air New Zealand | Oct 2026 | `te anau/credits.txt` | |
| Henry Creek Campsite | `te anau/resized/full/henry-creek-campsite.webp` | Great South (Brandkit) | Worldwide Public Use | Great South | Oct 2026 | `te anau/credits.txt` | |
| Kepler Track: Control Gates to Brod Bay | `te anau/resized/full/kepler-track-brod-bay.webp` | Great South (Brandkit) | Worldwide Public Use | Bas Bergsma \| whatdoesbassee | Oct 2026 | `te anau/credits.txt` | |
| Mavora Lakes Campsite | `te anau/resized/full/mavora-lakes-campsite.webp` | Great South (Brandkit) | Worldwide Public Use | Chris McLennan | Oct 2026 | `te anau/credits.txt` | |
| Punanga Manu o Te Anau Bird Sanctuary | `te anau/resized/full/punanga-manu-o-te-anau-bird-sanctuary.webp` | Great South (Brandkit) | Worldwide Public Use | Great South | Oct 2026 | `te anau/credits.txt` | |
| Redcliff Restaurant & Bar | `te anau/resized/full/redcliff-te-anau.webp` | Great South (Brandkit) | Worldwide Public Use | Great South | Oct 2026 | `te anau/credits.txt` | |
| Te Anau Glowworm Caves | `te anau/resized/full/te-anau-glowworm-caves.webp` | Wikimedia Commons | CC BY-SA 3.0 | MSeses, CC BY-SA 3.0, resized | Oct 2026 | `te anau/credits.txt` | |
| Church of the Good Shepherd | `tekapo/resized/full/church-of-the-good-shepherd.webp` | not recorded | not recorded | none needed | Oct 2026 | `tekapo/credits.txt` | |
| Dark Sky Project Summit Experience | `tekapo/resized/full/dark-sky-project-summit-experience.webp` | not recorded | not recorded | none needed | Oct 2026 | `tekapo/credits.txt` | |
| Mt John Summit and Astro Café | `tekapo/resized/full/mt-john-summit-astro-cafe.webp` | not recorded | not recorded | none needed | Oct 2026 | `tekapo/credits.txt` | |
| Tekapo Springs | `tekapo/resized/full/tekapo-springs.webp` | not recorded | not recorded | none needed | Oct 2026 | `tekapo/credits.txt` | |
| Big Tree Walk, Peel Forest | `timaru/resized/full/big-tree-walk-peel-forest.webp` | Wikimedia Commons | CC BY-SA 4.0 | Tomas Sobek, CC BY-SA 4.0, resized | Oct 2026 | `timaru/credits.txt` | |
| South Canterbury Museum | `timaru/resized/full/south-canterbury-museum.webp` | Wikimedia Commons | Public domain | none needed | Oct 2026 | `timaru/credits.txt` | |
| Talbot Forest Scenic Reserve | `timaru/resized/full/talbot-forest-scenic-reserve.webp` | Wikimedia Commons | CC BY 4.0 | Mike Dickison, CC BY 4.0, resized | Oct 2026 | `timaru/credits.txt` | |
| Timaru Botanic Gardens | `timaru/resized/full/timaru-botanic-gardens.webp` | Wikimedia Commons | CC BY-SA 4.0 | Michal Klajban, CC BY-SA 4.0, resized | Oct 2026 | `timaru/credits.txt` | |
| Clifden Caves | `tuatapere/resized/full/clifden-caves.webp` | Great South (Brandkit) | Worldwide Public Use | Videocopter | Oct 2026 | `tuatapere/credits.txt` | |
| Clifden Suspension Bridge | `tuatapere/resized/full/clifden-suspension-bridge.webp` | Great South (Brandkit) | Worldwide Public Use | Liz Carlson | Oct 2026 | `tuatapere/credits.txt` | |
| Gemstone Beach | `tuatapere/resized/full/gemstone-beach-orepuki.webp` | Great South (Brandkit) | Worldwide Public Use | Gayle Hogue | Oct 2026 | `tuatapere/credits.txt` | |
| Lake Hauroko Lookout Track | `tuatapere/resized/full/lake-hauroko-lookout-track.webp` | Great South (Brandkit) | Worldwide Public Use | Videocopter | Oct 2026 | `tuatapere/credits.txt` | |
| McCracken's Rest | `tuatapere/resized/full/mccrackens-rest.webp` | Great South (Brandkit) | Worldwide Public Use | Liz Carlson | Oct 2026 | `tuatapere/credits.txt` | |
| Monkey Island (Te Puka o Takitimu) | `tuatapere/resized/full/monkey-island-orepuki.webp` | Great South (Brandkit) | Worldwide Public Use | Great South | Oct 2026 | `tuatapere/credits.txt` | |
| Clay Cliffs Omarama | `twizel/resized/full/clay-cliffs-omarama.webp` | Wikimedia Commons | Public domain | none needed | Oct 2026 | `twizel/credits.txt` | |
| Lindis Pass Summit Lookout | `twizel/resized/full/lindis-pass-summit-lookout.webp` | Wikimedia Commons | CC BY-SA 4.0 | Wildman NZ, CC BY-SA 4.0, resized | Oct 2026 | `twizel/credits.txt` | |
| Peters Lookout | `twizel/resized/full/peters-lookout.webp` | Wikimedia Commons | CC BY 2.0 | Francis Vallance (Heritage Warrior), CC BY 2.0, resized | Oct 2026 | `twizel/credits.txt` | |
| Alps 2 Ocean: Otematata to Kurow | `waitakivalley/resized/full/alps-2-ocean-otematata-kurow.webp` | Wikimedia Commons | CC BY 3.0 | Mattinbgn, CC BY 3.0, resized | Oct 2026 | `waitakivalley/credits.txt` | |
| Benmore Dam and Peninsula Track | `waitakivalley/resized/full/benmore-dam-peninsula-track.webp` | Wikimedia Commons | Public domain | none needed | Oct 2026 | `waitakivalley/credits.txt` | |
| Elephant Rocks and Anatini Whale Fossil | `waitakivalley/resized/full/elephant-rocks-anatini.webp` | Wikimedia Commons | Public domain | none needed | Oct 2026 | `waitakivalley/credits.txt` | |
| Kurow Hill Walk | `waitakivalley/resized/full/kurow-hill-walk.webp` | Wikimedia Commons | CC BY 3.0 | Arend Veenhuizen, CC BY 3.0, resized | Oct 2026 | `waitakivalley/credits.txt` | |
| Vanished World Centre | `waitakivalley/resized/full/vanished-world-centre.webp` | Wikimedia Commons | CC BY 2.0 | itravelNZ - New Zealand in your pocket, CC BY 2.0, resized | Oct 2026 | `waitakivalley/credits.txt` | |
| Big Fig | `wanaka/resized/full/big-fig-wanaka.webp` | Lake Wānaka Tourism (Brandkit) | not recorded | Lake Wanaka Tourism | Oct 2026 | `wanaka/credits.txt` | |
| Cardrona Hotel | `wanaka/resized/full/cardrona-hotel.webp` | Lake Wānaka Tourism (Brandkit) | not recorded | Lake Wanaka Tourism | Oct 2026 | `wanaka/credits.txt` | |
| Diamond Lake and Rocky Mountain Track | `wanaka/resized/full/diamond-lake-rocky-mountain-track.webp` | Wikimedia Commons | Public domain | none needed | Oct 2026 | `wanaka/credits.txt` | |
| Lake Hāwea Esplanade Reserve | `wanaka/resized/full/lake-hawea-esplanade-reserve.webp` | not recorded | not recorded | none needed | Oct 2026 | `wanaka/credits.txt` | |
| Mount Iron Track | `wanaka/resized/full/mount-iron-track.webp` | Lake Wānaka Tourism (Brandkit) | not recorded | Lake Wanaka Tourism | Oct 2026 | `wanaka/credits.txt` | |
| National Transport and Toy Museum | `wanaka/resized/full/national-transport-and-toy-museum.webp` | Lake Wānaka Tourism (Brandkit) | not recorded | Lake Wanaka Tourism | Oct 2026 | `wanaka/credits.txt` | |
| Paddle Wānaka | `wanaka/resized/full/paddle-wanaka.webp` | not recorded | not recorded | none needed | Oct 2026 | `wanaka/credits.txt` | |
| Puzzling World | `wanaka/resized/full/puzzling-world.webp` | Lake Wānaka Tourism (Brandkit) | not recorded | Lake Wanaka Tourism | Oct 2026 | `wanaka/credits.txt` | |
| Rob Roy Glacier Track | `wanaka/resized/full/rob-roy-glacier-track.webp` | not recorded | not recorded | Bri Woolnough | Oct 2026 | `wanaka/credits.txt` | |
| Roys Peak Track | `wanaka/resized/full/roys-peak-track.webp` | not recorded | not recorded | none needed | Oct 2026 | `wanaka/credits.txt` | |
| That Wānaka Tree | `wanaka/resized/full/that-wanaka-tree.webp` | Wikimedia Commons | CC BY-SA 2.0 | Keerti Siag photography, CC BY-SA 2.0, resized | Oct 2026 | `wanaka/credits.txt` | |
| The Neck Lookout | `wanaka/resized/full/the-neck-lookout.webp` | not recorded | not recorded | Benn Jae | Oct 2026 | `wanaka/credits.txt` | |
| Bazil's Hostel & Surf School | `westport/resized/full/bazils-hostel-surf-school.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Stewart Nimmo | Oct 2026 | `westport/credits.txt` | |
| Cape Foulwind Walkway and Seal Colony | `westport/resized/full/cape-foulwind-walkway-seal-colony.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | BareKiwi | Oct 2026 | `westport/credits.txt` | |
| Charming Creek Walkway to Mangatini Falls | `westport/resized/full/charming-creek-walkway-mangatini-falls.webp` | not recorded | not recorded | none needed | Oct 2026 | `westport/credits.txt` | |
| Denniston Plateau and Brakehead | `westport/resized/full/denniston-plateau-brakehead.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Clint Trahan | Oct 2026 | `westport/credits.txt` | |
| Kawatiri Beach Reserve Freedom Camping | `westport/resized/full/kawatiri-beach-reserve-freedom-camping.webp` | not recorded | not recorded | none needed | Oct 2026 | `westport/credits.txt` | |
| Kawatiri Coastal Trail | `westport/resized/full/kawatiri-coastal-trail.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | BareKiwi | Oct 2026 | `westport/credits.txt` | |
| Kōhaihai Campsite | `westport/resized/full/kohaihai-campsite.webp` | not recorded | not recorded | none needed | Oct 2026 | `westport/credits.txt` | |
| Museum of Kawatiri (Pounamu Pathway) | `westport/resized/full/museum-of-kawatiri.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Clint Trahan | Oct 2026 | `westport/credits.txt` | |
| Ōpārara Arch | `westport/resized/full/oparara-arch.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Nimmo Photography | Oct 2026 | `westport/credits.txt` | |
| Scotts Beach Walk (Heaphy Track) | `westport/resized/full/scotts-beach-walk-heaphy-track.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Clint Trahan | Oct 2026 | `westport/credits.txt` | |
| Tauranga Bay Beach | `westport/resized/full/tauranga-bay-beach.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | BareKiwi | Oct 2026 | `westport/credits.txt` | |
| The Wild Pie Co | `westport/resized/full/wild-pie-co-westport.webp` | West Coast (CrowdRiff) | West Coast CrowdRiff, credit named in the file | Clint Trahan | Oct 2026 | `westport/credits.txt` | |
| Underworld Adventures | `westport/resized/full/underworld-adventures-charleston.webp` | not recorded | not recorded | none needed | Oct 2026 | `westport/credits.txt` | |
