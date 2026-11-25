# Duo Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A manual GitHub Actions job, `duo-screens.yml`, that installs the pasted simulator build on the iPhone Duo simulator, signs in a test account, and produces one zip with a page of screenshots of every listed screen and pop-up: folded, open upright and open sideways. Misses are named on the page.

**Architecture:** The spike workflow (branch `duo-spike`, `.github/workflows/duo-spike.yml`, run 9) becomes:
- one workflow file
- four files under `.github/duo/`:
  - `appstate.py`: reads and writes the app's storage. It seeds the open count, writes the test account's session and reports the running update.
  - `helpers.sh`: the spike's helpers, now recording each shot or miss in `results.tsv`.
  - `shots.sh`: the shot list.
  - `page.py`: builds `index.html` and the run summary from `results.tsv`.

The job runs two passes. The guest pass covers all three positions and the guest pop-ups. Then it writes the session, relaunches and runs the signed-in pass.

**Tech Stack:**
- GitHub Actions `runs-on: xcode-27`
- `xcrun simctl`
- duoctl v0.2.1 and AXe v2.1.1 (pinned tarballs)
- bash
- Python 3 stdlib only (unittest for tests)

**Spec:** [docs/plans/duo-screenshots-design.md](duo-screenshots-design.md). The spike workflow is at `C:\Users\User\AppData\Local\Temp\claude\6d13d82554ef9caf\3d69b356-dd1f-4abd-9e94-0bcab0206413\scratchpad\duo-spike\.github\workflows\duo-spike.yml`, and also on `origin/duo-spike`.

## Global Constraints

**Where the work happens**
- Work on branch `duo-screens`, made from `main`, in a worktree: `git worktree add <scratchpad>/duo-screens -b duo-screens main`.
  - Never push `trip-builder`: it holds unpushed work.
  - `<scratchpad>` is `C:\Users\User\AppData\Local\Temp\claude\6d13d82554ef9caf\3d69b356-dd1f-4abd-9e94-0bcab0206413\scratchpad`.
- Every push, and every run on GitHub, waits for the owner's go. Commits are local until then. Each task that runs on GitHub ends at a checkpoint: show the result, then stop.

**Runner and tools**
- `runs-on: xcode-27`, `timeout-minutes: 60`, `permissions: contents: read`.
- Pick the `iPhone Duo` on iOS 27.1, with the spike's picker.
- duoctl: `https://github.com/skarol/duoctl/archive/refs/tags/v0.2.1.tar.gz`, sha256 `32332f5ae653e857e94c845c71a29d6a8056c550cf4f839a51830d0330026f77`. Scripts are in `skills/duoctl/scripts`.
- AXe: `https://github.com/cameroncooke/AXe/releases/download/v2.1.1/AXe-macOS-v2.1.1-universal.tar.gz`, sha256 `8788838b1b32059d143cf06541b72fcaead85c16274457cdbff086510a5b17fa`. `axe` is at the root.
- Install both exactly as the spike's step "Install duoctl and AXe". No Homebrew, no Maestro.
- Python is stdlib only, run as `python3 -I`.

**The app**
- `APP_ID=app.blacksands.southislandguide`. Links are `southislandguide://<route>`.
- Screenshots: `xcrun simctl io "$UDID" screenshot --display=1` when folded, `--display=3` when open.
- Positions: `folded` is `duoctl close`. `upright` is `duoctl open` then `duoctl rotate portrait`. `sideways` is `duoctl open` then `duoctl rotate landscape`.

**Taps**
- Taps go by testID (`duoctl tap --id`) or accessibility name (`duoctl tap --label`), never by position.
- `dismiss` taps only `Close` or `Cancel`, in that order. Never `Done`, `Save`, `Add`, `Delete` or `Confirm`.
- "Open in 'Kiwi Guide'?" is tapped by the name `Open`, only if it's showing.

**Secrets**
- Secrets: `DUO_APP_URL`, `DUO_TEST_EMAIL`, `DUO_TEST_PASSWORD`. Each one is in the `env:` of only the step that uses it.
- Never `set -x`. Never echo a secret or a token.
- Tokens are masked with `::add-mask::` before anything else prints.
- The session command's output goes straight to the log, never through `tee`, a variable or a file under `shots/`, because `shots/` is uploaded.

