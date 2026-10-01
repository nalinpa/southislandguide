#!/usr/bin/env node
/**
 * Resize originals into the two sizes the app uses, as WebP.
 *
 *   node scripts/resize-images.js <inputDir> <outputDir> [--quality 82]
 *
 * Output:  <outputDir>/full/<name>.webp   1200px wide — detail hero
 *          <outputDir>/thumb/<name>.webp   400px wide — list rows, map cards
 *
 * <name> is the input file's name without its extension, unchanged — so the
 * input filename IS the key the app looks the image up by. Name originals
 * accordingly before running:
 *   - category defaults: the category id exactly, e.g. Food.jpg, Walks.jpg
 *     (case-sensitive), output to assets/images/categories
 *   - place photos: the place's slug, e.g. little-high-eatery.jpg, output
 *     anywhere outside the repo, then upload to R2
 *
 * Ported from rotorua-guide/scripts/resize-images.js, which hardcoded its
 * input folder. Never enlarges a small original — a 600px source stays 600px
 * rather than being upscaled to 1200.
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const SUPPORTED = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".heic", ".heif"]);
const SIZES = { full: 1200, thumb: 400 };

const args = process.argv.slice(2);
const qualityArg = args.indexOf("--quality");
const QUALITY = qualityArg !== -1 ? parseInt(args[qualityArg + 1], 10) : 82;
const positional = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--quality");
const [inputDir, outputDir] = positional.map((p) => path.resolve(p));

if (!inputDir || !outputDir) {
  console.error("Usage: node scripts/resize-images.js <inputDir> <outputDir> [--quality 82]");
  process.exit(1);
}
if (!fs.existsSync(inputDir)) {
  console.error(`Input folder not found: ${inputDir}`);
  process.exit(1);
}

const files = fs
  .readdirSync(inputDir)
  .filter((f) => SUPPORTED.has(path.extname(f).toLowerCase()) && !f.startsWith("."));

if (!files.length) {
  console.error(`No images found in ${inputDir}`);
  process.exit(1);
}

for (const size of Object.keys(SIZES)) fs.mkdirSync(path.join(outputDir, size), { recursive: true });

const kb = (bytes) => `${(bytes / 1024).toFixed(0)}kb`.padStart(7);

(async () => {
  console.log(`Processing ${files.length} image(s) at quality ${QUALITY}...\n`);
  let failed = 0;

  for (const file of files) {
    const name = path.basename(file, path.extname(file));
    const src = path.join(inputDir, file);
    try {
      const img = sharp(src).rotate(); // apply EXIF orientation before resizing
      const out = {};
      for (const [size, width] of Object.entries(SIZES)) {
        out[size] = path.join(outputDir, size, `${name}.webp`);
        await img.clone().resize({ width, withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(out[size]);
      }
      console.log(
        `✓ ${file.padEnd(40)} ${kb(fs.statSync(src).size)} → full ${kb(fs.statSync(out.full).size)} / thumb ${kb(fs.statSync(out.thumb).size)}`,
      );
    } catch (err) {
      console.error(`✗ ${file}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${files.length - failed} succeeded${failed ? `, ${failed} failed` : ""}.`);
  console.log(`→ ${path.join(outputDir, "full")}`);
  console.log(`→ ${path.join(outputDir, "thumb")}`);
  if (failed) process.exit(1);
})();
