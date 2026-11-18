// Kiwi Guide — iPad App Store screenshots, landscape 2752 x 2064 (the 13" iPad, sideways).
//
// Builds kiwi-guide-ipad-01…06 (.svg masters + .png) in this folder from the captures in ./source/.
// ponytail: a copy of ../duo/build.js with the iPad's size and no folded frame; if a third set
// comes, lift the shared parts (caption, framed, rgbPng) into one file. Setup and how to run
// are in that file's header (same scratch folder, same font).
//
// Captures (owner, 2026-11-18, iPad Pro 13" on EAS Simulator, sideways 2752 x 2064). The trip's
// days and hours are one screen here as on the Duo, and Explore shows the place beside the list,
// so the set is six frames: poster, trip, suggested trips, map, Explore, guide.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { Resvg } = require(require.resolve("@resvg/resvg-js", { paths: [process.cwd()] }));

const OUT = __dirname;
const SRC = path.join(OUT, "source");
const PHONE = path.join(OUT, "..");
const CAP = "2752x2064";
const FONT = process.env.BAHNSCHRIFT || path.join(process.cwd(), "bahnschrift-semibold.ttf");

const W = 2752, H = 2064;
const TEAL = "#095C65", YELLOW = "#FFC20E";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
// parts: [["white text", false], ["yellow text", true], ...]
const caption = (parts, x, y, size, anchor = "middle", extra = "") =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Bahnschrift" font-weight="600" font-size="${size}" fill="#fff"${extra}>${parts
    .map(([t, yel]) => (yel ? `<tspan style="fill:${YELLOW}">${esc(t)}</tspan>` : esc(t)))
    .join("")}</text>`;

const DEFS = `<filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="30" stdDeviation="40" flood-color="#0B0B0B" flood-opacity="0.5"/></filter>
<filter id="ssh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="22" flood-color="#000" flood-opacity="0.45"/></filter>
<filter id="tsh" x="-10%" y="-40%" width="120%" height="180%"><feDropShadow dx="0" dy="4" stdDeviation="9" flood-color="#000" flood-opacity="0.6"/></filter>`;

// A screen in a black frame; (x, y) is the screen's top-left.
let clipN = 0;
function framed(href, x, y, w, h, rScreen = 70, bezel = 26) {
  const id = `clip${++clipN}`;
  return {
    defs: `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rScreen}"/></clipPath>`,
    body: `<rect filter="url(#sh)" x="${x - bezel}" y="${y - bezel}" width="${w + bezel * 2}" height="${h + bezel * 2}" rx="${rScreen + bezel}" fill="#0B0B0B" stroke="#FFFFFF" stroke-opacity="0.15" stroke-width="4"/>
<image clip-path="url(#${id})" href="${href}" xlink:href="${href}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none"/>`,
  };
}

