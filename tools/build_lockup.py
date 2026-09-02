# -*- coding: utf-8 -*-
"""lockup = mark ใหม่ + คำว่า drift
   คำต้องเรนเดอร์ในเบราว์เซอร์ เพราะฟอนต์ฝังในแอปเป็น woff2 ที่ PIL อ่านไม่ได้ (ข้อ 108.2)"""
import re, base64, subprocess, os
from PIL import Image, ImageDraw, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get('VAR_OUT') or HERE
APP = os.path.join(os.path.dirname(HERE), 'index.html')
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

JS = r"""
<script>
(function(){
 function go(){
  var R=[];
  [['26,26,26',0.92],['238,234,226',0.96]].forEach(function(C){
    var FS=260, S=2400, cv=document.createElement('canvas');
    cv.width=S; cv.height=Math.round(FS*2.2);
    var x=cv.getContext('2d');
    x.font='400 '+FS+'px "Noto Serif Thai", Georgia, serif';
    try{ x.letterSpacing='0.34em'; }catch(e){}
    x.textBaseline='alphabetic'; x.textAlign='left';
    x.fillStyle='rgba('+C[0]+','+C[1]+')';
    x.fillText('drift', 40, FS*1.4);
    R.push(cv.toDataURL('image/png'));
  });
  var d=document.createElement('div'); d.id='R';
  d.textContent=R.join('\n'); document.body.appendChild(d);
 }
 document.fonts.ready.then(function(){ setTimeout(go, 500); });
})();
</script>
</body>"""

src = open(APP, encoding='utf-8').read()
f = os.path.join(HERE, '_gen_word.html')
open(f, 'w', encoding='utf-8').write(src.replace('</body>', JS))
out = subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--window-size=900,900',
                      '--virtual-time-budget=12000', '--dump-dom', 'file:///' + f.replace('\\', '/')],
                     capture_output=True, text=True, encoding='utf-8', errors='replace').stdout
os.remove(f)
m = re.search(r'<div id="R">(.*?)</div>', out, re.S)
if not m:
    raise SystemExit('word render failed')
words = []
for u in [u for u in m.group(1).split('\n') if u.startswith('data:image')]:
    im = Image.open(__import__('io').BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGBA')
    words.append(im.crop(im.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox()))
print('word', words[0].size, words[1].size)

MARK = os.path.join(OUT, 'mark_new.png')
MARKD = os.path.join(OUT, 'mark_new_dark.png')
mark_light = Image.open(MARK)
mark_dark = Image.open(MARKD)


def lockup(mark, word, vertical, mark_h=640):
    """คำกว้าง 78% ของ mark ในแนวตั้ง · แนวนอนจัดกึ่งกลางตามความสูง mark"""
    mw, mh = mark.size
    mk = mark.resize((round(mw * mark_h / mh), mark_h), Image.LANCZOS)
    mw, mh = mk.size
    ww, wh = word.size
    if vertical:
        tw = round(mw * 0.78)
        wd = word.resize((tw, round(wh * tw / ww)), Image.LANCZOS)
        gap = round(mark_h * 0.10)
        W = max(mw, wd.size[0])
        H = mh + gap + wd.size[1]
        c = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        c.paste(mk, ((W - mw) // 2, 0), mk)
        c.paste(wd, ((W - wd.size[0]) // 2, mh + gap), wd)
    else:
        th = round(mark_h * 0.30)
        wd = word.resize((round(ww * th / wh), th), Image.LANCZOS)
        gap = round(mark_h * 0.09)
        W = mw + gap + wd.size[0]
        H = max(mh, wd.size[1])
        c = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        c.paste(mk, (0, (H - mh) // 2), mk)
        c.paste(wd, (mw + gap, (H - wd.size[1]) // 2), wd)
    return c


made = {
    'lockup_v_new.png':      lockup(mark_light, words[0], True),
    'lockup_h_new.png':      lockup(mark_light, words[0], False),
    'lockup_v_dark_new.png': lockup(mark_dark, words[1], True),
    'lockup_h_dark_new.png': lockup(mark_dark, words[1], False),
}
for n, img in made.items():
    rgb, a = img.convert('RGB'), img.getchannel('A')
    out = ImageOps.posterize(rgb, 4)
    out.putalpha(a)
    out.save(os.path.join(OUT, n), optimize=True)

# แผ่นตรวจ — พื้นสว่างคู่หนึ่ง พื้นเข้มคู่หนึ่ง
rows = [('lockup_v_new.png', '#f9f0e5'), ('lockup_h_new.png', '#f9f0e5'),
        ('lockup_v_dark_new.png', '#2b3a55'), ('lockup_h_dark_new.png', '#2b3a55')]
CELL, PAD = 300, 26
sheet = Image.new('RGB', (PAD + 4 * (CELL + PAD), PAD + CELL + 46), '#ffffff')
d = ImageDraw.Draw(sheet)
for i, (n, bg) in enumerate(rows):
    img = made[n]
    x = PAD + i * (CELL + PAD)
    tile = Image.new('RGB', (CELL, CELL), bg)
    sc = min((CELL - 40) / img.size[0], (CELL - 40) / img.size[1])
    r = img.resize((round(img.size[0] * sc), round(img.size[1] * sc)), Image.LANCZOS)
    tile.paste(r, ((CELL - r.size[0]) // 2, (CELL - r.size[1]) // 2), r)
    sheet.paste(tile, (x, PAD))
    d.text((x, PAD + CELL + 8), n.replace('_new.png', ''), fill='#22252b')
sheet.save(os.path.join(OUT, 'check_lockup.png'))
for n in made:
    print(n, made[n].size, os.path.getsize(os.path.join(OUT, n)), 'bytes')
