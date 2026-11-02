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
import os
import subprocess

import uharfbuzz as hb
from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont
from reportlab.lib.units import mm
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
TEAL = (0.90, 0.35, 0.40, 0.30)
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


HEADLINE = [  # (text, weight, size in A4 points, highlighted)
    ("Free for 2026:", "ExtraBold", 28, True),
    ("New Zealand", "ExtraBold", 66, False),
    ("travel planner", "ExtraBold", 66, False),
    ("for iPhone", "ExtraBold", 28, False),
]


def build(pg, k, clear, sign_border):
    """One layout for every size: A4 coordinates (mm) scaled by k. `clear` = QR clear zone in mm."""
    tw, th = pg.tw, pg.th
    W = tw + 2 * BLEED
    M = 14 * k  # visual margin
    pt = lambda size: size * k * 25.4 / 72  # A4 points -> mm em at this size
    pg.rect(-BLEED, -BLEED, W, th + 2 * BLEED, fill=WHITE)

    # ---- headline: small highlighted lead-in, two huge lines, small tail
    f = FONTS["ExtraBold"]
    y = M
    prev_desc = 0.0
    for i, (text, wt, size, hi) in enumerate(HEADLINE):
        em = pt(size)
        pad = 0.12 * em if hi else 0.0
        gap = (2.5 * k if i else 0.0)
        bl = y + prev_desc + gap + pad + f.cap * em
        if hi:
            fw = f.width(text, -0.02) * em
            pg.rect(M - pad, bl - f.cap * em - pad, fw + 2 * pad - 0.02 * em, f.cap * em + 2 * pad, fill=YELLOW)
        assert M + f.width(text, -0.02) * em <= tw - M + 0.01, text
        pg.text(wt, size * k, M, bl, text, BLACK, tracking_em=-0.02)
        y = bl
        prev_desc = (0.22 * em if text != "Free for 2026:" else 0.0) + pad
    head_bottom = y + prev_desc

    # ---- hero row: sign on the left planted on a road, phone on the right running off the bottom
    top = head_bottom + 10 * k
    road_t, road_h = top + 104 * k, 13 * k
    # road strip with yellow centre-line dashes, full bleed
    pg.rect(-BLEED, road_t, W, road_h, fill=BLACK)
    dl, dg, dh = 16 * k, 12 * k, 2.4 * k
    x = -BLEED - dl / 3
    while x < tw + BLEED:
        x0, x1 = max(x, -BLEED), min(x + dl, tw + BLEED)
        pg.rect(x0, road_t + (road_h - dh) / 2, x1 - x0, dh, fill=YELLOW)
        x += dl + dg
    draw_icon(pg, M, top, 70 * k, post_to=road_t, border=sign_border)

    # phone: black body, mid-teal screen placeholder, island
    px, pw = 104 * k, 88 * k
    pg.rect(px, top, pw, th + BLEED - top + 20 * k, fill=BLACK, r=14 * k)
    b = 3 * k
    sx, sy, sw_ = px + b, top + b, pw - 2 * b
    pg.rect(sx, sy, sw_, th + BLEED - sy + 20 * k, fill=TEAL_TINT, r=11 * k)
    pg.rect(px + pw / 2 - 11 * k, sy + 3 * k, 22 * k, 6 * k, fill=BLACK, r=3 * k)

    # ---- QR on a white tile overlapping the phone, below the road
    qs = 62 * k
    qx, qy = 102 * k + clear - 4 * k, road_t + road_h + 12 * k
    pg.rect(qx - clear, qy - clear, qs + 2 * clear, qs + 2 * clear, fill=WHITE, r=2 * k)
    labelled_box(pg, qx, qy, qs, qs, "QR", 36 * k, BLACK, 1.0 * k)
    assert qx + qs <= tw - SAFE and qy + qs <= th - SAFE, "QR inside safe area"

    # screenshot label centred in the visible screen above the road
    cap = FONTS["SemiBold"].cap * pt(16)
    pg.text("SemiBold", 16 * k, sx + sw_ / 2, (sy + road_t) / 2 + cap / 2, "screenshot", TEAL, align="center")

    # ---- supporting text + address, left column under the road
    tx, tsz = M, 20
    em = pt(tsz)
    col_w = qx - clear - 6 * k - tx
    lines = [("Medium", "500+ places, 26 trips."), ("ExtraBold", "Scan to download."), ("SemiBold", URL)]
    bl = qy + FONTS["Medium"].cap * em
    for i, (wt, text) in enumerate(lines):
        assert FONTS[wt].width(text) * em <= col_w, (text, col_w)
        if i == 2:
            bl += 4 * k
        pg.text(wt, tsz * k, tx, bl, text, BLACK)
        bl += 1.3 * em
    assert bl - 1.3 * em <= th - SAFE


PIECES = {  # name: (trim w, trim h, scale k vs A4, QR clear zone mm, sign border)
    "kiwi-guide_A6-card": (105, 148, 0.5, 4.0, False),
    "kiwi-guide_A4-poster": (210, 297, 1.0, 4.0, True),
    "kiwi-guide_A3-poster": (297, 420, math.sqrt(2), 4.0 * math.sqrt(2), True),
}


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, (tw, th, k, clear, border) in PIECES.items():
        title = name.replace("_", " ")
        for suffix, marks in (("print", True), ("bleed", False)):
            path = os.path.join(OUT, f"{name}_{suffix}.pdf")
            pg = Page(path, tw, th, marks, title)
            build(pg, k, clear, border)
            pg.finish()
        subprocess.run(["pdftoppm", "-r", "300", "-png", "-singlefile",
                        os.path.join(OUT, f"{name}_bleed.pdf"), os.path.join(OUT, f"{name}_300dpi")], check=True)
        print("built", name)


if __name__ == "__main__":
    main()
