/* จดหมายสายลม — service worker (ใช้เฉพาะตอน host บน http/https)
   กลยุทธ์: network-first สำหรับตัวหน้า (อัปเดตเวอร์ชันใหม่ได้ทันที)
            cache-fallback เมื่อออฟไลน์
   ไม่แคช API พยากรณ์/geocoding — ข้อมูลอากาศต้องสดเสมอ */
const CACHE = 'letter-wind-v1';
const SHELL = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   /* Open-Meteo ผ่านตรง ไม่แตะ */

  /* ไฟล์แคชลม (ข้อ 58) — แต่ละรอบดึงมี ?v= ของตัวเอง ไฟล์เดิมจึงไม่มีวันเปลี่ยนเนื้อใน
     ใช้ cache-first ได้ ไม่ต้องโหลด 56 KB ใหม่ทุกครั้งที่เปิดแอป
     ตัว index.json ไม่เข้าเงื่อนไขนี้ จึงยังเป็น network-first และรู้ว่ามีรอบใหม่เสมอ */
  if (url.pathname.indexOf('/wind/') >= 0 && url.pathname.endsWith('.bin')) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }))
    );
    return;
  }

  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