**Storage facts** (read from `node_modules`; Task 2 checks them on the runner)
- AsyncStorage folder: `<data>/Library/Application Support/app.blacksands.southislandguide/RCTAsyncLocalStorage_V1/`, holding `manifest.json`.
  - A value of 1024 characters or fewer sits inline in the manifest.
  - A longer value goes in a file in that folder. The file is named with the lowercase hex MD5 of the key's UTF-8, and the manifest holds `null` for that key.
- Open count: key `southislandguide:appOpenCount`, seeded to the string `"10"`.
- Firebase session:
  - Key: `firebase:authUser:<apiKey>:[DEFAULT]`.
  - Value: JSON with `uid` (string), `email`, `emailVerified` (bool), `isAnonymous` (bool), `providerData`, `stsTokenManager` {`refreshToken`, `accessToken`, `expirationTime` (number, ms)}, `apiKey` and `appName` `"[DEFAULT]"`.
  - Source: `@firebase/auth` `UserImpl._fromJSON` and `StsTokenManager.fromJSON`.
- The API key is `extra.firebase.apiKey` in the installed app's Expo config.

**Things not to change**
- `.gitignore` (root), `package.json`, `app.config.ts`, `eas.json`: they're in the fingerprint.
- After any app change, check the iOS runtime is unchanged. In PowerShell (`npx` is missing in Git Bash): `npx expo-updates runtimeversion:resolve --platform ios`, before and after.

**Output**
- Artifact `duo-screens-<short sha>`, the whole `shots/` folder, `retention-days: 14`.
- Shot files are named `shots/<position>-<name>.png`.

**The test account**
- Trip name: `Duo test`.
- The job never saves anything on it.

## Review Focus

- **Token in public logs:** the job's logs are public. The session step must mask both tokens before printing anything, and must never print the response or the record. *Test: `test_session_masks_tokens` (Task 1).*
- **The update didn't reach the build** (runtime mismatch, or no update published): the run carries on with the built-in JS, and the page says so in red. *Tests: `test_running_update_embedded` (Task 1), `test_header_built_in_js` (Task 3).*
- **Sign-in fails** (wrong password, network): the guest pass is already done. Every signed-in row shows as missed with the reason, and the run goes red. *Tests: `test_session_bad_password` (Task 1), `signed pass without sign-in` (Task 3 helpers test).*
- **A pop-up won't close:** the rest of that position's signed-in pop-ups are marked `skipped: <name> didn't close`, not tapped. *Test: `popups stop after a failed close` (Task 3 helpers test).*
- **No storage yet** (the first launch quit before AsyncStorage wrote anything): `set_item` creates the folder and the manifest. *Test: `test_missing_manifest_created` (Task 1).*

---

### Task 0: Owner setup (owner, before Task 2)

Nothing to build. The owner does these steps and tells me when they're done:

- [ ] Make a new email and password account in the app with a throwaway address. No name or photo on it.
- [ ] Signed in as that account on the phone, set it up:
  - one trip named `Duo test` with three or four stops and a note
  - one saved place: a Queenstown place with photos and at least one review
- [ ] Sign out.
- [ ] Tell me the saved place's name. Task 4 needs its id. I find the id, or the owner reads it from the Firebase console's `sites` collection.
- [ ] Set the secrets. `gh` prompts for each value, so it never goes in the chat or the shell history:
  ```
  gh secret set DUO_TEST_EMAIL
  gh secret set DUO_TEST_PASSWORD
  ```
- [ ] Publish current JS to the simulator channel. The owner or I run this from the main folder, whatever branch it's on:
  ```
  eas update --channel simulator --platform ios --environment production --message "duo <branch> <short sha>"
  ```
  Note the printed runtime and the iOS update ID. Task 2 compares them with the build's.

### Task 1: `appstate.py`: the open count, the session and the running update

**Files:**
- Create: `.github/duo/appstate.py`
- Test: `.github/duo/test_appstate.py`

