# -*- coding: utf-8 -*-
"""ยกสีลูกโลกออกมาเป็น SKIN — ค่าต้องเท่าเดิมเป๊ะ ยังไม่ทำโหมดมืด (ข้อ 128)
   ⚠️ SKIN ต้องประกาศก่อน G object ไม่งั้น TDZ แล้ว boot ตายทั้งก้อน (ข้อ 106.6)"""
import io, sys

APP = 'index.html'
s = io.open(APP, encoding='utf-8').read()
n = 0


def sub(old, new, count=1):
    global s, n
    if s.count(old) < count:
        sys.exit('NOT FOUND (%d/%d): %s' % (s.count(old), count, old[:80]))
    s = s.replace(old, new, count)
    n += count


SKIN = """
/* ---------- สีของลูกโลก (ข้อ 128) ----------
   ยกออกมาจากที่กระจายอยู่ 12 จุด เพื่อให้มีที่เดียวที่ต้องแก้ตอนทำโหมดมืด
   ⚠️ ค่าทุกตัวเท่าของเดิมเป๊ะ — ขั้นนี้ไม่เปลี่ยนหน้าตาแม้แต่พิกเซลเดียว
   ⚠️ ต้องอยู่เหนือ G ที่ใช้มัน — const ไม่ยกขึ้นเหมือน function (ข้อ 106.6)
   ⓘ เก็บเป็น 'r,g,b' เพราะ segs() ประกอบ rgba เองอยู่แล้ว */
const SKIN = {
  lit:      '255,253,246',   /* แสงที่ตกบนโลกฝั่งโดนแดด */
  litMid:   '240,238,232',
  litEdge:  '196,193,186',
  lift:     '238,235,227',   /* ยกซีกกลางวันให้สว่างขึ้นทั้งซีก */
  nightBg:  '34,40,60',      /* พื้นกลางคืน ทึบสม่ำเสมอ (ข้อ 41) */
  nightG0:  '28,34,54',      /* ไล่ระดับความลึกของกลางคืน */
  nightG1:  '32,38,58',
  nightG2:  '36,42,62',
  dayInk:   '84,90,104',     /* เส้นชายฝั่ง+กริด ฝั่งกลางวัน */
  nightGrid:'204,220,244',   /* ฝั่งกลางคืนกลับขั้ว เส้นสว่างบนพื้นมืด (ข้อ 40) */
  nightCoast:'222,232,248',
  termLine: '228,214,186',   /* เส้นขอบแสง รอยต่อวัน-คืน */
  rim:      '70,76,86',      /* ขอบโลก */
  atmo:     '198,154,84',    /* ชั้นบรรยากาศฝั่งโดนแดด */
  cityGlow: '226,172,88',    /* ไฟเมือง — วงแสงรอบจุด */
  cityDot:  '240,206,140',
  markHalo: '247,245,239',   /* วงแสงรอบจุดจดหมาย */
  selHalo:  '198,154,84',
  selDot:   '210,168,96',
};
"""

# ---- วางไว้เหนือ G ----
anchor = 'const G = {'
if anchor not in s:
    sys.exit('anchor not found')
s = s.replace(anchor, SKIN.strip() + '\n\n' + anchor, 1)
n += 1

# ---- 1. แสงบนโลก (3 สี ใน gradient เดียว) ----
sub("""    g.addColorStop(0,'rgba(255,253,246,'+(lit?.5:.22)+')');
    g.addColorStop(.55,'rgba(240,238,232,0.15)');
    g.addColorStop(1,'rgba(196,193,186,0.06)');""",
    """    g.addColorStop(0,'rgba('+SKIN.lit+','+(lit?.5:.22)+')');
    g.addColorStop(.55,'rgba('+SKIN.litMid+',0.15)');
    g.addColorStop(1,'rgba('+SKIN.litEdge+',0.06)');""")

# ---- 2. ยกซีกกลางวัน ----
sub("""    g.addColorStop(0,'rgba(238,235,227,'+lift.toFixed(3)+')');
    g.addColorStop(.55,'rgba(238,235,227,'+(lift*.62).toFixed(3)+')');
    g.addColorStop(1,'rgba(238,235,227,0)');""",
    """    g.addColorStop(0,'rgba('+SKIN.lift+','+lift.toFixed(3)+')');
    g.addColorStop(.55,'rgba('+SKIN.lift+','+(lift*.62).toFixed(3)+')');
    g.addColorStop(1,'rgba('+SKIN.lift+',0)');""")

# ---- 3. พื้นกลางคืน + ไล่ระดับ (มีสองที่ ใช้ค่าเดียวกัน) ----
sub("""      tgt.fillStyle='rgba(34,40,60,0.34)';""",
    """      tgt.fillStyle='rgba('+SKIN.nightBg+',0.34)';""")
