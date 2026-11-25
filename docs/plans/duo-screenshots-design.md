# Duo screenshots on GitHub's free Mac: design

2026-11-24, updated 2026-11-25. Status: owner picked the app source (C, the pasted link) and the sign-in way (S1, a test account) on 2026-11-25. Next: the build plan. Nothing is built until the owner says go.

## Why

The owner has no Mac. The only way to see Kiwi Guide on the iPhone Duo today is EAS Simulator, which works but costs about $0.10 a minute and has to be driven by hand. The owner wants a cheap, repeatable way to see how every screen and pop-up looks on the Duo: folded, open upright and open sideways.

Nine throwaway runs on the `duo-spike` branch (2026-11-23 and 24, results page https://claude.ai/artifact/MYKBnJRVLoKV7HTK81BV5y) proved the approach works on GitHub's free Mac. This doc turns the spike into a job the owner can run whenever they like.

Success: the owner presses Run on a branch, and about half an hour later downloads one page showing every screen and pop-up in all three Duo positions, with any misses named. No Mac, no per-minute bill, no babysitting.

## Goals

- One manual run produces screenshots of every listed screen, folded, open upright (669 × 951 pt) and open sideways (951 × 669 pt).
- Pop-ups from the Duo build plan (`docs/plans/duo-build.md`, Task 2 and Task 12), opened and closed in both open positions.
- The screenshots show the JS last published to the `simulator` channel, and the page says which update that was, so a stale run is plain to see.
- One page to look at: the screenshots in a grid, screens down the side and positions across the top.
- A miss (a button not found, a pop-up that didn't close) is named on that page and turns the run red. It never stops the other screenshots.
- Adding a screen or pop-up is one line in one file.

## Non-goals

- Judging the looks. No pixel comparison, no saved baselines, no pass/fail on how a screen looks. The owner looks at the page.
- iPad, Android, web. The app is iOS only and has no web build. iPad could reuse the same job later (the runner has iPad simulators). Not now.
- Running on every push or pull request. Manual only.
- Gestures beyond taps (drag to reorder, map pinch), offline map downloads, and real Apple or Google sign-in.

## Anti-goals (a failure even if it works)

- Anything that touches the `production` channel, a store build or a real user's data.
- Taps by position that might hit the app when a prompt isn't there. Run 8 tapped the place page's Review button this way. Every tap is by testID or accessibility name.
- A run that needs someone to watch it, re-run it, or fix it by hand most times.
- A monthly bill. It must stay on GitHub's free standard Mac (`runs-on: xcode-27`, free on a public repo; the `-xlarge` runner is billed).

## Constraints (from the spike and the project)

- **Runner:** `xcode-27` (Xcode 27.1). The `iPhone Duo` simulator is on iOS 27.1 and 27.2; pick 27.1. It boots folded, with the inner screen off. GitHub's Free plan allows 5 Mac jobs at once and 6 hours per job.
- **Folding and turning:** `simctl` can't fold. duoctl (skarol/duoctl v0.2.1, MIT) does: `duoctl open|close`, `rotate portrait` (669 × 951, the app's "upright"), `rotate landscape` (951 × 669, "sideways"), and `tap --id` / `tap --label`, which need AXe. duoctl is shell and Python scripts plus a small helper it compiles on first use. It uses private Apple interfaces inside the simulator.
- **Screenshots:** `xcrun simctl io <udid> screenshot --display=1` gives the outer (folded) screen, `--display=3` the inner screen.
- **Maestro can't be used.** On the open Duo it sees an empty screen tree, takes black screenshots, and its taps miss.
- **Links:** `xcrun simctl openurl <udid> southislandguide://<route>` opens any route. iOS asks "Open in 'Kiwi Guide'?" on the first link only, then remembers. Tap "Open" by name, and only if it's there.
- **Prompts:**
  - Location: grant it before launch with `simctl privacy grant location` and `location-always`.
  - App Store review: the app asks on its 5th start (`app/_layout.tsx:59`). AXe can't see that prompt. The fix is to launch once, terminate, set `southislandguide:appOpenCount` to `"10"` in AsyncStorage's `manifest.json` under the app's data container, then relaunch. Folding, turning and links don't count as starts (run 8).
- **Speed (run 9):** ready to launch the app in under 6 minutes, with the boot running while the tools install. The first `duoctl open` took 4.5 minutes, cause not measured. Links took 7 to 40 s each, pop-ups about 20 s each.
- **Tools pinned by checksum:**
  - duoctl: `https://github.com/skarol/duoctl/archive/refs/tags/v0.2.1.tar.gz`, sha256 `32332f5ae653e857e94c845c71a29d6a8056c550cf4f839a51830d0330026f77`, scripts in `skills/duoctl/scripts`.
  - AXe: `https://github.com/cameroncooke/AXe/releases/download/v2.1.1/AXe-macOS-v2.1.1-universal.tar.gz`, sha256 `8788838b1b32059d143cf06541b72fcaead85c16274457cdbff086510a5b17fa`, `axe` at the root.
  - duoctl finds `axe` on `PATH`. No Homebrew needed.
- **Public repo:**
  - Anyone signed in to GitHub can download a run's screenshots.
  - Only the owner can start a manual run; forks can't start it, so the secrets stay safe.
  - Secrets go to the step that needs them, never the whole job. The job has `permissions: contents: read`.
- **App updates:** the app uses a fingerprint runtime (`app.config.ts:18`). An update only reaches a build with the same native code. expo-updates downloads at a cold start and applies at the next cold start; the job's launch, terminate, relaunch already gives it that second start.
- **Existing secrets:** `DUO_APP_URL` is the spike's link to the EAS simulator build (`simulator` profile, channel `simulator`). The job keeps using it. The job doesn't need `NPM_GITHUB_TOKEN` or an `EXPO_TOKEN`: it installs nothing from npm and never calls EAS.
- **Firebase sign-in:** the app keeps its sign-in in AsyncStorage through `getReactNativePersistence` (`lib/firebase.ts:21-22`). The Firebase web API key comes from the app's own config (`expoConfig.extra.firebase`, `lib/firebase.ts:8`), which is inside the installed app. It's a public key, not a secret.
- **Fingerprint safety:** don't touch the root `.gitignore` (it's part of the fingerprint). Keep the job's files under `.github/`.
- **Manual runs need the workflow on `main`:** GitHub only offers Run for workflows on the default branch. A run on another branch then uses that branch's copy of the file.
- **Data and quotas:**
  - Firestore's free plan allows 50k reads a day. A guest run reads little: the places list comes from the cached API.
  - Sentry is on in the simulator build (production environment), so crashes in a run get reported.
  - Each run installs the app fresh, so EAS Update counts it as one more user.

