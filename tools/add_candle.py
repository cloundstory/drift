# -*- coding: utf-8 -*-
"""แสงเทียนในโหมดมืด (ข้อ 134)
   ⛔ ไม่วาดเทียน มีแต่แสง — เห็นเทียนเป็นวัตถุคือของตกแต่งที่แย่งพื้นที่จากคำ
   ⚠️ เปลวไหวตามลมจริงที่ต้นทาง · ไม่รู้ลม = นิ่งสนิท (กฎเดียวกับกระดาษหายใจ ข้อ 102.2)"""
import io, sys

APP = 'index.html'
s = io.open(APP, encoding='utf-8').read()
n = 0


def sub(old, new):
    global s, n
    if old not in s:
        sys.exit('NOT FOUND: ' + old[:90])
    s = s.replace(old, new, 1)
    n += 1


# ---- 1. CSS — ใช้ ::before ไม่เพิ่ม element ----
CSS = """
/* ---------- แสงเทียน (ข้อ 134) ----------
   ⛔ ไม่มีเทียน มีแต่แสงที่ตกลงบนกระดาษ — เห็นเทียนเป็นวัตถุคือของตกแต่ง
      ที่แย่งพื้นที่จากคำ ซึ่งเป็นสิ่งเดียวที่หน้านั้นมีไว้ทำ (ข้อ 127.1)
   ⓘ ใช้ ::before ไม่เพิ่ม element · ตำแหน่งกับความเข้มมาจากตัวแปรที่ :root
      loop เดียวจึงคุมได้ทั้งหน้าเขียนและหน้าอ่าน
   ⚠️ โผล่เฉพาะโหมดมืด ผูกแกนเดียวกับทุกอย่าง ไม่ดูนาฬิกา (ข้อ 127.1) */
@media (prefers-color-scheme: dark){
  #cSheet::before,.ptext::before{
    content:'';position:absolute;inset:0;pointer-events:none;z-index:1;
    background:radial-gradient(128% 94% at var(--cnd-x,50%) var(--cnd-y,-7%),
      rgba(255,206,138,var(--cnd-a,.15)),
      rgba(255,176,96,calc(var(--cnd-a,.15) * .38)) 42%,
      transparent 70%);
  }
  /* เนื้อหาต้องอยู่เหนือแสง ไม่งั้นตัวหนังสือถูกฉาบจนซีด */
  #cSheet .ink,.ptext > *{position:relative;z-index:2}
}
"""

sub("#toast.on{opacity:1;transform:translateX(-50%)}",
    "#toast.on{opacity:1;transform:translateX(-50%)}\n" + CSS.strip())

# ---- 2. loop ----
JS = """
/* ---------- แสงเทียน (ข้อ 134) ----------
   ⚠️ ไหวตามลมจริงที่ต้นทางเท่านั้น — ไม่รู้ลม = นิ่งสนิท
      กฎเดียวกับกระดาษหายใจ (ข้อ 102.2) ที่ทำให้เทียนเป็นตัวบอกลม ไม่ใช่ของประดับ
   ⓘ ทำงานเฉพาะหน้าเขียนกับหน้าอ่าน และเฉพาะโหมดมืด */
let cndTick=0, cndRaf=null;
function candleSet(x,y,a){
  const r=document.documentElement.style;
  r.setProperty('--cnd-x', x.toFixed(1)+'%');
  r.setProperty('--cnd-y', y.toFixed(1)+'%');
  r.setProperty('--cnd-a', a.toFixed(3));
}
function candleStep(){
  if(!SCHEME.matches || (sheetOpen!=='compose' && sheetOpen!=='read')){ cndRaf=null; return; }
  cndRaf=requestAnimationFrame(candleStep);
  if(WIND_HERE===null){ candleSet(50,-7,.15); return; }   /* ไม่รู้ลม = เปลวนิ่ง */
  const w=clamp(WIND_HERE/45,0,1);
  cndTick+=1/60;
  const k=0.5+w*2.4;
  candleSet(50+Math.sin(cndTick*0.71)*k*1.5,
            -7+Math.sin(cndTick*0.53+1.1)*k*0.7,
            .15+Math.sin(cndTick*0.94+2.3)*k*0.006);
}
function candleOn(){
  windHere();                       /* หน้าอ่านไม่เคยเรียก — เทียนจะนิ่งตลอดถ้าไม่เรียกที่นี่ */
  if(!cndRaf) candleStep();
}
"""

sub("""/* ลม ณ ต้นทาง — อ่านจากแคชลมก้อนเดิมที่แอปโ""",
    JS.strip() + """

/* ลม ณ ต้นทาง — อ่านจากแคชลมก้อนเดิมที่แอปโ""")

# ---- 3. จุดเรียก ----
sub("  paintWritePaper(); syncKB(); windHere();",
    "  paintWritePaper(); syncKB(); windHere(); candleOn();")

io.open(APP, 'w', encoding='utf-8').write(s)
print('patched', n, 'sections')
