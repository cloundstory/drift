# -*- coding: utf-8 -*-
"""โลโก้โหมดมืดต้องใช้ *ภาพ* ไม่ใช่ filter (ข้อ 132)
   ⛔ invert() ทำให้กระดาษกลายเป็นดำ ซึ่งขัดข้อ 108.4 ตรง ๆ
      กระดาษไม่เปลี่ยนสีทั้งสองคู่ เพราะมันคือกระดาษ — เปลี่ยนแค่รอยลม"""
import base64, io, os, sys
from PIL import Image, ImageFilter, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(os.path.dirname(HERE), 'index.html')
ART = os.environ['VAR_OUT']

src = Image.open(os.path.join(ART, 'mark_new_dark.png'))

# หน้าเปิด/splash — 300 px เท่ากับตัวสว่าง
intro = src.resize((300, round(src.size[1] * 300 / src.size[0])), Image.LANCZOS)
rgb, a = intro.convert('RGB'), intro.getchannel('A')
intro = ImageOps.posterize(rgb, 4)
intro.putalpha(a)
p_intro = os.path.join(ART, 'intro_mark_dark.png')
intro.save(p_intro, optimize=True)

# หัวจอ — ต้องขยายขอบหมึกเหมือนตัวสว่าง ไม่งั้นจางหายที่ 28 px (ข้อ 124.5)
work = src.resize((224, 224), Image.LANCZOS)
al = work.getchannel('A').filter(ImageFilter.MaxFilter(3))
ink = work.convert('RGB').filter(ImageFilter.MaxFilter(3))   # ⚠️ Max ไม่ใช่ Min — หมึกสว่างต้องลามด้วยค่าสูง
bar = ink.convert('RGBA')
bar.putalpha(al)
bar = bar.resize((56, 56), Image.LANCZOS)
p_bar = os.path.join(ART, 'mark_bar_dark_d3.png')
bar.save(p_bar, optimize=True)


def b64(p):
    return 'data:image/png;base64,' + base64.b64encode(open(p, 'rb').read()).decode()


s = io.open(APP, encoding='utf-8').read()
n = 0


def sub(old, new):
    global s, n
    if old not in s:
        sys.exit('NOT FOUND: ' + old[:80])
    s = s.replace(old, new, 1)
    n += 1


# ---- ฝังคู่มืดต่อจากคู่สว่าง ----
i = s.index("const BARMARK='")
j = s.index("';", i) + 2
s = s[:j] + """
/* คู่สีสำหรับพื้นเข้ม (ข้อ 132) — รอยลมกับคำสว่างขึ้น **กระดาษยังขาว จุดทองยังทอง**
   ⛔ ห้ามใช้ filter:invert() แทน มันกลับสีกระดาษเป็นดำ ซึ่งขัดข้อ 108.4 */
const INTROMARK_D='""" + b64(p_intro) + """';
const BARMARK_D='""" + b64(p_bar) + "';" + s[j:]
n += 1

# ---- เอา filter ออกจาก CSS โหมดมืด ----
sub("  .brand img,#introMark,#spMark{filter:invert(1) hue-rotate(180deg) brightness(1.12)}\n", "")

# ---- สลับภาพตามโหมด ----
sub("""function applyScheme(dark){
  Object.assign(SKIN, dark ? DARK_SKIN : LIGHT_SKIN);""",
    """function applyScheme(dark){
  /* โลโก้สลับ *ภาพ* ไม่ใช่ filter — กระดาษต้องขาวทั้งสองโหมด (ข้อ 132) */
  const bm = dark ? BARMARK_D : BARMARK, im = dark ? INTROMARK_D : INTROMARK;
  const b = $('#brandMark'); if(b && b.getAttribute('src') !== bm) b.src = bm;
  const t = $('#introMark'); if(t && t.getAttribute('src') !== im) t.src = im;
  const p = $('#spMark');    if(p && p.getAttribute('src') !== im) p.src = im;
  Object.assign(SKIN, dark ? DARK_SKIN : LIGHT_SKIN);""")

# ---- หน้าเปิดกับ splash ต้องหยิบตัวที่ตรงโหมดตั้งแต่แรก ----
sub("""function paintIntroMark(){
  const el=$('#introMark'); if(!el) return;
  if(el.getAttribute('src')!==INTROMARK) el.src=INTROMARK;
}""",
    """function paintIntroMark(){
  const el=$('#introMark'); if(!el) return;
  const want = matchMedia('(prefers-color-scheme: dark)').matches ? INTROMARK_D : INTROMARK;
  if(el.getAttribute('src')!==want) el.src=want;
}""")

sub("  im.src=INTROMARK;",
    "  im.src = matchMedia('(prefers-color-scheme: dark)').matches ? INTROMARK_D : INTROMARK;")

sub("$('#brandMark').src=BARMARK;   /* เวอร์ชันเส้นหนาสำหรับ 28 px (ข้อ 124.5) */",
    "$('#brandMark').src=BARMARK;   /* applyScheme สลับเป็นคู่มืดให้เองถ้าจำเป็น (ข้อ 132) */")

io.open(APP, 'w', encoding='utf-8').write(s)
print('patched %d sections · intro %d B · bar %d B'
      % (n, os.path.getsize(p_intro), os.path.getsize(p_bar)))