## Approaches

### Where the screenshots come from (decided earlier)

| | What | Trade-off |
|---|---|---|
| **Picked** | GitHub's free Mac running the real Duo simulator | Free and automatic. Proven by the spike. About 20 minutes a run. |
| | EAS Simulator | Works today. About $0.10 a minute, and driven by hand. This is what's being replaced. |
| | Streamed Macs (VibeView, Appetize, MacRun) | Hand-driven, and paid beyond small free tiers. Fine for a quick live look, no good for a full set. |
| | Imitating the Duo on Windows | The app has no web build, and it wouldn't be the real thing. Ruled out. |

### Where the app comes from (owner picked C, 2026-11-25)

| | What | Trade-off |
|---|---|---|
| A | Keep the EAS simulator build (`simulator` profile, channel `simulator`). Each run publishes the branch's JS as an update to the `simulator` channel, then installs the newest simulator build with the same fingerprint. | About 3 extra minutes a run. Always the branch's JS. Needs a new `EXPO_TOKEN` secret. When native code changes, the owner runs `eas build --profile simulator --platform ios` once, and the job says so when that's needed. The `simulator` channel only reaches simulator builds, so production is never touched. |
| B | Build the app on the runner with `expo prebuild` and `xcodebuild` | Exact branch, native code included, no EAS. Adds about 20 to 30 minutes and pods. Needs the production environment's values on the runner. More things to break. |
| **C (picked)** | Keep the spike's way: the owner pastes a build link and publishes updates by hand | No new secret, no EAS calls from GitHub. Before a run with new JS, someone publishes an update by hand, and the JS can be stale if they forget. The page names the running update to catch that. |

### Signed-in pop-ups (owner picked S1, 2026-11-25)

Add to Trip, picking a trip, writing a review, new trip, editing a stop, notes, delete trip and delete account all need a signed-in user. A guest only gets "Sign in to plan your trip".

