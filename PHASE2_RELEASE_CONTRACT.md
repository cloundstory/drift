# Phase 2 — เริ่มเดินทางเมื่อปล่อยจริง

อัปเดต 7 ต.ค. 2026 — ทำและทดสอบในเครื่อง ยังไม่ได้ deploy

เดิมปุ่มยืนยันพยากรณ์สร้างลิงก์ บันทึก outgoing และเริ่มนับเวลา ก่อนผู้ใช้ปัดกระดาษออกจากมือ รอบนี้แยกจดหมายที่เตรียมไว้กับจดหมายที่ออกเดินทางแล้ว ปุ่มยืนยันพาไปถือกระดาษ การปัดขึ้น/ค้าง ArrowUp หรือ Space/ปุ่ม “ปล่อยจดหมาย” จึงเป็นจุดเริ่มเดินทาง

## ลำดับและการกู้ร่าง

1. ได้พยากรณ์แล้วเก็บร่างแยกที่ `lw.v1.draft` ก่อนเปิด forecast; ยังไม่เพิ่ม outgoing
2. ยืนยันแล้วถือกระดาษ พร้อม “กลับไปเขียน” และปุ่มปล่อย มี Escape/Tab และปุ่มเก็บร่างเป็นไฟล์เมื่อเก็บในเครื่องไม่ได้
3. เตรียมเส้นเมฆ/ฝนเป็นช่วงงานประมาณ 3 ms และเตรียมริ้วลมใน task ถัดไป กระดาษยังอยู่ในมือและยกเลิกได้ ปุ่มปล่อยเปิดเมื่อเตรียมเสร็จ
4. เมื่อปล่อย กำหนด `s` จากเวลาที่ทำท่าทาง ตรวจอายุพยากรณ์ไม่เกิน 5 นาที สร้าง payload แล้วบันทึกสำเนาผู้ส่ง
5. บันทึกสำเร็จจึงล้างร่าง เปิดอนิเมชั่นบิน และสร้างทางเข้าลิงก์/ไฟล์ส่งต่อ เวลาเดินทางระยะยาวยังมาจาก simulation/record เดิม

Reload ก่อนปล่อยนำข้อความ ผู้รับและสถานที่กลับมาในหน้าเขียน ผู้ใช้ถามสายลมใหม่ก่อนปล่อย ไม่ใช้เวลาเริ่มหรือพยากรณ์เก่าต่ออัตโนมัติ ยกเลิกเก็บข้อความไว้ การยกเลิกขณะเตรียมภาพหยุดการสร้าง cache ที่ยังไม่เสร็จ ไม่มี outgoing เพิ่ม

## การบันทึกและความล้มเหลว

`createReleaseTransaction` มี prepared/committing/committed/cancelled การเรียก commit พร้อมกันหรือซ้ำใช้ผลเดียว จึงบันทึกหนึ่งครั้ง การสร้าง payload ล้มเหลวหรือบันทึกไม่ได้กลับมา prepared และลองใหม่ได้ timestamp ใช้การปล่อยครั้งที่สำเร็จ

`saveReleasedRecord` ปฏิเสธ id ที่มีแล้ว ใช้การเขียนรายการจดหมาย **หนึ่ง key** เป็นจุดบันทึกหลัก หากเขียนไม่ได้คืน false และคืน session view ไปยังรายการเดิม เมื่อบันทึก outgoing สำเร็จจึงพยายามล้าง draft; cleanup ล้มเหลวหรือปิดแอประหว่างสองขั้นไม่ย้อนการปล่อยที่บันทึกแล้ว `readPreparedDraft` ซ่อน draft id ที่อยู่ในรายการจดหมาย จึงไม่ฟื้นฉบับที่ส่งแล้วเป็นร่างหลัง reload ไม่พึ่งการเขียนสอง key ให้สำเร็จพร้อมกัน

หากเก็บร่างไม่ได้ ร่างยังอยู่ในหน่วยความจำเฉพาะ session และแสดงคำเตือนให้เก็บเป็นไฟล์ก่อนปิด หากเก็บ outgoing ไม่ได้ จดหมายยังอยู่ในมือ ไม่มีหน้า “ออกเดินทางแล้ว” หรือการล้างเนื้อหา

Archive v2 รองรับ optional `draft` ร่างต้องผ่าน validation และตรงกับ identity ที่กำลัง restore/import; ไม่ทับร่างที่มีอยู่ และไม่นับเป็น sent letter ไฟล์เก่า v1/v2 ยัง import ได้ รหัส port ผู้รับอยู่เฉพาะสำเนาผู้ส่งและร่างในเครื่อง ไม่เพิ่มลง wire payload

ร่างและ archive ปัจจุบันยังเป็น plaintext ตามสถาปัตยกรรม prototype ไม่มีการเพิ่มคำรับรอง E2EE

## ภาพและต้นทุน

ใช้ generator เดียวสร้างเส้นเมฆทั้งแบบเดิม synchronous และแบบทยอยเตรียม ผลพิกัด ลำดับ น้ำหนักและรางอนิเมชั่นตรงกับ reference ก่อนเปลี่ยนทุกค่าใน clear/rain/snow/ice/fog/storm ที่ progress 0 และ 0.5 การ append id ใหม่เก็บ cache ที่เตรียมไว้ เพราะ start clock ไม่เปลี่ยน weather/geometry; replace/import/wipe ยังล้าง cache ตามเดิม

ไม่เพิ่ม RAF owner อีกวง ใช้ task yielding ระหว่างเตรียมภาพและตรวจ session ก่อนทำต่อ ปรับขนาดกระดาษใน release/arrival/lost ให้เผื่อความสูงจอแบบเดียวกับ reduced-motion เพื่อไม่ตัดหัวท้ายกระดาษในจอเตี้ย

## หลักฐาน

- `PHASE2_RELEASE_TESTS.json` — 9 กลุ่ม transaction/storage/retry/cancel/archive
- `PHASE2_RAIN_PREWARM_TESTS.json` — exact geometry 12 กรณี, task yielding, cancellation, cache reuse
- `PHASE2_RELEASE_REGRESSION.json` — 19 กลุ่ม compatibility/ingress/storage/service worker
- `PHASE2_RELEASE_EVIDENCE.json` — source audit, simulation/wire parity, ไม่มี save ก่อน swipe
- `PHASE2_RELEASE_BROWSER_QA.json` — reload/cancel/button/keyboard/swipe/storage failure/mobile viewport/arrival/read/lost และตัวเลข callback จริงใน browser fixture
- `PHASE1_SCENE_QA.md` — ขอบเขตและผล whole-scene timings

Browser QA ใช้ profile/ข้อความในหน่วยความจำและ API fixture; cache ลมอ่านไฟล์ใน checkout ไม่ดึงพยากรณ์ provider เพิ่ม ปุ่ม export แสดงสำเร็จ แต่เครื่องมือจับ download event timeout จึงไม่อ้างว่าตรวจไฟล์ที่ browser ดาวน์โหลดแล้ว เนื้อหา archive/restore ตรวจด้วย source tests

ยังเหลือ physical phone, OS reduced motion, keyboard/safe area/orientation, animation choreography รอบใหม่, arrival keyboard equivalent และ published-site/PWA QA งานนี้ไม่ปิด Phase 2 ทั้งหมด
