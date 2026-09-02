# -*- coding: utf-8 -*-
"""สร้างไอคอน PWA ครบชุดจากภาพที่กอล์ฟเจนมา
   แก้สองอย่างที่ทำให้ใช้ตรง ๆ ไม่ได้: มุมดำทึบ · maskable ที่ตัว D ล้นวงใน 52%"""
import os
from PIL import Image, ImageDraw, ImageFilter

SRC = r'C:\Users\User\.claude\uploads\61de2dff-d7f4-439d-9059-1faf0e33eb6d\3f78e260-image.png'
OUT = os.environ.get('VAR_OUT') or os.path.dirname(os.path.abspath(__file__))
CREAM = (249, 240, 229)

im = Image.open(SRC).convert('RGB')
W, H = im.size

# มุมโค้งถูกวาดเป็นสีดำสนิท — flood fill จากสี่มุมแล้วแทนด้วยพื้นครีม
flood = im.copy()
for corner in [(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1)]:
    ImageDraw.floodfill(flood, corner, CREAM, thresh=40)

# ขอบมุมยังมี anti-alias สีเทาเข้มค้าง — เก็บด้วยการไล่จากขอบเข้ามา
px = flood.load()
CORNER = int(W * 0.16)
for cx, cy, sx, sy in [(0, 0, 1, 1), (W - 1, 0, -1, 1), (0, H - 1, 1, -1), (W - 1, H - 1, -1, -1)]:
    for dy in range(CORNER):
        for dx in range(CORNER):
            x, y = cx + sx * dx, cy + sy * dy
            r, g, b = px[x, y]
            if r + g + b < 330:          # เข้มกว่าครีมมาก = เศษมุมดำ
                px[x, y] = CREAM

base = flood


def flatten_bg(img, tol=8):
    """เกรนกระดาษในพื้นทำให้ PNG บีบไม่ลง (216 KB) — ทำพื้นให้เรียบเหลือ 51 KB
       แตะเฉพาะพิกเซลที่แทบเป็นครีมอยู่แล้ว เกรนในตัวอักษรกับกระดาษไม่ถูกแตะ"""
    out = img.copy(); p = out.load(); w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b = p[x, y]
            if abs(r - CREAM[0]) <= tol and abs(g - CREAM[1]) <= tol and abs(b - CREAM[2]) <= tol:
                p[x, y] = CREAM
    return out


def sheet_icon(size, inner=1.0):
    """inner < 1 = ย่อของสำคัญให้อยู่ในวงใน แล้วขยายพื้นครีมรอบ ๆ (สำหรับ maskable)"""
    if inner >= 1.0:
        return base.resize((size, size), Image.LANCZOS)
    canvas = Image.new('RGB', (size, size), CREAM)
    s = int(size * inner)
    canvas.paste(base.resize((s, s), Image.LANCZOS), ((size - s) // 2, (size - s) // 2))
    return canvas


files = {
    'icon-192.png':       sheet_icon(192),
    'icon-512.png':       sheet_icon(512),
    'icon-apple-180.png': sheet_icon(180),
    # maskable: ระบบครอบได้ถึง 20% รอบด้าน ของสำคัญต้องอยู่ในวงใน ~52-60%
    'icon-512-mask.png':  sheet_icon(512, inner=0.72),
}
# ลดเหลือ 64 สีพร้อม dither — ข้อ 107.5 พิสูจน์แล้วว่าดูไม่ออกว่าต่าง
for n, img in files.items():
    q = flatten_bg(img.convert('RGB')).quantize(colors=64, method=Image.MEDIANCUT)
    q.save(os.path.join(OUT, n), optimize=True)
    files[n] = q.convert('RGB')

# ---- แผ่นตรวจ ----
PAD, TOP = 26, 34
cells = [('192', files['icon-192.png'], 0),
         ('512', files['icon-512.png'], 0),
         ('maskable 512', files['icon-512-mask.png'], 1),
         ('apple 180', files['icon-apple-180.png'], 0)]
BIG = 220
sheet_w = PAD + len(cells) * (BIG + PAD)
sheet_h = TOP + BIG + PAD + 160 + PAD + 40 + PAD + 20
sheet = Image.new('RGB', (sheet_w, sheet_h), '#ffffff')
d = ImageDraw.Draw(sheet)

for i, (label, img, circle) in enumerate(cells):
    x = PAD + i * (BIG + PAD)
    d.text((x, 12), label, fill='#22252b')
    big = img.convert('RGB').resize((BIG, BIG), Image.LANCZOS)
    if circle:
        # จำลองการถูกครอบเป็นวงกลมแบบ Android
        m = Image.new('L', (BIG, BIG), 0)
        ImageDraw.Draw(m).ellipse([0, 0, BIG - 1, BIG - 1], fill=255)
        shown = Image.new('RGB', (BIG, BIG), '#ffffff')
        shown.paste(big, (0, 0), m)
        big = shown
    sheet.paste(big, (x, TOP))
    small = img.convert('RGB').resize((40, 40), Image.LANCZOS)
    y = TOP + BIG + PAD
    sheet.paste(small.resize((160, 160), Image.NEAREST), (x, y))
    sheet.paste(small, (x, y + 160 + PAD))
    d.rectangle([x, y + 160 + PAD, x + 40, y + 160 + PAD + 40], outline='#c8ccd2')

d.text((PAD, TOP + BIG + PAD - 18), 'shrunk to 40 px, then scaled back 4x', fill='#6a707c')
d.text((PAD, sheet_h - 18), '40 px actual size  ·  maskable shown as Android would crop it', fill='#6a707c')
sheet.save(os.path.join(OUT, 'check_icon.png'))

for n in files:
    print(n, os.path.getsize(os.path.join(OUT, n)), 'bytes')
print('total', sum(os.path.getsize(os.path.join(OUT, n)) for n in files), 'bytes')
