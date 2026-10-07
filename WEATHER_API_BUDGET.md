# Drift — weather API budget and globe grid

6 ต.ค. 2026 · ตรวจเอกสารและซอร์สสาธารณะของผู้ให้บริการ; ไม่ยิง weather API จริง ไม่ refresh cache หรือรัน GitHub Actions ในรอบนี้

อัปเดต 7 ต.ค.: ตรวจแล้วว่า workflow/Pages บน GitHub ทำงานและแคช checkout ค้างเอง Sync ข้อมูลล่าสุดมาใช้แล้วโดยไม่เรียก Open-Meteo; เพิ่ม retry spacing, validation และ publication guard ในเครื่อง ดู `WEATHER_CACHE_REFRESH.md` ข้อความแคชหมดอายุด้านล่างเป็นผลตรวจวันที่ 6 ต.ค.

ซ่อนเส้น latitude/longitude ทั้งหน้าหลังใน production B และ revised B study หลังวาด material แต่ก่อนเส้นชายฝั่ง ตัว GRID/พิกัด/225 field points/13 route points อยู่เหมือนเดิม ไม่มีความละเอียดข้อมูลที่ลดลงเพราะการซ่อนเส้น เก็บ baseline ก่อน B เพื่อเทียบเหมือนเดิม

## ขีดจำกัดที่ตรวจ

[Open-Meteo pricing](https://open-meteo.com/en/pricing) และ [terms](https://open-meteo.com/en/terms) ระบุ Free/Open-Access: 600 calls/นาที, 5,000/ชั่วโมง, 10,000/วัน, monthly allowance 300,000; free ใช้ non-commercial/prototyping การใช้งานเชิงพาณิชย์ต้องเลือก licence/plan ที่เหมาะสม

ต้องนับ weighted calls แยกจากจำนวน HTTP requests: [ForecastApiResult.calculateQueryWeight](https://github.com/open-meteo/open-meteo/blob/main/Sources/App/Helper/Writer/ForecastApiResult.swift#L230) รวมต้นทุนแต่ละ location โดยมีขั้นต่ำ 1 ต่อ location และเพิ่มตาม variables/models/time span; [RateLimiter](https://github.com/open-meteo/open-meteo/blob/main/Sources/App/Helper/Vapor/RateLimiter.swift#L95) ตรวจงบต่อ IP

Drift ขอ 6 hourly variables / forecast 4 วัน / default model จึงประเมินขั้นต่ำ 1 call ต่อ location ตามสูตรซอร์ส ณ วันที่ตรวจ: batch 238 พิกัดใช้งบราว 238 calls แม้มี HTTP request เดียว การลด calls ด้านล่างเป็นการคำนวณจากพารามิเตอร์/ซอร์ส ไม่ใช่ usage meter ของ account หรือการทดสอบ production rate limit

## คำขอของแอป

| เส้นทางข้อมูล | HTTP weather requests ต่อการคำนวณ journey | Locations / estimated weighted calls |
| --- | ---: | ---: |
| แคชภูมิภาคใช้ได้ | 1: ดึง route สด | 13 |
| ไม่มี/หมดอายุ/อ่านแคชล้ม | 1: ดึง field + route ครบ | 238 |
| กรณีไม่มีแคชก่อนแก้ | 2: route แล้วดึงชุดเต็มซ้ำ | 13 + 238 = 251 |
| API เส้นทางล้ม แต่ยังมีแคชใช้ได้ | ลอง route 1 ครั้ง แล้ว fallback แคช | 13 locations attempted; ไม่เดาว่า request ล้มถูกคิดงบอย่างไร |

แก้ `fetchWx` ให้เลือก full request ก่อนเมื่อไม่มีแคช แทนยิง route แล้ว full ซ้ำ ผลลัพธ์ 238 จุดและลำดับเดิมครบ ไม่เปลี่ยน simulation/seed/wire หรือความละเอียดอากาศ ไม่มี API จากการลาก/ซูม/ซ่อนตาราง/วาดเมฆเพิ่ม คำขอที่ค้างมี timeout 15 วินาทีอยู่แล้ว และไม่มี automatic retry loop ใน `fetchWx`

ข้อมูล journey ถูกบันทึกตอนเตรียมส่ง; การวาด/ดูย้อนหลังอ่าน record เดิม บรรยากาศต้นทางอ่านแคชผ่าน `wxAt` และ revalidate ตาม TTL ส่วน geocoding มี debounce/abort เดิมแต่เป็นอีกประเภทคำขอ ไม่รวมในตัวเลข journey table ต้องเผื่องบส่วนนี้และผู้ใช้อื่นที่ใช้ public IP เดียวกันด้วย

## ตัว refresh ภูมิภาค

`tools/fetch_wind.py` ใช้กริด 40×37 = 1,480 locations, 4 HTTP requests ต่อรอบ (380/380/380/340); workflow มี schedule ทุก 6 ชั่วโมง ต้นทุนประมาณ 5,920 weighted calls/วันของ worker IP ไม่ใช่งบร่วมทั่วแอป และไม่ใช่ quota ที่กันไว้ให้ browser ผู้ใช้

เพิ่ม PAUSE ระหว่าง batches จาก 35 → 61 วินาที เพราะสอง batch 380 + 380 ภายใน 60 วินาทีใช้งบ 760 ซึ่งเกินเพดาน 600 การเว้นนี้เผื่อ burst ของตัว refresher เอง ไม่รับรองว่าคำขออื่นจาก IP เดียวกันจะไม่ทำให้ชน quota HTTP 429 ยังใช้ backoff เดิม

`wind/index.json` ใน checkout ออกวันที่ 6 ก.ย. 2026 จึงใช้ไม่ได้ ณ 6 ต.ค. ต้องตรวจว่า refresh/deploy ข้อมูลใหม่ทำงานจริงก่อนเปิดให้ผู้ใช้จำนวนมาก รอบนี้ไม่ได้สรุปสถานะ GitHub Actions/live hosting และไม่ได้รัน fetch 1,480 จุดเพื่อทำ visual preview

ยังไม่มี global/shared quota governor หรือ dashboard; browser budget ไม่สามารถรู้การใช้งานของทุกอุปกรณ์หลัง IP เดียวกัน ควรใช้แคชส่วนกลางที่สด และวัดยอด request/429 ก่อนขยายการใช้งาน การเพิ่มความละเอียดภาพควร interpolate/draw จากข้อมูลที่มี ก่อนเพิ่ม API sampling

## ตรวจแล้ว

`WEATHER_REQUEST_TESTS.json`: no-cache/hybrid/broken-cache/offline fallback/failure ตรวจจำนวน calls และลำดับข้อมูลครบด้วย mock ไม่มี external requests; `PHASE1_GRID_RENDER_TESTS.json`: ไม่มี GRID drawing หน้า/หลัง แต่ coast/material/cache/mask คงอยู่; `PHASE1_GRID_REGRESSION.json` และ `PHASE1_GRID_EVIDENCE.json`: syntax/simulation/wire parity ผ่าน Browser ตรวจธีมสว่าง/มืดและลากโลก พร้อมภาพ `tools/phase1-grid-hidden.png`
