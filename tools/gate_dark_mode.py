# -*- coding: utf-8 -*-
"""ใส่สวิตช์ให้โหมดมืด เปิด/ปิดด้วยค่าเดียว (ข้อ 136)
   ⓘ โค้ดทั้งหมดอยู่ครบ — ปิดคือไม่ติด class ไม่ใช่ลบทิ้ง
   วิธี: selector ใน @media ทุกตัวต้องมี html.dm นำหน้า แล้ว JS เป็นคนติด class"""
import io, re, sys

APP = 'index.html'
s = io.open(APP, encoding='utf-8').read()


def gate(block):
    """เติม html.dm ให้ทุก selector ในบล็อก — :root กลายเป็น html.dm"""
    out, depth, buf = [], 0, ''
    i = 0
    while i < len(block):
        ch = block[i]
        if ch == '{':
            depth += 1
            if depth == 1:
                sel = buf.strip()
                parts = []
                for one in sel.split(','):
                    one = one.strip()
                    if not one:
                        continue
                    if one == ':root':
                        parts.append('html.dm')
                    else:
                        parts.append('html.dm ' + one)
                out.append('\n  ' + ',\n  '.join(parts))
                buf = ''
            else:
                buf += ch
        elif ch == '}':
            depth -= 1
            if depth == 0:
                out.append('{' + buf + '}')
                buf = ''
            else:
                buf += ch
        else:
            buf += ch
        i += 1
    return ''.join(out)


count = 0
res = []
pos = 0
for m in re.finditer(r'@media \(prefers-color-scheme: dark\)\{', s):
    start = m.start()
    i = m.end()
    depth = 1
    while i < len(s) and depth:
        if s[i] == '{':
            depth += 1
        elif s[i] == '}':
            depth -= 1
        i += 1
    inner = s[m.end():i - 1]
    res.append(s[pos:start])
    res.append('/* ⛔ ปิดอยู่ชั่วคราว — ต้องมี html.dm ถึงจะทำงาน (ข้อ 136)\n'
               '   สวิตช์อยู่ที่ const DARK_MODE ในสคริปต์ ไม่ต้องแก้ CSS ตรงนี้ */\n'
               '@media (prefers-color-scheme: dark){' + gate(inner) + '\n}')
    pos = i
    count += 1
res.append(s[pos:])
s = ''.join(res)

# ---- สวิตช์ + ตัวติด class ----
old = """const SCHEME = matchMedia('(prefers-color-scheme: dark)');"""
new = """/* ⛔ โหมดมืดปิดอยู่ชั่วคราว (ข้อ 136) — โค้ดทั้งหมดยังอยู่ครบ
   เปลี่ยนเป็น true แล้วเปิดกลับได้ทันที ไม่ต้องแตะอย่างอื่นเลย
   ⓘ ปิดแล้วแอปเป็นโหมดสว่างเสมอ ไม่ว่าเครื่องจะตั้งไว้ยังไง */
const DARK_MODE = false;

const SCHEME = matchMedia('(prefers-color-scheme: dark)');"""
if old not in s:
    sys.exit('scheme anchor not found')
s = s.replace(old, new, 1)

old2 = """function syncScheme(){
  if(SCHEME.matches === schemeNow) return;   /* ไม่วาดใหม่ถ้าไม่ได้เปลี่ยนจริง */
  schemeNow = SCHEME.matches;
  applyScheme(schemeNow);
}"""
new2 = """function syncScheme(){
  const on = DARK_MODE && SCHEME.matches;
  if(on === schemeNow) return;   /* ไม่วาดใหม่ถ้าไม่ได้เปลี่ยนจริง */
  schemeNow = on;
  document.documentElement.classList.toggle('dm', on);
  applyScheme(on);
}"""
if old2 not in s:
    sys.exit('syncScheme not found')
s = s.replace(old2, new2, 1)

# แสงเทียนกับโลโก้เช็ค SCHEME.matches ตรง ๆ — ต้องผ่านสวิตช์ด้วย
s = s.replace("if(!SCHEME.matches || (sheetOpen!=='compose' && sheetOpen!=='read')){ cndRaf=null; return; }",
              "if(!DARK_MODE || !SCHEME.matches || (sheetOpen!=='compose' && sheetOpen!=='read')){ cndRaf=null; return; }", 1)
s = s.replace("const want = matchMedia('(prefers-color-scheme: dark)').matches ? INTROMARK_D : INTROMARK;",
              "const want = (DARK_MODE && SCHEME.matches) ? INTROMARK_D : INTROMARK;", 1)
s = s.replace("  im.src = matchMedia('(prefers-color-scheme: dark)').matches ? INTROMARK_D : INTROMARK;",
              "  im.src = (DARK_MODE && SCHEME.matches) ? INTROMARK_D : INTROMARK;", 1)

io.open(APP, 'w', encoding='utf-8').write(s)
print('gated %d media blocks' % count)
