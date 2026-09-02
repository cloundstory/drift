# -*- coding: utf-8 -*-
"""เรนเดอร์ไอคอนด้วยโค้ดของแอปเอง — drawFlutter คือกระดาษใบเดียวกับที่ลอยบนลูกโลก"""
import re, base64, subprocess, os, sys

OUT = os.path.dirname(os.path.abspath(__file__))
APP = r'C:\Users\User\Desktop\letter wind\index.html'
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

JS = r"""
<script>
(function(){
 setTimeout(function(){
  var R=[];
  var POSES = POSES_JSON;
  POSES.forEach(function(P,i){
    var S=1024;
    var cv=document.createElement('canvas'); cv.width=S; cv.height=S;
    var x=cv.getContext('2d');
    // พื้น — ไล่เฉดเดียวกับท้องฟ้าของแอป
    var g=x.createLinearGradient(0,0,S*0.26,S);
    g.addColorStop(0,P.g0); g.addColorStop(1,P.g1);
    x.fillStyle=g; x.fillRect(0,0,S,S);

    // รอยลม — จางที่หาง เข้มที่หัว (ข้อ 3) และ *แกว่ง* ไม่ใช่โค้งเรียบ
    var c=S/2, k=S*P.safe/2;
    function bez3(p0,p1,p2,p3,t){
      var u=1-t;
      return [u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],
              u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]];
    }
    var A=[c-k*0.98,c+k*0.64], B=[c-k*0.62,c-k*0.04], C=[c-k*0.04,c+k*0.18], D=[c+k*0.50,c-k*0.40];
    var N=200, pts=[];
    for(var j=0;j<N;j++){
      var t=j/(N-1), p=bez3(A,B,C,D,t);
      pts.push([p[0], p[1]-Math.sin(t*Math.PI*(P.sw||2.6))*S*(P.sa==null?0.028:P.sa)]);
    }
    var cut=Math.floor(N*P.cut);
    x.lineCap='round';
    for(var j=0;j<cut-1;j++){
      var t=j/(cut-2);
      x.strokeStyle='rgba('+(P.windc||'84,90,104')+','+(0.02+P.ink*t).toFixed(3)+')';
      x.lineWidth=S*P.lw;
      x.beginPath(); x.moveTo(pts[j][0],pts[j][1]); x.lineTo(pts[j+1][0],pts[j+1][1]); x.stroke();
    }
    var e=pts[cut-1];

    // กระดาษ — โค้ดของแอปเอง
    var PW=S*P.pw;
    x.save();
    x.translate(e[0]+S*P.dx, e[1]+S*P.dy);
    x.rotate(P.rot*Math.PI/180);
    if(P.sh>0){ x.shadowColor='rgba(51,51,58,'+P.sh+')'; x.shadowBlur=S*0.045; x.shadowOffsetY=S*0.016; }
    if(P.mode==='photo'){
      drawFlutter(x, 0, 0, PW*0.74, PW, P.t, P.w, 0, null);
    }else{
      /* รูปทรงมาจากฟิสิกส์ของแอป (meshPoints ตัวเดียวกับที่กระดาษใช้บนลูกโลก)
         แต่ลงหมึกแบบสัญลักษณ์ — ไม่มีตาข่าย ไม่มีเส้นบรรทัด
         เพราะรายละเอียดพวกนั้นเป็นภาษาของภาพ ซึ่งเละที่ 40 พิกเซล */
      var W2=PW*0.74, H2=PW, C=12, Rw=15;
      var M=meshPoints(W2,H2,P.t,P.w,C,Rw), pp=M.pts;
      var edge=[];
      for(var cc=0;cc<=C;cc++) edge.push(pp[0][cc]);
      for(var rr=1;rr<=Rw;rr++) edge.push(pp[rr][C]);
      for(var cc=C-1;cc>=0;cc--) edge.push(pp[Rw][cc]);
      for(var rr=Rw-1;rr>=1;rr--) edge.push(pp[rr][0]);
      x.beginPath();
      edge.forEach(function(p,ii){ ii?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y); });
      x.closePath();
      x.fillStyle=P.paper||'rgba(253,252,249,0.97)'; x.fill();
      x.shadowColor='transparent';
      var INK=P.inkc||'74,79,92';
      if(P.ol>0){ x.strokeStyle='rgba('+INK+','+P.oa+')'; x.lineWidth=S*P.ol; x.lineJoin='round'; x.stroke(); }
      if(P.fold){
        /* รอยพับเส้นเดียว — ตำแหน่งที่กระดาษบิดแรงที่สุดตามฟิสิกส์เดียวกัน */
        x.beginPath();
        for(var rr=0;rr<=Rw;rr++){ var p=pp[rr][Math.round(C*0.62)]; rr?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y); }
        x.strokeStyle='rgba('+(P.foldc||INK)+','+(P.folda||0.26)+')';
        x.lineWidth=S*(P.ol||0.012)*0.62; x.stroke();
      }
    }
    x.restore();
    R.push(cv.toDataURL('image/png'));
  });
  var d=document.createElement('div'); d.id='R';
  d.textContent=R.join('\n'); document.body.appendChild(d);
 }, 900);
})();
</script>
</body>"""

def render(poses, tag):
    src = open(APP, encoding='utf-8').read()
    page = src.replace('</body>', JS.replace('POSES_JSON', repr(poses).replace("'", '"')))
    f = os.path.join(OUT, '_gen.html')
    open(f, 'w', encoding='utf-8').write(page)
    out = subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--window-size=900,900',
                          '--virtual-time-budget=9000', '--dump-dom', 'file:///' + f.replace('\\', '/')],
                         capture_output=True, text=True, encoding='utf-8', errors='replace').stdout
    m = re.search(r'<div id="R">(.*?)</div>', out, re.S)
    if not m:
        print('NO RESULT'); return []
    urls = [u for u in m.group(1).split('\n') if u.startswith('data:image')]
    paths = []
    for i, u in enumerate(urls):
        p = os.path.join(OUT, '%s%d.png' % (tag, i))
        open(p, 'wb').write(base64.b64decode(u.split(',')[1]))
        paths.append(p)
    return paths

if __name__ == '__main__':
    # โลโก้จริง — รูปทรงจาก meshPoints ของแอป ลงหมึกแบบสัญลักษณ์ (ข้อ 107)
    B = dict(safe=0.74, ink=0.30, lw=0.011, cut=0.62, pw=0.48, sh=0.20,
             g0='#d7dbe1', g1='#e6e0d2', t=3.1, w=0.30, rot=-24,
             dx=0.075, dy=-0.055, mode='line', ol=0.013, oa=0.54, fold=1)
    MASK = dict(B, safe=0.52, pw=0.40, dx=0.055, dy=-0.040)
    print('rendered', len(render([B, MASK], 'logo')))
