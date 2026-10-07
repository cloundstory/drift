# Drift — P1-C render quality

6 ต.ค. 2026 · ทำใน local `index.html` และ study แล้ว ยังไม่ได้ deploy หรือวัด FPS บนโทรศัพท์จริง

เพิ่ม “รายละเอียดภาพ” ในตั้งค่า: อัตโนมัติ / ละเอียด / เบา ค่าเริ่มต้น auto เก็บใน `lw.v1.quality` ผ่าน storage abstraction เดิมและรวมใน backup/import/wipe Import ตรวจค่า allowlist และไม่ทับค่าที่เครื่องนี้มีอยู่แล้ว ไม่มีข้อมูล quality เพิ่มใน payload จดหมาย

AUTO ใช้เวลาวาด JavaScript callback จาก render owner เดิม จึงรวมการเตรียมข้อมูลและ Canvas ทุกชั้นที่ callback เรียก แต่ไม่รวม compositor/GPU/display latency ไม่มี RAF ใหม่และไม่ใช้ callback cadence เป็นคำตัดสินคุณภาพ หน้าจอ 30 Hz ที่วาดเร็วจึงไม่ถูกลดรายละเอียดเพราะ refresh rate เพียงอย่างเดียว

เริ่ม high, รอ warm-up 2 วินาที แล้วดู p90 ของหน้าต่างอย่างน้อย 1 วินาที/30 samples เมื่อเกิน 12 ms ต่อเนื่องสองหน้าต่าง ลดหนึ่งระดับโดยเว้นการลดอย่างน้อย 8 วินาที เมื่อมี headroom ต่ำกว่า 7 ms ต่อเนื่อง 20 หน้าต่างและผ่าน 20 วินาที จึงเพิ่มหนึ่งระดับ ตัวเลขเป็นงบเริ่มจูนจาก desktop preview ไม่ใช่หลักฐานว่าโทรศัพท์ทุกเครื่องรักษา 60 FPS ได้ Hero/forecast/sheet และช่วงกลับจาก hidden หรือ callback gap >=250 ms ไม่ใช้ตัดสินระดับโลก

| ระดับ | ฝุ่นใกล้ | ดาวไกล | บรรยากาศ study | ฝน/หิมะต้นทาง |
| --- | ---: | ---: | ---: | ---: |
| high | 100% | 100% | 100% | 100% |
| balanced (AUTO ขั้นกลาง) | 45% | 65% | 100% | 100% |
| low | 25% | 40% | 75%, haze 1 band | 65% |

ลด secondary effects ก่อน: เส้นโลก/ผิวดินสอ 900 รอยยังมี topology เดิม, ลมและ weather ของเส้นทางเดิม, จดหมาย mesh 80 ช่อง/แรงเฉื่อย/condition, hit target และ hero timing คงเดิม Reduced motion เป็น policy แยกจากระดับรายละเอียด ไม่มี quality-driven canvas resize หรือการลดความละเอียดกระดาษ/เส้นชายฝั่ง

Pool เดิมยัง bounded: ฝุ่น 26 จุดเก็บตำแหน่งและเดินต่อแม้บางจุดไม่วาด, production stars 55 และ study distant 112 เป็น pool คงที่, ฝนสูงสุด 40 / low 26, หิมะสูงสุด 42 / low 27, splash สูงสุด 14 และ low จำกัดการสร้างใหม่ 9 วง ตัวเลือกคุณภาพไม่สุ่มฝุ่นใหม่หรือสร้าง cache ต่อระดับอย่างไม่จำกัด

Metrics เก็บสี่ scene เท่านั้น, histogram 2,001 ช่องต่อ scene สำหรับ p95 ทั้งช่วงที่วัดด้วย resolution 0.1 ms (overflow >=200 ms ใช้ max เป็น upper bound), recent ring สูงสุด 180 samples และประวัติการปรับระดับสูงสุด 8 รายการ ไม่มี id/เนื้อจดหมาย/พิกัด และไม่มีการส่ง metrics ออกเครือข่าย ปุ่ม “วัดภาพ 10 วินาที” ใน study ล้างเฉพาะ metrics และคืนผลทาง DOM ให้ตรวจผ่าน UI

## ตรวจแล้ว

- `tools/test_render_quality.cjs`: overload/recovery/cooldown, manual lock, warm-up spike, 30 Hz display, hero/hidden exclusion, bounded metrics, histogram ทั้งช่วง, actual dust/star/rain/snow caps และ runtime full callback timing ผ่าน ดู `PHASE1_QUALITY_TESTS.json`
- Phase 0 regression 19 กลุ่ม รวม quality backup roundtrip/merge/invalid preference/wipe; lifecycle 15 กลุ่ม, globe layers 221 กรณี, paper material 14,404 เฟรม, forecast/default drawing parity 9 กรณี และ study projection/surface reference 64 กรณีผ่าน
- Syntax และ simulation/wire parity ดู `PHASE1_QUALITY_EVIDENCE.json`; audit/regression ใช้วันที่ fixture เดิม 5 ต.ค. ไม่ใช่เวลา browser รอบนี้

Browser B ใกล้จดหมาย/sheen 150 กล้องนิ่ง: HIGH clear p95 3.4 ms / LOW 3.3 ms, HIGH rain 3.2 ms / LOW 3.0 ms จากหน้าต่างละ 10 วินาที (600–601 callbacks) เป็น JavaScript draw cost เท่านั้น ความต่างเล็กและเวลาเฟสของกระดาษไม่เหมือนกัน จึงไม่ใช้เป็นข้อสรุป speedup บนอุปกรณ์อื่น ช่วงแรกที่กล้องกำลังเข้าใกล้มี p95 10.6 ms แยกจาก warm baseline หลักฐาน `PHASE1_QUALITY_BROWSER_QA.json`

AUTO rain มีสองครั้งที่ลากแล้วปล่อยในหน้าต่าง 10 วินาที: p95 10.0 ms, peak 17.8 ms และยังอยู่ high (ไม่เกิด persistent overload ตามเกณฑ์) มี pose lag 0/detail switches 0 เป็น brief drag + rest ไม่ใช่ sustained drag baseline แอปจริงผ่าน synthetic existing profile: เลือก low แล้ว reload iframe ยังเห็น aria-pressed=true; profile/storage จริงของผู้ใช้ไม่ถูกแตะ

Mobile study viewport 390×844 ผ่าน LAN: low เหลือดาว 30/foreground 3 จุด, paper 80 ช่องและ condition เปียก 0.7, layout width/scrollWidth 390 และ scrollHeight 844 โหมด low + reduced มี motion snapshot เหมือนกันสองครั้ง ตั้งค่าในแอปหลัก viewport 390×844 เลือก low ด้วย Enter ได้ ดู `tools/phase1-quality-mobile.png` / `tools/phase1-quality-settings-mobile.png` ลิงก์ LAN รอบนี้ใช้ allowlist 5 ไฟล์/GET–HEAD/token/TTL 4 ชั่วโมงตาม preview-mobile เดิม

## ยังเหลือ

ภาพ B เข้าแอปจริงแล้วใน P1-D ดู `PHASE1_PENCIL_WORLD.md` งานที่เหลือคือ whole-scene cold/warm/drag/zoom/forecast/release/arrival บนอุปกรณ์จริง, Safari/Android/DPI/PWA และ sustained performance หลักฐาน browser ของ quality เป็น local In-app Browser และ viewport จำลอง ไม่ใช่ผล physical phone
