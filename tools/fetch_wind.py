# -*- coding: utf-8 -*-
"""
drift — ตัวดึงลมล่วงหน้าเก็บเป็นแคช (ข้อ 58)

ทำไมต้องมี: เดิมทุกครั้งที่มีคนส่งจดหมาย แอปยิง Open-Meteo 238 พิกัด
ซึ่งเกิน 600 คำขอ/นาที ทันทีที่ส่ง 3 ฉบับติดกัน และมือถือไทยใช้ CGNAT
คนจำนวนมากจึงใช้โควตาก้อนเดียวกันโดยไม่รู้ตัว

ตัวนี้ดึงลมทั้งภูมิภาคไว้ล่วงหน้าเป็นไฟล์เดียว แล้วแอปไปอ่านจากไฟล์แทน
ราคาจึงคงที่ต่อวัน ไม่โตตามจำนวนผู้ใช้

รันทุก 6 ชั่วโมง — ไม่ใช่ 1-2 ชั่วโมง เพราะแบบจำลองต้นทางเองอัปเดตทุก 3-6 ชม.
และหนึ่งคำขอได้พยากรณ์ล่วงหน้า 96 ชม.อยู่แล้ว ดึงถี่กว่านั้นได้ข้อมูลชุดเดิมกลับมา

ใช้ไลบรารีมาตรฐานล้วน ไม่มี dependency
"""
import json, math, os, sys, time, zlib, urllib.request, urllib.error
from datetime import datetime, timedelta, timezone

# คอนโซลวินโดวส์เป็น cp874 พิมพ์ตัวอักษรนอกชุดแล้วสคริปต์ตายทั้งตัว
# ทั้งที่ไฟล์เขียนเสร็จแล้ว — บังคับ UTF-8 และไม่ให้การพิมพ์ล้มงานได้
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'wind')

# ---------- ขอบเขตที่แคช ----------
# กล่องนี้ไม่ได้เลือกด้วยสายตา — คำนวณจากกฎข้อ 56 โดยไล่ทุกคู่เมืองในไทย
# แล้วรวมสนามลมของทุกเส้นทางเข้าด้วยกัน (เส้นที่กว้างสุดคือ เชียงราย→นราธิวาส
# ระยะ 1,553 กม. ครึ่งสนาม 1,709 กม. → สนามยื่นถึงอ่าวเบงกอลและทะเลจีนใต้)
#
# โครงสร้างเป็น "รายการแผ่น" ตั้งแต่วันแรก เพื่อให้เพิ่มแผ่นความละเอียดต่ำ
# ที่ครอบกว้างกว่าได้ทีหลังโดยไม่ต้องแก้แอป — แอปเลือกแผ่นที่ *ละเอียดที่สุด
# ที่ครอบสนามได้ทั้งผืน* เอง ถ้าไม่มีแผ่นไหนครอบก็ถอยไปยิง API ตรง
TILES = [
    dict(id='th', la0=-5.5, la1=30.5, lo0=80.0, lo1=119.0, step=1.0),
]

SLICES = 24      # จำนวนช่วงเวลาที่เก็บ
STEP_H = 3       # ห่างกันกี่ชั่วโมง → 24 × 3 = 72 ชม.ข้างหน้า
CHUNK = 380      # พิกัดต่อคำขอ (Open-Meteo รับ 400 ตรวจแล้ว เผื่อไว้เล็กน้อย)
PAUSE = 35       # วินาทีระหว่างคำขอ — กันชนเพดาน 600 ครั้ง/นาที
FORECAST_DAYS = 4
NVARS = 6        # จำนวนชั้นในไฟล์ — แอปอ่านค่านี้จาก manifest ห้ามฝังตัวเลขไว้สองที่


