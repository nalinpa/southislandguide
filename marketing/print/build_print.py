#!/usr/bin/env python3
"""Build print-ready Kiwi Guide pieces (A6 card, A4 poster, A3 poster).

Outputs, per piece, into ./out:
  <name>_print.pdf   CMYK vector PDF, 3 mm bleed, crop marks, Trim/Bleed boxes
  <name>_bleed.pdf   same artwork, page = bleed size, no marks (used for the PNG)
  <name>_300dpi.png  300 dpi raster of the bleed-size page

All text is converted to outlines (Inter, shaped with HarfBuzz) so the printer
needs no fonts. Layout coordinates are millimetres from the top-left of the TRIM.

Requires: reportlab, fonttools, uharfbuzz, svgelements, poppler (pdftoppm).
"""
import math

import numpy as np
import os
import subprocess

import uharfbuzz as hb
from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont
from PIL import Image
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas as rl_canvas
from svgelements import Arc, Close, CubicBezier, Line, Matrix, Move, Path, QuadraticBezier

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get("KIWI_PRINT_OUT", os.path.join(HERE, "out"))
FONT_DIR = "/usr/share/fonts/opentype/inter"

BLEED = 3.0      # mm
SAFE = 5.0       # mm inside trim
MARK_AREA = 12.0  # mm outside the bleed for crop marks
MARK_OFFSET = 3.0  # crop marks start this far from the trim (= outside bleed)
MARK_LEN = 6.0

# CMYK builds (0-1). Yellow ~ #F7C600, teal = #095C65, black = 100K.
YELLOW = (0.0, 0.20, 1.0, 0.0)
TEAL = (1.00, 0.25, 0.40, 0.45)  # closest press build to #095C65 (checked against a poppler render)
BLACK = (0.0, 0.0, 0.0, 1.0)
POST_GREY = (0.0, 0.0, 0.0, 0.55)  # galvanised sign post
TEAL_TINT = (0.42, 0.06, 0.24, 0.0)  # mid teal (clean build, no K) for the panel behind the text
WHITE = (0.0, 0.0, 0.0, 0.0)
REGISTRATION = (1.0, 1.0, 1.0, 1.0)

# ---------------------------------------------------------------- fonts
class Font:
    def __init__(self, weight):
        path = os.path.join(FONT_DIR, f"Inter-{weight}.otf")
        blob = hb.Blob.from_file_path(path)
        self.hb_font = hb.Font(hb.Face(blob))
        self.tt = TTFont(path)
        self.upm = self.tt["head"].unitsPerEm
        self.glyphset = self.tt.getGlyphSet()
        self.order = self.tt.getGlyphOrder()
        hhea = self.tt["hhea"]
        self.asc = hhea.ascent / self.upm
        self.desc = -hhea.descent / self.upm
        self.cap = self.tt["OS/2"].sCapHeight / self.upm

    def shape(self, text, tracking_em=0.0):
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        hb.shape(self.hb_font, buf, {"kern": True, "liga": True})
        out, x = [], 0.0
        for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
            out.append((self.order[info.codepoint], x + pos.x_offset / self.upm))
            x += pos.x_advance / self.upm + tracking_em
        return out, x  # positions and total advance in em

    def width(self, text, tracking_em=0.0):
        return self.shape(text, tracking_em)[1]


FONTS = {w: Font(w) for w in ("Medium", "SemiBold", "Bold", "ExtraBold")}


class RLPen(BasePen):
    """fontTools pen that draws into a reportlab path with a point transform."""

    def __init__(self, glyphset, path, tf):
        super().__init__(glyphset)
        self.p, self.tf = path, tf

    def _moveTo(self, pt):
        self.p.moveTo(*self.tf(pt))

    def _lineTo(self, pt):
        self.p.lineTo(*self.tf(pt))

    def _curveToOne(self, a, b, c):
        self.p.curveTo(*self.tf(a), *self.tf(b), *self.tf(c))

    def _closePath(self):
        self.p.close()


