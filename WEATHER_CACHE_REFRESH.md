# แคชอากาศ — ตรวจและแก้ 7 ต.ค. 2026

## สิ่งที่พบ

ไฟล์ใน checkout ค้างที่ 6 ก.ย. แต่ระบบบน GitHub ยังทำงาน: [scheduled run](https://github.com/cloundstory/drift/actions/runs/37510202375) สำเร็จและสร้าง commit `317bc2feb63fa0e8fad6ea05318c3ee14ca02b0f` เมื่อ 7 ต.ค. 01:19 น. เวลาไทย GitHub Pages API รายงาน `built` ที่ commit เดียวกัน เวลา 01:20 น. ไม่ได้ dispatch งานหรือเปลี่ยนการตั้งค่า GitHub ในรอบนี้

นำ manifest และ tile จาก **commit เดียวกัน** มาใช้ในเครื่องผ่าน `tools/sync_wind.py` ตรวจข้อมูลก่อนเขียน เปลี่ยนชื่อไฟล์ให้ขึ้นกับ SHA-256 ของเนื้อหาโดยไม่เปลี่ยนค่าพยากรณ์/เวลาต้นทาง ไม่เรียก Open-Meteo เพิ่ม

ข้อมูลเริ่ม 7 ต.ค. 01:00 น. ถึง sample สุดท้าย 9 ต.ค. 22:00 น. เวลาไทย เหลือประมาณ 60 ชั่วโมงตอนตรวจ `issued` ยังเป็น `2026-10-06T18:19` UTC ตามต้นทาง ไฟล์ในเครื่องคือ `th-2da736bc82c27ee0.bin` ขนาด 98,216 bytes, decoded 213,120 bytes / 1,480 จุด / 6 ตัวแปร

## การแก้ตัวอัปเดต

- `validate_wind.py`: ตรวจ schema, ขอบเขต/ขนาดกริด, compressed bytes, checksum เมื่อมี, decoded size, direction/WMO ranges และ forecast coverage อย่างน้อย 36 ชั่วโมง ตัวตรวจก่อน publish ต้องมี issue age ไม่เกิน 12 ชั่วโมง; ไม่ได้เปลี่ยนเงื่อนไข `wcPick` ในแอป
- `fetch_wind.py`: ปฏิเสธ hourly variables ที่หาย/ไม่ใช่ตัวเลข และ timestamps ที่ต่างกันระหว่างพิกัด แทนเปลี่ยน null เป็นฟ้าใส/ลมศูนย์
- สร้างทุก tile และตรวจทั้งชุดในหน่วยความจำก่อนเขียน ใช้ชื่อ immutable `th-<content hash>.bin`, เขียนไฟล์แบบ atomic และเขียน manifest สุดท้าย เก็บรุ่นปัจจุบันกับรุ่นก่อนหน้าเพื่อรองรับ manifest ที่ยังอยู่ใน session/CDN; คง `th.bin` รุ่นเก่าที่มีอยู่เพื่อความเข้ากันได้
- Normal batches และ **retry หลัง timeout/HTTP errors** เว้นอย่างน้อย 61 วินาที เพราะคำขอล้มไม่ได้แปลว่า provider ไม่คิดโควตา ไม่ sleep หลัง attempt สุดท้าย
- workflow ตรวจ bundle อีกครั้งก่อน commit; `.gitignore` กันไฟล์ staging ที่ค้างจากการหยุด process กลางทาง

การปรับ worker/workflow เหล่านี้อยู่ในเครื่อง **ยังไม่ได้ push/deploy** ระบบที่กำลังรันบน GitHub ยังเป็นรุ่นเดิม แม้แคชล่าสุดจะใช้ได้ แผนโควตาปกติยังเป็น 1,480 weighted calls/รอบ หรือ 5,920/วันเมื่อรัน 4 รอบ; retry/คำขออื่นจาก IP เดียวกันต้องเผื่องบเพิ่ม ดู `WEATHER_API_BUDGET.md`

## หลักฐาน

- Python synthetic tests 9 กลุ่ม: cache freshness/coverage, corruption/checksum/unsafe names, atomic publication, version retention, missing forecast และ retry spacing ไม่มี network
- `WEATHER_CACHE_INTEGRATION.json`: โหลด binary จริงในเครื่องผ่าน **ฟังก์ชัน decoder ของแอปจริง** และ mock HTTP; สนาม 225 จุดมาจากแคช ส่วน route ขอสดเพียง 13 จุด, 238 จุดลำดับครบและค่าทั้ง 6 ชั้น finite; แคชหมดอายุถูกปฏิเสธ ไม่มี weather API จริง
- `WEATHER_CACHE_REGRESSION.json`: regression 19 กลุ่มผ่าน
- `WEATHER_CACHE_EVIDENCE.json`: current cache eligible ณ เวลา audit, syntax/simulation/wire parity ผ่าน แยกเวลา audit จริงจาก fixture clock เดิม

## ใช้ต่อ

```sh
python tools/validate_wind.py
python tools/test_wind_cache.py
node tools/test_wind_integration.cjs WEATHER_CACHE_INTEGRATION.json
```

Sync checkout จาก cache ที่เผยแพร่แล้ว โดยระบุ commit SHA เต็ม:

```sh
python tools/sync_wind.py --revision <40-character-commit-sha>
```

ตัว sync จะปฏิเสธข้อมูลเก่าหรือ forecast ไม่พอ ควรเลือก commit ล่าสุดของ workflow ปัจจุบัน การ sync ดึงเฉพาะไฟล์สาธารณะจาก GitHub ไม่เปลืองโควตา Open-Meteo; การเรียก `fetch_wind.py` จึงจำเป็นเมื่ออยากสร้างข้อมูลชุดใหม่เองเท่านั้น
