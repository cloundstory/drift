# -*- coding: utf-8 -*-
"""ตรวจของจริงในเบราว์เซอร์ — วัดค่า ไม่ดูภาพ (ข้อ 102.9)"""
import re, subprocess, os

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(os.path.dirname(HERE), 'index.html')
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

JS = r"""
<script>
(function(){
 var ERR=[];
 addEventListener('error', function(e){ ERR.push(String(e.message||e.error)); });
 function load(src){ return new Promise(function(res){
   var i=new Image(); i.onload=function(){res([i.naturalWidth,i.naturalHeight]);};
   i.onerror=function(){res(null);}; i.src=src; }); }
 document.fonts.ready.then(function(){ setTimeout(function(){
  var R={};
  try{ openIntro(); }catch(e){ ERR.push('openIntro: '+e.message); }
  Promise.all([load(ICON192), load(ICON512), load(ICONMSK), load(INTROMARK)]).then(function(s){
    R.icon192=s[0]; R.icon512=s[1]; R.iconmsk=s[2]; R.intromark=s[3];
    var el=document.getElementById('introMark');
    R.introTag = el ? el.tagName : 'MISSING';
    R.introComplete = el ? !!el.complete : null;
    R.introNatural = el ? [el.naturalWidth, el.naturalHeight] : null;
    var r = el ? el.getBoundingClientRect() : null;
    R.introBox = r ? [Math.round(r.width), Math.round(r.height)] : null;
    var ap=document.querySelector('link[rel="apple-touch-icon"]');
    var fv=document.querySelector('link[rel="icon"]');
    R.appleLen = ap ? ap.href.length : 0;
    R.faviconLen = fv ? fv.href.length : 0;
    R.driftMarkCalls = (typeof driftMark==='function') ? 'still defined' : 'gone';
    try{ var mf=JSON.parse(atob(document.querySelector('link[rel=manifest]').href.split(',')[1]));
         R.theme=mf.theme_color; R.bg=mf.background_color; R.iconCount=mf.icons.length;
    }catch(e){ R.manifest='ERR '+e.message; }
    R.errors=ERR;
    var d=document.createElement('div'); d.id='R';
    d.textContent=JSON.stringify(R); document.body.appendChild(d);
  });
 }, 900); });
})();
</script>
</body>"""

src = open(APP, encoding='utf-8').read()
f = os.path.join(HERE, '_gen_verify.html')
open(f, 'w', encoding='utf-8').write(src.replace('</body>', JS))
out = subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--window-size=390,844',
                      '--virtual-time-budget=12000', '--dump-dom', 'file:///' + f.replace('\\', '/')],
                     capture_output=True, text=True, encoding='utf-8', errors='replace')
os.remove(f)
m = re.search(r'<div id="R">(.*?)</div>', out.stdout, re.S)
print(m.group(1) if m else 'NO RESULT')
err = [l for l in out.stderr.splitlines() if 'ERROR' in l or 'Uncaught' in l]
print('console errors:', err if err else 'none')
