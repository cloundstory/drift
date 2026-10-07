/* จดหมายสายลม — service worker (ใช้เฉพาะตอน host บน http/https)
   กลยุทธ์: network-first สำหรับตัวหน้า (อัปเดตเวอร์ชันใหม่ได้ทันที)
            cache-fallback เมื่อออฟไลน์
   ไม่แคช API พยากรณ์/geocoding — ข้อมูลอากาศต้องสดเสมอ */
const CACHE = 'letter-wind-v2';
const SHELL = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => /^letter-wind-v\d+$/.test(k) && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function remember(req, res, wind=false){
  if(!res.ok) return;
  const c=await caches.open(CACHE);
  await c.put(req,res);
  if(wind){
    const keys=(await c.keys()).filter(k=>{
      const u=new URL(k.url); return u.pathname.includes('/wind/')&&u.pathname.endsWith('.bin');
    });
    await Promise.all(keys.slice(0,Math.max(0,keys.length-4)).map(k=>c.delete(k)));
  }
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   /* Open-Meteo ผ่านตรง ไม่แตะ */
  const name=url.pathname.split('/').pop();
  /* Studies own their in-memory fixtures; don't grow the production cache with them. */
  if(/-studies\.html$/.test(name)||['all-on-globe.html','sky-mobile.html','storm-mobile.html','pencil-world-preview.html'].includes(name)
      ||url.pathname.includes('/tools/')||url.searchParams.has('qa')) return;

  /* ไฟล์แคชลม (ข้อ 58) — แต่ละรอบดึงมี ?v= ของตัวเอง ไฟล์เดิมจึงไม่มีวันเปลี่ยนเนื้อใน
     ใช้ cache-first ได้ ไม่ต้องโหลด 56 KB ใหม่ทุกครั้งที่เปิดแอป
     ตัว index.json ไม่เข้าเงื่อนไขนี้ จึงยังเป็น network-first และรู้ว่ามีรอบใหม่เสมอ */
  if (url.pathname.indexOf('/wind/') >= 0 && url.pathname.endsWith('.bin')) {
    e.respondWith(
      caches.open(CACHE).then(c=>c.match(req)).then(hit => hit || fetch(req).then(res => {
        e.waitUntil(remember(req,res.clone(),true).catch(()=>{}));
        return res;
      }))
    );
    return;
  }

  e.respondWith(
    fetch(req)
      .then(res => {
        e.waitUntil(remember(req,res.clone()).catch(()=>{}));
        return res;
      })
      .catch(async()=>{
        const c=await caches.open(CACHE), hit=await c.match(req);
        if(hit) return hit;
        if(req.mode==='navigate') return (await c.match('./index.html'))||Response.error();
        return Response.error();
      })
  );
});
