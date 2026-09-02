# -*- coding: utf-8 -*-
"""ต่อสไลเดอร์ลูกโลกเข้าแบบศึกษา — แก้ SKIN ในแอปจริงผ่าน iframe แล้ววาดใหม่"""
import io, sys

P = 'dark-studies.html'
s = io.open(P, encoding='utf-8').read()
n = 0


def sub(old, new):
    global s, n
    if old not in s:
        sys.exit('NOT FOUND: ' + old[:70])
    s = s.replace(old, new, 1)
    n += 1


sub("""    <div class="row"><label>ทอง สว่าง</label>
      <input type="range" id="goL" min="40" max="90" value="66"><output id="oGoL"></output></div>""",
    """    <div class="row"><label>ทอง สว่าง</label>
      <input type="range" id="goL" min="40" max="90" value="66"><output id="oGoL"></output></div>

    <p class="grp">ลูกโลก — แก้สีที่วาดบน canvas จริง</p>
    <div class="row"><label>กลางวัน สว่าง</label>
      <input type="range" id="gDay" min="-45" max="30" value="0"><output id="oGDay"></output></div>
    <div class="row"><label>กลางคืน สว่าง</label>
      <input type="range" id="gNight" min="-20" max="55" value="0"><output id="oGNight"></output></div>
    <div class="row"><label>เส้น กลางวัน</label>
      <input type="range" id="gInkD" min="-30" max="60" value="0"><output id="oGInkD"></output></div>
    <div class="row"><label>เส้น กลางคืน</label>
      <input type="range" id="gInkN" min="-40" max="25" value="0"><output id="oGInkN"></output></div>""")

sub(".note{font-size:11px;",
    ".grp{font-size:11px;letter-spacing:.16em;opacity:.5;margin:16px 0 2px;\n"
    "  border-top:1px solid rgba(232,227,216,.12);padding-top:12px}\n.note{font-size:11px;")

sub("const K = ['bgL','bgH','bgS','shL','shW','inkL','goL'];",
    "const K = ['bgL','bgH','bgS','shL','shW','inkL','goL','gDay','gNight','gInkD','gInkN'];\n"
    "/* สไลเดอร์หนึ่งตัวคุมสีหลายตัวที่เป็นเรื่องเดียวกัน — ไม่ให้มี 18 ปุ่มที่ไม่มีใครหมุนไหว */\n"
    "const GK = {gDay:['lit','litMid','litEdge','lift'], gNight:['nightBg','nightG0','nightG1','nightG2'],\n"
    "            gInkD:['dayInk'], gInkN:['nightGrid','nightCoast','termLine']};")

sub("""function apply(){
  const d = app.contentDocument; if(!d) return;""",
    """/* ปรับความสว่างโดยคงเนื้อสีไว้ — บวกคือเข้าหาขาว ลบคือคูณลง */
function shiftL(rgb, d){
  if(!d) return rgb;
  const p = rgb.split(',').map(Number);
  const f = v => Math.max(0, Math.min(255, Math.round(d > 0 ? v + (255 - v) * (d / 100) : v * (1 + d / 100))));
  return f(p[0]) + ',' + f(p[1]) + ',' + f(p[2]);
}

/* แก้ SKIN ของแอปจริงแล้วสั่งวาดใหม่ — ไม่ได้จำลองลูกโลกขึ้นมาเอง */
function applyGlobe(){
  const w = app.contentWindow;
  if(!w || !w.SKIN) return;
  if(!w.__SKIN0) w.__SKIN0 = Object.assign({}, w.SKIN);
  const v = V();
  Object.keys(GK).forEach(sl => GK[sl].forEach(k => {
    w.SKIN[k] = dark ? shiftL(w.__SKIN0[k], v[sl]) : w.__SKIN0[k];
  }));
  try{ w.renderGlobe(); }catch(e){}
}

function apply(){
  const d = app.contentDocument; if(!d) return;
  applyGlobe();""")

sub("""    if(go==='home'){ w.closeSheet && w.closeSheet(); }""",
    """    if(go==='home'){ w.closeSheet && w.closeSheet(); setTimeout(applyGlobe, 60); }""")

sub("""  <p class="note">⛔ ลูกโลก · กระดาษ 3D · ลม · อากาศ ยังไม่เปลี่ยนตาม เพราะวาดบน canvas
      ด้วยสีที่เขียนตายตัว — ต้องรอขั้นที่ canvas อ่านสีจากที่เดียวกับ CSS</p>""",
    """  <p class="note">✅ ลูกโลกปรับได้แล้ว — สไลเดอร์สี่ตัวล่างแก้สีที่วาดบน canvas จริง
      <br>⛔ กระดาษ 3D · ลม · อากาศ ยังไม่เปลี่ยนตาม เป็นกลุ่มถัดไป</p>""")

io.open(P, 'w', encoding='utf-8').write(s)
print('patched', n, 'sections')