# ---------------------------------------------------------------- page
class Page:
    def __init__(self, path, trim_w, trim_h, marks, title):
        self.tw, self.th = trim_w, trim_h
        self.off = BLEED + (MARK_AREA if marks else 0.0)
        self.pw, self.ph = trim_w + 2 * self.off, trim_h + 2 * self.off
        self.c = rl_canvas.Canvas(path, pagesize=(self.pw * mm, self.ph * mm))
        self.c.setTitle(title)
        self.c.setAuthor("Kiwi Guide")
        self.marks = marks

    # trim-mm (top-left origin) -> PDF points
    def X(self, x):
        return (self.off + x) * mm

    def Y(self, y):
        return (self.ph - self.off - y) * mm

    def fill(self, cmyk):
        self.c.setFillColorCMYK(*cmyk)

    def stroke(self, cmyk, w_mm):
        self.c.setStrokeColorCMYK(*cmyk)
        self.c.setLineWidth(w_mm * mm)

    def rect(self, x, y, w, h, fill=None, stroke=None, sw=0.0, r=0.0):
        if fill:
            self.fill(fill)
        if stroke:
            self.stroke(stroke, sw)
            # stroke sits fully inside the box (like CSS border-box)
            x, y, w, h, r = x + sw / 2, y + sw / 2, w - sw, h - sw, max(r - sw / 2, 0)
        args = (self.X(x), self.Y(y + h), w * mm, h * mm)
        kw = dict(fill=1 if fill else 0, stroke=1 if stroke else 0)
        if r:
            self.c.roundRect(*args, r * mm, **kw)
        else:
            self.c.rect(*args, **kw)

    def text(self, font, size_pt, x, baseline, s, color, tracking_em=0.0, align="left"):
        f = FONTS[font]
        glyphs, adv = f.shape(s, tracking_em)
        em_mm = size_pt * 25.4 / 72
        if align == "center":
            x -= adv * em_mm / 2
        self.fill(color)
        path = self.c.beginPath()
        for name, gx in glyphs:
            ox = x + gx * em_mm

            def tf(pt, ox=ox):
                return (self.X(ox + pt[0] / f.upm * em_mm), self.Y(baseline - pt[1] / f.upm * em_mm))

            f.glyphset[name].draw(RLPen(f.glyphset, path, tf))
        self.c.drawPath(path, fill=1, stroke=0, fillMode=1)  # nonzero winding
        return adv * em_mm

    def svg_path(self, d, matrix, tf, color, even_odd=False):
        p = Path(d) * matrix
        path = self.c.beginPath()
        for seg in p.segments():
            if isinstance(seg, Move):
                path.moveTo(*tf(seg.end))
            elif isinstance(seg, Line):
                path.lineTo(*tf(seg.end))
            elif isinstance(seg, Close):
                path.close()
            elif isinstance(seg, QuadraticBezier):
                s, c1, e = seg.start, seg.control, seg.end
                a = (s[0] + 2 / 3 * (c1[0] - s[0]), s[1] + 2 / 3 * (c1[1] - s[1]))
                b = (e[0] + 2 / 3 * (c1[0] - e[0]), e[1] + 2 / 3 * (c1[1] - e[1]))
                path.curveTo(*tf(a), *tf(b), *tf(e))
            elif isinstance(seg, CubicBezier):
                path.curveTo(*tf(seg.control1), *tf(seg.control2), *tf(seg.end))
            elif isinstance(seg, Arc):
                for cb in seg.as_cubic_curves():
                    path.curveTo(*tf(cb.control1), *tf(cb.control2), *tf(cb.end))
        self.fill(color)
        self.c.drawPath(path, fill=1, stroke=0, fillMode=0 if even_odd else 1)

    def begin_art(self):
        """Clip everything drawn until end_art() to the bleed box, so nothing spills into the mark area."""
        self.c.saveState()
        p = self.c.beginPath()
        p.rect(self.X(-BLEED), self.Y(self.th + BLEED), (self.tw + 2 * BLEED) * mm, (self.th + 2 * BLEED) * mm)
        self.c.clipPath(p, stroke=0, fill=0)

    def end_art(self):
        self.c.restoreState()

    def finish(self):
        c = self.c
        # page boxes (points, PDF bottom-left origin)
        b = (self.X(-BLEED), self.Y(self.th + BLEED), self.X(self.tw + BLEED), self.Y(-BLEED))
        t = (self.X(0), self.Y(self.th), self.X(self.tw), self.Y(0))
        c.setBleedBox(b)
        c.setTrimBox(t)
        if self.marks:
            self.stroke(REGISTRATION, 0.25 / 72 * 25.4)  # 0.25 pt hairline
            o, L = MARK_OFFSET + BLEED, MARK_LEN
            for x in (0, self.tw):
                for y, s in ((0, -1), (self.th, 1)):
                    c.line(self.X(x), self.Y(y + s * o), self.X(x), self.Y(y + s * (o + L)))
            for y in (0, self.th):
                for x, s in ((0, -1), (self.tw, 1)):
                    c.line(self.X(x + s * o), self.Y(y), self.X(x + s * (o + L)), self.Y(y))
        c.showPage()
        c.save()


# ---------------------------------------------------------------- the app icon
KIWI_D = (
    "M323.2 559.2A5 5 0 0 1 316.6 551.9Q358.1 499.5 403.4 448.1A38 38 0 0 1 454.2 422.8C465.4 427.3 500 352 600 352"
    "C658 352 702 394 702 450C702 490 665.1 534.9 644.9 557.1Q636 566.9 634.4 580.1L634.1 582.2Q633.4 588.2 635.5 593.8"
    "L642.8 613.4A7.5 7.5 0 0 1 629.2 619.6L619.8 602.3L616.4 617.5A7.5 7.5 0 0 1 601.6 615.5L602.1 603.3L588.7 616.9"
    "A7.5 7.5 0 0 1 577.3 607.1L592.4 586.3Q595.9 581.5 596.6 575.5L598.5 560C601.2 537.6 571.6 536.5 564.7 558"
    "L558.2 578.4Q556.3 584.2 553.3 589.4L535.7 619.8A7.5 7.5 0 0 1 522.3 613.2L529.6 595.3L507 621.1"
    "A7.5 7.5 0 0 1 495 611.9L500.1 604.3L478.6 611A7.5 7.5 0 0 1 473.4 597L512.9 580.1Q518.4 577.8 520.3 572.1"
    "L528.2 547.5Q532.6 533.5 511.7 531C442.2 522.7 430.1 514.7 423.9 497.8Q421.5 491.2 418.6 498.4Q371.1 528.7 323.2 559.2Z"
)
SIGN_D = (  # rounded square 527.2, rx 96, at 248.4
    "M344.4 248.4H679.6A96 96 0 0 1 775.6 344.4V679.6A96 96 0 0 1 679.6 775.6H344.4A96 96 0 0 1 248.4 679.6"
    "V344.4A96 96 0 0 1 344.4 248.4Z"
)
OUTER = "translate(512 512) scale(1.2608) translate(-512 -512)"
VB_X, VB_Y, VB_W, VB_H = 92, 92, 840, 1148  # icon viewBox


BADGE = os.path.join(HERE, "assets", "app-store-badge-black.svg")  # Apple's official "Download on the App Store" badge


def draw_badge(pg, x, y, h):
    """Place Apple's badge unmodified at height h (mm). Colours map 1:1 to CMYK: black -> K100,
    the #A6A6A6 keyline -> K35, white lettering/logo -> white."""
    from svgelements import SVG, Shape
    svg = SVG.parse(BADGE)
    s = h / svg.height
    cmyk = {"#000000": BLACK, "#a6a6a6": (0, 0, 0, 1 - 0xA6 / 255), "#ffffff": WHITE}

    def tf(pt):
        return pg.X(x + pt[0] * s), pg.Y(y + pt[1] * s)

    for e in svg.elements():
        if isinstance(e, Shape) and e.fill is not None and str(e.fill) != "None":
            pg.svg_path(e.d(), Matrix(), tf, cmyk[str(e.fill).lower()])
    return svg.width * s


