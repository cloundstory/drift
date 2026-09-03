# -*- coding: utf-8 -*-
"""ต่อโหมดมืดเข้าแอปจริง (ข้อ 131)
   CSS ทำเองด้วย @media · canvas ต้องดักฟัง matchMedia แล้ววาดใหม่ (ข้อ 129.7)"""
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


# ---- 1. ชุดสีมืดของ CSS ----
DARK_CSS = """
/* ---------- โหมดมืด (ข้อ 131) ----------
   📌 "แสงน้อยลง" ไม่ใช่ "กลับสี" — แผ่นขาวกลายเป็นแผ่นสว่างบนพื้นเข้ม (ข้อ 127.1)
   ⛔ กระดาษเป็นเกาะของตัวเอง — ทุกอย่างบนกระดาษใช้สีของกระดาษ ไม่ใช่สีของ UI
      กระดาษยังสว่าง หมึกบนมันจึงต้องเข้มเหมือนเดิม (ข้อ 130.3)
   ⚠️ ไม่มีปุ่มสลับในแอป ตั้งใจ — คนที่ชอบมืดตั้งที่ระบบไว้แล้ว (ข้อ 127.1) */
@media (prefers-color-scheme: dark){
  :root{
    --sheet-rgb: 231,224,207;
    --ink-rgb: 228,226,221;
    --gold-rgb: 208,179,128;
    --shadow-rgb: 0,0,0;
    --alert-rgb: 214,138,124;
    --bg-a: #1a1e28;
    --bg-b: #242c32;
    --sheet-a: 30,35,47;
    --sheet-b: 41,49,56;
    --gold-flat: #d0b380;
    --gold-ink: #d8bb88;
    --gold-ink-2: #c9a878;
    --alert: #d68a7c;
    --hits-bg: #222834;

    --line: rgba(var(--sheet-rgb),.26);
    --line-soft: rgba(var(--sheet-rgb),.13);
    --txt: rgba(var(--ink-rgb),.92);
    --dim: rgba(var(--ink-rgb),.62);
    --faint: rgba(var(--ink-rgb),.42);
  }
  /* แผ่นต่าง ๆ จางกว่าโหมดสว่าง เพราะบนพื้นเข้ม แผ่นสว่างแรงกว่ามาก */
  .btn{background:rgba(var(--sheet-rgb),.13)}
  .btn:active,.chip.sel{background:rgba(var(--sheet-rgb),.26)}
  .pbtn{background:rgba(var(--sheet-rgb),.17)}
  .chip,.fc,.pick,.link,.addr,.shade{background:rgba(var(--sheet-rgb),.10)}
  .pick.on{background:rgba(var(--sheet-rgb),.20)}
  .hit,#cHits .hit{background:rgba(var(--sheet-rgb),.10)}
  .hit:active{background:rgba(var(--sheet-rgb),.22)}
  input,textarea{background:rgba(var(--sheet-rgb),.10)}
  input:focus,textarea:focus{background:rgba(var(--sheet-rgb),.16)}
  #toast{background:rgba(var(--sheet-rgb),.94);color:var(--bg-a)}
  #splash{background:var(--bg-a)}
  .brand img,#introMark,#spMark{filter:invert(1) hue-rotate(180deg) brightness(1.12)}

  /* ---- กระดาษเป็นเกาะ (ข้อ 130.3) ----
     ⛔ อย่าให้กฎข้างบนทับตรงนี้ — ตัวหนังสือจะหายไปกับกระดาษ */
  #cSheet input,#cSheet textarea,#cWho .who{background:transparent;color:rgba(var(--paper-ink-rgb),.92)}
  #cSheet input:focus,#cSheet textarea:focus{background:transparent}
  #cSheet input::placeholder,#cSheet textarea::placeholder{color:rgba(var(--paper-ink-rgb),.38)}
  .wline .lb{color:rgba(var(--paper-ink-rgb),.9)}
  .ptext{color:rgba(var(--paper-ink-rgb),.9)}
  .sig{color:rgba(var(--paper-ink-rgb),.6)}
}
"""

sub('#toast.on{opacity:1;transform:translateX(-50%)}',
    '#toast.on{opacity:1;transform:translateX(-50%)}\n' + DARK_CSS.strip())

# ---- 2. canvas ต้องตามด้วย ----
DARK_JS = """
/* ---------- โหมดมืดของ canvas (ข้อ 131) ----------
   ⚠️ CSS เปลี่ยนเองได้ แต่ canvas ไม่รู้เรื่อง — ต้องดักฟังแล้ววาดใหม่
      ลืมข้อนี้แล้วลูกโลกจะค้างสีเดิมทั้งที่ UI เปลี่ยนไปแล้ว (ข้อ 129.7)
   ⚠️ และต้องล้าง G._key ด้วย เพราะแคชคิดจากมุมกับซูมเท่านั้น ไม่รู้จักสี (ข้อ 128.3) */
const LIGHT_SKIN = Object.assign({}, SKIN);
const LIGHT_PAPER = {fresh:PAPER.fresh.slice(), aged:PAPER.aged.slice(),
  sheetFresh:PAPER.sheetFresh.slice(), sheetAged:PAPER.sheetAged.slice(),
  line:PAPER.line, edge:PAPER.edge};
const LIGHT_FOG = CFG.FOG;

const DARK_SKIN = {
  base:'120,121,123', baseA:0.30,      /* ลูกโลกต้องมีเนื้อของตัวเอง (ข้อ 129.2) */
  dayA:3.2, nightA:3.0,
  nightBg:'18,21,32', nightG0:'15,18,29', nightG1:'17,20,31', nightG2:'19,22,33',
  nightGrid:'108,117,129', nightCoast:'118,123,131', termLine:'121,113,99',
};
const DARK_PAPER = {
  fresh:[165,154,134], aged:[145,125,85],
  sheetFresh:[169,158,137], sheetAged:[151,134,98],
};
const DARK_FOG = 0.18;   /* หมอกต้องต่างกันสองโหมด — สว่าง=ถูกกลืน มืด=หายไป (ข้อ 129.4) */

function applyScheme(dark){
  Object.assign(SKIN, dark ? DARK_SKIN : LIGHT_SKIN);
  Object.assign(PAPER, dark ? DARK_PAPER : LIGHT_PAPER);
  CFG.FOG = dark ? DARK_FOG : LIGHT_FOG;
  try{ G._key=null; G._nkey=null; }catch(e){}
  try{ renderGlobe(); }catch(e){}
  try{ repaintPaper(); }catch(e){}
}
const SCHEME = matchMedia('(prefers-color-scheme: dark)');
SCHEME.addEventListener('change', e => applyScheme(e.matches));
applyScheme(SCHEME.matches);
"""

sub("""bootRoute();
startSplash();""",
    DARK_JS.strip() + """

bootRoute();
startSplash();""")

io.open(APP, 'w', encoding='utf-8').write(s)
print('patched', n, 'sections')
