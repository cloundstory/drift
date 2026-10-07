# Drift — P1-D: B pencil world

6 ต.ค. 2026 · ภาพ B ที่เลือกเข้า local `index.html` แล้ว ยังไม่ได้ deploy และไม่ได้ทดสอบโทรศัพท์จริง

คงผิวซาตินสีเดียวและภาษาเส้นดินสอ ใช้ sheen 150 ตามค่าที่ผู้ใช้ชอบ เพิ่มเงาโค้ง/แสงนุ่ม แรงกดชายฝั่งและรอยแรเงาปลายเบา 900 เส้น × 4 vertices รายละเอียดเกาะบนผิวโลก ไม่มีการถมสีทวีปหรือน้ำสีน้ำเงิน เส้นทาง ลมเหนือหมอก จดหมาย แสงอาทิตย์จริง และ simulation/wire เดิมยังใช้ pipeline เดิม

แสงและเส้นอบเฉพาะเมื่อ pose/zoom/ขนาด/solar key หรือธีมเปลี่ยน ใช้ sampling 2× และ exact pose ไม่มีการปัดองศาหรือสลับ topology ระหว่างลาก/พัก HIGH/LOW ลดดาว/ฝุ่น/haze/ambient weather ก่อนรายละเอียดโลกและ mesh กระดาษ เมื่อไม่รู้ค่าลมหรือไม่มีลม ไม่สร้าง foreground flow ขึ้นมาแทน

ฝุ่น ฝน หิมะ ละอองน้ำ และ foreground ใช้ even-odd mask บังทั้ง primitive รวมปลายฝน การจำลองยังเดินต่อหลังโลก ส่วนอากาศของจดหมายและริ้วลมบนโลกคงลำดับเดิม ดาว/haze/rim/city glow ใช้โทน B และนาฬิกาเดิม reduced motion จึงหยุดจังหวะหายใจ/ฝุ่น/การร่อนโดยไม่เพิ่ม RAF

`tools/study-globe-lines.js` เป็น math source ร่วมกับแบบศึกษา `tools/pencil-world.js` เป็นตัวติดตั้งในแอป `node tools/embed-pencil-world.cjs` ฝังทั้งคู่ใน `index.html`; `--check` และ integration test ยืนยันว่าเนื้อหาตรงกัน แอปจึงเปิดจากไฟล์และใช้ offline shell เดิมได้โดยไม่ต้องโหลด JS asset ใหม่ แต่ยังไม่ได้ทดสอบ PWA/offline จริงในรอบนี้

Study iframes คง renderer ก่อน B เพื่อรักษาการเทียบและ historical fixtures; production preview/QA opt-in ผ่าน `renderer=production` การติดตั้ง production ไม่เปลี่ยน record, storage, journey seed หรือเวลาเดินทาง `pencil-world-preview.html` ใช้แอปจริงพร้อม sample journey/weather ในหน่วยความจำและตรึง replay ที่ 2 ชั่วโมง มีปุ่ม theme/weather/quality/reduced/close/reset/measure โดยไม่ได้ override renderer แสงอาทิตย์ใช้เวลาแอปจริง หน้านี้ถูกกันออกจาก SW cache และ LAN preview เปิดเฉพาะ allowlist 6 ไฟล์ GET/HEAD/token/TTL 4 ชั่วโมง

## หลักฐาน

- Integration 7 กลุ่ม: inline source integrity, exact pose/cache reuse, material ก่อนเส้นหน้า, theme invalidation, mask restore และ unknown-wind behavior ดู `PHASE1_PENCIL_TESTS.json`
- Shared line/surface tests ผ่าน reference 64 poses ทุกพิกเซล; globe-layer legacy parity 221 กรณี, lifecycle 15 กลุ่ม, regression 19 กลุ่ม, quality policy และ paper motion/condition ผ่าน
- `PHASE1_PENCIL_EVIDENCE.json` syntax/simulation/wire parity; audit ใช้ fixture วันที่ 5 ต.ค. ขนาดรวมประมาณ 1.046 MB / gzip 457 KB ไม่ใช่ transfer measurement
- Browser actual renderer: brief rain drag + rest 10 วินาที p95 9.0 ms / max 12.1 ms, 531 callbacks; HIGH close-up camera transition + rest p95 4.1 ms / max 15.3 ms, 530 callbacks ต้นทุน JS draw callback ไม่รวม compositor/GPU และไม่ใช่ sustained FPS ค่ารอบนี้ไม่ใช้เทียบ speedup กับ historical study
- Mask radius 29/68: insideLeaks/outsideMissing 0, restore ผ่าน; drag/close-up มี detail switches 0 และ pose lag 0
- รอบสุดท้าย warm rain กล้องนิ่ง 10 วินาที: 600 callbacks, p95 3.2 ms / max 3.7 ms เป็น JS draw cost และรวมอยู่ใน browser evidence แยกจากช่วงลาก
- Mobile viewport 390×844 ผ่าน LAN: width/scrollWidth 390, scrollHeight 844, iframe 390×676, LOW ใช้ star cap 30/foreground cap 3 และรอยแรเงา 900 เส้นเหมือนเดิม การร่อนอิง recorded leg; LOW + reduced มี motion snapshots เหมือนกันสองครั้ง ดู `PHASE1_PENCIL_BROWSER_QA.json` และ `tools/phase1-pencil-mobile.png`

ยังเหลือ whole-scene/forecast/release/arrival cold+warm, sustained drag/zoom, physical phone, Safari/Android/DPI/safe area และ PWA/offline QA จึงยังไม่รับ Phase 1 ทั้งหมด งาน release commit/arrival choreography อยู่ Phase 2
