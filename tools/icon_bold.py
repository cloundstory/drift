# -*- coding: utf-8 -*-
"""รอบสอง — แก้ที่ระบบ ไม่ใช่ค่า: พื้นทึบ · ตัดเงา · กระดาษกินกรอบ · silhouette เดียว"""
import os, sys
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_icon import render

OUT = os.environ.get('VAR_OUT') or os.path.dirname(os.path.abspath(__file__))

NAVY, CREAM = '#2b3a55', '#f5eee1'

B = dict(safe=0.74, ink=0.30, lw=0.011, cut=0.62, pw=0.48, sh=0.20,
         g0='#d7dbe1', g1='#e6e0d2', t=3.1, w=0.30, rot=-24,
         dx=0.075, dy=-0.055, mode='line', ol=0.013, oa=0.54, fold=1)

# ท่ากระดาษของ F ซึ่งชนะรอบแรก — บิดพอให้อ่านเป็นแผ่นบาง
POSE = dict(rot=-32, t=4.4, w=0.62)

VARIANTS = [
    # ยืนยันว่าโค้ดที่แก้แล้วยังให้ของเดิมเป๊ะ
    ('A - now (control)', dict(B)),

    # F เดิม แต่ตัดเงา + พื้นทึบ + กระดาษใหญ่ขึ้น
    ('G - flat, no shadow', dict(B, **POSE, ink=0.55, oa=0.78, ol=0.015, cut=0.72,
                                 lw=0.013, pw=0.62, sh=0, g0='#dfe2e6', g1='#dfe2e6',
                                 dx=0.055, dy=-0.045)),

    # silhouette เดียว — กระดาษเป็นหมึก ไม่มีเส้นขอบเลย
    ('H - ink paper', dict(B, **POSE, sh=0, ol=0, pw=0.64, cut=0.74, lw=0.016, ink=0.62,
                           g0=CREAM, g1=CREAM, paper=NAVY, windc='43,58,85',
                           foldc='245,238,225', folda=0.34, dx=0.050, dy=-0.045)),

    # พื้นเข้มทึบ กระดาษครีม — ระบบสีของภาพที่กอล์ฟเจนมา แต่เป็นกระดาษ ไม่ใช่ตัวอักษร
    ('I - dark bg', dict(B, **POSE, sh=0, ol=0, pw=0.64, cut=0.74, lw=0.016, ink=0.50,
                         g0=NAVY, g1=NAVY, paper=CREAM, windc='245,238,225',
                         foldc='43,58,85', folda=0.24, dx=0.050, dy=-0.045)),

    # H + รอยลมที่แกว่งจริงตามข้อ 107.2
    ('J - H + sway', dict(B, **POSE, sh=0, ol=0, pw=0.64, cut=0.76, lw=0.017, ink=0.66,
                          sa=0.062, sw=2.2, g0=CREAM, g1=CREAM, paper=NAVY,
                          windc='43,58,85', foldc='245,238,225', folda=0.34,
                          dx=0.050, dy=-0.050)),

    # I + กระดาษกินกรอบเต็มที่ + แกว่ง
    ('K - I + big + sway', dict(B, **POSE, sh=0, ol=0, pw=0.74, cut=0.76, lw=0.018, ink=0.54,
                                sa=0.062, sw=2.2, g0=NAVY, g1=NAVY, paper=CREAM,
                                windc='245,238,225', foldc='43,58,85', folda=0.24,
                                dx=0.035, dy=-0.040)),
]

paths = render([v for _, v in VARIANTS], 'bold')
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
    small = im.resize((SMALL, SMALL), Image.LANCZOS)
    y = TOP + BIG + PAD
    sheet.paste(small.resize((SMALL * ZOOM, SMALL * ZOOM), Image.NEAREST), (x, y))
    sheet.paste(small, (x, y + SMALL * ZOOM + PAD))
    d.rectangle([x, y + SMALL * ZOOM + PAD, x + SMALL, y + SMALL * ZOOM + PAD + SMALL],
                outline='#c8ccd2')

d.text((PAD, TOP + BIG + PAD - 18), 'shrunk to 40 px, then scaled back 4x', fill='#6a707c')
d.text((PAD, sheet_h - 18), '40 px actual size', fill='#6a707c')
sheet.save(os.path.join(OUT, 'compare_bold.png'))
print('ok', sheet_w, 'x', sheet_h)
