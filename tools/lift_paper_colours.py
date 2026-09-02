# -*- coding: utf-8 -*-
"""ยกสีพื้นกระดาษเป็น PAPER (ข้อ 130)
   ⚠️ กระดาษ *มีเนื้อของตัวเอง* ต่างจากลูกโลกที่เป็นฟิล์มบนพื้นแอป
      alpha .72-.9 คือทึบจริง — โหมดมืดจึงต้องหรี่ตัวมันเอง ไม่ใช่เพิ่มความทึบ
   ⚠️ ค่าทุกตัวเท่าเดิมเป๊ะ"""
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


PAPER = """
/* ---------- สีของกระดาษ (ข้อ 130) ----------
   📌 ต่างจาก SKIN ตรงที่กระดาษ *มีเนื้อของตัวเอง* — alpha .72-.9 คือทึบจริง
      ลูกโลกเป็นฟิล์มบนพื้นแอป (ทึบ 4-12%) แต่กระดาษเป็นวัตถุ
      โหมดมืดจึงต้อง *หรี่กระดาษลง* ไม่ใช่เพิ่มความทึบเหมือนลูกโลก (ข้อ 129.2)
   ⚠️ ต้องอยู่เหนือ drawFlutter ที่ใช้มัน — const ไม่ยกขึ้นเหมือน function (ข้อ 106.6)
   ⓘ fresh/aged เป็น array เพราะ mix() ต้องการตัวเลข ไม่ใช่สตริง */
const PAPER = {
  fresh: [236,234,225],   /* กระดาษที่เพิ่งเขียน */
  aged:  [206,190,150],   /* กระดาษที่เดินทางมานาน */
  line:  '43,43,47',      /* เส้นบรรทัดกับตัวหนังสือ */
  edge:  '80,72,58',      /* ขอบที่ลมตีจนงอ */
};
"""

anchor = 'function drawFlutter(ctx,cx,cy,W,H,t,wind,age,traces){'
if anchor not in s:
    sys.exit('anchor not found')
s = s.replace(anchor, PAPER.strip() + '\n\n' + anchor, 1)
n += 1

sub("  const base=mix([236,234,225],[206,190,150],age*.85);",
    "  const base=mix(PAPER.fresh,PAPER.aged,age*.85);")
sub("  ctx.strokeStyle='rgba(43,43,47,'+(.32-age*.12)+')';ctx.lineWidth=1;",
    "  ctx.strokeStyle='rgba('+PAPER.line+','+(.32-age*.12)+')';ctx.lineWidth=1;")
sub("    ctx.strokeStyle='rgba(80,72,58,'+((wind-.5)*.5)+')';ctx.lineWidth=1.2;",
    "    ctx.strokeStyle='rgba('+PAPER.edge+','+((wind-.5)*.5)+')';ctx.lineWidth=1.2;")

io.open(APP, 'w', encoding='utf-8').write(s)
print('lifted', n, 'sites')
