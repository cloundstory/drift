# -*- coding: utf-8 -*-
"""lockup — เครื่องหมาย + คำว่า drift · เรนเดอร์ในเบราว์เซอร์เพื่อให้ได้ฟอนต์ตัวจริงของแอป"""
import re, base64, subprocess, os
OUT = os.path.dirname(os.path.abspath(__file__))
APP = r'C:\Users\User\Desktop\letter wind\index.html'
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

JS = r"""
<script>
(function(){
 setTimeout(function(){
  var R=[];
  var V = VARIANTS;
  V.forEach(function(P){
    var W=P.w, H=P.h, S=W;
    var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
    var x=cv.getContext('2d');

    // ---- เครื่องหมาย: รอยลม + กระดาษ (รูปทรงจาก meshPoints ของแอป) ----
    function drawMark(cx,cy,size){
      function bez3(p0,p1,p2,p3,t){var u=1-t;return[
        u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],
        u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]];}
      var k=size*0.74/2, c0=cx, c1=cy;
      var A=[c0-k*0.98,c1+k*0.64],B=[c0-k*0.62,c1-k*0.04],C=[c0-k*0.04,c1+k*0.18],D=[c0+k*0.50,c1-k*0.40];
      var N=200, pts=[];
      for(var j=0;j<N;j++){var t=j/(N-1),p=bez3(A,B,C,D,t);
        pts.push([p[0],p[1]-Math.sin(t*Math.PI*2.6)*size*0.028]);}
      var cut=Math.floor(N*0.62);
      x.lineCap='round';
      for(var j=0;j<cut-1;j++){var t=j/(cut-2);
        x.strokeStyle=(P.dark?'rgba(214,216,220,':'rgba(84,90,104,')+(0.03+0.34*t).toFixed(3)+')';
        x.lineWidth=size*0.011;
        x.beginPath();x.moveTo(pts[j][0],pts[j][1]);x.lineTo(pts[j+1][0],pts[j+1][1]);x.stroke();}
      var e=pts[cut-1];
      var PW=size*0.48;
      x.save();
      x.translate(e[0]+size*0.075, e[1]-size*0.055);
      x.rotate(-24*Math.PI/180);
      x.shadowColor='rgba(51,51,58,0.20)'; x.shadowBlur=size*0.045; x.shadowOffsetY=size*0.016;
      var W2=PW*0.74,H2=PW,C2=12,R2=15;
      var M=meshPoints(W2,H2,3.1,0.30,C2,R2), pp=M.pts, edge=[];
      for(var cc=0;cc<=C2;cc++) edge.push(pp[0][cc]);
      for(var rr=1;rr<=R2;rr++) edge.push(pp[rr][C2]);
      for(var cc=C2-1;cc>=0;cc--) edge.push(pp[R2][cc]);
      for(var rr=R2-1;rr>=1;rr--) edge.push(pp[rr][0]);
      x.beginPath(); edge.forEach(function(p,ii){ii?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y);}); x.closePath();
      x.fillStyle='rgba(253,252,249,0.97)'; x.fill();
      x.shadowColor='transparent';
      x.strokeStyle=(P.dark?'rgba(120,126,140,0.85)':'rgba(74,79,92,0.54)'); x.lineWidth=size*0.013; x.lineJoin='round'; x.stroke();
      x.beginPath();
      for(var rr=0;rr<=R2;rr++){var p=pp[rr][Math.round(C2*0.62)]; rr?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y);}
      x.strokeStyle=(P.dark?'rgba(120,126,140,0.45)':'rgba(74,79,92,0.26)'); x.lineWidth=size*0.013*0.62; x.stroke();
      x.restore();
      return [e[0]+size*0.075, e[1]-size*0.055];
    }
    var pc=drawMark(P.mx, P.my, P.ms);

    // ---- คำ: ฟอนต์ตัวจริงของแอป ----
    x.fillStyle=P.col;
    x.textBaseline='alphabetic';
    x.font=P.fw+' '+P.fs+'px "Noto Serif Thai", Georgia, serif';
    // canvas ไม่รองรับ letter-spacing ในทุกรุ่น — วาดทีละตัวเพื่อคุมระยะเอง
    var word='drift', ls=P.fs*P.ls, tw=0, ws=[];
    for(var i2=0;i2<word.length;i2++){ var m2=x.measureText(word[i2]).width; ws.push(m2); tw+=m2+ls; }
    tw-=ls;
    var ty = P.stack ? (pc[1]+P.ms*P.gapv+P.fs*0.36) : (pc[1]+P.fs*0.36);
    var tx = P.stack ? (P.mx-tw/2) : (pc[0]+P.ms*0.26+P.fs*P.gaph);
    for(var i2=0;i2<word.length;i2++){ x.fillText(word[i2],tx,ty); tx+=ws[i2]+ls; }
    R.push(cv.toDataURL('image/png'));
  });
  var d=document.createElement('div'); d.id='R'; d.textContent=R.join('\n');
  document.body.appendChild(d);
 },1200);
})();
</script>
</body>"""

def render(variants, tag):
    src = open(APP, encoding='utf-8').read()
    page = src.replace('</body>', JS.replace('VARIANTS', repr(variants).replace("'", '"')))
    f = os.path.join(OUT, '_lock.html')
    open(f, 'w', encoding='utf-8').write(page)
    out = subprocess.run([CHROME,'--headless=new','--disable-gpu','--window-size=900,900',
                          '--virtual-time-budget=9000','--dump-dom','file:///'+f.replace('\\','/')],
                         capture_output=True, text=True, encoding='utf-8', errors='replace').stdout
    m = re.search(r'<div id="R">(.*?)</div>', out, re.S)
    if not m: print('NO RESULT'); return []
    urls=[u for u in m.group(1).split('\n') if u.startswith('data:image')]
    ps=[]
    for i,u in enumerate(urls):
        p=os.path.join(OUT,'%s%d.png'%(tag,i)); open(p,'wb').write(base64.b64decode(u.split(',')[1])); ps.append(p)
    return ps

if __name__ == '__main__':
    INK  = 'rgba(58,61,69,0.88)'
    PALE = 'rgba(233,229,219,0.92)'
    B=dict(w=1800,h=900,mx=560,my=430,fw='400',ls=0.34,stack=0,gapv=0.0,dark=0)
    H  = dict(B, ms=400, fs=150, gaph=0.52, col=INK)
    V  = dict(B, stack=1, w=1200, h=1400, mx=600, my=540, ms=460, fs=140, gapv=0.42, gaph=0, col=INK)
    HD = dict(H, dark=1, col=PALE)
    VD = dict(V, dark=1, col=PALE)
    MK = dict(B, w=900, h=900, mx=450, my=450, ms=560, fs=1, gaph=0, col='rgba(0,0,0,0)')
    print(len(render([H,V,HD,VD,MK],'out')))
