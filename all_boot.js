/* ============================================================
   ทุกอย่างบนโลกใบเดียว — งานอาร์ตอากาศทั้งชุดในเรขาคณิตจริง

   กอล์ฟ 25 ส.ค.: "ก่อนจะเข้า index ผมอยากเห็นทั้งหมดอยู่บนโลกก่อน"

   สามอันใหม่ (หิมะ · หมอกจริง · ฝนแข็งตัว) ยังไม่อยู่ใน index.html
   หน้านี้จึงเขียนทับ G ชั่วคราว เพื่อให้เห็นของจริงบนทรงกลม
   ถ้าผ่านตา โค้ดชุดนี้ย้ายเข้า index.html ได้เลย
   ============================================================ */
(function(){
'use strict';
const hs=(n)=>{ const x=Math.sin(n*12.9898)*43758.5453; return x-Math.floor(x); };
/* สีกระดาษของหน้าเว็บ ใช้ผสมกลับตอนอ่านพิกเซลที่ยังไม่ถูกผสม */
const PAPER=[236,231,220];

/* ---------- จดหมายสาธิต: ใส่รหัสอากาศให้ครบทุกแบบบนเส้นทางเดียว ----------
   wc มาจาก weather_code ของ Open-Meteo · ค่าที่ใช้เป็นค่าจริงตามมาตรฐาน WMO */
const PLAN = [
  {i:1,  wc:95, pre:1.6},   /* ฝนฟ้าคะนอง */
  {i:3,  wc:73, pre:1.1},   /* หิมะ */
  {i:5,  wc:45, pre:0.2},   /* หมอก */
  {i:7,  wc:66, pre:1.0},   /* ฝนแข็งตัว */
  {i:9,  wc:63, pre:1.4}    /* ฝนหนัก */
];

async function seed(){
  const r = await fetch('demo-letter.json');
  const L = await r.json();
  L.id='wx-all';
  for(const p of PLAN){ if(L.lg[p.i]){ L.lg[p.i][8]=p.wc; L.lg[p.i][4]=p.pre; } }
  const a = (store.letters()||[]).filter(x=>x.id!=='wx-all');
  a.push(L);
  store.saveAll(a);
  return L;
}

/* ---------- ตัวช่วย: จุดบนเส้นทางที่รหัสอากาศตรงเงื่อนไข ---------- */
function spots(L,test){
  const out=[];
  if(!L.lg) return out;
  for(let i=0;i<L.lg.length;i++){
    const wc=L.lg[i][8]||0;
    if(test(wc)) out.push(fromXYZ(posVAt(L,(i+0.5)/L.lg.length)));
  }
  return out;
}
const isSnow = wc => wc>=71 && wc<=77;
const isFog  = wc => wc===45 || wc===48;
const isIce  = wc => wc===56 || wc===57 || wc===66 || wc===67;

/* ---------- สร้างรอยของสามอันใหม่ เก็บเป็นจุดบนทรงกลม ---------- */
const CACHE=new Map();
function extras(L){
  if(CACHE.has(L.id)) return CACHE.get(L.id);
  const f=rainOf(L);
  const half = f ? f.pts.half : 900;
  const R = half*0.20;

  /* หิมะ — เกล็ดที่ *ยกกระดาษให้สว่าง* และส่ายไปมาระหว่างร่วง */
  const snow=[];
  spots(L,isSnow).forEach((c,si)=>{
    for(let k=0;k<260;k++){
      const n=si*991+k*17.3;
      const br=hs(n)*360, dd=Math.sqrt(hs(n*3.1))*R;
      const s=destPoint(c.lat,c.lng,br,dd);
      /* รางร่วง — สั้นกว่าฝนมาก เพราะหิมะลอยมากกว่าตก */
      const fallBrg=hs(n*7.7)*360;
      const track=[]; let q={lat:s.lat,lng:s.lng};
      for(let m=0;m<=6;m++){
        track.push(toXYZ(q.lat,q.lng));
        /* ส่าย — นี่คือสิ่งที่บอกว่าเป็นหิมะ ไม่ใช่ฝน */
        const sway=Math.sin(m*1.15+hs(n*5.3)*6.283)*34;
        q=destPoint(q.lat,q.lng,(fallBrg+sway+360)%360, R*0.075);
      }
      snow.push({p:track, sp:0.10+0.07*hs(n*11.1), ph:hs(n*13.7), w:0.5+0.5*hs(n*19.3)});
    }
  });

  /* หมอก — หย่อมที่ *ลบ* เส้นข้างใต้ ไม่ใช่ฟิล์มที่ทาทับ */
  const fog=[];
  spots(L,isFog).forEach((c,si)=>{
    for(let k=0;k<58;k++){
      const n=si*577+k*23.1;
      const br=hs(n)*360, dd=Math.sqrt(hs(n*3.7))*R*1.15;
      const q=destPoint(c.lat,c.lng,br,dd);
      fog.push({a:toXYZ(q.lat,q.lng), r:R*(0.24+0.20*hs(n*5.9)),
                ph:hs(n*9.3)*6.283, w:0.45+0.55*hs(n*7.1)});
    }
  });

  /* ฝนแข็งตัว — ร่วงตรงสนิท เร็วกว่าฝน มีประกายที่หัว และทิ้งรอยแตกไว้ */
  const ice=[], crack=[];
  spots(L,isIce).forEach((c,si)=>{
    for(let k=0;k<150;k++){
      const n=si*733+k*29.7;
      const br=hs(n)*360, dd=Math.sqrt(hs(n*3.3))*R;
      const s=destPoint(c.lat,c.lng,br,dd);
      const fallBrg=hs(n*7.1)*360;
      const track=[]; let q={lat:s.lat,lng:s.lng};
      for(let m=0;m<=6;m++){ track.push(toXYZ(q.lat,q.lng));
        q=destPoint(q.lat,q.lng,fallBrg,R*0.085); }   /* ไม่ส่ายเลย */
      ice.push({p:track, sp:0.42+0.26*hs(n*11.7), ph:hs(n*13.1), w:0.5+0.5*hs(n*17.9)});
    }
    for(let k=0;k<44;k++){
      const n=si*311+k*41.3;
      const br=hs(n)*360, dd=Math.sqrt(hs(n*5.1))*R*0.95;
      const q=destPoint(c.lat,c.lng,br,dd);
      crack.push({a:toXYZ(q.lat,q.lng), s:0.55+0.55*hs(n*3.9), ph:hs(n*7.7)*6.283});
    }
  });

  /* ---------- เมฆของหิมะและฝนแข็งตัว ----------
     ข้อ 85 ให้ก้อนเมฆกับจุดฟ้าคะนองไปแล้ว เพราะ WMO 95-99 แปลว่ามีเมฆก่อตัวสูง
     หิมะกับฝนแข็งตัวก็ตกลงมาจากเมฆเหมือนกัน — ถ้าไม่มี มันจะร่วงออกมาจากฟ้าโล่ง
     ตอนย้ายเข้า index.html นี่คือการขยายเงื่อนไขของก้อนเดิม ไม่ใช่กลไกใหม่ */
  const patch=[];
  const A=-28*Math.PI/180;
  const addPatch=(c,rad,dens,seed)=>{
    for(let k=0;k<1500;k++){
      const n=seed+k*13.7;
      const br=hs(n)*360, dd=Math.sqrt(hs(n*3.1))*rad;
      const q=destPoint(c.lat,c.lng,br,dd);
      const fall=1-dd/rad;
      if(hs(n*5.3) > dens*fall*fall) continue;
      const ang=A+(hs(n*1.7)-0.5)*0.06;
      const len=rad*0.055*(1+0.5*hs(n*7.1));
      const b=destPoint(q.lat,q.lng,(ang*180/Math.PI+90+360)%360,len);
      patch.push({a:toXYZ(q.lat,q.lng), b:toXYZ(b.lat,b.lng), w:0.45+0.5*fall});
    }
  };
  spots(L,isSnow).forEach((c,i)=>addPatch(c,R*1.25,0.62,i*401));   /* เมฆหิมะ เรียบ ไม่มีแกน */
  spots(L,isIce ).forEach((c,i)=>addPatch(c,R*1.05,0.78,i*617));   /* เมฆฝนแข็งตัว แน่นกว่า */

  const out={snow,fog,ice,crack,patch};
  CACHE.set(L.id,out);
  return out;
}

/* ---------- วาด ---------- */
const at=(tr,u)=>{
  const K=tr.length-1, x=Math.max(0,Math.min(1,u))*K;
  const i=Math.min(K-1,Math.floor(x)), f=x-i, a=tr[i], b=tr[i+1];
  const vx=a.x+(b.x-a.x)*f, vy=a.y+(b.y-a.y)*f, vz=a.z+(b.z-a.z)*f;
  const m=Math.hypot(vx,vy,vz)||1;
  return {x:vx/m, y:vy/m, z:vz/m};
};
const ss=(e,a,b)=>{ const x=Math.max(0,Math.min(1,(e-a)/(b-a))); return x*x*(3-2*x); };

/* ⚠️ ต้องจัดกลุ่มตามความเข้มก่อนวาด แบบเดียวกับ streams และ hatchClouds
   วาดทีละเม็ด = beginPath/fill หลายร้อยครั้งต่อเฟรม ซึ่งเป็นต้นเหตุของอาการกระตุก
   จัดกลุ่มแล้วเหลือ fill ไม่กี่ครั้ง ภาพเหมือนเดิมทุกประการ */
function drawSnow(ctx,list){
  const B=new Map();
  for(const t of list){
    const u=(T*t.sp+t.ph)%1;
    const life=ss(u,0,0.3)*(1-ss(u,0.55,1));
    if(life<=0.02) continue;
    const r0=G.rotate(at(t.p,u)); if(r0.z<0.03) continue;
    const p=G.project(r0);
    if(p.x<-6||p.x>G.W+6||p.y<-6||p.y>G.H+6) continue;
    const depth=.45+.55*Math.sqrt(r0.z);
    const a=life*depth*t.w*0.95;
    if(a<=.02) continue;
    const ai=Math.min(23,Math.round(a*24));
    let arr=B.get(ai); if(!arr) B.set(ai,arr=[]);
    arr.push(p.x,p.y,0.85+0.85*t.w);
  }
  B.forEach((arr,ai)=>{
    ctx.fillStyle='rgba(255,254,250,'+(ai/24).toFixed(3)+')';
    ctx.beginPath();
    for(let i=0;i<arr.length;i+=3){ ctx.moveTo(arr[i]+arr[i+2],arr[i+1]);
      ctx.arc(arr[i],arr[i+1],arr[i+2],0,6.2832); }
    ctx.fill();
  });
}

/* หมอก: ยกหมึกออกจริง ๆ แล้วทาโทนของโลกตรงนั้นกลับลงไป
   ผลคือเส้นแผ่นดินหายเป็นหย่อม แต่ตัวโลกไม่โหว่ */
function drawFog(ctx,list){
  /* ⚠️ ต้องดูดสีจาก *จอที่วาดไปแล้ว* ไม่ใช่จาก G._cv
     เพราะ _cv คือผืนโลกก่อนที่หมอกของแอปจะลบความทึบออก มันเข้มกว่าที่ตาเห็นมาก
     ดูดจากตรงนั้นแล้วเอามาทา = ได้ก้อนดำ ซึ่งตรงข้ามกับที่หมอกควรทำ */
  const dpr=Math.min(devicePixelRatio||1,2);
  const sc=ctx.canvas.getContext('2d',{willReadFrequently:true});
  const key=G._key||'';
  ctx.save();
  for(const b of list){
    const r0=G.rotate(b.a); if(r0.z<0.06) continue;
    const p=G.project(r0);
    const rad=G.R*Math.sin(b.r/ER)*(0.85+0.15*Math.sin(T*0.5+b.ph));
    if(rad<2) continue;
    if(p.x<-rad||p.x>G.W+rad||p.y<-rad||p.y>G.H+rad) continue;
    const br=0.55+0.45*Math.sin(T*0.42+b.ph);
    const a=b.w*br*(0.35+0.65*Math.sqrt(r0.z))*0.62;
    if(a<=.03) continue;
    /* ⚠️ getImageData คืนสี *ก่อนผสมกับพื้นหลังหน้าเว็บ*
       พิกเซลที่ alpha ต่ำจึงคืนสีหมึกเข้ม ไม่ใช่สีที่ตาเห็นจริง ต้องผสมกับสีกระดาษเองก่อน

       และอ่านครั้งเดียวต่อการขยับกล้อง ไม่ใช่ทุกเฟรม —
       การอ่านพิกเซลกลับจาก canvas บังคับให้ GPU กับ CPU รอกัน
       บนเครื่องจริงมันแพงกว่าที่วัดได้ในเครื่องทดสอบมาก */
    if(b._k!==key){
      b._k=key; b._tone='rgba(226,224,216,';
      try{
        const px=sc.getImageData(Math.round(p.x*dpr),Math.round(p.y*dpr),1,1).data;
        const al=px[3]/255;
        b._tone='rgba('+Math.round(px[0]*al+PAPER[0]*(1-al))+','
                       +Math.round(px[1]*al+PAPER[1]*(1-al))+','
                       +Math.round(px[2]*al+PAPER[2]*(1-al))+',';
      }catch(e){}
    }
    const tone=b._tone;
    const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,rad);
    g.addColorStop(0,tone+a.toFixed(3)+')');
    g.addColorStop(0.55,tone+(a*0.5).toFixed(3)+')');
    g.addColorStop(1,tone+'0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,rad,0,6.2832); ctx.fill();
  }
  ctx.restore();
}

function drawIce(ctx,list,cracks){
  const B=new Map();
  for(const t of list){
    const u=(T*t.sp+t.ph)%1;
    const life=ss(u,0,0.26)*(1-ss(u,0.5,1));
    if(life<=0.02) continue;
    const v0=at(t.p,u), v1=at(t.p,u-0.15);
    const r0=G.rotate(v0); if(r0.z<0.03) continue;
    const r1=G.rotate(v1); if(r1.z<0.03) continue;
    const p0=G.project(r0), p1=G.project(r1);
    const depth=.42+.58*Math.sqrt((r0.z+r1.z)*.5);
    let a=life*depth*t.w*0.5;
    if(a<=.01) continue; if(a>.44) a=.44;
    const ai=Math.min(19,Math.round(a*32));
    let arr=B.get(ai); if(!arr) B.set(ai,arr=[]);
    arr.push(p0.x,p0.y,p1.x,p1.y,life*depth);
  }
  ctx.save(); ctx.lineCap='round'; ctx.lineWidth=0.9;
  B.forEach((arr,ai)=>{
    ctx.strokeStyle='rgba(52,60,78,'+(ai/32).toFixed(3)+')';
    ctx.beginPath();
    for(let i=0;i<arr.length;i+=5){ ctx.moveTo(arr[i],arr[i+1]); ctx.lineTo(arr[i+2],arr[i+3]); }
    ctx.stroke();
  });
  /* ประกายเย็นที่หัวหยด — จัดกลุ่มเช่นกัน */
  const Gl=new Map();
  B.forEach((arr)=>{
    for(let i=0;i<arr.length;i+=5){
      const gl=arr[i+4];
      if(gl<0.25) continue;
      const ai=Math.min(19,Math.round(gl*0.8*24));
      let a2=Gl.get(ai); if(!a2) Gl.set(ai,a2=[]);
      a2.push(arr[i],arr[i+1]);
    }
  });
  Gl.forEach((arr,ai)=>{
    ctx.fillStyle='rgba(255,255,252,'+(ai/24).toFixed(3)+')';
    ctx.beginPath();
    for(let i=0;i<arr.length;i+=2){ ctx.moveTo(arr[i]+1.15,arr[i+1]);
      ctx.arc(arr[i],arr[i+1],1.15,0,6.2832); }
    ctx.fill();
  });
  /* รอยแตกที่ค้างอยู่ — น้ำแข็งคือสิ่งที่ไม่ไหลผ่าน */
  ctx.lineWidth=0.85;
  const C=new Map();
  for(const c of cracks){
    const r0=G.rotate(c.a); if(r0.z<0.05) continue;
    const p=G.project(r0);
    const a=0.34*(0.42+0.58*Math.sin(T*0.5+c.ph))*(0.35+0.65*Math.sqrt(r0.z));
    if(a<=.02) continue;
    const s=(2.0+2.4*c.s)*Math.min(1.6,G.R/288);
    const ai=Math.min(15,Math.round(a*40));
    let arr=C.get(ai); if(!arr) C.set(ai,arr=[]);
    arr.push(p.x,p.y,s);
  }
  C.forEach((arr,ai)=>{
    ctx.strokeStyle='rgba(46,54,72,'+(ai/40).toFixed(3)+')';
    ctx.beginPath();
    for(let i=0;i<arr.length;i+=3){
      const x=arr[i],y=arr[i+1],s=arr[i+2];
      ctx.moveTo(x-s,y-s*0.6); ctx.lineTo(x+s,y+s*0.6);
      ctx.moveTo(x-s*0.7,y+s*0.7); ctx.lineTo(x+s*0.7,y-s*0.7);
    }
    ctx.stroke();
  });
  ctx.restore();
}

/* ---------- เสียบเข้ากับลำดับวาดของแอป ----------
   G.fall ถูกเรียกหลังเมฆและก่อนริ้วลมอยู่แล้ว จึงเป็นที่ที่ถูกต้อง
   หมอกวาดก่อนสุด (มันลบของที่อยู่ข้างล่าง) แล้วค่อยหิมะกับน้ำแข็ง */
const origFall = G.fall.bind(G);
G.fall = function(ctx,marks,alpha){
  const L = (store.letters()||[]).find(x=>x.id==='wx-all');
  if(L){
    const e=extras(L);
    /* เมฆของหิมะ/น้ำแข็ง วาดก่อน แล้วหมอกจึงลบสิ่งที่อยู่ใต้มัน */
    if(e.patch.length) G.hatchClouds(ctx,{hatch:e.patch},1);
    if(e.fog.length)  drawFog(ctx,e.fog);
    origFall(ctx,marks,alpha);
    if(e.snow.length) drawSnow(ctx,e.snow);
    if(e.ice.length)  drawIce(ctx,e.ice,e.crack);
    return;
  }
  origFall(ctx,marks,alpha);
};

/* ---------- ป้ายบอกว่ากำลังดูอะไรอยู่ ---------- */
function chrome(L){
  const bar=document.createElement('div');
  bar.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:60;'+
    'padding:10px 14px calc(10px + env(safe-area-inset-bottom));'+
    'background:rgba(244,241,233,.93);border-top:1px solid #d2ccbd;'+
    "font:400 12px/1.65 'IBM Plex Sans Thai',system-ui,sans-serif;color:#4a4f5c;"+
    'display:flex;gap:14px;flex-wrap:wrap;justify-content:center;text-align:center';
  bar.innerHTML =
    '<span><b style="font-weight:600">ฝนฟ้าคะนอง</b> เมฆเข้ม + แสงวาบ</span>'+
    '<span><b style="font-weight:600">หิมะ</b> เกล็ดสว่าง ส่ายช้า</span>'+
    '<span><b style="font-weight:600">หมอก</b> แผ่นดินหายเป็นหย่อม</span>'+
    '<span><b style="font-weight:600">ฝนแข็งตัว</b> ประกาย + รอยแตก</span>'+
    '<span><b style="font-weight:600">ฝน</b> ร่วงเป็นเส้น</span>';
  document.body.appendChild(bar);

  const tip=document.createElement('div');
  tip.style.cssText='position:fixed;left:0;right:0;top:0;z-index:60;padding:10px 14px;'+
    'background:rgba(244,241,233,.93);border-bottom:1px solid #d2ccbd;'+
    "font:400 12.5px/1.6 'IBM Plex Sans Thai',system-ui,sans-serif;color:#4a4f5c;text-align:center";
  tip.innerHTML='ลากเพื่อหมุนโลก · แตะจดหมายด้านล่างเพื่อเลือก — '+
    '<b style="font-weight:600">อากาศทั้งห้าแบบอยู่บนเส้นทางเดียวกัน</b>';
  document.body.appendChild(tip);
  setTimeout(()=>{ tip.style.transition='opacity .8s'; tip.style.opacity='0';
    setTimeout(()=>tip.remove(),900); }, 6500);
}

/* ---------- เริ่ม ---------- */
seed().then(L=>{
  refreshDock();
  selected=L.id;
  const st=letterState(L,nowFor(L));
  /* เล็งไปที่ช่วงกลางเส้นทางที่มีอากาศครบ */
  const c=fromXYZ(posVAt(L,0.42));
  G.focus({lat:c.lat,lng:c.lng}, 2.4);
  chrome(L);
}).catch(e=>{
  const d=document.createElement('div');
  d.style.cssText='position:fixed;inset:auto 12px 12px;z-index:99;padding:10px;'+
    'background:#f0e4e0;color:#a8574a;font:13px sans-serif';
  d.textContent='โหลดจดหมายสาธิตไม่ได้: '+e;
  document.body.appendChild(d);
});
})();
