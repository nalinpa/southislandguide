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

Re-uploading a place file with `scripts/upload-places.js` replaces the whole place, including the photo and credit added in the admin panel. Don't re-upload a place that has a photo unless the file has its photo fields too.

## The libraries

| Library | Licence used | Allows | Must | Not allowed |
|---|---|---|---|---|
| Tourism New Zealand (Brandkit) | Paid Activity License | Paid and unpaid media, worldwide | Promote New Zealand as a visitor destination; credit the photographer where the photo's page names one | Other licence types in the same library (unpaid only, editorial, trade); Tourism NZ's logos and trade marks; a paid app without asking first |
| Great South, Southland (Brandkit) | Worldwide Public Use - All Uses | Commercial or non-commercial use, worldwide | Promote the Southland region (Invercargill, Bluff, Riverton, Tuatapere, Gore, Fiordland, Stewart Island, the Southland side of the Catlins); credit the photographer | Otago places, such as Nugget Point, Purakaunui Falls and Owaka; bulk downloads; changes beyond what the licence allows (ask before relying on resizing and cropping) |

Either library can ask for a photo to stop being used. A place photo comes out in the admin panel, with no app update; a town photo needs an update.

## Photos

| Place (or town) | File | Library | Licence | Credit | Released / downloaded | Licence copy | Written OKs |
|---|---|---|---|---|---|---|---|
| | | | | | | | |
