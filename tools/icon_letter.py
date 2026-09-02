# -*- coding: utf-8 -*-
"""ไอคอนตัวอักษร — ตัว d มาจากฟอนต์ที่แอปฝังไว้เอง (ข้อ 108.2) ไม่ใช่ฟอนต์แปลกปลอม"""
import re, base64, subprocess, os, sys
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get('VAR_OUT') or HERE
APP = os.path.join(os.path.dirname(HERE), 'index.html')
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

JS = r"""
<script>
(function(){
 function go(){
  var R=[], POSES = POSES_JSON;
  POSES.forEach(function(P){
    var S=1024, cv=document.createElement('canvas'); cv.width=S; cv.height=S;
    var x=cv.getContext('2d');
    x.fillStyle=P.bg; x.fillRect(0,0,S,S);

    // รอยลมพาดใต้ตัวอักษร — วาดก่อนเพื่อให้ตัวอักษรทับ
    if(P.wind){
      var c=S/2, k=S*0.40;
      function bez3(p0,p1,p2,p3,t){var u=1-t;return[
        u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],
        u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]];}
      var A=[c-k*1.15,c+k*0.98], B=[c-k*0.45,c+k*0.58],
          C=[c+k*0.35,c+k*1.02], D=[c+k*1.15,c+k*0.55];
      var N=180, pts=[];
      for(var j=0;j<N;j++){var t=j/(N-1),p=bez3(A,B,C,D,t);
        pts.push([p[0],p[1]-Math.sin(t*Math.PI*2.2)*S*0.045]);}
      x.lineCap='round';
      for(var j=0;j<N-1;j++){
        var t=j/(N-2);
        x.strokeStyle='rgba('+P.windc+','+(0.05+P.winda*Math.sin(t*Math.PI)).toFixed(3)+')';
        x.lineWidth=S*P.windw;
        x.beginPath();x.moveTo(pts[j][0],pts[j][1]);x.lineTo(pts[j+1][0],pts[j+1][1]);x.stroke();
      }
    }

    // ตัวอักษร — วัดขอบหมึกจริงแล้วจัดกึ่งกลาง (ข้อ 108.3) ไม่เดาพิกัด
    x.font = P.fw+' '+Math.round(S*P.fs)+'px "Noto Serif Thai", Georgia, serif';
    x.textBaseline='alphabetic'; x.textAlign='left';
    var m=x.measureText(P.ch);
    var bw=m.actualBoundingBoxRight+m.actualBoundingBoxLeft;
    var bh=m.actualBoundingBoxAscent+m.actualBoundingBoxDescent;
    var tx=S/2-bw/2+m.actualBoundingBoxLeft;
    var ty=S/2+bh/2-m.actualBoundingBoxDescent+S*(P.dy||0);
    x.fillStyle=P.ink; x.fillText(P.ch,tx,ty);

    // กระดาษ — meshPoints ตัวเดียวกับที่ลอยบนลูกโลก
    if(P.paper){
      var PW=S*P.pw, W2=PW*0.74, H2=PW, C=12, Rw=15;
      x.save();
      x.translate(S/2+S*P.px, S/2+S*P.py);
      x.rotate(P.prot*Math.PI/180);
      var M=meshPoints(W2,H2,P.pt,P.pwv,C,Rw), pp=M.pts, edge=[];
      for(var cc=0;cc<=C;cc++) edge.push(pp[0][cc]);
      for(var rr=1;rr<=Rw;rr++) edge.push(pp[rr][C]);
      for(var cc=C-1;cc>=0;cc--) edge.push(pp[Rw][cc]);
      for(var rr=Rw-1;rr>=1;rr--) edge.push(pp[rr][0]);
      x.beginPath();
      edge.forEach(function(p,ii){ ii?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y); });
      x.closePath(); x.fillStyle=P.paper; x.fill();
      x.beginPath();
      for(var rr=0;rr<=Rw;rr++){var p=pp[rr][Math.round(C*0.62)]; rr?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y);}
      x.strokeStyle='rgba('+P.foldc+',0.30)'; x.lineWidth=S*0.006; x.stroke();
      x.restore();
    }
    R.push(cv.toDataURL('image/png'));
  });
  var d=document.createElement('div'); d.id='R';
  d.textContent=R.join('\n'); document.body.appendChild(d);
 }
 document.fonts.ready.then(function(){ setTimeout(go, 500); });
})();
</script>
</body>"""


def render(poses, tag):
    src = open(APP, encoding='utf-8').read()
    page = src.replace('</body>', JS.replace('POSES_JSON', repr(poses).replace("'", '"')))
    f = os.path.join(HERE, '_gen_letter.html')
    open(f, 'w', encoding='utf-8').write(page)
    out = subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--window-size=900,900',
                          '--virtual-time-budget=12000', '--dump-dom', 'file:///' + f.replace('\\', '/')],
                         capture_output=True, text=True, encoding='utf-8', errors='replace').stdout
    m = re.search(r'<div id="R">(.*?)</div>', out, re.S)
    if not m:
        print('NO RESULT'); return []
    urls = [u for u in m.group(1).split('\n') if u.startswith('data:image')]
    paths = []
    for i, u in enumerate(urls):
        p = os.path.join(HERE, '%s%d.png' % (tag, i))
        open(p, 'wb').write(base64.b64decode(u.split(',')[1]))
        paths.append(p)
    os.remove(f)
    return paths


NAVY, CREAM = '#2b3a55', '#f5eee1'
INKN, INKC = '43,58,85', '245,238,225'

L = dict(bg=CREAM, ink=NAVY, ch='d', fw='400', fs=0.72, dy=0.02,
         wind=0, paper=0, windc=INKN, winda=0.30, windw=0.014)

VARIANTS = [
    ('L - d only',        dict(L)),
    ('M - d + paper bowl', dict(L, paper=CREAM, foldc=INKN, pw=0.30, px=0.045, py=0.095,
                                prot=-28, pt=4.4, pwv=0.62)),
    ('N - D + paper',      dict(L, ch='D', fs=0.78, paper=CREAM, foldc=INKN, pw=0.28,
                                px=0.055, py=0.055, prot=-24, pt=4.4, pwv=0.62)),
    ('O - d + wind',       dict(L, wind=1, fs=0.66, dy=-0.03)),
    ('P - d + wind + paper', dict(L, wind=1, fs=0.64, dy=-0.05, paper=CREAM, foldc=INKN,
                                  pw=0.26, px=0.045, py=0.075, prot=-30, pt=4.4, pwv=0.62)),
    ('Q - inverted',       dict(L, bg=NAVY, ink=CREAM, wind=1, windc=INKC, fs=0.66, dy=-0.03)),
]

paths = render([v for _, v in VARIANTS], 'let')
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
sheet.save(os.path.join(OUT, 'compare_letter.png'))
for p in paths:
    os.remove(p)
print('ok', sheet_w, 'x', sheet_h)