def grid(t):
    """พิกัดทุกจุดของแผ่น เรียงตามแถวละติจูด แล้วค่อยลองจิจูด"""
    ny = int(round((t['la1'] - t['la0']) / t['step'])) + 1
    nx = int(round((t['lo1'] - t['lo0']) / t['step'])) + 1
    pts = []
    for iy in range(ny):
        for ix in range(nx):
            pts.append((round(t['la0'] + iy * t['step'], 4),
                        round(t['lo0'] + ix * t['step'], 4)))
    return pts, nx, ny


def fetch(chunk):
    la = ','.join('%.4f' % p[0] for p in chunk)
    lo = ','.join('%.4f' % p[1] for p in chunk)
    url = ('https://api.open-meteo.com/v1/forecast'
           '?latitude=' + la + '&longitude=' + lo +
           '&hourly=wind_speed_10m,wind_direction_10m,precipitation,wind_gusts_10m'
           ',weather_code,pressure_msl'
           '&wind_speed_unit=kmh&forecast_days=%d&timezone=UTC' % FORECAST_DAYS)
    req = urllib.request.Request(url, headers={'User-Agent': 'drift-wind-cache/1'})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                j = json.loads(r.read().decode('utf-8'))
                return j if isinstance(j, list) else [j]
        except urllib.error.HTTPError as e:
            # 429 = ยิงถี่เกิน ไม่ใช่ของเสีย — ถอยแล้วลองใหม่
            wait = 60 * (attempt + 1) if e.code == 429 else 10 * (attempt + 1)
            print('  HTTP %d - wait %ds, retry (%d/4)' % (e.code, wait, attempt + 1))
            time.sleep(wait)
        except Exception as e:
            print('  %s - wait 15s, retry (%d/4)' % (e, attempt + 1))
            time.sleep(15)
    raise SystemExit('ดึงข้อมูลไม่สำเร็จหลังลอง 4 ครั้ง')