**Interfaces:**
- Produces, in `appstate.py`:
  - `BUNDLE_ID = "app.blacksands.southislandguide"`, `COUNT_KEY = "southislandguide:appOpenCount"`
  - `storage_dir(data: Path) -> Path`
  - `get_item(folder: Path, key: str) -> str | None`
  - `set_item(folder: Path, key: str, value: str) -> None`
  - `auth_key(api_key: str) -> str`
  - `api_key(app: Path) -> str`: reads `app/EXConstants.bundle/app.config` (JSON) and returns `extra.firebase.apiKey`
  - `sign_in(api_key: str, email: str, password: str) -> dict`:
    - POSTs to `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=<api_key>` with `{"email", "password", "returnSecureToken": true}` using `urllib.request`
    - raises `SignInError(message)` with Firebase's `error.message` (for example `INVALID_LOGIN_CREDENTIALS`), or the network error text
  - `user_record(resp: dict, api_key: str, now_ms: int) -> dict`
  - `running_update(data: Path, app: Path) -> dict`, returning `{"build_runtime", "update_id", "update_time", "embedded"}`:
    - `build_runtime`: `EXUpdatesRuntimeVersion` from `app/Expo.plist`, read with `plistlib`
    - embedded id: `app/EXUpdates.bundle/app.manifest` → `id`
    - DB: newest file matching `data/Library/Application Support/.expo-internal/expo-v*.db`. The running row is the one in table `updates` with the highest `last_accessed`.
    - `update_id`: that row's 16-byte `id` blob, as a lowercase dashed UUID
    - `update_time`: its `commit_time` (ms), as ISO UTC
    - `embedded`: true when the running id equals the embedded id, or when the DB is missing
  - CLI, `python3 -I appstate.py <command> ...`:
    - `count <data> [value]` prints `open count: <old>` or `open count: <old> -> <value>`.
    - `session <data> <app> <status file>` reads `DUO_TEST_EMAIL` and `DUO_TEST_PASSWORD` from the environment.
      - First it prints `::add-mask::<idToken>` and `::add-mask::<refreshToken>`.
      - Then it writes the record, prints `signed in: <first 6 chars of uid>…` and writes `ok` to the status file.
      - On `SignInError` it prints `sign-in failed: <message>`, writes the same line to the status file, and exits 1. Missing env values count as `SignInError("no test account secrets")`.
    - `update <data> <app> [--wait SECONDS]` prints `running_update` as one JSON line. With `--wait`, it polls every 3 s until a row other than the embedded one exists, or the time runs out.

- [ ] **Step 1: Make the worktree.** `git worktree add <scratchpad>/duo-screens -b duo-screens main`. All later tasks work there.

- [ ] **Step 2: Write the failing tests** in `test_appstate.py`. Use `unittest`, temp folders, and `unittest.mock.patch` on `appstate.sign_in`.
  - `test_small_value_inlined`: `set_item(f, "k", "v")` → manifest is `{"k": "v"}`, and there's no other file in `f`.
  - `test_big_value_in_md5_file`: a value of 1025 chars → manifest `{"k": None}`. The file `hashlib.md5(b"k").hexdigest()` holds the value. `get_item(f, "k")` returns it.
  - `test_big_then_small_removes_file`: big then `"v"` → manifest `{"k": "v"}`, and the MD5 file is gone.
  - `test_missing_manifest_created`: on an empty data folder, `set_item(storage_dir(data), COUNT_KEY, "10")` creates the folders, and `manifest.json` is `{COUNT_KEY: "10"}`.
  - `test_keeps_other_keys`: a manifest with `{COUNT_KEY: "11"}`, then setting the session key → both keys are present.
  - `test_auth_key`: `auth_key("AIza")` is `"firebase:authUser:AIza:[DEFAULT]"`.
  - `test_user_record_fields`:
    - input: `resp = {"localId": "u1", "email": "a@b.c", "idToken": "tok-id-123", "refreshToken": "tok-refresh-456", "expiresIn": "3600"}`, `now_ms = 1000`
    - output: `uid == "u1"`, `email == "a@b.c"`, `emailVerified is False`, `isAnonymous is False`, `providerData == [{"providerId": "password", "uid": "a@b.c", "displayName": None, "email": "a@b.c", "phoneNumber": None, "photoURL": None}]`, `stsTokenManager == {"refreshToken": "tok-refresh-456", "accessToken": "tok-id-123", "expirationTime": 3601000}`, `apiKey == "AIza"`, `appName == "[DEFAULT]"`
  - `test_session_masks_tokens`:
    - setup: `main(["session", data, app, status])` with `sign_in` patched to return the resp above, the env set, and a fake app holding `EXConstants.bundle/app.config`
    - the first two output lines are `::add-mask::tok-id-123` and `::add-mask::tok-refresh-456`
    - neither token appears on any other line
    - the session key's value in storage parses to the record
    - the status file holds `ok`, and no token
  - `test_session_bad_password`: `sign_in` raises `SignInError("INVALID_LOGIN_CREDENTIALS")` → exit code 1, output `sign-in failed: INVALID_LOGIN_CREDENTIALS`, the status file holds the same line, and no session key is written.
  - `test_session_no_secrets`: env values unset → exit code 1, and the status file holds `sign-in failed: no test account secrets`.
  - `test_running_update_embedded`:
    - setup: a fake app with `app.manifest` id `aaaaaaaa-0000-0000-0000-000000000001`, `Expo.plist` runtime `rt1`, and a sqlite DB built in the test (`CREATE TABLE updates (id BLOB, commit_time INTEGER, last_accessed INTEGER, runtime_version TEXT, status INTEGER)`) with one row holding that id
    - result: `embedded is True`, `build_runtime == "rt1"`
  - `test_running_update_newer`: add a second row with a later `last_accessed` → its id, its ISO time, and `embedded is False`.
  - `test_running_update_no_db`: no `.expo-internal` → `embedded is True`, `update_id is None`.