def rounded_square(x0, size, r):
    x1 = x0 + size
    return (f"M{x0 + r} {x0}H{x1 - r}A{r} {r} 0 0 1 {x1} {x0 + r}V{x1 - r}A{r} {r} 0 0 1 {x1 - r} {x1}"
            f"H{x0 + r}A{r} {r} 0 0 1 {x0} {x1 - r}V{x0 + r}A{r} {r} 0 0 1 {x0 + r} {x0}Z")


# black inset border like a real road sign: ring centred 22 units inside the edge, 14 wide
SIGN_BORDER_D = rounded_square(263.4, 497.2, 81) + rounded_square(277.4, 469.2, 67)


def draw_icon(pg, x, y, w, post_to=None, border=False, post=True, plate_mm=None, plate_weight="Bold"):
    s = w / VB_W  # mm per icon unit

    def tf(pt):
        return pg.X(x + (pt[0] - VB_X) * s), pg.Y(y + (pt[1] - VB_Y) * s)

    post_bottom = post_to if post_to is not None else y + (1240 - VB_Y) * s
    if post:
        pg.rect(x + (484 - VB_X) * s, y + (880 - VB_Y) * s, 56 * s, post_bottom - (y + (880 - VB_Y) * s), fill=BLACK)
    pg.svg_path(SIGN_D, Matrix(OUTER + " rotate(45 512 512)"), tf, YELLOW)
    if border:
        pg.svg_path(SIGN_BORDER_D, Matrix(OUTER + " rotate(45 512 512)"), tf, BLACK, even_odd=True)
    kiwi_m = Matrix(OUTER + " translate(512 520) scale(1.12) translate(-512 -520)"
                    " translate(496.5 534.4) scale(0.970) translate(-512 -512)")
    pg.svg_path(KIWI_D, kiwi_m, tf, BLACK)
    pg.rect(x + (12 - VB_X) * s, y + (950 - VB_Y) * s, 1000 * s, 260 * s, fill=TEAL, r=24 * s)  # name plate (wider than the sign)
    pg.rect(x + (30 - VB_X) * s, y + (968 - VB_Y) * s, 964 * s, 224 * s, stroke=WHITE, sw=12 * s, r=14 * s)  # inset border
    size_pt = (plate_mm if plate_mm else 176 * s) * 72 / 25.4
    cap = FONTS[plate_weight].cap * size_pt * 25.4 / 72
    plate_mid = y + (950 + 130 - VB_Y) * s  # vertical centre of the name plate
    pg.text(plate_weight, size_pt, x + (512 - VB_X) * s, plate_mid + cap / 2, "Kiwi Guide", WHITE,
            tracking_em=-2 / 128, align="center")
    return VB_H * s


# ---------------------------------------------------------------- layout helpers
def css_baseline(font, size_pt, top, lh, line):
    """Baseline (mm) of line N in a CSS block at `top` with unitless line-height `lh`."""
    f = FONTS[font]
    em = size_pt * 25.4 / 72
    box = lh * em
    return top + line * box + (box - (f.asc + f.desc) * em) / 2 + f.asc * em


def wrap_runs(runs, size_pt, width):
    """Greedy word wrap of [(weight, text), ...]; returns lines of [(weight, word)]."""
    em = size_pt * 25.4 / 72
    words = [(w, t) for w, txt in runs for t in txt.split()]
    lines, cur, cur_w = [], [], 0.0
    for wt, t in words:
        ww = FONTS[wt].width(t) * em
        sp = FONTS[wt].width(" ") * em if cur else 0.0
        if cur and cur_w + sp + ww > width:
            lines.append(cur)
            cur, cur_w = [], 0.0
            sp = 0.0
        cur.append((wt, t))
        cur_w += sp + ww
    lines.append(cur)
    return lines


def labelled_box(pg, x, y, w, h, label, size_pt, color, sw, r=0.0, weight="ExtraBold"):
    pg.rect(x, y, w, h, fill=WHITE, stroke=color, sw=sw, r=r)
    cap = FONTS[weight].cap * size_pt * 25.4 / 72
    pg.text(weight, size_pt, x + w / 2, y + h / 2 + cap / 2, label, color, align="center")


URL = "kiwiguide.app"
QR_FILES = {"poster": os.path.join(HERE, "qr", "poster.svg"),  # https://kiwiguide.app/go/poster (ct=poster)
            "card": os.path.join(HERE, "qr", "card.svg")}      # https://kiwiguide.app/go/card (ct=card)


def qr_modules(svg_path):
    """Read a `qrcode` (npm) SVG: returns (symbol size in modules incl. its 4-module quiet zone,
    list of dark runs as (x, y, width) in modules). The SVG draws each row as 1-unit strokes."""
    import re
    txt = open(svg_path, encoding="utf-8").read()
    n = int(re.search(r'viewBox="0 0 (\d+) \1"', txt).group(1))
    d = re.search(r'<path stroke="#000000" d="([^"]+)"', txt).group(1)
    toks = re.findall(r"[MmHh]|-?\d*\.?\d+", d)
    runs, x, y, i, cmd = [], 0.0, 0.0, 0, None
    while i < len(toks):
        if toks[i] in "MmHh":
            cmd = toks[i]
            i += 1
        if cmd == "M":
            x, y = float(toks[i]), float(toks[i + 1]); i += 2
        elif cmd == "m":
            x, y = x + float(toks[i]), y + float(toks[i + 1]); i += 2
        elif cmd in "Hh":
            w = float(toks[i]) - (x if cmd == "H" else 0); i += 1
            runs.append((x, y - 0.5, w))
            x += w
    return n, runs


