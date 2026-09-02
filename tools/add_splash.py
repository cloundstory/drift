# -*- coding: utf-8 -*-
"""หน้า splash ครั้งแรกของ session + โลโก้แทนคำ drift ที่หัวจอ (ข้อ 124)"""
import os, sys

APP = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'index.html')
s = open(APP, encoding='utf-8').read()
n = 0


def sub(old, new):
    global s, n
    if old not in s:
        sys.exit('NOT FOUND: ' + old[:100])
    s = s.replace(old, new, 1)
    n += 1


# ---- 1. ตัดสินใจก่อน body วาด — ไม่งั้นคนที่ไม่ควรเห็น splash จะเห็นแวบหนึ่ง ----
#    ⚠️ ต้องอ่าน localStorage ตรง ๆ เพราะ K กับ store ยังไม่ถูกประกาศตอนนี้
#    ชื่อคีย์ต้องตรงกับ K ที่ index.html:785 — แก้ที่นั่นแล้วต้องแก้ที่นี่ด้วย
sub('<meta name="theme-color" content="#f9f0e5">',
    '''<meta name="theme-color" content="#f9f0e5">
<script>
/* หน้า splash — ตัดสินตั้งแต่ก่อน <body> วาด (ข้อ 124.2)
   ⛔ คนที่กดลิงก์จดหมายมาต้องไม่เจอ (ข้อ 105.5) · คนใหม่ไปหน้าเปิดเลย ไม่งั้นเห็นโลโก้สองรอบ
   ⚠️ คีย์ต้องตรงกับ K ที่ประกาศทีหลังในไฟล์ — ที่นี่อ่านเองเพราะ store ยังไม่เกิด */
(function(){
  var no=function(){ document.documentElement.className+=' nosp'; };
  try{
    if(location.hash.length>10) return no();                    /* ลิงก์มาก่อนเสมอ */
    if(sessionStorage.getItem('lw.v1.splash')==='1') return no(); /* เห็นไปแล้วรอบนี้ */
    var L=localStorage.getItem('lw.v1.letters'), M=localStorage.getItem('lw.v1.me'), me=null;
    try{ me=M?JSON.parse(M):null; }catch(e){}
    var known = localStorage.getItem('lw.v1.intro')==='1'
             || (L && L!=='[]' && L.length>2)
             || (me && (me.name || me.lat!=null));
    if(!known) return no();                                      /* คนใหม่ → หน้าเปิด */
    sessionStorage.setItem('lw.v1.splash','1');
  }catch(e){ return no(); }   /* ที่เก็บของพัง = ไม่แสดงดีกว่าค้าง */
})();
</script>''')

# ---- 2. CSS ----
sub(".brand{font-size:12px;letter-spacing:.34em;color:var(--faint);pointer-events:none}",
    """.brand{display:flex;align-items:center;gap:9px;font-size:12px;letter-spacing:.34em;
  color:var(--faint);pointer-events:none}
/* 28px คือเพดานที่แถบไม่สูงขึ้น เพราะ .mbtn มี margin -8px กินความสูงจริงแค่ 28 อยู่แล้ว
   ⚠️ เส้นของโลโก้บางมาก ย่อแล้วจางเอง — ตั้ง opacity ต่ำกว่านี้จะหายไปเลย (ข้อ 124.5) */
.brand img{width:28px;height:28px;display:block;opacity:.72;flex:none}
.brand span{display:block;margin-top:1px}

/* ---------- หน้า splash (ข้อ 124) ---------- */
#splash{position:fixed;inset:0;z-index:90;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:13px;background:#f9f0e5;
  transition:opacity .55s ease}
#splash.out{opacity:0;pointer-events:none}
html.nosp #splash{display:none}
#spMark{width:132px;height:132px;display:block;opacity:0;transition:opacity .5s ease}
#spMark.on{opacity:1}
#spWord{font-size:13px;letter-spacing:.34em;color:var(--dim);opacity:0;transition:opacity .5s ease .12s}
#spMark.on + #spWord{opacity:1}""")

# ---- 3. markup ----
sub('<body>\n<canvas id="stage"></canvas>',
    '''<body>
<!-- F0 หน้า splash — ครั้งแรกของแต่ละ session เท่านั้น (ข้อ 124)
     สคริปต์ใน <head> เป็นคนตัดสินว่าจะวาดไหม ที่นี่แค่วางของ -->
<div id="splash"><img id="spMark" alt=""><div id="spWord">drift</div></div>
<canvas id="stage"></canvas>''')

sub('    <div class="brand">drift</div>',
    '    <div class="brand"><img id="brandMark" alt=""><span>drift</span></div>')

# ---- 4. JS — ใส่ต่อจาก paintIntroMark เพราะใช้ INTROMARK ตัวเดียวกัน ----
sub("""function paintIntroMark(){
  const el=$('#introMark'); if(!el) return;
  if(el.getAttribute('src')!==INTROMARK) el.src=INTROMARK;
}""",
    """function paintIntroMark(){
  const el=$('#introMark'); if(!el) return;
  if(el.getAttribute('src')!==INTROMARK) el.src=INTROMARK;
}

/* ---------- หน้า splash (ข้อ 124) ----------
   ⚠️ นับ 1.2 วินาทีจากตอนที่ *โลโก้ปรากฏ* ไม่ใช่ตอนเปิดหน้า
      ไม่งั้นเครื่องที่โหลดช้าจะได้ splash ที่แวบหายก่อนตาจับได้ */
const SPLASH_MS=1200;
let splashGone=false;
function hideSplash(){
  if(splashGone) return; splashGone=true;
  const el=$('#splash'); if(!el) return;
  el.classList.add('out');
  setTimeout(()=>{ el.remove(); }, 600);
}
function startSplash(){
  const el=$('#splash'); if(!el || document.documentElement.classList.contains('nosp')){
    if(el) el.remove(); splashGone=true; return;
  }
  const im=$('#spMark');
  im.addEventListener('load', ()=>{ im.classList.add('on'); setTimeout(hideSplash, SPLASH_MS); });
  im.addEventListener('error', ()=>{ setTimeout(hideSplash, SPLASH_MS); });
  im.src=INTROMARK;
  /* แตะข้ามได้ — คนที่รีบไม่ควรถูกบังคับให้รอ */
  ['pointerdown','keydown'].forEach(ev=>addEventListener(ev, hideSplash, {once:true}));
}""")

# ---- 5. เรียกตอน boot — ต่อจาก bootRoute() ที่มีอยู่ ----
sub("""bootRoute();
try{ localStorage.removeItem('drift.lock'); }catch(e){}""",
    """bootRoute();
startSplash();
$('#brandMark').src=INTROMARK;   /* โลโก้บนหัวจอ ใช้ภาพเดียวกับหน้าเปิด ไม่เพิ่มไบต์ */
try{ localStorage.removeItem('drift.lock'); }catch(e){}""")

open(APP, 'w', encoding='utf-8').write(s)
print('patched', n, 'sections ·', len(s), 'chars')