- [ ] **Step 3: Run them and see them fail.**
  Run: `python -m unittest discover -s .github/duo -p "test_*.py" -v`
  Expected: errors, `ModuleNotFoundError: No module named 'appstate'`.

- [ ] **Step 4: Write `appstate.py`** to the interfaces above.
  - Write `manifest.json` compact (`json.dump`), as the spike did.
  - Write value files as UTF-8.
  - In `user_record`, `expirationTime = now_ms + int(resp["expiresIn"]) * 1000`.
  - Header comment: the storage facts from Global Constraints, with their sources (`RNCAsyncStorage.mm` lines 17–21 and 499–503 and 625, and `@firebase/auth` `_fromJSON`).
  - Add `# ponytail: expo-updates DB schema assumed (updates.id/last_accessed/commit_time); Task 2 checks it on the runner`.

- [ ] **Step 5: Run the tests and see them pass.**
  Run: `python -m unittest discover -s .github/duo -p "test_*.py" -v`
  Expected: all `ok`.

- [ ] **Step 6: Commit** (local).
  ```
  git add .github/duo/appstate.py .github/duo/test_appstate.py
  git commit -m "feat(duo screens): app storage helper: open count, test sign-in, running update"
  ```

### Task 2: Prove the sign-in and the update on the runner (checkpoint)

**Files:**
- Create: `.github/workflows/duo-screens.yml`

**Interfaces:**
- Consumes: the `appstate.py` CLI from Task 1.
- Produces:
  - the workflow's first five steps, which Task 4 keeps
  - env `UDID`, `DUOCTL_UDID`, `SHORT` (7-char sha)
  - `shots/update.json`, one line from `appstate.py update`
  - `shots/signin.txt`, holding `ok` or `sign-in failed: <message>`

- [ ] **Step 1: Write the workflow.**
  - Trigger: `on: push: branches: [duo-screens]` plus `workflow_dispatch` with boolean input `elements` (default `false`, description "Also save each screen's element list"). Comment: the push trigger is for building only, and Task 6 removes it.
  - Job `screens`, with the Global Constraints settings.
  - Steps:
    1. `actions/checkout@v4` with `persist-credentials: false`.
    2. **Pick the Duo and start it booting:** as the spike, plus `echo "SHORT=${GITHUB_SHA::7}" >> "$GITHUB_ENV"`.
    3. **Install duoctl and AXe:** the spike's step, verbatim.
    4. **Install the app:** the spike's step, with `DUO_APP_URL` in this step's env.
       - Then save `DATA` and `APPDIR` (`xcrun simctl get_app_container "$UDID" "$APP_ID" data` and `app`) to `$GITHUB_ENV`.
       - Then run `duoctl state` with timestamps either side, to measure and warm up the slow first duoctl call.
    5. **First launch:**
       - launch
       - `appstate.py update "$DATA" "$APPDIR" --wait 90`
       - terminate
       - `appstate.py count ... 10`
       - relaunch, then `sleep 12`
       - `appstate.py update ... > shots/update.json`
       - shot `folded-profile-guest` after `openurl account` (tap `Open` by name as the spike does)
    6. **Sign in (proof only, Task 4 moves it):**
       - terminate
       - `appstate.py session "$DATA" "$APPDIR" shots/signin.txt`, with `DUO_TEST_EMAIL` and `DUO_TEST_PASSWORD` in this step's env and its output straight to the log
       - relaunch, `sleep 12`, `openurl account`, shot `folded-profile-signed-in`
    7. **Report:** append to `shots/report.txt`:
       - `ls -R "$DATA/Library/Application Support"` (names only)
       - `sqlite3 <expo db> .schema`
       - the embedded `app.manifest` id
       - `EXUpdatesRuntimeVersion`
       - the path of `app.config` inside the app

       This step must not print file contents from `RCTAsyncLocalStorage_V1`.
    8. `actions/upload-artifact@v4`, `if: always()`, name `duo-screens-${{ env.SHORT }}`, path `shots/`, `retention-days: 14`.
  - Every run step has `set +e` except the installs, as the spike does.

