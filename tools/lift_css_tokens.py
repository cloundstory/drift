# -*- coding: utf-8 -*-
"""ยกสี CSS เป็น token (ข้อ 131)
   ⚠️ ค่าทุกตัวเท่าเดิมเป๊ะ — ขั้นนี้ยังไม่มีโหมดมืด แค่ทำที่ให้หมุน
   📌 UI เกือบทั้งแอปคือ rgba(255,255,255,α) วางทับพื้น ไม่ได้ระบายสี (ข้อ 127.2)
      จึงยุบเหลือไม่กี่ token ได้จริง"""
import io, re, sys

APP = 'index.html'
s = io.open(APP, encoding='utf-8').read()

head, sep, rest = s.partition('<style>')
css, sep2, tail = rest.partition('</style>')
if not sep or not sep2:
    sys.exit('style block not found')

TOKENS = """:root{
  --gold:#c69a54;
  --line:rgba(84,90,104,.30);
  --line-soft:rgba(84,90,104,.15);
  --txt:rgba(51,51,58,.92);
  --dim:rgba(84,90,104,.55);
  --faint:rgba(84,90,104,.38);
"""

NEW_TOKENS = """:root{
  /* ---------- สีของแอป (ข้อ 131) ----------
     📌 UI เกือบทั้งหมดคือ "แผ่น" วางทับ "พื้น" ไม่ได้ระบายสี
        โหมดมืดจึงคือเปลี่ยนแผ่นขาวเป็นแผ่นสว่างบนพื้นเข้ม (ข้อ 127.2)
     ⓘ เก็บเป็น 'r,g,b' เพื่อให้ rgba(var(--x), α) ใช้ได้ทุกระดับความจาง
     ⚠️ --paper-ink คือหมึกบน *กระดาษ* ซึ่งเป็นคนละโลกกับ --ink ของ UI
        กระดาษยังสว่างในโหมดมืด หมึกบนมันจึงต้องเข้มเหมือนเดิม (ข้อ 130.3) */
  --sheet-rgb: 255,255,255;      /* แผ่นที่วางทับพื้น — ปุ่ม การ์ด ชิป ช่องกรอก */
  --ink-rgb: 84,90,104;          /* หมึกของ UI */
  --gold-rgb: 198,154,84;
  --paper-ink-rgb: 43,43,47;     /* หมึกบนกระดาษ */
  --shadow-rgb: 51,51,58;
  --alert-rgb: 168,87,74;
  --bg-a: #dfe2e6;               /* พื้นแอป สองปลายของ gradient */
  --bg-b: #eee9de;
  --sheet-a: 223,226,230;        /* พื้นของแผ่นเต็มจอ */
  --sheet-b: 238,233,222;
  --gold-ink: #8b6a33;           /* ตัวหนังสือสีทองบนปุ่ม */
  --gold-ink-2: #7d5f2e;
  --alert: #a8574a;
  --hits-bg: #fbf9f4;

  --gold:#c69a54;
  --line:rgba(var(--ink-rgb),.30);
  --line-soft:rgba(var(--ink-rgb),.15);
  --txt:rgba(var(--shadow-rgb),.92);
  --dim:rgba(var(--ink-rgb),.55);
  --faint:rgba(var(--ink-rgb),.38);
"""

if TOKENS not in css:
    sys.exit('root block not matched')
css = css.replace(TOKENS, NEW_TOKENS, 1)

# ---- แทนที่ทุกจุดที่เหลือด้วย token ----
PAIRS = [
    (r'rgba\(255,255,255,', 'rgba(var(--sheet-rgb),'),
    (r'rgba\(84,90,104,',   'rgba(var(--ink-rgb),'),
    (r'rgba\(198,154,84,',  'rgba(var(--gold-rgb),'),
    (r'rgba\(43,43,47,',    'rgba(var(--paper-ink-rgb),'),
    (r'rgba\(51,51,58,',    'rgba(var(--shadow-rgb),'),
    (r'rgba\(168,87,74,',   'rgba(var(--alert-rgb),'),
    (r'rgba\(223,226,230,', 'rgba(var(--sheet-a),'),
    (r'rgba\(238,233,222,', 'rgba(var(--sheet-b),'),
]
n = 0
for pat, rep in PAIRS:
    css, k = re.subn(pat, rep, css)
    n += k

FLAT = [
    ('linear-gradient(165deg,#dfe2e6,#eee9de)', 'linear-gradient(165deg,var(--bg-a),var(--bg-b))'),
    ('color:#8b6a33', 'color:var(--gold-ink)'),
    ('color:#7d5f2e', 'color:var(--gold-ink-2)'),
    ('background:#fbf9f4', 'background:var(--hits-bg)'),
    ('#c69a54', 'var(--gold-flat)'),
]
for old, new in FLAT:
    if old in css:
        css = css.replace(old, new)
        n += 1

# --gold ถูกแทนไปด้วยตอน #c69a54 — คืนค่าให้เป็นสีจริงตัวเดียว
css = css.replace('--gold:var(--gold-flat);', '--gold-flat:#c69a54;\n  --gold:var(--gold-flat);', 1)

io.open(APP, 'w', encoding='utf-8').write(head + '<style>' + css + '</style>' + tail)
print('replaced', n, 'sites')