| | What | Trade-off |
|---|---|---|
| **S1 (picked)** | A test account (email and password as two secrets). The job signs in through Firebase's sign-in web API, writes the session into the app's AsyncStorage (where `lib/firebase.ts:21` keeps it), then relaunches. The account already holds one trip with a few stops, a note and a review-able place. | No typing on the simulator. Unproven: the stored session's format. Prove it with a first task before the rest. The account must hold nothing personal: anyone signed in to GitHub can see the screenshots. The job opens and cancels and never saves, so the account doesn't change. |
| S2 | Type into the login form (`axe type`) | Simple on paper. AXe's typing on the open Duo is unproven, and duoctl has no typing. |
| S3 | A simulator-only "screens" link in the app that shows each pop-up with sample data | No account. Can show empty and error states too. It's app code that ships in the binary (switched on only for the `simulator` channel), and it needs upkeep. |
| S0 | Guest pop-ups only for now | No account work. Leaves half the Duo build plan's pop-ups unseen. |

## The design

### Running it

Before a run (by hand, on Windows, by the owner or me):

- **New JS:** publish it to the simulator channel. The message names the branch and commit, so the page can show it:
  ```
  eas update --channel simulator --platform ios --environment production --message "duo <branch> <short sha>"
  ```
- **New native code** (the fingerprint changed): build a new simulator app and paste its link into the secret:
  ```
  eas build --profile simulator --platform ios
  gh secret set DUO_APP_URL
  ```
  An update only reaches a build with the same fingerprint. If they don't match, the app runs the JS built into it, and the page says so in red.

Then:

- The owner runs **Duo screens** from the Actions tab and picks a branch, or I run `gh workflow run duo-screens.yml --ref <branch>`. The branch only picks the shot list; the app's JS comes from the update.
- It takes about 30 minutes (two passes: guest, then signed in). When it's done, the run has one download, `duo-screens-<short sha>.zip`. Inside is `index.html` plus the PNGs. Its summary on GitHub gives the counts, the running update and any misses.

### Steps

1. **Checkout:** the branch, for the shot list and the page script only. No `npm ci`.
2. **Boot:** pick the iPhone Duo (iOS 27.1) and start it booting. While it boots, download duoctl and AXe (pinned and checksum-checked) and the app from `DUO_APP_URL`.
3. **Install:** install the app and grant location.
4. **First launch:**
   - launch, then wait until the update has downloaded (or time out: then the run goes on with the built-in JS and says so)
   - terminate, set the open count to 10, and write the test account's session
   - relaunch, and record which update is now running and its message
5. **Shots:** work through the shot list:
   - folded screens on display 1
   - `duoctl open`, `rotate portrait`, then the upright screens and pop-ups
   - `rotate landscape`, then the sideways screens and pop-ups
6. **Gallery:** build `index.html`, write the summary, upload the zip (kept 14 days), and fail the run if anything was missed.

### The test account (owner's setup, once)

- A new email and password account in the app, with a throwaway address. No name, photo or anything personal on it.
- Signed in on the owner's phone once to set it up: one trip with three or four stops and a note, and one saved place. Then signed out.
- Two repo secrets: `DUO_TEST_EMAIL` and `DUO_TEST_PASSWORD`.
- The job signs in through Firebase's sign-in web API with these, using the API key from the installed app, and writes the session into AsyncStorage before the relaunch. Nothing is typed on the simulator.
- The job only opens and cancels. It never taps Save, Add, Delete or Confirm, so the account stays as set up. Delete trip and delete account are shot last (my call), and if a pop-up doesn't close, the job skips the rest of the signed-in pop-ups for that position rather than tap on.

### The shot list

One plain file, `.github/duo/shots.sh`, using five helpers proven in the spike:

- `go <route> <name>`: open a link, tap "Open" by name only if it's showing, then take the screenshot.
- `tap_id <testID> <name>`, `tap_label <label> <name>`: open a pop-up.
- `dismiss`: close by Close or Cancel, and nothing else. Never Done: in some pop-ups it saves.
- `count`: read the app's open count.

Every helper records a miss instead of stopping. First list (the builder fills in ids):