- [ ] **Step 2: Check the YAML parses.**
  Run: `node -e "require('<main folder>/node_modules/js-yaml').load(require('fs').readFileSync('.github/workflows/duo-screens.yml','utf8')); console.log('ok')"`
  Expected: `ok`.

- [ ] **Step 3: Commit** (local).
  ```
  git add .github/workflows/duo-screens.yml
  git commit -m "feat(duo screens): workflow, first launch and test sign-in"
  ```

- [ ] **Step 4: Checkpoint, owner's go.** Task 0 must be done. With the owner's go:
  - push: `git push -u origin duo-screens`
  - watch: `gh run watch`
  - download: `gh run download <id> -D <scratchpad>/screens-t2`

- [ ] **Step 5: Check the result.**
  - `folded-profile-signed-in.png` shows the test account signed in, and `folded-profile-guest.png` shows the guest profile.
  - `signin.txt` is `ok`.
  - `update.json` has `"embedded": false`, and `update_id` matches the iOS update ID that Task 0's `eas update` printed (not the group ID).
    - If `build_runtime` differs from the update's runtime, stop and tell the owner a new simulator build is needed (`eas build --profile simulator --platform ios`, then `gh secret set DUO_APP_URL`).
  - The run log shows `***` where the tokens would be, and no token text.
  - The schema in `report.txt` has `updates.id`, `last_accessed` and `commit_time`. If it differs, fix `running_update` and its tests in this task. Likewise for the storage folder and the `app.config` path.
  - Note how long `duoctl state` took.

  Show the owner both profile shots and these findings, then stop.

### Task 3: `helpers.sh` and `page.py`: recording shots and building the page

**Files:**
- Create: `.github/duo/helpers.sh`, `.github/duo/page.py`
- Test: `.github/duo/test_helpers.sh`, `.github/duo/test_page.py`

**Interfaces:**
- Consumes: env `UDID`, `APP_ID`, `ELEMENTS` (`1` or empty).
- Produces:
  - In `helpers.sh` (sourced, `set +e`):
    - `R=shots/report.txt`, `RESULTS=shots/results.tsv`. Each results line is `<position>\t<name>\t<ok|missed>\t<detail>`.
    - `at <folded|upright|sideways>`: runs the position's duoctl commands and sets `POS` and `DISPLAY` (1 or 3). On failure it records `missed` row `position` with detail `duoctl <cmd> failed` and returns 1.
    - `shot <name>`: writes `shots/$POS-<name>.png` and records `ok`, or `missed` with `screenshot failed`.
    - `miss <name> <detail>`
    - `open_route <route>`: openurl, then `tap_open` as in the spike, then `sleep 3`.
    - `go <route> <name>`: `open_route`, then `shot`.
    - `tap_to <id|label> <target> <name>`: tap, then `sleep 3`, then shot. If the tap fails, it records `missed` with `no <id|label> <target>` and returns 1.
    - `popup <id|label> <opener> <name>`: like `tap_to`, then `dismiss`. If the dismiss fails, it records `missed` for `<name>` with `didn't close` (the shot stays) and returns 2.
    - `dismiss`: tries `Close`, then `Cancel`, and returns 1 if neither is found.
    - `els <name>`: when `ELEMENTS=1`, writes `duoctl elements` to `shots/elements/$POS-<name>.txt`.
  - In `page.py`:
    - `build(rows: list[tuple[str, str, str, str]], run: dict, files: set[str]) -> tuple[str, str, int]`, returning (html, summary markdown, missed count)
    - `run` keys: `branch`, `sha`, `update` (the `update.json` dict, or `None`) and `signin` (the `signin.txt` line, or `None`)
    - CLI `python3 -I page.py <shots dir> --branch <b> --sha <s>`:
      - reads `results.tsv`, `update.json` and `signin.txt` (each may be missing)
      - writes `index.html`
      - appends the summary to the file in `$GITHUB_STEP_SUMMARY` if that's set
      - exits 1 when the missed count is above 0