def draw_qr(pg, x, y, size, svg_path):
    """Draw the QR symbol (with its own white quiet zone) as one K100 vector path filling a
    size x size mm square; returns (code size in mm without the quiet zone, module size in mm)."""
    n, runs = qr_modules(svg_path)
    quiet = 4
    u = size / n
    pg.rect(x, y, size, size, fill=WHITE)
    c = pg.c
    path = c.beginPath()
    for rx, ry, rw in runs:
        path.rect(pg.X(x + rx * u), pg.Y(y + (ry + 1) * u), rw * u * mm, u * mm)
    c.setFillColorCMYK(*BLACK)
    c.drawPath(path, stroke=0, fill=1)
    assert min(rx for rx, _, _ in runs) >= quiet and min(ry for _, ry, _ in runs) >= quiet, "4-module quiet zone"
    return (n - 2 * quiet) * u, u
SCREEN = os.path.join(HERE, "assets", "screen-map.png")  # app screenshot shown on the phone
_SCREEN_CMYK = None


_SCREEN_RGB = None


def screen_rgb():
    """The screenshot as RGB with the test-device distance pill painted out (cached)."""
    global _SCREEN_RGB
    if _SCREEN_RGB is None and os.path.exists(SCREEN):
        src = Image.open(SCREEN).convert("RGB")
        if os.path.basename(SCREEN) == "screen-map.png":
            from PIL import ImageDraw
            sx, sy = src.size[0] / 828, src.size[1] / 1792
            panel = src.getpixel((int(560 * sx), int(1480 * sy)))
            ImageDraw.Draw(src).rectangle([580 * sx, 1434 * sy, 802 * sx, 1516 * sy], fill=panel)
        _SCREEN_RGB = src
    return _SCREEN_RGB


def screen_crop_cmyk(box):
    """A crop of the screenshot (pixel box) separated with full grey replacement: K = 1 - max(RGB),
    CMY rescaled, so dark colours keep their hue (the app's teal prints teal) and ink stays <= 300%."""
    src = screen_rgb()
    if src is None:
        return None
    rgb = np.asarray(src.crop(box), dtype=np.float32) / 255.0
    k = 1.0 - rgb.max(axis=2, keepdims=True)
    denom = np.maximum(1.0 - k, 1e-6)
    cmy = np.where(k < 0.999, (1.0 - rgb - k) / denom, 0.0)
    cmyk = np.concatenate([cmy, k], axis=2)
    return Image.fromarray((np.clip(cmyk, 0, 1) * 255 + 0.5).astype(np.uint8), mode="CMYK")


def screen_image_true():
    """The whole screenshot separated with full grey replacement (see screen_crop_cmyk)."""
    src = screen_rgb()
    return None if src is None else screen_crop_cmyk((0, 0) + src.size)


def screen_image():
    """The screenshot as a CMYK image (simple conversion; the printer may re-separate with their profile)."""
    global _SCREEN_CMYK
    if _SCREEN_CMYK is None and os.path.exists(SCREEN):
        src = Image.open(SCREEN).convert("RGB")
        # hide the test-device distance pill ("1010.3 km") in the place panel with the panel's own colour
        if os.path.basename(SCREEN) == "screen-map.png":
            from PIL import ImageDraw
            sx, sy = src.size[0] / 828, src.size[1] / 1792  # coordinates measured on the 828x1792 capture
            panel = src.getpixel((int(560 * sx), int(1480 * sy)))
            d = ImageDraw.Draw(src)
            d.rectangle([580 * sx, 1434 * sy, 802 * sx, 1516 * sy], fill=panel)  # distance pill
        rgb = np.asarray(src, dtype=np.float32) / 255.0
        cmy = 1.0 - rgb
        kk = 0.7 * cmy.min(axis=2, keepdims=True)  # 70% grey-component replacement
        cmy = cmy - kk
        cmyk = np.concatenate([cmy, kk], axis=2)
        _SCREEN_CMYK = Image.fromarray((cmyk * 255 + 0.5).astype(np.uint8), mode="CMYK")
    return _SCREEN_CMYK


