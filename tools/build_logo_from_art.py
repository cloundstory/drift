# -*- coding: utf-8 -*-
"""สร้าง mark + lockup จากภาพโลโก้ที่กอล์ฟเจนมา
   ยากตรงกระดาษเป็นสีขาวนวลบนพื้นขาว — ตัดพื้นตรง ๆ แล้วกระดาษหายไปด้วย
   จึงแยกด้วยการถามว่า 'พิกเซลขาวนี้เชื่อมกับขอบภาพไหม' แทนการดูสี"""
import os
from PIL import Image, ImageDraw, ImageFilter
from collections import deque

SRC = r'C:\Users\User\.claude\uploads\61de2dff-d7f4-439d-9059-1faf0e33eb6d\6fd5544d-image.png'
OUT = os.environ.get('VAR_OUT') or os.path.dirname(os.path.abspath(__file__))

im = Image.open(SRC).convert('RGB')
W, H = im.size
px = im.load()

# ---- 1. หาพื้นนอก: พิกเซลขาวที่เดินจากขอบภาพถึงได้ ----
WHITE = 244
outside = bytearray(W * H)
q = deque()
for x in range(W):
    for y in (0, H - 1):
        q.append((x, y))
for y in range(H):
    for x in (0, W - 1):
        q.append((x, y))
while q:
    x, y = q.popleft()
    if x < 0 or y < 0 or x >= W or y >= H:
        continue
    i = y * W + x
    if outside[i]:
        continue
    r, g, b = px[x, y]
    if min(r, g, b) < WHITE:
        continue
    outside[i] = 1
    q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

# ---- 2. alpha: นอก = จางตามความสว่าง · ใน (กระดาษ) = ทึบเต็ม ----
alpha = Image.new('L', (W, H))
ap = alpha.load()
for y in range(H):
    row = y * W
    for x in range(W):
        r, g, b = px[x, y]
        ap[x, y] = max(0, 255 - min(r, g, b)) if outside[row + x] else 255

art = im.copy()
art.putalpha(alpha)

# ---- 3. ครอปตามขอบหมึกจริงแล้วเว้นขอบเท่ากันทุกด้าน (ข้อ 108.3) ----
bbox = alpha.point(lambda v: 255 if v > 8 else 0).getbbox()
art = art.crop(bbox)
mw, mh = art.size
side = max(mw, mh)
pad = int(side * 0.06)
mark = Image.new('RGBA', (side + pad * 2, side + pad * 2), (0, 0, 0, 0))
mark.paste(art, (pad + (side - mw) // 2, pad + (side - mh) // 2))
mark.save(os.path.join(OUT, 'mark_new.png'))


def recolour(img, ink):
    """คู่สีที่สอง (ข้อ 108.4) — เปลี่ยนเฉพาะหมึกเข้ม กระดาษกับจุดทองไม่แตะ"""
    out = img.copy()
    p = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = p[x, y]
            if a > 6 and max(r, g, b) < 120 and abs(r - b) < 40:   # หมึกเข้ม ไม่ใช่ทอง
                p[x, y] = (ink[0], ink[1], ink[2], a)
    return out


mark_dark = recolour(mark, (238, 234, 226))
mark_dark.save(os.path.join(OUT, 'mark_new_dark.png'))

# ---- แผ่นตรวจ: วางบนพื้นสามแบบเพื่อดูว่าพื้นโปร่งจริงและกระดาษไม่หาย ----
CELL, PAD = 260, 24
sheet = Image.new('RGB', (PAD + 4 * (CELL + PAD), PAD + CELL + PAD + 60), '#ffffff')
d = ImageDraw.Draw(sheet)
backs = [('on white', '#ffffff', mark), ('on cream', '#f9f0e5', mark),
         ('on navy', '#2b3a55', mark_dark), ('checker', None, mark)]
for i, (label, bg, src_img) in enumerate(backs):
    x = PAD + i * (CELL + PAD)
    tile = Image.new('RGB', (CELL, CELL), bg or '#ffffff')
    if bg is None:
        td = ImageDraw.Draw(tile)
        for yy in range(0, CELL, 20):
            for xx in range(0, CELL, 20):
                if (xx // 20 + yy // 20) % 2:
                    td.rectangle([xx, yy, xx + 19, yy + 19], fill='#d8dade')
    m = src_img.resize((CELL, CELL), Image.LANCZOS)
    tile.paste(m, (0, 0), m)
    sheet.paste(tile, (x, PAD))
    d.text((x, PAD + CELL + 8), label, fill='#22252b')
sheet.save(os.path.join(OUT, 'check_mark.png'))

print('mark', mark.size, os.path.getsize(os.path.join(OUT, 'mark_new.png')), 'bytes')
print('bbox in source:', bbox)