sub("""      n.addColorStop(0,'rgba(28,34,54,0.22)');
      n.addColorStop(.6,'rgba(32,38,58,0.10)');
      n.addColorStop(1,'rgba(36,42,62,0)');""",
    """      n.addColorStop(0,'rgba('+SKIN.nightG0+',0.22)');
      n.addColorStop(.6,'rgba('+SKIN.nightG1+',0.10)');
      n.addColorStop(1,'rgba('+SKIN.nightG2+',0)');""")
sub("""    r.fillStyle='rgba(34,40,60,0.34)';""",
    """    r.fillStyle='rgba('+SKIN.nightBg+',0.34)';""")

# ---- 4. เส้นซีกกลางวัน / กลางคืน ----
sub("""    this.segs(c,GRID,.13,.7,true,1,'84,90,104',this.shadeDay);
    for(const cs of this.coastSets()) this.segs(c,cs[0],.25*cs[1],.85,true,stride,'84,90,104',this.shadeDay);""",
    """    this.segs(c,GRID,.13,.7,true,1,SKIN.dayInk,this.shadeDay);
    for(const cs of this.coastSets()) this.segs(c,cs[0],.25*cs[1],.85,true,stride,SKIN.dayInk,this.shadeDay);""")
sub("""      this.segs(c,GRID,.15,.7,true,1,'204,220,244',this.shadeNight);
      for(const cs of this.coastSets()) this.segs(c,cs[0],.33*cs[1],.9,true,stride,'222,232,248',this.shadeNight);""",
    """      this.segs(c,GRID,.15,.7,true,1,SKIN.nightGrid,this.shadeNight);
      for(const cs of this.coastSets()) this.segs(c,cs[0],.33*cs[1],.9,true,stride,SKIN.nightCoast,this.shadeNight);""")

# ---- 5. เส้นขอบแสง · ขอบโลก · บรรยากาศ ----
sub("""      c.strokeStyle='rgba(228,214,186,'+lineA.toFixed(3)+')'; c.lineWidth=.9;""",
    """      c.strokeStyle='rgba('+SKIN.termLine+','+lineA.toFixed(3)+')'; c.lineWidth=.9;""")
sub("""    c.strokeStyle='rgba(70,76,86,0.45)'; c.lineWidth=1.1;""",
    """    c.strokeStyle='rgba('+SKIN.rim+',0.45)'; c.lineWidth=1.1;""")
sub("""        c.strokeStyle='rgba(198,154,84,'+al+')';""",
    """        c.strokeStyle='rgba('+SKIN.atmo+','+al+')';""")

# ---- 6. ไฟเมือง ----
sub("""        g.addColorStop(0,'rgba(226,172,88,'+Math.min(.5,a*.55).toFixed(3)+')');
        g.addColorStop(1,'rgba(226,172,88,0)');""",
    """        g.addColorStop(0,'rgba('+SKIN.cityGlow+','+Math.min(.5,a*.55).toFixed(3)+')');
        g.addColorStop(1,'rgba('+SKIN.cityGlow+',0)');""")
sub("""      c.fillStyle='rgba(240,206,140,'+Math.min(.85,a).toFixed(3)+')';""",
    """      c.fillStyle='rgba('+SKIN.cityDot+','+Math.min(.85,a).toFixed(3)+')';""")

# ---- 7. จุดจดหมายบนลูกโลก ----
sub("""    halo.addColorStop(0,'rgba(247,245,239,'+(.78*a)+')');
    halo.addColorStop(.55,'rgba(247,245,239,'+(.34*a)+')');
    halo.addColorStop(1,'rgba(247,245,239,0)');""",
    """    halo.addColorStop(0,'rgba('+SKIN.markHalo+','+(.78*a)+')');
    halo.addColorStop(.55,'rgba('+SKIN.markHalo+','+(.34*a)+')');
    halo.addColorStop(1,'rgba('+SKIN.markHalo+',0)');""")
sub("""    halo.addColorStop(0,'rgba(198,154,84,'+(.45*a*pulse)+')');
    halo.addColorStop(1,'rgba(198,154,84,0)');""",
    """    halo.addColorStop(0,'rgba('+SKIN.selHalo+','+(.45*a*pulse)+')');
    halo.addColorStop(1,'rgba('+SKIN.selHalo+',0)');""")
sub("""    ctx.fillStyle='rgba(210,168,96,'+a+')';""",
    """    ctx.fillStyle='rgba('+SKIN.selDot+','+a+')';""")

io.open(APP, 'w', encoding='utf-8').write(s)
print('lifted %d sites' % n)