const svgDoc = (comment, defs, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><!-- ${comment} Render: ipad/build.js (resvg). --><defs>${DEFS}
${defs}</defs>
${body}</svg>`;

// Caption across the top, the open screen below.
function standard(n, slug, parts) {
  const href = `source/${slug}-capture-${CAP}.png`;
  const TOP = 360, BOTTOM = 90, BEZEL = 26;
  const h = H - TOP - BOTTOM - BEZEL * 2, w = Math.round(h * (W / H));
  const f = framed(href, Math.round((W - w) / 2), TOP + BEZEL, w, h, 44);
  return { n, slug, svg: svgDoc(`Kiwi Guide iPad App Store screenshot ${n}.`, f.defs, `<rect width="${W}" height="${H}" fill="${TEAL}"/>
${caption(parts, W / 2, 250, 120)}
${f.body}`) };
}

// 1: the poster — the phone poster's photo, words and kiwi sign, laid out landscape.
function poster() {
  const phone = fs.readFileSync(path.join(PHONE, "kiwi-guide-01-poster.svg"), "utf8");
  const start = phone.indexOf('<g filter="url(#ssh)"');
  const end = phone.indexOf('<rect filter="url(#tsh)"', start);
  const sign = phone.slice(start, end).replace(/^<g filter="url\(#ssh\)" transform="[^"]*">/, "").replace(/<\/g>\s*$/, "");
  const pH = 2260, pW = Math.round(5184 * (pH / 2916));
  const SX = 2070, SY = 580, S = 0.6;                  // sign centre and scale (1024-unit icon box)
  const postTop = SY + 250, postBottom = 1940;
  const photo = "../duo/source/road-towards-mount-cook-5184x2916.jpg";
  const defs = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03262B" stop-opacity="0.6"/><stop offset="0.3" stop-color="#03262B" stop-opacity="0"/></linearGradient>
<linearGradient id="left" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.55"/><stop offset="0.45" stop-color="#000" stop-opacity="0.25"/><stop offset="0.65" stop-color="#000" stop-opacity="0"/></linearGradient>
<linearGradient id="post" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7d8487"/><stop offset="0.45" stop-color="#c9cdcf"/><stop offset="1" stop-color="#5d6467"/></linearGradient>
<radialGradient id="foot"><stop offset="0" stop-color="#000" stop-opacity="0.45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`;
  const body = `<image href="${photo}" xlink:href="${photo}" x="-200" y="-120" width="${pW}" height="${pH}" preserveAspectRatio="none"/>
<rect width="${W}" height="${H}" fill="url(#sky)"/><rect width="${W}" height="${H}" fill="url(#left)"/>
${caption([["Places.", false]], 160, 400, 200, "start", ' filter="url(#tsh)"')}
${caption([["Trips.", false]], 160, 610, 200, "start", ' filter="url(#tsh)"')}
${caption([["Guides.", false]], 160, 820, 200, "start", ' filter="url(#tsh)"')}
${caption([["South Island road trips", true]], 166, 990, 120, "start", ' filter="url(#tsh)"')}
${caption([["500+ places. 26 trips.", false]], 166, 1130, 90, "start", ' filter="url(#tsh)"')}
<ellipse cx="${SX + 30}" cy="${postBottom}" rx="140" ry="30" fill="url(#foot)"/>
<rect x="${SX - 24}" y="${postTop}" width="48" height="${postBottom - postTop}" fill="url(#post)"/>
<g filter="url(#ssh)" transform="translate(${SX - 512 * S} ${SY - 512 * S}) scale(${S})">${sign}</g>
<rect filter="url(#tsh)" x="${SX - 330}" y="${SY + 420}" width="660" height="210" rx="28" fill="${TEAL}"/>
${caption([["Kiwi Guide", false]], SX, SY + 560, 116)}`;
  return { n: 1, slug: "poster", svg: svgDoc('Kiwi Guide iPad App Store screenshot 1. Photo: "Road towards Mount Cook", Jean-Pierre Brungs, CC0, Wikimedia Commons.', defs, body) };
}

// RGBA pixels → an RGB PNG (no alpha), with Node's own zlib. Pixels are composited on white.
function rgbPng(rgba, w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0; // filter: none
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, o = y * (w * 3 + 1) + 1 + x * 3, a = rgba[i + 3] / 255;
      raw[o] = Math.round(rgba[i] * a + 255 * (1 - a));
      raw[o + 1] = Math.round(rgba[i + 1] * a + 255 * (1 - a));
      raw[o + 2] = Math.round(rgba[i + 2] * a + 255 * (1 - a));
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

const frames = [
  poster(),
  standard(2, "trip", [["Your trip, ", false], ["day by day, hour by hour", true]]),
  standard(3, "suggested-trips", [["Ready-made trips, or ", false], ["build your own", true]]),
  standard(4, "map", [["Everything your trip needs, ", false], ["mapped", true]]),
  standard(5, "explore", [["Places worth the ", false], ["drive", true]]),
  standard(6, "guide", [["Know ", false], ["before", true], [" you go", false]]),
];

const only = process.argv[2] ? process.argv[2].split(",").map(Number) : null;
for (const f of frames) {
  if (only && !only.includes(f.n)) continue;
  const base = `kiwi-guide-ipad-0${f.n}-${f.slug}`;
  fs.writeFileSync(path.join(OUT, `${base}.svg`), f.svg);
  // resvg-js doesn't load external files: inline each source/ image as a data URI for the render only.
  const inlined = f.svg.replace(/(xlink:href|href)="((?:\.\.\/duo\/)?source\/[^"]+)"/g, (m, attr, rel) =>
    `${attr}="data:image/${rel.endsWith(".jpg") ? "jpeg" : "png"};base64,${fs.readFileSync(path.join(OUT, rel)).toString("base64")}"`);
  const img = new Resvg(inlined, {
    font: { fontFiles: [FONT], loadSystemFonts: false, defaultFontFamily: "Bahnschrift" },
    fitTo: { mode: "original" },
  }).render();
  fs.writeFileSync(path.join(OUT, `${base}.png`), rgbPng(img.pixels, img.width, img.height));
  console.log("wrote", base);
}
