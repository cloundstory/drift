# Drift — P1-B shared frame and globe layers

5 ต.ค. 2026 · แยกโครงสร้าง runtime ใน `index.html` เพื่อเตรียมย้ายภาพ B เข้าแอปหลัก รอบนี้ยังใช้ภาพ production เดิม

`renderGlobe()` เป็นผู้เรียกชั้นภาพตามลำดับเดิม ไม่มี RAF เพิ่ม:

1. clear / camera step / sky
2. `renderGlobeEnvironment`: stars → grain → dust → origin rain/snow/splash/bolt → globe shade
3. `prepareGlobeJourneys`: list/state/selection/replay clock
4. `renderGlobeWorld`: sphere → fog opening → night restoration
5. `renderGlobeWeather`: selected journey clouds / fog / rain / snow / ice / bolts
6. `renderGlobeRoutes`: selected wind → trails / sender-recipient nodes / lost ghosts
7. `renderGlobeLetters`: animated paper/dots → overflow dots → hit targets

Frame ถือ context, dimensions, ambient delta, visual time, selected id และ prepared `all/flying/sel` อ่าน `store.letters()` ครั้งเดียวและคำนวณ state แต่ละฉบับครั้งเดียว ทั้งฉากใช้ wall-clock snapshot เดียว; `nowFor()` ยังให้ replay ของฉบับที่เลือกใช้เวลาเดินทางของตัวเอง ส่วน call sites เดิมใช้ wall clock ตามเดิม

`globeFramePosition()` เก็บ world position เฉพาะ record ในเฟรมนั้น ให้ fog opening/ghost/flying letter ใช้ร่วมกัน รอบถัดไปสร้าง records ใหม่จึงไม่ค้างตำแหน่ง ไม่เก็บ cache ใน storage และไม่เปลี่ยน wire/path/seed/arrival timestamp

คงจังหวะเปลี่ยน replay sun หลัง environment ตามลำดับเก่า คง MAX_ANIM/hit target/parked motion และให้ลมกับจดหมายอยู่เหนือหมอก ไม่มีถมสี/engine/quality effect ใหม่

## ตรวจแล้ว

- `tools/test_globe_layers.cjs`: 221 กรณีผ่าน เทียบ Canvas commands/layer order/hit targets กับ source ก่อนแยก รวม empty/multiple/arrived/lost/selected/replay/reduced/zoom/horizon/overflow; ตรวจ wall clock ร่วมและ cache ที่หมดอายุทุกเฟรม
- Phase 0 regression 19 กลุ่ม, render lifecycle 15 กลุ่ม และ study geometry/surface references 64 กรณีผ่าน
- `PHASE1_LAYERS_EVIDENCE.json`: syntax และ simulation parity ผ่าน clear/rain/snow/storm; wire fields/totals/legs/loss คงเดิม
- Browser synthetic: existing profile, waiting link → log → globe drag, reduced arrival wait → pickup → read พร้อม body ตัวอย่าง; ไม่มี real profile/network fixture changes
- แบบ B หลัง reload: rain drag ที่ sheen 150 ตามค่าบนหน้าผู้ใช้; detail switches 0 / pose lag 0 และ mask ไม่รั่ว คืน clear/live และมุมเริ่มต้นแล้ว

หลักฐาน `PHASE1_LAYERS_BROWSER_QA.json` · [แอปเดิม](tools/phase1-layers-existing.png) · [กำลังเดินทาง](tools/phase1-layers-waiting-globe.png) · [รอหยิบ](tools/phase1-layers-arrival.png) · [แบบ B](tools/living-world-B-layers-final.png)

`index.html` 1,008,635 → 1,010,062 bytes (+1,427), local gzip 443,095 → 443,640 (+545) เป็นขนาดไฟล์ในเครื่อง ไม่ใช่ network transfer/frame-rate benchmark ยังไม่ตรวจ physical Safari/Android/PWA, whole-frame budget หรือ deploy

## เหลือใน Phase 1

ย้ายภาพ B เข้าผู้วาด production ผ่าน boundary นี้, quality AUTO/HIGH/LOW ที่ลด secondary effects ก่อน interaction, full-frame cold/warm idle/drag/zoom/forecast/hero evidence และ physical mobile QA ตาม master ภาพ study ที่เลือกยังไม่ได้เปลี่ยนเป็นภาพ production
