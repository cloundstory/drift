# -*- coding: utf-8 -*-
"""ซีกกลางวันไม่มีสีของตัวเอง — มันคือพื้นแอปที่มองผ่านชั้นสีจาง (ข้อ 129)
   เพิ่มตัวคูณความทึบ เพื่อให้โหมดมืดยกซีกกลางวันขึ้นมาจากพื้นได้จริง
   ⚠️ ค่าตั้งต้น 1 = ไม่เปลี่ยนอะไรจากเดิมแม้แต่พิกเซลเดียว"""
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


# ---- 1. แก้คอมเมนต์ที่เขียนผิด + เพิ่มตัวคูณความทึบ ----
sub("""  lift:     '238,235,227',   /* ยกซีกกลางวันให้สว่างขึ้นทั้งซีก */""",
    """  lift:     '238,235,227',   /* ⚠️ ยกซีก*กลางคืน*ให้ไม่ทึบเกิน (liftNight) ไม่ใช่กลางวัน */""")

sub("""  selDot:   '210,168,96',
};""",
    """  selDot:   '210,168,96',

  /* ---- ตัวคูณความทึบ (ข้อ 129) ----
     ⚠️ ซีกกลางวันของลูกโลก *ไม่มีสีของตัวเอง* — มันคือพื้นแอปที่มองผ่านชั้นสีจาง
        (alpha .5 ตรงจุดที่แดดตั้งฉาก ไล่ลงเหลือ .06 ที่ขอบ)
        พอพื้นแอปมืด ฐานที่ซีกกลางวันยืนอยู่ก็หายไป เพิ่มค่า RGB เท่าไหร่ก็ไม่ช่วย
        เพราะที่ขอบ 94% ของสีที่ตาเห็นคือพื้น ไม่ใช่สีของโลก
     📌 โหมดมืดจึงต้องยกความทึบ ไม่ใช่แค่เปลี่ยนสี
     ⓘ 1 = เท่าเดิมเป๊ะ · ค่ามากกว่า 1 ทำให้ซีกนั้นมีตัวตนของตัวเองมากขึ้น */
  dayA:  1,    /* เนื้อทรงกลมฝั่งกลางวัน */
  nightA: 1,   /* ชั้นมืดฝั่งกลางคืน */
};""")

# ---- 2. ชั้นเนื้อทรงกลมฝั่งกลางวัน ----
sub("""    g.addColorStop(0,'rgba('+SKIN.lit+','+(lit?.5:.22)+')');
    g.addColorStop(.55,'rgba('+SKIN.litMid+',0.15)');
    g.addColorStop(1,'rgba('+SKIN.litEdge+',0.06)');""",
    """    const dA=v=>Math.min(1,v*SKIN.dayA).toFixed(3);
    g.addColorStop(0,'rgba('+SKIN.lit+','+dA(lit?.5:.22)+')');
    g.addColorStop(.55,'rgba('+SKIN.litMid+','+dA(0.15)+')');
    g.addColorStop(1,'rgba('+SKIN.litEdge+','+dA(0.06)+')');""")

# ---- 3. ชั้นมืดฝั่งกลางคืน (สองที่ ใช้ค่าเดียวกัน) ----
sub("""      tgt.fillStyle='rgba('+SKIN.nightBg+',0.34)';""",
    """      tgt.fillStyle='rgba('+SKIN.nightBg+','+Math.min(1,0.34*SKIN.nightA).toFixed(3)+')';""")
sub("""      n.addColorStop(0,'rgba('+SKIN.nightG0+',0.22)');
      n.addColorStop(.6,'rgba('+SKIN.nightG1+',0.10)');""",
    """      const nA=v=>Math.min(1,v*SKIN.nightA).toFixed(3);
      n.addColorStop(0,'rgba('+SKIN.nightG0+','+nA(0.22)+')');
      n.addColorStop(.6,'rgba('+SKIN.nightG1+','+nA(0.10)+')');""")
sub("""    r.fillStyle='rgba('+SKIN.nightBg+',0.34)';""",
    """    r.fillStyle='rgba('+SKIN.nightBg+','+Math.min(1,0.34*SKIN.nightA).toFixed(3)+')';""")

io.open(APP, 'w', encoding='utf-8').write(s)
print('patched', n, 'sections')
