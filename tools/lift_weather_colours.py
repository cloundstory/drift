# -*- coding: utf-8 -*-
"""ยกสีอากาศบนลูกโลกเป็น SKIN แล้วกลับขั้วในโหมดมืด (ข้อ 135)
   ⚠️ วัดแล้ว: เมฆต่างจากพื้น 27 ในโหมดสว่าง เหลือ 5.6 ในโหมดมืด — หายไป 80%
      เพราะพื้นที่มันวาดทับหรี่ลง แต่สีอากาศยังเข้มเท่าเดิม
   📌 หลักเดียวกับ "การกลับขั้ว" ของเส้นชายฝั่งฝั่งกลางคืน (ข้อ 40)"""
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


# ---- 1. token ----
sub("""  dayEdge: 0.06,""",
    """  dayEdge: 0.06,

  /* ---- อากาศบนลูกโลก (ข้อ 135) ----
     ⚠️ ทั้งหมดเป็นสีเข้มที่วาดทับผิวโลก — ได้ผลตอนผิวสว่าง
        พอโหมดมืดหรี่ผิวลง ความต่างก็หายตาม (เมฆ 27 → 5.6)
     📌 โหมดมืดจึงต้องกลับขั้วให้สว่างขึ้น หลักเดียวกับเส้นชายฝั่งกลางคืน (ข้อ 40) */
  cloud:  '58,63,76',      /* ลายเมฆที่ถูกถม */
  rain:   '48,53,66',      /* เม็ดฝนที่ร่วง */
  ice:    '52,60,78',      /* ฝนแข็ง */
  iceDot: '255,255,252',   /* เกล็ดหิมะ — สว่างอยู่แล้วทั้งสองโหมด */
  fog:    '46,54,72',      /* หมอกจริง */
  gust:   '48,53,66',      /* ลมกระโชก */""")

# ---- 2. แทนที่จุดใช้งาน ----
sub("      ctx.strokeStyle='rgba(58,63,76,'+(ai/90).toFixed(4)+')';",
    "      ctx.strokeStyle='rgba('+SKIN.cloud+','+(ai/90).toFixed(4)+')';")
sub("      ctx.strokeStyle='rgba(48,53,66,'+(ai/32).toFixed(3)+')';",
    "      ctx.strokeStyle='rgba('+SKIN.rain+','+(ai/32).toFixed(3)+')';")
sub("      ctx.strokeStyle='rgba(52,60,78,'+(ai/32).toFixed(3)+')';",
    "      ctx.strokeStyle='rgba('+SKIN.ice+','+(ai/32).toFixed(3)+')';")
sub("      ctx.fillStyle='rgba(255,255,252,'+(ai/24).toFixed(3)+')';",
    "      ctx.fillStyle='rgba('+SKIN.iceDot+','+(ai/24).toFixed(3)+')';")
sub("        ctx.strokeStyle='rgba(46,54,72,'+(ai/40).toFixed(3)+')';",
    "        ctx.strokeStyle='rgba('+SKIN.fog+','+(ai/40).toFixed(3)+')';")
sub("    ctx.strokeStyle='rgba(48,53,66,'+a.toFixed(3)+')';",
    "    ctx.strokeStyle='rgba('+SKIN.gust+','+a.toFixed(3)+')';")

# ---- 3. ชุดมืด — กลับขั้ว ----
sub("""  nightGrid:'108,117,129', nightCoast:'118,123,131', termLine:'121,113,99',
};""",
    """  nightGrid:'108,117,129', nightCoast:'118,123,131', termLine:'121,113,99',
  /* กลับขั้ว: ผิวโลกหรี่ลงแล้ว อากาศจึงต้องสว่างขึ้นถึงจะยังอ่านออก (ข้อ 135)
     ⓘ iceDot สว่างอยู่แล้วทั้งสองโหมด ไม่ต้องเปลี่ยน */
  cloud:'214,220,232', rain:'224,230,242', ice:'218,226,240',
  fog:'206,214,228', gust:'224,230,242',
};""")

io.open(APP, 'w', encoding='utf-8').write(s)
print('patched', n, 'sites')
