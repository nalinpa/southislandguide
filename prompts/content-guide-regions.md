# Content: Guide sections for the other nine regions

Launch content. The owner wants the guide's regions in for the whole-island launch (2026-10-20).

## What exists

The guide is static, in-bundle content in `lib/guideContent.ts`. It works offline, and corrections ship with `eas update`, no store review.

- **13 island-wide sections** (driving, weather, sun/sandflies/water, booking ahead, getting there, Ngāi Tahu and custom, money, emergencies…). Done.
- **Region sections**, five per region, in fixed slots so they stay predictable to write and to read. **Only Canterbury has them** (lines 246–331). The guide screen shows a region's tab once that region has sections (`REGIONS_WITH_CONTENT`), so today the only tabs are "South Island" and "Canterbury & Christchurch".

The other nine regions, from `REGIONS` (`lib/guideContent.ts:19-30`):

| id | Label |
|---|---|
| `kaikoura` | Kaikōura |
| `marlborough` | Marlborough |
| `nelson-tasman` | Nelson & Tasman |
| `west-coast` | West Coast |
| `aoraki-mackenzie` | Aoraki & Mackenzie |
| `queenstown-wanaka` | Queenstown & Wānaka |
| `fiordland` | Fiordland |
| `dunedin-otago` | Dunedin & Otago Coast |
| `southland-catlins` | Southland & the Catlins |

## The five slots

Copy Canterbury's pattern exactly: slug, title, icon, colour, region. The icons are already imported.

| Slot | slug | title | icon | color |
|---|---|---|---|---|
| Why come | `<id>-why` | `Why Come to <Label>` | `Compass` | `#14607A` |
| Getting around | `<id>-getting-around` | `Getting Around <Label>` | `Car` | `#2466D6` |
| When to come | `<id>-when` | `When to Come` | `CloudSun` | `#2E6B4F` |
| Hazards | `<id>-hazards` | `Local Hazards & Rules` | `ShieldAlert` | `#8F6310` |
| Book ahead | `<id>-book-ahead` | `Book Ahead in <Label>` | `MapPin` | `#095C65` |

Where a label reads badly in a title, use the plain place name ("Why Come to Fiordland", "Getting Around the West Coast", "Book Ahead in Queenstown & Wānaka"). Say which you chose in the draft.

## House style

From the comment at `lib/guideContent.ts:49-63`, and the Canterbury sections as the worked example. Read all five Canterbury bodies before writing anything.

- Plain prose. No marketing voice: no "breathtaking", "hidden gem", "must-see", "nestled".
- **Lead with what actually catches a visitor out.** Canterbury's "Why" opens by saying the plains are a dull drive; "When to Come" opens with the wind people don't expect.
- Two to five short paragraphs, **about 200–460 words** per section (the existing 18 run 206–461).
- New Zealand English: metres, kilometres, colour, centre. Māori place names with macrons (Wānaka, Kaikōura, Aoraki, Ōtautahi). Use dual names where they are official.
- **No markdown.** No bullets, bold, links or lists: the screen renders plain paragraphs.
- **The heading rule:** the screen splits the body on blank lines, and a paragraph that doesn't end in `.`, `!` or `?` is drawn as a **subheading** (`app/(app)/(tabs)/guide/[slug].tsx:59-62`). So every real paragraph must end in sentence punctuation, and a subheading is a short line with none ("Fire", "Rivers", "The earthquakes"). Use subheadings only where a section really has parts, as Canterbury's hazards section does.
- **Don't repeat the island-wide sections.** Driving rules, sandflies, sun, general weather, money, emergencies and Ngāi Tahu custom are already covered island-wide. A region section says only what's different or specific here: a particular road, pass, river, crossing, closure pattern, local rule or booking crunch.
- Name real things a visitor will meet (roads by number, passes, tracks, ferries, operators' booking windows) rather than generalising.

## Accuracy

These are safety and planning facts that people will act on.

- **Every fact comes from a current official or primary source.** For example: DOC (tracks, huts, Great Walk bookings, closures), NZTA Waka Kotahi (road status, SH closures, chains), MetService and NIWA (climate), regional councils and LAWA (swimming), Fire and Emergency (fire seasons), NEMA (tsunami and earthquakes), operators' own sites (seasons and booking), i-SITEs.
- **Don't invent** numbers, opening dates, distances or prices. If a fact can't be confirmed, leave it out or write around it.
- Prefer facts that don't go stale: "book months ahead for summer" rather than a specific date or price.
- At the end of each region's draft, list **Facts to double-check**: every number, date, rule and claim that the owner should verify, each with its source URL. The Canterbury round's list was never pasted back (TASKS.md, "Guide section bodies"); don't let that happen again.

## How to work: one region per round

The owner reviews each region before it goes into code.

1. **Draft** the region's five sections in `docs/guide/<id>.md`: one `##` heading per section (its title), then its body exactly as it will ship, then the "Facts to double-check" list with sources. The markdown file is the drafting document; the app never reads it.
2. **Stop.** Show the owner the draft and the facts list, and wait for their go or their edits.
3. **On go,** transcribe the five sections into `lib/guideContent.ts` as one block after the previous region's block, with a `// ---- <id>` divider like Canterbury's. Bodies are template literals, so watch for backticks and `${` in the text.
4. Run `npx tsc --noEmit` and `npm test`, then move to the next region.

**Order:** by how many visitors each region gets, so the most-used land first: `queenstown-wanaka`, `fiordland`, `west-coast`, `aoraki-mackenzie`, `nelson-tasman`, `dunedin-otago`, `marlborough`, `kaikoura`, `southland-catlins`. Keep the blocks in `lib/guideContent.ts` in `REGIONS` order regardless of the order they're written in: the tab strip follows `REGIONS`, and the file is easier to read that way.

## A check that the data stays well-formed

Before the first region's transcription, add `lib/__tests__/guideContent.test.ts`. It needs only three checks, which run over every region that has sections:

1. A region has exactly the five slots: slugs `<id>-why`, `<id>-getting-around`, `<id>-when`, `<id>-hazards`, `<id>-book-ahead`, in that order.
2. All slugs across `GUIDE_CATEGORIES` are unique (the route is a flat `/guide/[slug]`).
3. A body's subheadings (paragraphs with no sentence-ending punctuation) are short, under 40 characters. This catches a real paragraph that lost its full stop and would render as a giant heading.

Canterbury must pass it as it stands.

## Not in scope

- Tying places to guide regions. The places' `region` values don't match the guide's `REGIONS` ids exactly (the places use `otago`, and have no `kaikoura` or `aoraki-mackenzie`), and nothing links the two today.
- Changes to the guide screens.

## Validation, per region

- `npx tsc --noEmit`: no type errors.
- `npm test`: all tests pass, including the new data check.
- Device (once, after the first region): the guide shows the new region's tab, all five sections open, and the subheadings render in the highlight colour.
