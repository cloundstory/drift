# Drift — P1-A render lifecycle

5 ต.ค. 2026 · Phase 1 ตาม `DRIFT_MASTER_PRODUCT_SPEC.md` · local implementation + synthetic/browser verification

P1-A รวมวงจรวาดต่อเนื่องของ globe, forecast/sent, compose, candle และ release/arrival/lost ไว้ที่ `RENDER` แล้ว ลดเจ้าของเวลาแยกกันและป้องกัน globe paint ซ้ำใต้ hero ฉากหนึ่งครั้งต่อ callback รายงานนี้ครอบ lifecycle/motion; visual layer separation, quality presets และ physical-device performance ยังอยู่ใน TODO

## Contract ที่ใช้แล้ว

- `createRenderRuntime` ถือ continuous requestAnimationFrame เพียงหนึ่งตัว; `start()` เรียกซ้ำได้โดยไม่เพิ่ม callback ส่วน bounded one-shot callbacks สำหรับรอ layout/วาด texture ยังอยู่
- `frame(now, dt)` เลือกฉากเดียวตามลำดับ release → arrival → lost → forecast/sent → globe → compose แสงเทียนทำงานเฉพาะ compose/read ภายใน callback เดียวกัน Helpers ไม่ schedule loop ของตนเอง
- `dt` เป็นวินาทีและ cap 0.05; camera easing/inertia, particles, กระดาษหายใจ, candle และ keyboard hold ใช้ elapsed delta แทนจำนวน callbacks
- visual clock หยุดเมื่อ `document.hidden` และ cancel pending RAF; เฟรมแรกหลัง resume ใช้ delta=0 ฉากจึงต่อจากจุดเดิมโดยไม่สะสมเวลาที่ซ่อน การเดินทางยังใช้ `Date.now()` และอาจถึงปลายทางระหว่างปิดแอป
- เปลี่ยน/ปิด scene ล้าง hero phase, callback เก่า และ held input; visibility/blur ล้าง pointer drag, momentum และ keyboard hold เพื่อไม่ให้การกดที่ขาด keyup ค้าง
- theme invalidation ใช้ callback ของ runtime วาด globe ครั้งถัดไป

## Motion policy

อ่าน `prefers-reduced-motion` ตอนเริ่มและฟัง change event ระหว่าง session ด้วย โหมด reduced หยุด ambient clocks, camera inertia, paper breathing, candle flicker, shooting stars และ lightning flash; direct drag และการเลือกเส้นทางยังใช้ได้

Release แสดงกระดาษนิ่งพร้อมข้อความ แล้วใช้ fade 180 ms หลัง swipe/keyboard launch Arrival แสดงด้านหลังกระดาษนิ่งและรอแตะหยิบก่อน fade 180 ms ไปหน้าอ่าน Lost ใช้ fade 220 ms โดยไม่หมุน/พุ่งกระดาษและกลับไป callback เดิม การ replay ที่ผู้ใช้กดเล่นเองยังเดินเวลาและหยุดเมื่อซ่อนแท็บ Keyboard pickup สำหรับ arrival ยังเป็นงาน accessibility ใน Phase 6

การปรับนี้คง wire `r`/`z`, `WF.VER`, weather assets, simulation, seed, path, arrival timestamp และร่องรอยกระดาษ Release ยังบันทึกก่อน swipe ตาม prototype เดิม; prepared → released transaction เป็น Phase 2

## หลักฐาน

| การตรวจ | ผลและขอบเขต |
|---|---|
| `node tools/test_render_runtime.cjs` | 15 กลุ่มผ่าน: single RAF, hide/resume, capped delta, 30/60/120 Hz parity, scene dispatch, camera, paper, positive candle wind, keyboard hold, reduced hero, stale callback และ wall-clock journey |
| `node tools/test_phase0.cjs` | 19 กลุ่มผ่าน รวม inline syntax, study isolation, backup/ingress, freshness/cache, privacy diagnostics และ SW |
| `node tools/audit_phase0.cjs PHASE1_RENDER_EVIDENCE.json` | baseline simulation parity ผ่าน: clear 5.17h, rain 9.71h, snow 6.66h, storm 208.56h; totals/legs/loss/wire fields ตรง baseline |
| In-app Browser / synthetic memory | home, compose, forecast, normal + reduced release → sent, normal arrival hide/resume → wait, reduced arrival wait → tap → read, reduced lost → home, light/dark theme และ preference switch ระหว่างถือกระดาษตรวจแล้ว |
| visibility fixture | ฉาก normal arrival ที่ `globe` หยุด elapsed=183.302 ms / frames=9 / scheduled=false; อ่านซ้ำหลังหลายวินาทียังเท่าเดิม กลับมาแล้วถึง `wait` โดยไม่เปิดอ่านอัตโนมัติ |
| callback sample | desktop home 10.00s: 601 callbacks ≈60.1/s, visual time 10016.7ms; เป็น scheduling sample ในเบราว์เซอร์นี้ ไม่ใช่ physical FPS/GPU benchmark และยังไม่มี before/after frame-cost comparison |
| viewport 390×844 | reduced arrival fit และแตะหยิบไป read ได้; DOM width/scrollWidth ทั้ง parent/app=390, hero canvas CSS 390×549 เพราะ toolbar ของ harness ใช้พื้นที่ด้านบน ไม่ใช่ full-screen physical mobile |

ไฟล์ผลตรวจ: `PHASE1_RENDER_TEST_RESULTS.json`, `PHASE0_REGRESSION_RESULTS.json`, `PHASE1_RENDER_EVIDENCE.json`, `PHASE1_BROWSER_QA.json` ไม่เขียนทับ `PHASE0_EVIDENCE.json` หรือ snapshot `PHASE0_STABILIZATION_EVIDENCE.json`

`index.html` จาก Phase 0 stabilization 1,004,463 → 1,008,635 bytes (+4,172); local gzip estimate 441,394 → 443,095 bytes (+1,701) เป็น file-size comparison ไม่ใช่ network transfer หรือ parse/decode benchmark `git diff --check` และ syntax ของ harness ผ่าน

Browser QA ใช้ `tools/phase0-browser-qa.html` ที่ขยายด้วยปุ่ม motion/hide/show/measure; hide/show จำลอง document visibility และ motion buttons เรียก policy เดียวกับ OS listener จึงยังต้องตรวจ native tab backgrounding/OS preference change บนอุปกรณ์จริง Console capture พบ MutationObserver errors สองรายการจาก browser session; ไม่พบ MutationObserver ใน application/harness source จึงยังไม่ถือว่า console ทั้ง session สะอาด รายละเอียดอยู่ใน browser evidence

![Reduced arrival รอให้แตะหยิบใน viewport มือถือ](tools/phase1-mobile-reduced-arrival.png)

## งานต่อ

P1-B แยก environment/world/weather/route/letters และเตรียม shared frame แล้ว ดู [PHASE1_RENDER_LAYERS.md](PHASE1_RENDER_LAYERS.md) ถัดไป quality policy / whole-frame cold+warm baseline / ย้าย B ภาษาดินสอเข้า production และ physical mobile QA ยังไม่ได้ตรวจ physical Safari/Android/PWA, memory/GPU/render p95 หรือทำ independent security review และไม่ได้ deploy รอบนี้
