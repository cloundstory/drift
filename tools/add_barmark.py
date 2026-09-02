# -*- coding: utf-8 -*-
"""โลโก้หัวจอต้องใช้เวอร์ชันเส้นหนา — ของเดิมเส้นบางจนจางหายเองที่ 28 px"""
import base64, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(os.path.dirname(HERE), 'index.html')
ART = os.environ['VAR_OUT']

b = base64.b64encode(open(os.path.join(ART, 'mark_bar_d3.png'), 'rb').read()).decode()
barmark = 'data:image/png;base64,' + b

s = open(APP, encoding='utf-8').read()
old = "const INTROMARK='"
i = s.index(old)
j = s.index("';", i) + 2

new_block = s[i:j] + """
/* โลโก้บนหัวจอใช้คนละไฟล์กับหน้าเปิด — เส้นของโลโก้เต็มบางเกินไป
   ย่อลง 28 px แล้วจางหายเอง แม้ opacity เต็ม (วัดแล้ว ข้อ 124.5)
   ตัวนี้ขยายขอบหมึกมา 3 พิกเซลที่ความละเอียด 224 ก่อนย่อ — หนาพอให้อ่านออก
   โดยยังเห็นรูปทรงกระดาษ (dilate 5 ขึ้นไปกระดาษตัน กลายเป็นก้อน) */
const BARMARK='""" + barmark + "';"

s = s[:i] + new_block + s[j:]

old_call = "$('#brandMark').src=INTROMARK;   /* โลโก้บนหัวจอ ใช้ภาพเดียวกับหน้าเปิด ไม่เพิ่มไบต์ */"
if old_call not in s:
    sys.exit('call site not found')
s = s.replace(old_call, "$('#brandMark').src=BARMARK;   /* เวอร์ชันเส้นหนาสำหรับ 28 px (ข้อ 124.5) */")

s = s.replace(".brand img{width:28px;height:28px;display:block;opacity:.72;flex:none}",
              ".brand img{width:28px;height:28px;display:block;opacity:.78;flex:none}")

open(APP, 'w', encoding='utf-8').write(s)
print('barmark bytes:', len(barmark), 'file chars:', len(s))