- [ ] **Step 1: Write the failing page tests** in `test_page.py`:
  - `test_grid_rows_and_columns`:
    - input: rows `("folded","explore","ok","")`, `("upright","explore","ok","")`, `("upright","town-picker","ok","")`, with files for those
    - output: the html has `<img src="folded-explore.png"`; row order is `explore`, then `town-picker`; columns are in the order Folded, Open upright, Open sideways
    - `town-picker`'s folded and sideways cells hold `—`
  - `test_missed_shows_reason_escaped`: `("sideways","add-to-trip","missed","no id <place-add>")` → the html has `missed: no id &lt;place-add&gt;`, and the count is 1.
  - `test_missed_with_file_shows_both`: a missed row whose png exists shows both the image and the reason.
  - `test_header_built_in_js`: `run["update"] = {"embedded": True, ...}` → the html has `built-in JS, no update` inside an element with the red class.
  - `test_header_update`: when not embedded, the header shows the branch, the sha, the first 8 chars of `update_id`, and `update_time`.
  - `test_signin_failed_in_header`: `run["signin"] = "sign-in failed: INVALID_LOGIN_CREDENTIALS"` → that text is in the header.
  - `test_summary`: the summary has `Shots: 2 ok, 1 missed` and one line per miss.

- [ ] **Step 2: Write the failing helpers test**, `test_helpers.sh`, a plain bash script.
  - Before sourcing `helpers.sh`, it defines stub functions `xcrun` and `duoctl` that log their arguments:
    - `screenshot` touches the file
    - `tap --id missing` fails
    - `tap --label Close` fails while `STUCK=1`
  - It prints `ok` per case, and exits 1 on the first failure. Cases:
    - `popup ok`: `popup id place-add add-to-trip` → `results.tsv` has `upright\tadd-to-trip\tok\t`.
    - `popup not found`: `popup id missing x` → returns 1, and the row is `missed` with `no id missing`.
    - `popup didn't close`: with `STUCK=1`, a stuck Cancel too → returns 2, and the row is `missed` with `didn't close`.
    - `never taps Done`: across all cases, the stub's log has no `--label Done`, `Save`, `Delete` or `Confirm`. Keep this case last, so Task 4's cases fall under it.

- [ ] **Step 3: Run both and see them fail.**
  Run: `python -m unittest discover -s .github/duo -p "test_*.py" -v` and `bash .github/duo/test_helpers.sh`
  Expected: the page tests error (`No module named 'page'`), and the helpers test fails at its first case.

- [ ] **Step 4: Write `helpers.sh`** from the spike's `helpers.sh` heredoc (`duo-spike.yml` lines 70–109), changed to the interfaces above:
  - `dismiss` without `Done`
  - every helper records a row
  - Add `# ponytail: sleeps are the spike's timings, not waits on the screen; shorten once runs are steady`.

- [ ] **Step 5: Write `page.py`** to the interfaces above.
  - Self-contained HTML, with inline CSS and no scripts.
  - Images link to themselves, so a click opens full size.
  - A row label is the shot name with `-` turned into spaces.
  - Use `html.escape` on every value.

- [ ] **Step 6: Run both again.**
  Expected: all `ok`.

- [ ] **Step 7: Commit** (local).
  ```
  git add .github/duo/helpers.sh .github/duo/page.py .github/duo/test_helpers.sh .github/duo/test_page.py
  git commit -m "feat(duo screens): shot helpers that record misses, and the results page"
  ```

### Task 4: The shot list, the two passes and the page in the workflow (checkpoint)

**Files:**
- Create: `.github/duo/shots.sh`
- Modify: `.github/workflows/duo-screens.yml` (steps 5 to 8 from Task 2)

**Interfaces:**
- Consumes:
  - Task 3's helpers
  - `appstate.py` (Task 1)
  - `shots/signin.txt` and `shots/update.json` (Task 2)
