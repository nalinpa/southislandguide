// Copies the website's trip builder into the app. The website (../kiwiguide-site) is the home of the rules:
// change them there, commit, then run this. It takes the files as the site has them committed:
//   public/plan/builder.js         -> lib/tripBuilder/builder.js     (the rules)
//   public/plan/quiz.js            -> lib/tripBuilder/quizLogic.js   (the quiz's logic; its web page half left out,
//                                                                      and a few more of its lists handed out)
//   public/plan/builder-data.json  -> assets/data/builder-data.json  (the day blocks and places the rules use)
// and writes test/fixtures/site-trips.json: the trips the site's own builder and pack.js build for the answer
// sets in that file, which lib/__tests__/tripBuilder.test.ts holds the app to. To cover another answer set,
// add { "ans": {...} } to its cases, then run this.
//
// Usage: node scripts/copy-site-builder.mjs [--check] [path to kiwiguide-site]
//   --check  writes nothing; exits 1 if the app's copies aren't what the site has now.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const check = args.includes("--check");
const site = path.resolve(args.find((a) => !a.startsWith("--")) ?? path.join(root, "../kiwiguide-site"));
const PLAN = "public/plan/";
const FILES = ["builder.js", "quiz.js", "builder-data.json", "pack.js"];
const CASES = "test/fixtures/site-trips.json";
const lf = (s) => s.replace(/\r\n/g, "\n");
const git = (...a) => lf(execFileSync("git", ["-C", site, ...a], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));

// The site's last commit to touch these files: the stamp only changes when they do.
const commit = git("log", "-1", "--format=%H", "--", ...FILES.map((f) => PLAN + f)).trim();
if (!commit) throw new Error(`No commit to ${PLAN} found in ${site}`);
const src = Object.fromEntries(FILES.map((f) => [f, git("show", `${commit}:${PLAN}${f}`)]));
// Only committed files are copied. Say so if the site has edits waiting (line endings aside).
const waiting = execFileSync("git", ["-C", site, "diff", "--ignore-cr-at-eol", "HEAD", "--", ...FILES.map((f) => PLAN + f)], {
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
  stdio: ["ignore", "pipe", "ignore"],
});
if (waiting.trim()) console.warn(`Note: the site has uncommitted changes in ${PLAN}. They aren't in this copy: commit them on the site first.`);

const header = (file, more = "") =>
  `// COPIED from kiwiguide-site ${PLAN}${file} at ${commit.slice(0, 7)}.${more} Don't edit here: change it on the\n` +
  "// website, then run `node scripts/copy-site-builder.mjs`.\n";

// quiz.js is the quiz's logic, then the web page that draws it. The app draws its own screens.
const PAGE = '\n// ---- the page ----\nif (typeof document !== "undefined") (function () {';
const halves = src["quiz.js"].split(PAGE);
if (halves.length !== 2) throw new Error("quiz.js: can't find where the web page half starts");
// Lists the app's screens show that the site's export line leaves out. Handed out too; the logic isn't touched.
const EXTRA = ["VIBES", "INTO", "DRIVES", "SEASONS", "MONTH_NAMES"];
for (const n of EXTRA) if (!new RegExp(`^var ${n} = `, "m").test(halves[0])) throw new Error(`quiz.js: no ${n} to hand out`);
const extra = `
// Added by the copy script: lists the site's export line leaves out.
if (typeof module !== "undefined") Object.assign(module.exports, { ${EXTRA.map((n) => `${n}: ${n}`).join(", ")} });
`;

// The trips to hold the app to: the site's builder with the site's own pack.js, not the app's code.
const cases = existsSync(path.join(root, CASES)) ? JSON.parse(readFileSync(path.join(root, CASES), "utf8")).cases : [];
if (!cases.length) throw new Error(`${CASES} has no answer sets`);
const tmp = mkdtempSync(path.join(tmpdir(), "site-builder-"));
let siteTrips;
try {
  for (const f of ["builder", "pack"]) writeFileSync(path.join(tmp, f + ".cjs"), src[f + ".js"]);
  const load = createRequire(import.meta.url);
  const { buildTrips } = load(path.join(tmp, "builder.cjs"));
  const pack = load(path.join(tmp, "pack.cjs"));
  const data = JSON.parse(src["builder-data.json"]);
  siteTrips = cases.map(({ ans }) => {
    const trips = buildTrips(data, pack, ans);
    return { ans, trips: trips.length, sha256: createHash("sha256").update(JSON.stringify(trips)).digest("hex") };
  });
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const out = {
  "lib/tripBuilder/builder.js": header("builder.js") + src["builder.js"],
  "lib/tripBuilder/quizLogic.js": header("quiz.js", " The web page half is left out.") + halves[0] + extra,
  "assets/data/builder-data.json": src["builder-data.json"],
  // one answer set a line
  [CASES]: `{\n "site": "${commit}",\n "cases": [\n${siteTrips.map((c) => "  " + JSON.stringify(c)).join(",\n")}\n ]\n}\n`,
};

if (check) {
  const behind = Object.keys(out).filter((f) => !existsSync(path.join(root, f)) || lf(readFileSync(path.join(root, f), "utf8")) !== out[f]);
  if (behind.length) {
    console.error(`The app's copy isn't what the website has now (${commit.slice(0, 7)}):\n  ${behind.join("\n  ")}\nRun: node scripts/copy-site-builder.mjs`);
    process.exit(1);
  }
  console.log(`The app's copy is what the website has now (${commit.slice(0, 7)}).`);
} else {
  for (const [f, text] of Object.entries(out)) {
    mkdirSync(path.dirname(path.join(root, f)), { recursive: true });
    writeFileSync(path.join(root, f), text);
  }
  console.log(`Copied from ${site} at ${commit.slice(0, 7)}: ${Object.keys(out).length} files, ${siteTrips.length} answer sets.`);
}