def build(t):
    pts, nx, ny = grid(t)
    print('%s: %dx%d = %d points (spacing %d km)'
          % (t['id'], nx, ny, len(pts), round(t['step'] * 111)))

    rows = []
    for i in range(0, len(pts), CHUNK):
        chunk = pts[i:i + CHUNK]
        print('  fetch %d-%d ...' % (i, i + len(chunk) - 1))
        rows += fetch(chunk)
        if i + CHUNK < len(pts):
            time.sleep(PAUSE)
    if len(rows) != len(pts):
        raise SystemExit('ได้ข้อมูลกลับมา %d จุด แต่ขอไป %d' % (len(rows), len(pts)))

    times = rows[0]['hourly']['time']
    base = datetime.strptime(times[0], '%Y-%m-%dT%H:%M').replace(tzinfo=timezone.utc)

    # จุดตั้งต้นของแคช = ชั่วโมงปัจจุบันปัดลงให้ลงตัวกับ STEP_H
    # ไม่ใช้ 00:00 UTC เพราะถ้าดึงตอนเย็น จะเหลือพยากรณ์ข้างหน้าไม่ครบ 72 ชม.
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    t0 = now - timedelta(hours=now.hour % STEP_H)
    off = int((t0 - base).total_seconds() // 3600)
    if off < 0:
        t0, off = base, 0
    if off + (SLICES - 1) * STEP_H >= len(times):
        raise SystemExit('พยากรณ์ที่ได้สั้นกว่าที่แคชต้องการ')

    # ---------- เข้ารหัส ----------
    # ควอนไทซ์เท่ากับที่ URL ของจดหมายเก็บอยู่แล้ว (ลม 2 กม./ชม. · ทิศ 5.625°)
    # จึงไม่เสียความละเอียดเพิ่มแม้แต่นิดเดียว — วัดแล้วช่วยให้ไฟล์เล็กลงจาก 81 KB เหลือ 54 KB
    # เรียงแบบแยกชั้น (ตัวแปร → ช่วงเวลา → พื้นที่) เพื่อให้เพื่อนบ้านอยู่ติดกัน บีบอัดได้ดีกว่า
    buf = bytearray()
    # ชั้นที่ 4 = ลมกระโชก ซึ่งเป็นตัวตัดสินว่าเป็นพายุหรือไม่ (ข้อ 62)
    # ควอนไทซ์เท่าลมต่อเนื่อง (2 กม./ชม.) เพราะใช้เทียบเกณฑ์หยาบ ๆ ไม่ได้ใช้คำนวณเส้นทาง
    #
    # ชั้นที่ 5-6 = รหัสอากาศ กับ ความกดอากาศ (ข้อ 119)
    # เพิ่มเพราะจดหมายที่ส่งตอนยิงสดไม่ได้ เคยตกมาใช้แคชล้วนแล้ว **ไม่มีวันเจอ
    # หิมะ หมอก ฝนแข็งตัว หรือพายุหมุน** เพราะสองชั้นนี้ไม่เคยถูกเก็บไว้ (ข้อ 111.3ก)
    # ⚠️ ไม่เพิ่มจำนวนคำขอเลย — ขอมาในคำขอเดิม และยังอยู่ใต้เพดาน 10 ตัวแปรของ Open-Meteo
    VARS = ('wind_speed_10m', 'wind_direction_10m', 'precipitation',
            'wind_gusts_10m', 'weather_code', 'pressure_msl')
    assert len(VARS) == NVARS, 'NVARS ไม่ตรงกับจำนวนชั้นที่เขียนจริง'
    for var in VARS:
        for s in range(SLICES):
            idx = off + s * STEP_H
            for r in rows:
                v = r['hourly'][var][idx]
                v = 0.0 if v is None else float(v)
                if var in ('wind_speed_10m', 'wind_gusts_10m'):
                    b = min(255, int(round(v / 2.0)))
                elif var == 'wind_direction_10m':
                    b = int(round(v / 5.625)) % 64
                elif var == 'weather_code':
                    # รหัส WMO 0-99 ใส่ตรง ๆ ได้ในหนึ่งไบต์ ไม่ต้องควอนไทซ์
                    b = min(255, int(round(v)))
                elif var == 'pressure_msl':
                    # 870-1085 hPa คือช่วงที่เป็นไปได้บนโลก → เก็บส่วนต่างจาก 870
                    # ความละเอียด 1 hPa พอเหลือเฟือ เพราะใช้เทียบเกณฑ์เดียวคือ 995 (ข้อ 93)
                    # 0 = ไม่มีข้อมูล ซึ่ง sampleWx จะแทนด้วย 1013 = ไม่มีระบบพายุ
                    b = 0 if v <= 0 else min(255, max(1, int(round(v - 870.0))))
                else:
                    b = min(255, int(round(v * 10.0)))
                buf.append(b)

    raw = bytes(buf)
    packed = zlib.compress(raw, 9)
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, t['id'] + '.bin'), 'wb') as f:
        f.write(packed)
    print('  %s.bin  raw %d KB -> packed %d KB'
          % (t['id'], len(raw) // 1024, len(packed) // 1024))

    return dict(id=t['id'], file=t['id'] + '.bin',
                la0=t['la0'], la1=t['la1'], lo0=t['lo0'], lo1=t['lo1'],
                step=t['step'], nx=nx, ny=ny,
                t0=t0.strftime('%Y-%m-%dT%H:%M'), stepH=STEP_H, slices=SLICES,
                nv=NVARS, bytes=len(packed), calls=len(pts))


def main():
    made = [build(t) for t in TILES]
    man = dict(v=3,   # v3 = มีรหัสอากาศกับความกดอากาศแล้ว (ข้อ 119)
               issued=datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M'),
               tiles=made)
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump(man, f, ensure_ascii=False, separators=(',', ':'))
    total = sum(m['calls'] for m in made)
    print('total %d calls per run -> %d per day at 6h interval (free cap 10,000)'
          % (total, total * 4))


if __name__ == '__main__':
    main()