- Produces:
  - `bash .github/duo/shots.sh guest|signed`
  - in `shots.sh`: `PLACE_ID`, `GUIDE_SLUG=driving`, `TRIP_NAME="Duo test"`, and the functions `guest_screens`, `guest_popups`, `signed_screens`, `signed_popups`, `guest_pass`, `signed_pass`, `to_trip`
  - `SIGNED_POPUPS`: a bash array of `route|id-or-label|opener|name` entries. `route` is a link route, or `trip` (go to Trips, then tap `$TRIP_NAME`).

- [ ] **Step 1: Add the failing helpers cases** to `test_helpers.sh`, before `never taps Done`:
  - `popups stop after a failed close`: calls `signed_popups` with `SIGNED_POPUPS` set to a two-entry test list and `STUCK=1`. The second entry is recorded `missed` with `skipped: <first name> didn't close`, and its opener is never tapped (check the stub's log).
  - `signed pass without sign-in`: `signin.txt` holds `sign-in failed: X` → `signed_pass` records every signed-in row as `missed` with `not signed in: sign-in failed: X`, and makes no duoctl calls.

  Run `bash .github/duo/test_helpers.sh`. Expected: it fails at `popups stop after a failed close` (no `shots.sh`).

- [ ] **Step 2: Write `shots.sh`.** It must be sourceable for the test: run the pass named in `$1` only when one is given.
  - `guest_pass`: for each `P in folded upright sideways`: `at $P`, then `guest_screens`, then `guest_popups` unless folded.
  - `signed_pass`: if `signin.txt` isn't `ok`, record every signed-in row as missed and return. Otherwise, for each `P in sideways upright folded` (the order that saves moves): `at $P`, then `signed_screens`, then `signed_popups` unless folded.
  - `guest_screens` (`go` each one, then `els`):
    - `sites` → `explore`
    - `sites/$PLACE_ID` → `place`
    - `sites/$PLACE_ID/reviews` → `reviews`
    - `guide` → `guide`
    - `guide/$GUIDE_SLUG` → `article`
    - `map` → `map`
    - `itinerary` → `trips-guest`
    - `account` → `profile-guest`
    - `photo-credits` → `photo-credits`
    - `login` → `sign-in`
  - `guest_popups`, as proven in run 9:
    - `sites`, then label `Queenstown, choose a town` → `town-picker`
    - label `All, choose a category` → `category-picker`
    - `guide`, then id `region-pill` → `region-picker`
    - `sites/$PLACE_ID`, then id `place-add` → `sign-in-alert`
  - `signed_screens`:
    - `itinerary` → `trips`
    - `to_trip` → `trip`
    - `account` → `profile`
    - `saved-sites` → `saved`
    - `sites/$PLACE_ID` → `place-signed-in`
  - `signed_popups`: `SIGNED_POPUPS` in this order:
    1. add-to-trip
    2. review
    3. new-trip
    4. edit-stop
    5. note
    6. delete-trip
    7. delete-account

    Delete trip and delete account are last. Openers use the best name the source shows; Step 6 fixes them from the element lists.
    - Loop: on a `popup` return of 1, go on to the next entry.
    - On a return of 2, record each remaining entry as `skipped: <name> didn't close` and stop.
  - `PLACE_ID`: the id of the place from Task 0.
  - Header comment: how to add a screen (one line in a list).

- [ ] **Step 3: Rework the workflow steps.**
  - Step 5 (first launch): keep it, minus the proof shot.
  - New step **Guest pass**: `bash .github/duo/shots.sh guest`.
  - Step 6 (sign in): keep it, minus its proof shot.
  - New step **Signed-in pass**: `bash .github/duo/shots.sh signed`.
  - Step 7 (report): keep it, minus the `ls` and schema lines.
  - New step **Page**, `if: always()`: `python3 -I .github/duo/page.py shots --branch "$GITHUB_REF_NAME" --sha "$SHORT"`.
  - Upload: unchanged.
  - `ELEMENTS` env on the job: `${{ github.event_name == 'push' && '1' || (inputs.elements && '1' || '') }}`.

- [ ] **Step 4: Run the local tests.**
  Run: `python -m unittest discover -s .github/duo -p "test_*.py" -v`, `bash .github/duo/test_helpers.sh`, and the YAML check from Task 2.
  Expected: all `ok`.

- [ ] **Step 5: Commit** (local), then hit the checkpoint: push and run on the owner's go, then download the artifact.
  ```
  git add .github/duo/shots.sh .github/workflows/duo-screens.yml
  git commit -m "feat(duo screens): shot list, guest and signed-in passes, results page"
  ```

- [ ] **Step 6: Fix the openers from the element lists.**
  - For each pop-up that missed with `no id/label`, find its opener in `shots/elements/<position>-<screen>.txt`.
  - Use its name if it's there and unique, and record the change in `shots.sh`.
  - If there's no usable name, list it for Task 5 (it needs a testID).
  - Show the owner `index.html` (screens, guest pop-ups, and whatever signed-in pop-ups already open) plus the Task 5 list, then stop.

### Task 5: testIDs for the openers that have no name (checkpoint)

**Files:**
- Modify: only the components from Task 4's list. These are likely: `components/itinerary/ItineraryDetailView.tsx` (stops, note, trip menu items), `components/account/DangerZoneCard.tsx`, `app/(app)/(tabs)/itinerary/index.tsx` (new trip) and `components/sites/detail/SiteDetail.tsx` (review).
- Modify: `.github/duo/shots.sh` (the `SIGNED_POPUPS` openers)

**Interfaces:**
- Consumes: Task 4's list of openers with no usable name.
- Produces: testIDs named `duo-<popup name>`, for example `duo-edit-stop`, `duo-delete-trip`, `duo-delete-account`, on the opener's `Pressable`. That's a test-only prop with no visible change.

- [ ] **Step 1: Link `node_modules`.** From PowerShell: `New-Item -ItemType Junction -Path <worktree>\node_modules -Target C:\Users\User\source\south-island\node_modules`. Then record the iOS runtime: `npx expo-updates runtimeversion:resolve --platform ios`.
- [ ] **Step 2: Add the testIDs** and update `SIGNED_POPUPS` to `id duo-...` for each.
- [ ] **Step 3: Check nothing else changed.**
  - `npx tsc --noEmit` passes.
  - `npx jest <changed component folders>` passes.
  - The runtime from Step 1 is unchanged.
  - No `package.json`, `app.config.ts` or `.gitignore` in `git status`.
- [ ] **Step 4: Commit** (local).
  ```
  git add <components> .github/duo/shots.sh
  git commit -m "feat(duo screens): testIDs on the pop-up openers the job can't find by name"
  ```
- [ ] **Step 5: Checkpoint, owner's go.**
  - Publish this branch's JS from the worktree: `eas update --channel simulator --platform ios --environment production --message "duo duo-screens <short sha>"`. Check that the printed runtime matches `build_runtime`. If not, stop and tell the owner.
  - Push, run, and download.
  - Show the owner `index.html` with every pop-up. Name any miss that's left, and say whether it's a missing Close/Cancel. That one is the owner's call: fixing it means a visible change, so it's not done here.

### Task 6: Ship (owner's word for each step)

**Files:**
- Modify: `.github/workflows/duo-screens.yml` (remove the `push` trigger)
- Modify: `docs/plans/duo-screenshots-design.md` (status: built)
- Modify: `TASKS.md` (in the main folder, which is on `trip-builder`): add a line for the job. It's the owner's file: add the one line only.

- [ ] **Step 1: Make it manual only.** Remove `push:` and its comment, keeping `workflow_dispatch` and `elements`. Change `ELEMENTS` to `${{ inputs.elements && '1' || '' }}`. Run the YAML check. Commit.
- [ ] **Step 2: Merge to `main`, on the owner's word.**
  ```
  git checkout main && git merge --ff-only duo-screens
  ```
  Do this in the worktree, because the main folder stays on `trip-builder`. Then push `main`.
- [ ] **Step 3: First manual run.**
  - Run: `gh workflow run duo-screens.yml --ref main`, then watch it and download.
  - Expected: green, the same set of shots as Task 5, and an artifact named `duo-screens-<short sha>`.
- [ ] **Step 4: Remove the spike.**
  - `git push origin --delete duo-spike`
  - `git worktree remove <scratchpad>/duo-spike`
  - `git branch -D duo-spike`
  - Also remove the `duo-screens` worktree and its `node_modules` junction. Remove the junction first, with `Remove-Item` on the link only.
  - `DUO_APP_URL` stays.
- [ ] **Step 5: Update the memory.** In `duo-sim-github-actions.md`, record the job's name, how to run it, the two secrets, and that the spike is gone.