| Screen | Folded | Upright | Sideways |
|---|---|---|---|
| Explore (`sites`) | ✓ | ✓ | ✓ |
| Place page (`sites/<id>`) | ✓ | ✓ | ✓ |
| Place reviews (`sites/<id>/reviews`) | ✓ | ✓ | ✓ |
| Guide (`guide`), an article (`guide/<slug>`) | ✓ | ✓ | ✓ |
| Map (`map`) | ✓ | ✓ | ✓ |
| Trips (`itinerary`), a trip (`itinerary/<id>`, S1) | ✓ | ✓ | ✓ |
| Profile (`account`), Saved (`saved-sites`, S1), Photo credits | ✓ | ✓ | ✓ |
| Sign-in (`login`, guest) | ✓ | ✓ | ✓ |
| **Pop-ups, guest:** town picker, category picker, region picker, a sign-in alert | | ✓ | ✓ |
| **Pop-ups, S1:** Add to Trip, review, new trip, edit stop, note, delete trip, delete account | | ✓ | ✓ |

Left out (2026-11-25): trip choice (TripChoiceSheet isn't used in the app), the offline map card (it's a card on Profile, so the Profile shot shows it) and the premium pop-up (it only shows with a paid unlock, and launch has none).

Pop-ups aren't shot folded (my call): folded, the Duo is a normal iPhone, and those layouts are checked on phones already. Each pop-up needs a testID or a unique accessibility name on its opener and a Close or Cancel to close it. Where one is missing, the builder adds a testID: a test-only prop, no visible change. If the sign-in fails, the run still shoots every guest screen and pop-up, marks the signed-in rows missed and says why.

### The page

```
Duo screens · shot list trip-builder @ 0c2f73a · app update "duo trip-builder 0c2f73a" (3f2a…) · 24 Nov 08:42 · 2 missed
                   Folded        Open upright     Open sideways
Explore            [shot]        [shot]           [shot]
Place page         [shot]        [shot]           [shot]
…
Pop-ups
Town picker          —           [shot]           [shot]
Add to Trip          —           [shot]           missed: no element place-add
```

- One self-contained `index.html` that opens from the unzipped folder.
- Click a shot for full size. A missed shot shows the reason from the report.
- The header shows the shot list's branch and commit, the running update's id and publish time (or "built-in JS, no update" in red), and the run time.

### Security

- `permissions: contents: read`, and no `GITHUB_TOKEN` in any step.
- `DUO_APP_URL` and the two test account secrets each go only to the step that uses them. The session token is never printed or saved in the zip.
- Manual trigger only. Third-party tools pinned by URL and sha256.
- The test account holds no personal data. The page shows nothing that's private to the owner.

## Decided

- By the owner:
  - GitHub Actions on the public repo; public screenshots are fine.
  - Start with the Duo build plan's pop-ups.
  - Get past the review prompt rather than answer it. Seeding the count does that without touching the app.
  - iOS only; no web build.
  - The app comes from the pasted build link, with updates published by hand (C, 2026-11-25).
  - Signed-in pop-ups through a test account (S1, 2026-11-25).
- Proven by the spike (runs 1 to 9): everything in Constraints above.
- My calls, open to change:
  - manual trigger only
  - the page goes in the zip (no GitHub Pages)
  - pop-ups not shot folded
  - 14-day retention
  - the run fails at the end on any miss
  - files under `.github/duo/`
  - the workflow is named `duo-screens.yml`
  - delete trip and delete account shot last; a pop-up that won't close ends the signed-in pop-ups for that position
  - `DUO_APP_URL` stays a secret, not a run input, so the build link isn't in the public logs

## Left to the builder

- The place id, guide slug and trip id for the links, and the testIDs or names for openers that don't have one yet.
- How to tell that the update has downloaded and is the one running. For example, read expo-updates' store in the data container, or check the update id after relaunch.
- The exact stored-session record (Firebase's AsyncStorage key and value), and whether it's big enough that AsyncStorage keeps it in its own file rather than in `manifest.json`. Prove this first, before the rest of the signed-in work.
- Where the API key sits in the installed app's config, and reading it there.
- Timing the first `duoctl` call and starting it early: for example, `duoctl state` right after boot, while the app installs.
- The page's markup and the summary's wording.
- Removing the spike: delete the `duo-spike` branch once the job runs. `DUO_APP_URL` stays.
