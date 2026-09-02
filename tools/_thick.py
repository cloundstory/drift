# -*- coding: utf-8 -*-
"""เส้นโลโก้บางเกินสำหรับ 28px — ทำเวอร์ชันเส้นหนาด้วยการขยายขอบหมึก (dilate)"""
import os
from PIL import Image, ImageDraw, ImageFilter

A = r'C:\Users\User\AppData\Local\Temp\claude\C--Users-User-Desktop-letter-wind\61de2dff-d7f4-439d-9059-1faf0e33eb6d\scratchpad'
src = Image.open(os.path.join(A, 'mark_new.png'))
BAR_BG = (226, 229, 233)
FAINT = (84, 90, 104)


def thicken(img, work, radius):
    """ขยายที่ความละเอียดกลางแล้วค่อยย่อ — dilate ที่ 28px ตรง ๆ จะได้ก้อนเละ"""
    m = img.resize((work, work), Image.LANCZOS)
    if radius:
        a = m.getchannel('A').filter(ImageFilter.MaxFilter(radius))
        rgb = m.convert('RGB')
        # หมึกก็ต้องลามตามขอบด้วย ไม่งั้นได้ขอบใสรอบเส้น
        ink = rgb.filter(ImageFilter.MinFilter(radius))
        out = ink.convert('RGBA'); out.putalpha(a)
        m = out
    return m.resize((56, 56), Image.LANCZOS)


VARIANTS = [('original', 0), ('dilate 3', 3), ('dilate 5', 5), ('dilate 7', 7)]
W, BARH, Z = 190, 46, 4
cells = []
for label, r in VARIANTS:
    m = thicken(src, 224, r).resize((28, 28), Image.LANCZOS)
    bar = Image.new('RGB', (W, BARH), BAR_BG)
    bar.paste(m, (14, (BARH - 28) // 2), m)
    ImageDraw.Draw(bar).text((51, BARH // 2 - 6), 'd r i f t', fill=FAINT)
    cells.append((label, bar))

PAD = 12
sheet = Image.new('RGB', (PAD + len(cells) * (W * Z + PAD), PAD + BARH * Z + 28), '#ffffff')
d = ImageDraw.Draw(sheet)
for i, (label, bar) in enumerate(cells):
    x = PAD + i * (W * Z + PAD)
    sheet.paste(bar.resize((W * Z, BARH * Z), Image.NEAREST), (x, PAD))
    d.text((x, PAD + BARH * Z + 7), label, fill='#22252b')
sheet.save(os.path.join(A, 'check_thick.png'))

# เก็บตัวที่น่าจะใช้ไว้ 56px (2x ของ 28 เผื่อ retina)
for label, r in VARIANTS[1:]:
    thicken(src, 224, r).save(os.path.join(A, 'mark_bar_d%d.png' % r), optimize=True)
    print('mark_bar_d%d.png' % r, os.path.getsize(os.path.join(A, 'mark_bar_d%d.png' % r)), 'bytes')