def build(pg, k, clear):
    """A4 layout (k = 1). `clear` = QR clear zone in mm."""
    tw, th = pg.tw, pg.th
    W = tw + 2 * BLEED
    M = 14 * k
    em_of = lambda size: size * k * 25.4 / 72
    XB, SB = FONTS["ExtraBold"], FONTS["SemiBold"]
    pg.rect(-BLEED, -BLEED, W, th + 2 * BLEED, fill=WHITE)

    # ================= header band
    em = em_of(26)
    padx = pady = 4.8 * k  # equal padding: 2.8 mm of yellow inside the frame all round
    tag_top = 11 * k
    tag_w = XB.width("Free for 2026:", -0.01) * em + 2 * padx
    tag_h = XB.cap * em + 2 * pady
    tag_bl = tag_top + pady + XB.cap * em
    em = em_of(56)
    bl = tag_top + tag_h + 4 * k + XB.cap * em
    lines = []
    for text in ("New Zealand", "travel planner"):
        assert M + XB.width(text, -0.02) * em <= tw - M, text
        lines.append((bl, text))
        last = bl
        bl += em
    ip_em = em_of(36)
    ip_bl = last + 0.22 * em + 3 * k + XB.cap * ip_em
    band_bottom = ip_bl + 11 * k
    pg.rect(-BLEED, -BLEED, W, band_bottom + BLEED, fill=TEAL)
    pg.rect(M, tag_top, tag_w, tag_h, fill=YELLOW, r=1.5 * k)
    pg.rect(M + 1.2 * k, tag_top + 1.2 * k, tag_w - 2.4 * k, tag_h - 2.4 * k, stroke=BLACK, sw=0.8 * k, r=0.8 * k)
    pg.text("ExtraBold", 26 * k, M + padx, tag_bl, "Free for 2026:", BLACK, tracking_em=-0.01)
    for y, text in lines:
        lsb = XB.tt["hmtx"][XB.tt.getBestCmap()[ord(text[0])]][1] / XB.upm
        pg.text("ExtraBold", 56 * k, M - lsb * em + 0.0098 * em, y, text, WHITE, tracking_em=-0.02)
    ip_w = pg.text("ExtraBold", 36 * k, M, ip_bl, "for iPhone", WHITE, tracking_em=-0.02)
    # App Store badge: right-aligned on the "for iPhone" line, centred on its cap height
    bh = 12 * k
    bw = bh * 119.66407 / 40
    bx, by = tw - M - bw, ip_bl - XB.cap * ip_em / 2 - bh / 2
    planner_end = M + XB.width(lines[-1][1], -0.02) * em
    assert M + ip_w + bh / 4 <= bx, "badge clear space from 'for iPhone'"
    assert planner_end + bh / 4 <= bx or by - bh / 4 >= lines[-1][0] + 0.22 * em, "badge clear space from the headline"
    assert by + bh + bh / 4 <= band_bottom, "badge inside the band"
    draw_badge(pg, bx, by, bh)

    # ================= left column: signpost (diamond, name plate, yellow QR plate on one grey post)
    sign_w = 64 * k
    s_ = sign_w / VB_W
    plate_w = 1000 * s_  # name plate width; the QR plate matches it
    xc = M + plate_w / 2
    sign_x = xc - (512 - VB_X) * s_
    assert sign_x + (12 - VB_X) * s_ >= SAFE - 0.01
    sign_top = band_bottom + 6.4 * k
    plate_bottom = sign_top + (1210 - VB_Y) * s_
    post_w = 80 * s_
    post_top = sign_top + (880 - VB_Y) * s_
    pg.rect(xc - post_w / 2, post_top, post_w, th + BLEED - post_top, fill=POST_GREY)  # ends exactly at the bleed edge
    draw_icon(pg, sign_x, sign_top, sign_w, border=True, post=False, plate_mm=em_of(36), plate_weight="ExtraBold")

    qp_x, qp_top, qp_w = M, plate_bottom + 2 * k, plate_w
    inset, line = 1.2 * k, 0.8 * k
    edge = inset + line
    em = em_of(36)
    bl1 = qp_top + edge + 3 * k + XB.cap * em
    bl2 = bl1 + em
    tile = qp_w - 2 * edge - 3 * k  # white tile = QR + clear zone; 1.5 mm of yellow at the sides and bottom
    qs = min(62 * k, tile - 2 * clear)
    tile_y = bl2 + 2.5 * k
    qp_bottom = tile_y + tile + 1.5 * k + edge
    assert qs >= 60 * k, ("QR too small", qs)
    assert qp_bottom <= th - SAFE + 0.01, ("QR plate inside the safe area", qp_bottom)
    pg.rect(qp_x, qp_top, qp_w, qp_bottom - qp_top, fill=YELLOW, r=1.5 * k)
    pg.rect(qp_x + inset, qp_top + inset, qp_w - 2 * inset, qp_bottom - qp_top - 2 * inset,
            stroke=BLACK, sw=line, r=0.8 * k)
    for bl_, t in ((bl1, "Scan to"), (bl2, "download.")):
        assert XB.width(t) * em <= qp_w - 2 * edge - 4 * k, t
        pg.text("ExtraBold", 36 * k, xc, bl_, t, BLACK, align="center")
    tx = xc - tile / 2
    pg.rect(tx, tile_y, tile, tile, fill=WHITE)
    code, module = draw_qr(pg, tx, tile_y, tile, QR_FILES["poster"])  # the tile is the code's quiet zone
    assert code >= 40 * k, ("printed code at least 4 cm on the poster", code)

    # ================= right column: phone (whole; 70 mm screen keeps the 828 px screenshot at 300 ppi),
    # proof line and address as its caption
    img = screen_image()
    pw = 76 * k
    px = tw - M - pw
    assert px - (M + qp_w) >= 10 * k, "gap between the signpost and the phone"
    b = 3 * k
    sw_ = pw - 2 * b
    aspect = img.size[1] / img.size[0] if img else 1792 / 828
    ih = sw_ * aspect
    ptop = sign_top
    pg.rect(px, ptop, pw, ih + 2 * b, fill=BLACK, r=11 * k)
    sx, sy = px + b, ptop + b
    if img is None:
        pg.rect(sx, sy, sw_, ih, fill=TEAL_TINT, r=8 * k)
        cap = SB.cap * em_of(16)
        pg.text("SemiBold", 16 * k, sx + sw_ / 2, sy + ih / 2 + cap / 2, "screenshot", TEAL, align="center")
    else:
        assert img.size[0] / (sw_ / 25.4) >= 299, "screenshot under 300 ppi"
        c = pg.c
        c.saveState()
        clip = c.beginPath()
        clip.roundRect(pg.X(sx), pg.Y(sy + ih), sw_ * mm, ih * mm, 8 * k * mm)
        c.clipPath(clip, stroke=0, fill=0)
        c.drawImage(ImageReader(img), pg.X(sx), pg.Y(sy + ih), sw_ * mm, ih * mm)
        c.restoreState()
    cem = em_of(26)
    cbl = ptop + ih + 2 * b + 2 * k + XB.cap * cem
    for t in ("500+ places,", "26 trips."):
        assert XB.width(t) * cem <= pw, t
        pg.text("ExtraBold", 26 * k, px, cbl, t, BLACK)
        cbl += cem * 1.05
    gem = em_of(26)
    natural = cbl - cem * 1.05 + 0.05 * cem + 3 * k + XB.cap * gem
    assert natural <= tile_y + tile + 0.3 * k, ("caption longer than the QR column", natural, tile_y + tile)
    gbl = tile_y + tile  # last caption baseline aligned with the bottom of the QR tile
    assert gbl + 0.25 * gem <= th - SAFE, ("guide.kiwi inside the safe area", gbl + 0.25 * gem)
    pg.text("ExtraBold", 26 * k, px, gbl, URL, TEAL)
    print(f"  band {band_bottom:.1f}  sign top {sign_top:.1f}  phone bottom {ptop + ih + 2 * b:.1f}  "
          f"tile bottom {tile_y + tile:.1f}  plate bottom {qp_bottom:.1f}  guide bl {gbl:.1f}")
    return code


