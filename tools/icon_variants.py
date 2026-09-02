# -*- coding: utf-8 -*-
"""เรนเดอร์ไอคอนหลายชุดค่าแล้ววางเทียบที่ 512 กับ 40 พิกเซล — ข้อ 107.7"""
import os, sys
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_icon import render

OUT = os.environ.get('VAR_OUT') or os.path.dirname(os.path.abspath(__file__))

# ชุดค่าฐาน = ไอคอนที่ใช้อยู่จริงตอนนี้ (ข้อ 107)
B = dict(safe=0.74, ink=0.30, lw=0.011, cut=0.62, pw=0.48, sh=0.20,
         g0='#d7dbe1', g1='#e6e0d2', t=3.1, w=0.30, rot=-24,
         dx=0.075, dy=-0.055, mode='line', ol=0.013, oa=0.54, fold=1)

VARIANTS = [
    ('A - now', dict(B)),
    ('B - darker ink', dict(B, ink=0.52, oa=0.78, ol=0.016)),
    ('C - dark + tilt', dict(B, ink=0.55, oa=0.80, ol=0.017,
                             rot=-38, t=3.6, w=0.42, cut=0.72, lw=0.013)),
    ('D - max', dict(B, ink=0.72, oa=0.92, ol=0.020,
                     rot=-42, t=3.9, w=0.50, cut=0.80, lw=0.016, pw=0.52)),
    ('E - C + dark bg', dict(B, ink=0.55, oa=0.80, ol=0.017,
                             rot=-38, t=3.6, w=0.42, cut=0.72, lw=0.013,
                             g0='#aeb6c2', g1='#c9c2b0')),
    ('F - more twist', dict(B, ink=0.55, oa=0.78, ol=0.015,
                            rot=-32, t=4.4, w=0.62, cut=0.72, lw=0.013, pw=0.50)),
]

paths = render([v for _, v in VARIANTS], 'var')
if not paths:
    raise SystemExit('render failed')

BIG, SMALL, ZOOM, PAD, TOP = 256, 40, 4, 26, 34
cellw = BIG + PAD
sheet_w = PAD + len(paths) * cellw
sheet_h = TOP + BIG + PAD + SMALL * ZOOM + PAD + SMALL + PAD + 20
sheet = Image.new('RGB', (sheet_w, sheet_h), '#ffffff')
d = ImageDraw.Draw(sheet)

for i, p in enumerate(paths):
    im = Image.open(p).convert('RGB')
    x = PAD + i * cellw
    d.text((x, 12), VARIANTS[i][0], fill='#22252b')
    sheet.paste(im.resize((BIG, BIG), Image.LANCZOS), (x, TOP))
    small = im.resize((SMALL, SMALL), Image.LANCZOS)          # ย่อจริงถึง 40 px
    y = TOP + BIG + PAD
    sheet.paste(small.resize((SMALL * ZOOM, SMALL * ZOOM), Image.NEAREST), (x, y))
    sheet.paste(small, (x, y + SMALL * ZOOM + PAD))           # 40 px ขนาดจริง
    d.rectangle([x, y + SMALL * ZOOM + PAD, x + SMALL, y + SMALL * ZOOM + PAD + SMALL],
                outline='#c8ccd2')

d.text((PAD, TOP + BIG + PAD - 18), 'shrunk to 40 px, then scaled back 4x', fill='#6a707c')
d.text((PAD, sheet_h - 18), '40 px actual size', fill='#6a707c')
sheet.save(os.path.join(OUT, 'compare.png'))
print('ok', sheet_w, 'x', sheet_h)
