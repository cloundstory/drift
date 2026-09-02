# -*- coding: utf-8 -*-
"""ติดตั้งไอคอนกับโลโก้ใหม่ลง index.html และ brand/
   ไอคอน: ฝัง base64 · หน้าเปิด: ฝัง mark เป็นภาพแทน canvas ที่วาดสด (ทาง ก.)"""
import base64, os, re, shutil
from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
APP = os.path.join(ROOT, 'index.html')
BRAND = os.path.join(ROOT, 'brand')
ART = os.environ['VAR_OUT']
CREAM = '#f9f0e5'


def b64(path):
    return 'data:image/png;base64,' + base64.b64encode(open(path, 'rb').read()).decode()


icon192 = b64(os.path.join(ART, 'icon-192.png'))
icon512 = b64(os.path.join(ART, 'icon-512.png'))
iconmsk = b64(os.path.join(ART, 'icon-512-mask.png'))
apple = b64(os.path.join(ART, 'icon-apple-180.png'))

# หน้าเปิด — mark ที่ 300 px (canvas เดิมวาด 132 css px, เผื่อ dpr 2)
mk = Image.open(os.path.join(ART, 'mark_new.png'))
mk = mk.resize((300, round(mk.size[1] * 300 / mk.size[0])), Image.LANCZOS)
rgb, a = mk.convert('RGB'), mk.getchannel('A')
mk = ImageOps.posterize(rgb, 4); mk.putalpha(a)
intro_path = os.path.join(ART, 'intro_mark.png')
mk.save(intro_path, optimize=True)
intro = b64(intro_path)

src = open(APP, encoding='utf-8').read()
before = len(src)

# ---- 1. ไอคอนใน <head> ----
src, n1 = re.subn(r'(<link rel="icon" type="image/png" sizes="192x192" href=")[^"]+(")',
                  lambda m: m.group(1) + icon192 + m.group(2), src)
src, n2 = re.subn(r'(<link rel="apple-touch-icon" href=")[^"]+(")',
                  lambda m: m.group(1) + apple + m.group(2), src)

# ---- 2. ไอคอนใน manifest ----
src, n3 = re.subn(r"const ICON192='[^']+'", "const ICON192='" + icon192 + "'", src)
src, n4 = re.subn(r"const ICON512='[^']+'", "const ICON512='" + icon512 + "'", src)
src, n5 = re.subn(r"const ICONMSK='[^']+'", "const ICONMSK='" + iconmsk + "'", src)

# ---- 3. สีพื้นตามไอคอนใหม่ (ข้อ 107.5) ----
#    ⚠️ สีอยู่สองที่ — manifest กับ <meta name="theme-color"> ใน head
#    แก้ที่เดียวแล้วแถบบนของเบราว์เซอร์จะยังเป็นสีเก่าเงียบ ๆ
src, n6 = re.subn(r"background_color:'#[0-9a-fA-F]{6}', theme_color:'#[0-9a-fA-F]{6}'",
                  "background_color:'%s', theme_color:'%s'" % (CREAM, CREAM), src)
src, n7 = re.subn(r'(<meta name="theme-color" content=")#[0-9a-fA-F]{6}(">)',
                  lambda m: m.group(1) + CREAM + m.group(2), src)

# ---- 4. หน้าเปิด: canvas ที่วาดสด → ภาพโลโก้ใหม่ ----
old_canvas = '<canvas id="introMark" style="display:block;margin:0 auto 14px"></canvas>'
new_img = ('<img id="introMark" alt="" width="132" height="%d" '
           'style="display:block;margin:0 auto 14px">' % round(132 * mk.size[1] / mk.size[0]))
if old_canvas in src:                     # รันซ้ำได้ — ครั้งที่สองข้ามไป
    src = src.replace(old_canvas, new_img)

# paintIntroMark วาดลง canvas ไม่ได้อีกแล้ว — ให้ตั้ง src ของภาพแทน
old_fn = """function paintIntroMark(){
  const cv=$('#introMark'); if(!cv) return;
  const dpr=Math.min(devicePixelRatio||1,2), S=132;
  cv.width=S*dpr; cv.height=S*dpr; cv.style.width=S+'px'; cv.style.height=S+'px';
  const c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0);
  c.clearRect(0,0,S,S);
  driftMark(c, S/2, S/2, S*0.92, false);
}"""
new_fn = """const INTROMARK='""" + intro + """';
/* หน้าเปิดใช้โลโก้ที่ฝังเป็นภาพแล้ว ไม่ได้วาดสดด้วย driftMark อีก
   driftMark ยังอยู่ในไฟล์เผื่ออยากกลับไปใช้ — ไม่มีที่ไหนเรียกแล้ว */
function paintIntroMark(){
  const el=$('#introMark'); if(!el) return;
  if(el.getAttribute('src')!==INTROMARK) el.src=INTROMARK;
}"""
if old_fn in src:
    src = src.replace(old_fn, new_fn)
else:                                      # ติดตั้งแล้ว — อัปเดตแค่ภาพในตัวแปร
    src = re.sub(r"const INTROMARK='[^']+'", "const INTROMARK='" + intro + "'", src)

open(APP, 'w', encoding='utf-8').write(src)

# ---- 5. brand/ ----
pairs = [('mark_new.png', 'mark.png'), ('lockup_v_new.png', 'lockup_v.png'),
         ('lockup_h_new.png', 'lockup_h.png'), ('lockup_v_dark_new.png', 'lockup_v_dark.png'),
         ('lockup_h_dark_new.png', 'lockup_h_dark.png')]
for s, d in pairs:
    if s == 'mark_new.png':          # 900 KB — octree รองรับ alpha ด้วย ลงเหลือ 61 KB
        im = Image.open(os.path.join(ART, s))
        im = im.resize((900, round(im.size[1] * 900 / im.size[0])), Image.LANCZOS)
        im.quantize(colors=64, method=Image.FASTOCTREE).save(os.path.join(BRAND, d), optimize=True)
    else:
        shutil.copy(os.path.join(ART, s), os.path.join(BRAND, d))

print('replacements: head=%d,%d  manifest=%d,%d,%d  colours=%d+%d' % (n1, n2, n3, n4, n5, n6, n7))
print('index.html %d -> %d chars (%+d)' % (before, len(src), len(src) - before))
for _, d in pairs:
    print(' brand/%-18s %d bytes' % (d, os.path.getsize(os.path.join(BRAND, d))))