def build_card(pg, k, clear):
    """A6 card (105 x 148 mm), read in the hand. White card: headline at the top with the offer as a
    black tag on line 1, the Kiwi Guide signpost as the hero with the app on a phone beside it, and
    a full-bleed yellow band at the foot that the post and the phone both stand on: call to action,
    App Store badge, address and the QR code."""
    tw, th = pg.tw, pg.th
    W = tw + 2 * BLEED
    M = 7.0                      # text and artwork margin on every side
    X1 = tw - M
    em_of = lambda size: size * 25.4 / 72
    XB = FONTS["ExtraBold"]
    H, TH = 22, -0.016           # headline
    C, TC = 18, -0.01            # call to action and address
    S, TS = 14, 0.0              # tag and proof line
    hem, cem, sem = em_of(H), em_of(C), em_of(S)
    gid = lambda ch: XB.tt.getBestCmap()[ord(ch)]
    lsb = lambda t, e: XB.tt["hmtx"][gid(t[0])][1] / XB.upm * e

    def ink_right(t, e, tr):     # right edge of the ink of the last glyph, from the text origin
        from fontTools.pens.boundsPen import BoundsPen
        name = gid(t[-1])
        gs = XB.tt.getGlyphSet()
        bp = BoundsPen(gs)
        gs[name].draw(bp)
        rsb = XB.tt["hmtx"][name][0] - bp.bounds[2] if bp.bounds else 0.0
        return XB.width(t, tr) * e - rsb / XB.upm * e

    pg.rect(-BLEED, -BLEED, W, th + 2 * BLEED, fill=WHITE)

    # ---- headline block on white: [Free for 2026:] New Zealand / travel planner for iPhone / proof
    padx, pady = 0.3 * sem, 1.3
    tag_w = XB.width("Free for 2026:", TS) * sem + 2 * padx
    tag_h = XB.cap * sem + 2 * pady
    tag_top = M
    bl1 = tag_top + tag_h / 2 + XB.cap * hem / 2          # tag centred on the cap height of line 1
    bl2 = bl1 + 1.04 * hem
    bl3 = bl2 + XB.desc * hem + 2.6 + XB.cap * sem
    nz_x = M + tag_w + 0.3 * hem
    assert nz_x - lsb("N", hem) + ink_right("New Zealand", hem, TH) <= X1 + 0.05, "line 1"
    assert M - lsb("t", hem) + ink_right("travel planner for iPhone", hem, TH) <= X1 + 0.05, "line 2"
    pg.rect(M, tag_top, tag_w, tag_h, fill=BLACK, r=0.8)
    pg.text("ExtraBold", S, M + padx, tag_top + pady + XB.cap * sem, "Free for 2026:", WHITE, tracking_em=TS)
    pg.text("ExtraBold", H, nz_x - lsb("N", hem), bl1, "New Zealand", BLACK, tracking_em=TH)
    pg.text("ExtraBold", H, M - lsb("t", hem), bl2, "travel planner for iPhone", BLACK, tracking_em=TH)
    pg.text("ExtraBold", S, M - lsb("5", sem), bl3, "500+ places, 26 trips.", BLACK, tracking_em=TS)
    hero_top = bl3 + XB.desc * sem + 3.6

    # ---- yellow band geometry: QR tile bottom-right; the band bleeds off the foot
    qs = 28.0
    tile = qs + 2 * clear
    gbl = th - M                                   # address baseline = tile bottom, 7 mm above the trim
    ty = gbl - tile
    tx = X1 - tile
    band_top = ty - 4.6

    # ---- signpost hero: galvanised post into the band, diamond, name plate on the left margin
    post_gap = 4.0
    s_ = (band_top - post_gap - hero_top) / (1210 - VB_Y)
    sign_w = s_ * VB_W
    sign_x = M + (VB_X - 12) * s_
    plate_bottom = hero_top + (1210 - VB_Y) * s_
    plate_right = sign_x + (1012 - VB_X) * s_
    pg.rect(sign_x + (484 - VB_X) * s_, hero_top + (880 - VB_Y) * s_, 56 * s_,
            band_top + 2 - (hero_top + (880 - VB_Y) * s_), fill=BLACK)
    draw_icon(pg, sign_x, hero_top, sign_w, border=True, post=False, plate_mm=hem, plate_weight="ExtraBold")

    # ---- phone on the right margin, same height as the signpost, fully above the band
    img = screen_image()
    b = 1.4
    ph = band_top + 0.2 - hero_top                 # base sits on the band edge, like the post
    aspect = img.size[1] / img.size[0] if img else 1792 / 828
    sw_ = (ph - 2 * b) / aspect
    pw = sw_ + 2 * b
    px = X1 - pw
    assert px - plate_right >= 3.0, ("phone clear of the name plate", px - plate_right)
    ih = sw_ * aspect
    pg.rect(px, hero_top, pw, ph, fill=BLACK, r=0.165 * pw)
    sx, sy = px + b, hero_top + b
    if img is None:
        pg.rect(sx, sy, sw_, ih, fill=TEAL_TINT, r=0.14 * sw_)
    else:
        c = pg.c
        c.saveState()
        clip = c.beginPath()
        clip.roundRect(pg.X(sx), pg.Y(sy + ih), sw_ * mm, ih * mm, 0.14 * sw_ * mm)
        c.clipPath(clip, stroke=0, fill=0)
        c.drawImage(ImageReader(img), pg.X(sx), pg.Y(sy + ih), sw_ * mm, ih * mm)
        c.restoreState()

    # ---- yellow band: call to action, badge, address (left); QR on its white tile (right)
    pg.rect(-BLEED, band_top, W, th + BLEED - band_top, fill=YELLOW)
    pg.rect(tx, ty, tile, tile, fill=WHITE)
    code, module = draw_qr(pg, tx, ty, tile, QR_FILES["card"])  # the tile is the code's quiet zone
    assert code >= 25.0, ("printed code at least 25 mm on the card", code)
    c1 = ty + XB.cap * cem
    c2 = c1 + 1.12 * cem
    for y, t in ((c1, "Scan to"), (c2, "download.")):
        pg.text("ExtraBold", C, M - lsb(t, cem), y, t, BLACK, tracking_em=TC)
    pg.text("ExtraBold", S, M - lsb("g", sem), gbl, URL, BLACK, tracking_em=TS)
    bh = 10.6                                     # Apple's minimum is 10 mm
    bw = bh * 119.66407 / 40
    by = (c2 + gbl - XB.cap * sem) / 2 - bh / 2
    assert M + bw + bh / 4 <= tx, "badge clear space (tile)"
    assert by - c2 >= bh / 4 and (gbl - XB.cap * sem) - (by + bh) >= bh / 4, "badge clear space (text)"
    draw_badge(pg, M, by, bh)
    print(f"  card: hero {hero_top:.1f}  sign {sign_w:.1f} wide to {plate_bottom:.1f}  phone {pw:.1f}x{ph:.1f}  "
          f"band {band_top:.1f}  tile {ty:.1f}-{ty + tile:.1f}  screen {img.size[0] / (sw_ / 25.4) if img else 0:.0f} ppi")
    return code


