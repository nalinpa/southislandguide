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
OUT = os.path.join(HERE, "out")
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


def rounded_square(x0, size, r):
    x1 = x0 + size
    return (f"M{x0 + r} {x0}H{x1 - r}A{r} {r} 0 0 1 {x1} {x0 + r}V{x1 - r}A{r} {r} 0 0 1 {x1 - r} {x1}"
            f"H{x0 + r}A{r} {r} 0 0 1 {x0} {x1 - r}V{x0 + r}A{r} {r} 0 0 1 {x0 + r} {x0}Z")


# black inset border like a real road sign: ring centred 22 units inside the edge, 14 wide
SIGN_BORDER_D = rounded_square(263.4, 497.2, 81) + rounded_square(277.4, 469.2, 67)


def draw_icon(pg, x, y, w, post_to=None, border=False):
    s = w / VB_W  # mm per icon unit

    def tf(pt):
        return pg.X(x + (pt[0] - VB_X) * s), pg.Y(y + (pt[1] - VB_Y) * s)

    post_bottom = post_to if post_to is not None else y + (1240 - VB_Y) * s
    pg.rect(x + (484 - VB_X) * s, y + (880 - VB_Y) * s, 56 * s, post_bottom - (y + (880 - VB_Y) * s), fill=BLACK)  # post
    pg.svg_path(SIGN_D, Matrix(OUTER + " rotate(45 512 512)"), tf, YELLOW)
    if border:
        pg.svg_path(SIGN_BORDER_D, Matrix(OUTER + " rotate(45 512 512)"), tf, BLACK, even_odd=True)
    kiwi_m = Matrix(OUTER + " translate(512 520) scale(1.12) translate(-512 -520)"
                    " translate(496.5 534.4) scale(0.970) translate(-512 -512)")
    pg.svg_path(KIWI_D, kiwi_m, tf, BLACK)
    pg.rect(x + (12 - VB_X) * s, y + (950 - VB_Y) * s, 1000 * s, 260 * s, fill=TEAL, r=24 * s)  # name plate (wider than the sign)
    pg.rect(x + (30 - VB_X) * s, y + (968 - VB_Y) * s, 964 * s, 224 * s, stroke=WHITE, sw=12 * s, r=14 * s)  # inset border
    size_pt = 176 * s * 72 / 25.4
    pg.text("Bold", size_pt, x + (512 - VB_X) * s, y + (1144 - VB_Y) * s, "Kiwi Guide", WHITE,
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


URL = "guide.kiwi"
SCREEN = os.path.join(HERE, "assets", "screen-map.png")  # app screenshot shown on the phone
_SCREEN_CMYK = None


def screen_image():
    """The screenshot as a CMYK image (simple conversion; the printer may re-separate with their profile)."""
    global _SCREEN_CMYK
    if _SCREEN_CMYK is None and os.path.exists(SCREEN):
        src = Image.open(SCREEN).convert("RGB")
        # hide the test-device distance pill ("1010.3 km") in the place panel with the panel's own colour
        if src.size == (828, 1792):
            from PIL import ImageDraw
            ImageDraw.Draw(src).rectangle([580, 1434, 802, 1516], fill=src.getpixel((560, 1480)))
        rgb = np.asarray(src, dtype=np.float32) / 255.0
        cmy = 1.0 - rgb
        kk = cmy.min(axis=2, keepdims=True)  # full grey-component replacement keeps total ink low
        cmy = np.where(kk < 1.0, (cmy - kk) / np.maximum(1.0 - kk, 1e-6), 0.0)
        cmyk = np.concatenate([cmy, kk], axis=2)
        _SCREEN_CMYK = Image.fromarray((cmyk * 255 + 0.5).astype(np.uint8), mode="CMYK")
    return _SCREEN_CMYK


def build(pg, k, clear):
    """One layout for every size: A4 measurements (mm, pt) scaled by k. `clear` = QR clear zone in mm."""
    tw, th = pg.tw, pg.th
    W = tw + 2 * BLEED
    M = 14 * k  # visual margin
    em_of = lambda size: size * k * 25.4 / 72  # A4 point size -> em in mm at this scale
    XB, SB = FONTS["ExtraBold"], FONTS["SemiBold"]
    pg.rect(-BLEED, -BLEED, W, th + 2 * BLEED, fill=WHITE)

    # phone geometry first (the header panel ends behind it)
    img = screen_image()
    px, pw = 112 * k, 84 * k
    b = 3 * k
    sw_ = pw - 2 * b
    ih = sw_ * (img.size[1] / img.size[0] if img else 1792 / 828)
    ph = ih + 2 * b
    ptop = 100 * k
    panel_bottom = 116 * k

    # ---- dark teal header panel, full bleed (echoes the app's own header)
    pg.rect(-BLEED, -BLEED, W, panel_bottom + BLEED, fill=TEAL)

    # "Free for 2026:" as a yellow tag, black text
    em = em_of(38)
    padx, pady = 0.25 * em, 0.22 * em
    tag_w = XB.width("Free for 2026:", -0.01) * em + 2 * padx
    tag_h = XB.cap * em + 2 * pady
    pg.rect(M, M, tag_w, tag_h, fill=YELLOW, r=0.12 * em)
    pg.text("ExtraBold", 38 * k, M + padx, M + pady + XB.cap * em, "Free for 2026:", BLACK, tracking_em=-0.01)

    em = em_of(66)
    bl = M + tag_h + 5 * k + XB.cap * em
    for text in ("New Zealand", "travel planner"):
        assert M + XB.width(text, -0.02) * em <= tw - M, text
        pg.text("ExtraBold", 66 * k, M, bl, text, WHITE, tracking_em=-0.02)
        last = bl
        bl += em
    bl = last + 0.22 * em + 3 * k + XB.cap * em_of(40)
    pg.text("ExtraBold", 40 * k, M, bl, "for iPhone", WHITE, tracking_em=-0.02)
    bl += 0.2 * em_of(40) + 4 * k + SB.cap * em_of(25)
    assert M + SB.width("500+ places, 26 trips.") * em_of(25) <= px - 4 * k
    pg.text("SemiBold", 25 * k, M, bl, "500+ places, 26 trips.", WHITE)
    assert bl + 0.2 * em_of(25) <= panel_bottom - 3 * k, "header text inside the panel"

    # ---- phone, whole, overlapping the bottom of the header panel
    gap = 1.5 * k
    assert px + pw <= tw - SAFE and ptop + ph <= th - SAFE, "phone inside safe area"
    pg.rect(px - gap, ptop - gap, pw + 2 * gap, ph + 2 * gap, fill=WHITE, r=13 * k + gap)
    pg.rect(px, ptop, pw, ph, fill=BLACK, r=13 * k)
    sx, sy = px + b, ptop + b
    if img is None:
        pg.rect(sx, sy, sw_, ih, fill=TEAL_TINT, r=10 * k)
        cap = SB.cap * em_of(16)
        pg.text("SemiBold", 16 * k, sx + sw_ / 2, sy + ih / 2 + cap / 2, "screenshot", TEAL, align="center")
    else:
        c = pg.c
        c.saveState()
        clip = c.beginPath()
        clip.roundRect(pg.X(sx), pg.Y(sy + ih), sw_ * mm, ih * mm, 10 * k * mm)
        c.clipPath(clip, stroke=0, fill=0)
        c.drawImage(ImageReader(img), pg.X(sx), pg.Y(sy + ih), sw_ * mm, ih * mm)
        c.restoreState()

    # ---- sign lockup on white, left column
    sign_w = 52 * k
    sign_x = M + 5 * k
    s_ = sign_w / VB_W
    assert sign_x + (12 - VB_X) * s_ >= SAFE, "plate inside safe margin"
    sign_top = panel_bottom + 4 * k
    draw_icon(pg, sign_x, sign_top, sign_w, border=True)
    sign_bottom = sign_top + VB_H * s_

    # ---- call to action + QR, left column, plain white
    col_r = px - gap - 4 * k
    em = em_of(28)
    bl = sign_bottom + 8 * k + XB.cap * em
    assert M + XB.width("Scan to download.") * em <= col_r
    pg.text("ExtraBold", 28 * k, M, bl, "Scan to download.", BLACK)
    em = em_of(24)
    bl += 4 * k + SB.cap * em
    pg.text("SemiBold", 24 * k, M, bl, URL, BLACK)
    qy = bl + 0.22 * em + clear
    qs = min(62 * k, th - SAFE - qy)
    assert qs >= (60 if k >= 1 else 25), ("QR too small", qs)
    assert M + qs + clear <= px - gap, "QR clear zone vs phone"
    labelled_box(pg, M, qy, qs, qs, "QR", 36 * k, BLACK, 1.0 * k)
    return qs


PIECES = {  # name: (trim w, trim h, scale k vs A4, QR clear zone mm)
    "kiwi-guide_A6-card": (105, 148, 0.5, 4.0),
    "kiwi-guide_A4-poster": (210, 297, 1.0, 5.0),
    "kiwi-guide_A3-poster": (297, 420, math.sqrt(2), 5.0 * math.sqrt(2)),
}


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, (tw, th, k, clear) in PIECES.items():
        title = name.replace("_", " ")
        for suffix, marks in (("print", True), ("bleed", False)):
            path = os.path.join(OUT, f"{name}_{suffix}.pdf")
            pg = Page(path, tw, th, marks, title)
            pg.begin_art()
            qs = build(pg, k, clear)
            pg.end_art()
            pg.finish()
        wpx, hpx = int((tw + 2 * BLEED) / 25.4 * 300), int((th + 2 * BLEED) / 25.4 * 300)
        subprocess.run(["pdftoppm", "-r", "300", "-png", "-singlefile", "-x", "0", "-y", "0",
                        "-W", str(wpx), "-H", str(hpx),
                        os.path.join(OUT, f"{name}_bleed.pdf"), os.path.join(OUT, f"{name}_300dpi")], check=True)
        print("built", name, f"QR {qs:.1f} mm", f"PNG {wpx}x{hpx}")


if __name__ == "__main__":
    main()