RICH_BLACK = (0.6, 0.4, 0.4, 1.0)  # 240% field black for the night poster; K100 stays for text and the kiwi


def build_night(pg, k, clear):
    """A4 poster B3, a kiwi crossing sign at night, on one left-hand axis. Rich-black field; the
    offer as a black-on-yellow tag, the headline on three lines, the signpost under it on the left
    and the full app screen on a phone at the right, both standing on a full-bleed yellow band
    that carries the proof line, the call to action, a 20 mm App Store badge, the address and a
    60 mm QR code."""
    tw, th = pg.tw, pg.th
    W = tw + 2 * BLEED
    M = 14 * k
    X1 = tw - M
    em_of = lambda size: size * k * 25.4 / 72
    XB, B = FONTS["ExtraBold"], FONTS["Bold"]
    lsb = lambda f, t, e: f.tt["hmtx"][f.tt.getBestCmap()[ord(t[0])]][1] / f.upm * e
    pg.rect(-BLEED, -BLEED, W, th + 2 * BLEED, fill=RICH_BLACK)

    # ---- two sizes: 46 pt headline; 40 pt for the tag, proof line, call to action and address
    H, S, TH, TS = 46, 40, -0.016, -0.005
    hem, sem = em_of(H), em_of(S)

    # ---- yellow ground band: proof line across the top, then the text column and the QR tile
    n_mod, _ = qr_modules(QR_FILES["poster"])
    u = 60 * k / (n_mod - 8)
    tile = n_mod * u
    pad = 8 * k
    band_top = th - pad - tile - 6 * k - B.desc * sem - B.cap * sem - pad
    pbl = band_top + pad + B.cap * sem                 # proof baseline
    ty = pbl + B.desc * sem + 6 * k
    tx = X1 - tile

    # ---- headline block, left: tag, three lines
    tpad = 4 * k
    tag_w = XB.width("Free for 2026:", TS) * sem + 2 * tpad
    tag_h = XB.cap * sem + 2 * tpad
    tag_top = M
    pg.rect(M, tag_top, tag_w, tag_h, fill=YELLOW, r=1.5 * k)
    pg.text("ExtraBold", S, M + tpad, tag_top + tpad + XB.cap * sem, "Free for 2026:", BLACK, tracking_em=TS)
    bl1 = tag_top + tag_h + 5 * k + XB.cap * hem
    bl2 = bl1 + 1.0 * hem
    bl3 = bl2 + 1.0 * hem
    line_end = M
    for y, t in ((bl1, "New Zealand"), (bl2, "travel planner"), (bl3, "for iPhone")):
        w = pg.text("ExtraBold", H, M - lsb(XB, t, hem), y, t, WHITE, tracking_em=TH)
        line_end = max(line_end, M - lsb(XB, t, hem) + w)
    block_bottom = bl3 + XB.desc * hem

    # ---- phone, right column, the whole screen, standing on the band
    img = screen_image_true()
    aspect = img.size[1] / img.size[0] if img else 1792 / 828
    b = 2.0 * k
    pw = 66 * k
    sw_ = pw - 2 * b
    ph = sw_ * aspect + 2 * b
    px = X1 - pw
    ptop = band_top + 0.2 - ph
    assert px - max(line_end, M + tag_w) >= 6 * k, ("phone clear of the headline", px - line_end)
    assert ptop >= tag_top + tag_h + 4 * k, ("phone below the tag", ptop)
    ppi = img.size[0] / (sw_ / 25.4) if img else 0
    assert ppi >= 300, ("screenshot resolution", ppi)
    pg.rect(px, ptop, pw, ph, fill=BLACK, r=0.165 * pw)
    pg.rect(px + 0.8 * k, ptop + 0.8 * k, pw - 1.6 * k, ph - 1.6 * k, stroke=WHITE, sw=0.5 * k, r=0.15 * pw)
    sx, sy = px + b, ptop + b
    c = pg.c
    c.saveState()
    clip = c.beginPath()
    clip.roundRect(pg.X(sx), pg.Y(sy + sw_ * aspect), sw_ * mm, sw_ * aspect * mm, 0.12 * sw_ * mm)
    c.clipPath(clip, stroke=0, fill=0)
    if img is not None:
        c.drawImage(ImageReader(img), pg.X(sx), pg.Y(sy + sw_ * aspect), sw_ * mm, sw_ * aspect * mm)
    c.restoreState()

    # ---- signpost, left column, as large as the space under the headline allows, on the band
    sign_top = block_bottom + 7 * k
    plate_bottom = band_top - 8 * k
    s_ = (plate_bottom - sign_top) / (1210 - VB_Y)
    sign_w = s_ * VB_W
    plate_w = 1000 * s_
    sign_x = M + (VB_X - 12) * s_
    assert sign_x + (1012 - VB_X) * s_ + 6 * k <= px, "sign clear of the phone"
    pg.rect(sign_x + (484 - VB_X) * s_, sign_top + (880 - VB_Y) * s_, 56 * s_,
            band_top + 2 - (sign_top + (880 - VB_Y) * s_), fill=POST_GREY)
    key = 1.0 * k
    f = 1 + key / (420 * 1.2608 * s_)
    tf_ = lambda pt: (pg.X(sign_x + (pt[0] - VB_X) * s_), pg.Y(sign_top + (pt[1] - VB_Y) * s_))
    pg.svg_path(SIGN_D, Matrix(f"translate(512 512) scale({f:.5f}) translate(-512 -512) " + OUTER + " rotate(45 512 512)"), tf_, WHITE)
    plate_pt = 0.84 * plate_w / (XB.width("Kiwi Guide", -2 / 128) * 25.4 / 72 * k)
    draw_icon(pg, sign_x, sign_top, sign_w, border=True, post=False, plate_mm=em_of(plate_pt), plate_weight="ExtraBold")

    # ---- band
    pg.rect(-BLEED, band_top, W, th + BLEED - band_top, fill=YELLOW)
    assert M + B.width("500+ places, 26 trips.", 0.0) * sem <= X1, "proof line"
    pg.text("Bold", S, M - lsb(B, "5", sem), pbl, "500+ places, 26 trips.", BLACK, tracking_em=0.0)
    code, module = draw_qr(pg, tx, ty, tile, QR_FILES["poster"])
    assert abs(code - 60 * k) < 0.05, code
    c1 = ty + XB.cap * sem
    c2 = c1 + 1.04 * sem
    for y, t in ((c1, "Scan to"), (c2, "download.")):
        assert M + XB.width(t, TS) * sem <= tx - 4 * k, t
        pg.text("ExtraBold", S, M - lsb(XB, t, sem), y, t, BLACK, tracking_em=TS)
    abl = ty + tile
    pg.text("Bold", S, M - lsb(B, "k", sem), abl, URL, BLACK, tracking_em=0.0)
    bh = 20 * k
    bw = bh * 119.66407 / 40
    by = (c2 + abl - B.cap * sem) / 2 - bh / 2
    assert M + bw + bh / 4 <= tx and by - c2 >= bh / 4 and (abl - B.cap * sem) - (by + bh) >= bh / 4, "badge clear space"
    draw_badge(pg, M, by, bh)
    print(f"  night: headline to {block_bottom:.1f}  sign {sign_w:.1f} wide at {sign_top:.1f}-{plate_bottom:.1f} (plate {plate_w:.1f}, {plate_pt:.0f} pt)  "
          f"phone {pw:.1f}x{ph:.1f} at x {px:.1f} y {ptop:.1f} ({ppi:.0f} ppi)  band {band_top:.1f}  proof bl {pbl:.1f}  tile {ty:.1f}-{ty + tile:.1f}  badge {bh:.0f}  code {code:.1f}")
    return code


PIECES = {  # name: (trim w, trim h, scale k vs A4, QR clear zone mm, builder)
    "kiwi-guide_A6-card": (105, 148, 1.0, 4.5, "card"),
    "kiwi-guide_A4-poster": (210, 297, 1.0, 4.5, "poster"),
    "kiwi-guide_A4-poster-night": (210, 297, 1.0, 4.5, "night"),
    # A3 (297 x 420, k = sqrt(2), clear 4.5 * sqrt(2)) is on hold until a higher-resolution screenshot is available
}


def strip_unused_font(path):
    """ReportLab writes 'BT /F1 12 Tf 14.4 TL ET' and a Helvetica resource on every page even though all
    text here is outlined. Remove both, then copy the page into a fresh PDF so the unreferenced font
    object is not carried over (PDF/X preflight then sees no fonts at all)."""
    from pypdf import PdfReader, PdfWriter
    from pypdf.generic import NameObject
    src = PdfReader(path)
    out = PdfWriter()
    for page in src.pages:
        res = page.get("/Resources")
        if res is not None and NameObject("/Font") in res.get_object():
            del res.get_object()[NameObject("/Font")]
        wp = out.add_page(page)
        cs = wp.get_contents()
        cs.set_data(cs.get_data().replace(b"BT /F1 12 Tf 14.4 TL ET", b""))
        wp.replace_contents(cs)
    if src.metadata:
        out.add_metadata({k: v for k, v in src.metadata.items()})
    with open(path, "wb") as fh:
        out.write(fh)


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, (tw, th, k, clear, kind) in PIECES.items():
        title = name.replace("_", " ")
        for suffix, marks in (("print", True), ("bleed", False)):
            path = os.path.join(OUT, f"{name}_{suffix}.pdf")
            pg = Page(path, tw, th, marks, title)
            pg.begin_art()
            qs = {"card": build_card, "night": build_night}.get(kind, build)(pg, k, clear)
            pg.end_art()
            pg.finish()
            strip_unused_font(path)
        wpx, hpx = round((tw + 2 * BLEED) / 25.4 * 300), round((th + 2 * BLEED) / 25.4 * 300)
        subprocess.run(["pdftoppm", "-r", "300", "-png", "-singlefile", "-x", "0", "-y", "0",
                        "-W", str(wpx), "-H", str(hpx),
                        os.path.join(OUT, f"{name}_bleed.pdf"), os.path.join(OUT, f"{name}_300dpi")], check=True)
        print("built", name, f"QR {qs:.1f} mm", f"PNG {wpx}x{hpx}")


if __name__ == "__main__":
    main()
