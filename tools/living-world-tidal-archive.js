'use strict';
// Study adapter only. Effects attach to the iframe's existing render owner.
// No production source, browser profile, SW lifecycle, or network assets change.
const studyApp=document.querySelector('#app');
const studyUI={direction:'B',dark:true,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,baseline:false,previousB:false,weather:'clear',sun:'twilight',strength:1,sheen:1,surface:'tidal'};
const studyNotes={
  A:{title:'กระดาษกับลม',english:'PAPER & AIR',look:'มองเนื้อภาพกับขอบโลกก่อน แล้วดูว่าฝุ่นยังบอกทิศลมได้โดยไม่แย่งจดหมายหรือเปล่า',risk:'สงบที่สุด แต่อาจอ่านความลึกได้น้อยเมื่ออยู่ในโหมดสว่าง',layers:['เนื้อกระดาษ','หมอกบาง','ฝุ่นเบา']},
  B:{title:'หายใจในสนธยา',english:'BREATHING TWILIGHT',look:'ลองหมุนให้แสงเลื่อนจากแผ่นดินลงทะเล ดูขอบฟ้าที่ไล่ตามดวงอาทิตย์ และจดหมายอุ่นกลางลม สลับซาตินรอบก่อนเพื่อเทียบในมุมเดียวกัน',risk:'พื้นโลกควรรองรับเรื่องของจดหมาย ความลึกและแสงต้องยังสงบเมื่ออยู่กับภาพนาน ๆ',layers:['โลกบังอากาศ','น้ำลึกและผืนดิน','ขอบฟ้าตามแสง','เมืองยามค่ำ']},
  C:{title:'คืนที่มีระยะ',english:'DISTANT NIGHT',look:'ดูระยะระหว่างดาวกับฝุ่นใกล้ตา และดูว่าโลกกับเส้นทางยังเป็นสิ่งแรกที่สายตาหยุดอยู่หรือเปล่า',risk:'ให้ความรู้สึกอวกาศมากขึ้น ต้องไม่เย็นจนเสียความเป็นจดหมายและไม่ทำให้คืนดูเหงาเกินไป',layers:['ดาวสองระยะ','หมอกเย็น','ขอบฟ้าบาง','parallax ใกล้']}
};

function installLivingWorldStudy(){
  const scene={direction:'B',dark:true,reduced:false,baseline:false,previousB:false,weather:'clear',sun:'twilight',strength:1,sheen:1,surface:'tidal'};
  const originals={grain,stars,paintSky,renderGlobe,dust,rain,snow,splash,sphere:G.sphere,paint:G.paint,segs:G.segs,cities:G.cities,node:G.node,dot:G.dot};
  const sunTimes={day:Date.parse('2026-10-05T04:30:00Z'),twilight:Date.parse('2026-10-05T10:30:00Z'),night:Date.parse('2026-10-05T16:30:00Z')};
  const presets={
    A:{haze:.045,rim:.055,foreground:7,starCount:50,starAlpha:.34,starSize:.48,parallax:.025,grain:.048,dark:['#272d38','#363b42'],light:['#eee8db','#e3ddce']},
    B:{haze:.12,rim:.16,foreground:12,starCount:75,starAlpha:.44,starSize:.55,parallax:.055,grain:.025,dark:['#202735','#303747'],light:['#f0ece2','#e2e5e3']},
    C:{haze:.095,rim:.11,foreground:17,starCount:112,starAlpha:.51,starSize:.61,parallax:.10,grain:.014,dark:['#141d2b','#252e40'],light:['#e9eaf0','#d9e0e5']}
  };
  const home={y:108*RAD,x:19*RAD};
  let seed=4415;
  function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  const distant=Array.from({length:112},()=>({x:rnd(),y:rnd(),r:.25+rnd()*.68,a:.25+rnd()*.7,phase:rnd()*Math.PI*2,rate:.17+rnd()*.27,depth:rnd()>.75?1:0}));
  const near=Array.from({length:17},()=>({x:rnd(),y:rnd(),r:.65+rnd()*.9,phase:rnd()*Math.PI*2,depth:.35+rnd()*.65}));
  const texture=document.createElement('canvas');texture.width=texture.height=128;
  const textureCtx=texture.getContext('2d'),noise=textureCtx.createImageData(128,128);
  for(let i=0;i<noise.data.length;i+=4){const v=rnd()>.5?255:0;noise.data[i]=noise.data[i+1]=noise.data[i+2]=v;noise.data[i+3]=70+Math.floor(rnd()*110);}
  textureCtx.putImageData(noise,0,0);
  const fixedGrain=textureCtx.createPattern(texture,'repeat');
  const rootStyle=document.createElement('style');rootStyle.textContent='#splash,.veil,header.bar,#bottom,#status,#play,#toast{display:none!important}#stage{opacity:1!important;transform:none!important;transition:none!important}';document.head.appendChild(rootStyle);
  // The same held journey/solar time is used in baseline too, for a fair comparison.
  sunMs=()=>sunTimes[scene.sun];
  const starOriginal=Object.assign({},STAR);
  const stableLines=parent.DriftStudyLines,paintLines=stableLines.createPainter();
  const earth=parent.DriftEarthMaterial.create(COAST,(w,h)=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;return cv;},224,{gpu:new URLSearchParams(parent.location.search).get('material')!=='canvas'});
  const landChecks=[['Bangkok',13.7,100.5,true],['Paris',48.8,2.3,true],['Sahara',24,13,true],['Atlantic',0,-30,false],['Pacific',0,-150,false],['Indian Ocean',-20,80,false],['Antarctica',-85,0,true]].map(([name,lat,lng,land])=>{
    const uv=parent.DriftEarthMaterial.geographic(toXYZ(lat,lng)),coverage=earth.sample(uv.u,uv.v)[0];return {name,coverage,expectedLand:land,passed:land?coverage>.8:coverage<.2};
  });
  function config(){return presets[scene.direction];}
  function revisedB(){return !scene.baseline&&scene.direction==='B'&&!scene.previousB;}
  function tidalB(){return revisedB()&&scene.surface==='tidal'&&scene.sheen>0;}
  function directionalRim(ctx){
    const light=G.rotate(sunVec()),r=G.R,weight=scene.strength*(scene.dark?1:.65);
    if(!weight)return;
    ctx.save();ctx.lineCap='butt';
    // Cached with the body: no rotating ring, independent timer, or filter.
    for(const [offset,width,gain] of [[.012,.045,.06],[.004,.014,.12],[0,.003,.27]]){
      ctx.lineWidth=Math.max(.55,r*width);const radius=r*(1+offset);
      for(let i=0;i<96;i++){
        const angle=(i+.5)/96*Math.PI*2,dot=Math.cos(angle)*light.x-Math.sin(angle)*light.y;
        const day=parent.DriftEarthMaterial.smooth(-.12,.45,dot),dusk=Math.exp(-Math.pow(dot/.23,2));
        const rgb=[128+(223-128)*day,160+(189-160)*day,200+(135-200)*day];
        const a=gain*weight*(.12+.88*day+.20*dusk);
        ctx.strokeStyle='rgba('+rgb.map(Math.round).join(',')+','+a.toFixed(4)+')';
        ctx.beginPath();ctx.arc(G.CX,G.CY,radius,i/96*Math.PI*2,(i+1.015)/96*Math.PI*2);ctx.stroke();
      }
    }
    ctx.restore();
  }
  function paintTidal(ctx){
    // Keep the tuning slider a blend with the earlier world, including near zero.
    if(scene.sheen<1)originals.paint.call(G,ctx,false);
    const cv=earth.render(G,sunVec(),scene);
    ctx.save();ctx.beginPath();ctx.arc(G.CX,G.CY,G.R,0,Math.PI*2);ctx.clip();
    ctx.globalAlpha=clamp(scene.sheen,0,1);
    ctx.drawImage(cv,G.CX-G.R,G.CY-G.R,G.R*2,G.R*2);
    // The grid is a whisper; coastlines support the letter's journey.
    paintLines(G,ctx,GRID,.045,.55,true,'83,101,112',G.shadeDay);
    for(const [lines,alpha] of G.coastSets())paintLines(G,ctx,lines,.23*alpha,.65,true,'61,84,94',G.shadeDay);
    paintLines(G,ctx,GRID,.045,.55,true,'160,178,198',G.shadeNight);
    for(const [lines,alpha] of G.coastSets())paintLines(G,ctx,lines,.18*alpha,.65,true,'163,178,190',G.shadeNight);
    ctx.restore();directionalRim(ctx);
  }
  // Mask whole primitives (including a drop's tail), not just their centre.
  // Simulation continues behind the world; routes and weather on the world stay visible.
  function outsideWorld(ctx,draw,box={w:W,h:H,x:G.CX,y:G.CY,r:G.R}){
    ctx.save();
    try{
      ctx.beginPath();ctx.rect(0,0,box.w,box.h);
      ctx.arc(box.x,box.y,box.r,0,Math.PI*2,true);ctx.clip('evenodd');draw();
    }finally{ctx.restore();}
  }
  for(const name of ['dust','rain','snow','splash']){
    const draw=originals[name];
    const wrapped=(ctx,dt)=>revisedB()?outsideWorld(ctx,()=>draw(ctx,dt)):draw(ctx,dt);
    if(name==='dust')dust=wrapped;else if(name==='rain')rain=wrapped;else if(name==='snow')snow=wrapped;else splash=wrapped;
  }
  // Small normal/half-vector material map, baked only when G.paint's existing
  // camera/solar cache invalidates. No per-frame pixel pass or new frame owner.
  const surface=document.createElement('canvas');surface.width=surface.height=192;
  const surfaceCtx=surface.getContext('2d');
  function material(ctx){
    if(!revisedB()||!scene.sheen)return;
    const size=surface.width,image=surfaceCtx.createImageData(size,size),light=G.rotate(sunVec());
    const halfLength=Math.hypot(light.x,light.y,light.z+1);
    const half=halfLength>1e-5?{x:light.x/halfLength,y:light.y/halfLength,z:(light.z+1)/halfLength}:{x:0,y:0,z:1};
    const base=scene.dark?[68,85,107]:[155,170,181],night=scene.dark?[19,25,39]:[105,119,143];
    const gain=scene.dark?[125,120,107]:[75,66,42],pearl=[255,250,234];
    const glazeLight=[255,243,215],glazeShade=[13,23,40];
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const nx=(x+.5)/size*2-1,ny=1-(y+.5)/size*2,q=nx*nx+ny*ny;
      if(q>=1)continue;
      const nz=Math.sqrt(1-q),dot=nx*light.x+ny*light.y+nz*light.z,day=Math.max(0,dot);
      const facing=Math.max(0,nx*half.x+ny*half.y+nz*half.z);
      const i=(y*size+x)*4;
      if(scene.surface==='first'){
        // Preserve the previous study's mild glaze for a direct comparison.
        const gloss=Math.pow(facing,22)*.34*Math.min(1,day*6),lift=Math.pow(day,.8)*.13;
        const shade=Math.pow(1-nz,1.5)*.21*(.35+.65*Math.min(1,day*4));
        const value=(lift+gloss-shade)*scene.sheen*(scene.dark?1:.8),rgb=value>=0?glazeLight:glazeShade;
        image.data[i]=rgb[0];image.data[i+1]=rgb[1];image.data[i+2]=rgb[2];image.data[i+3]=Math.round(Math.min(.65,Math.abs(value))*255);
      }else{
        // Replace the grey daytime wash with a shaded satin body, rather than
        // only placing a weak highlight on top of it. Fade through twilight;
        // the existing night film and city lights retain their contrast.
        const k=clamp((dot+.40)/.25,0,1),lit=k*k*(3-2*k),diffuse=Math.pow(day,.7);
        const dawn=clamp((dot+.20)/.40,0,1),warm=dawn*dawn*(3-2*dawn);
        const reflection=(Math.pow(facing,10)*.36+Math.pow(facing,42)*.58)*Math.min(1,day*5);
        const edge=Math.pow(1-nz,3)*day;
        for(let channel=0;channel<3;channel++){
          const body=night[channel]+(base[channel]-night[channel])*warm+gain[channel]*diffuse-edge*(channel===0?14:8);
          image.data[i+channel]=Math.round(body+(pearl[channel]-body)*reflection);
        }
        image.data[i+3]=Math.round(clamp(.88*lit*scene.sheen,0,1)*255);
      }
    }
    surfaceCtx.putImageData(image,0,0);
    ctx.save();ctx.beginPath();ctx.arc(G.CX,G.CY,G.R,0,Math.PI*2);ctx.clip();
    ctx.drawImage(surface,G.CX-G.R,G.CY-G.R,G.R*2,G.R*2);ctx.restore();
  }
  let painting=false,materialDrawn=false;
  const lineDiagnostics={paints:0,fastPaints:0,detailSwitches:0,maxPoseLagPx:0,last:null,recent:[]};
  G.paint=function(ctx,fast){
    const start=performance.now();painting=true;materialDrawn=false;
    try{return tidalB()?paintTidal(ctx):originals.paint.call(this,ctx,fast);}finally{
      painting=false;const last=lineDiagnostics.last;
      if(last&&last.fast!==fast)lineDiagnostics.detailSwitches++;
      const entry={y:this.rotY,x:this.rotX,zoom:this.zoom,fast,costMs:performance.now()-start};
      lineDiagnostics.last=entry;lineDiagnostics.paints++;if(fast)lineDiagnostics.fastPaints++;
      lineDiagnostics.recent.push(entry);if(lineDiagnostics.recent.length>120)lineDiagnostics.recent.shift();
    }
  };
  G.segs=function(ctx,lines,a,lw,front,...args){
    // Surface goes above the old day/night film but below front coast/grid lines.
    if(painting&&front&&!materialDrawn){materialDrawn=true;material(ctx);}
    if(revisedB())return paintLines(this,ctx,lines,a,lw,front,args[1],args[2]);
    return originals.segs.call(this,ctx,lines,a,lw,front,...args);
  };
  function checkMask(){
    const cv=document.createElement('canvas');cv.width=128;cv.height=96;const ctx=cv.getContext('2d');
    return [{w:128,h:96,x:64,y:44,r:29},{w:128,h:96,x:64,y:44,r:68}].map(box=>{
      ctx.clearRect(0,0,128,96);
      outsideWorld(ctx,()=>{ctx.fillStyle='#fff';ctx.fillRect(0,0,128,96);},box);
      const pixels=ctx.getImageData(0,0,128,96).data;let insideLeaks=0,outsideMissing=0;
      for(let y=0;y<96;y++)for(let x=0;x<128;x++){
        const d=Math.hypot(x+.5-box.x,y+.5-box.y),alpha=pixels[(y*128+x)*4+3];
        if(d<box.r-1&&alpha)insideLeaks++;
        if(d>box.r+1&&alpha!==255)outsideMissing++;
      }
      ctx.fillStyle='#fff';ctx.fillRect(64,44,1,1);
      return {radius:box.r,insideLeaks,outsideMissing,restored:ctx.getImageData(64,44,1,1).data[3]===255};
    });
  }
  const maskChecks=checkMask();
  function cameraOffset(k){let d=G.rotY-home.y;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return {x:clamp(d*G.R0*k,-32,32),y:clamp((G.rotX-home.x)*G.R0*k,-22,22)};}
  function atmosphere(ctx,front){
    const p=config(),weight=scene.strength;
    if(!weight)return;
    const t=T,off=cameraOffset(.05),cloud=scene.weather==='clear'?1:1.6;
    if(!front){
      const bands=scene.direction==='A'?1:2;
      ctx.save();
      for(let i=0;i<bands;i++){
        const x=W*(i===0?.18:.82)+off.x+Math.sin(t*.035+i*2.7)*W*.018;
        const y=H*(i===0?.31:.64)+off.y+Math.sin(t*.024+i)*H*.012;
        ctx.save();ctx.translate(x,y);ctx.scale(1,.30+i*.1);
        const radius=Math.max(W,H)*(.46+i*.04),g=ctx.createRadialGradient(0,0,0,0,0,radius);
        const color=scene.dark?(scene.direction==='C'?'124,152,194':i===0?'198,154,84':'142,157,177'):(i===0?'180,157,119':'135,156,174');
        g.addColorStop(0,'rgba('+color+','+(p.haze*weight*cloud*(scene.dark?1:.6))+')');g.addColorStop(1,'rgba('+color+',0)');
        ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();ctx.restore();
      }
      ctx.restore();return;
    }
    if(tidalB())return; // Directional rim is baked into the globe cache.
    // Narrow rim stays behind journey/weather and never covers a letter.
    const breathe=1+Math.sin(t*.12)*.025+Math.sin(t*.071+1.4)*.014;
    const r=G.R,outer=r*(1.05+.012*breathe),alpha=p.rim*weight*(scene.dark?1:.5)*breathe;
    const rgb=scene.direction==='C'?'133,162,204':'198,165,113';
    const glow=ctx.createRadialGradient(G.CX,G.CY,r*.985,G.CX,G.CY,outer);
    glow.addColorStop(0,'rgba('+rgb+',0)');glow.addColorStop(.24,'rgba('+rgb+','+alpha+')');glow.addColorStop(1,'rgba('+rgb+',0)');
    ctx.save();ctx.fillStyle=glow;ctx.beginPath();ctx.arc(G.CX,G.CY,outer,0,Math.PI*2);ctx.arc(G.CX,G.CY,r*.985,0,Math.PI*2,true);ctx.fill();ctx.restore();
  }
  grain=function(ctx){
    if(scene.baseline)return originals.grain(ctx);
    ctx.save();ctx.globalAlpha=config().grain;ctx.fillStyle=fixedGrain;ctx.fillRect(0,0,W,H);ctx.restore();atmosphere(ctx,false);
  };
  stars=function(ctx,dt){
    if(scene.baseline)return originals.stars(ctx,dt);
    if(!scene.dark)return;
    const p=config(),off=cameraOffset(.02),weatherFade=scene.weather==='clear'?1:.12;
    const solar=G.pipeV(sunVec()),sunFade=1-clamp(solar.z,0,1)*.75;
    ctx.save();
    for(let i=0;i<p.starCount;i++){
      const s=distant[i],depth=scene.direction==='C'&&s.depth?1.7:1;
      const x=s.x*W+off.x*depth,y=s.y*H+off.y*depth;
      if(Math.hypot(x-G.CX,y-G.CY)<G.R*1.085)continue;
      const flicker=.83+.09*Math.sin(T*s.rate+s.phase)+.04*Math.sin(T*s.rate*.43+s.phase*1.7);
      ctx.globalAlpha=p.starAlpha*s.a*flicker*weatherFade*sunFade;
      ctx.fillStyle=s.depth?'#ecdcc1':'#bcc8dc';ctx.beginPath();ctx.arc(x,y,s.r*p.starSize*depth,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  };
  paintSky=function(){
    if(scene.baseline)return originals.paintSky();
    const p=config(),palette=scene.dark?p.dark:p.light;
    document.body.style.background='linear-gradient(150deg,'+palette[0]+','+palette[1]+')';
  };
  G.sphere=function(ctx){
    if(!scene.baseline)atmosphere(ctx,true);
    let result;
    if(revisedB()){
      // One stable topology during drag and rest. Exact pose keeps the baked
      // coast/grid aligned with the live routes; 2x sampling smooths thin strokes.
      const dpr=2,key='study-stable:'+stableLines.poseKey(this,sunKey(),dpr);
      if(!this._cv){this._cv=document.createElement('canvas');this._cx=this._cv.getContext('2d');}
      if(this._key!==key){
        this._key=key;
        const width=Math.round(this.W*dpr),height=Math.round(this.H*dpr);
        if(this._cv.width!==width||this._cv.height!==height){this._cv.width=width;this._cv.height=height;}
        this._cx.setTransform(dpr,0,0,dpr,0,0);this._cx.clearRect(0,0,this.W,this.H);
        this.paint(this._cx,false);
      }
      ctx.drawImage(this._cv,0,0,this.W,this.H);if(!tidalB())this.liftNight(ctx);
      if(this.terminator())this.cities(ctx,false);
    }else result=originals.sphere.call(this,ctx);
    const last=lineDiagnostics.last;
    if(last)lineDiagnostics.maxPoseLagPx=Math.max(lineDiagnostics.maxPoseLagPx,this.R*Math.hypot(this.rotY-last.y,this.rotX-last.x));
    return result;
  };
  G.cities=function(ctx,fast){
    if(!tidalB()){ctx.save();ctx.globalAlpha=scene.baseline?1:scene.direction==='C'?.82:scene.direction==='A'?.65:.94;originals.cities.call(this,ctx,fast);ctx.restore();return;}
    const sun=sunVec();ctx.save();
    for(let i=0;i<CITY.length;i++){
      const {v,m}=CITY[i],dot=v.x*sun.x+v.y*sun.y+v.z*sun.z;
      const night=1-parent.DriftEarthMaterial.smooth(-.28,.04,dot),r=G.rotate(v);
      if(r.z<.025||night<.01)continue;
      const p=G.project(r),a=night*(.18+.48*m)*Math.sqrt(r.z)*(1+Math.sin(T*.13+i*2.399)*.075),rad=.38+m*.85;
      if(m>.45){const halo=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,rad*4.5);
        halo.addColorStop(0,'rgba(233,181,111,'+(a*.28).toFixed(4)+')');halo.addColorStop(1,'rgba(233,181,111,0)');
        ctx.fillStyle=halo;ctx.beginPath();ctx.arc(p.x,p.y,rad*4.5,0,Math.PI*2);ctx.fill();}
      ctx.fillStyle='rgba(247,204,140,'+a.toFixed(4)+')';ctx.beginPath();ctx.arc(p.x,p.y,rad,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  };
  G.node=function(ctx,p,hollow){
    if(!tidalB())return originals.node.call(this,ctx,p,hollow);
    if(!p||![p.x,p.y,p.z].every(Number.isFinite)||p.z<-.1)return;
    const a=p.z<0?.3:1,r=hollow?3.8:3;
    const world=this.unrotate({x:(p.x-this.CX)/this.R,y:(this.CY-p.y)/this.R,z:p.z}),sun=sunVec();
    const day=parent.DriftEarthMaterial.smooth(-.15,.3,world.x*sun.x+world.y*sun.y+world.z*sun.z);
    ctx.save();const halo=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*3.2);
    halo.addColorStop(0,'rgba(237,207,157,'+(a*.28*(1-day)).toFixed(4)+')');
    halo.addColorStop(.4,'rgba(237,207,157,'+(a*.12*(1-day)).toFixed(4)+')');halo.addColorStop(1,'rgba(237,207,157,0)');
    ctx.fillStyle=halo;ctx.beginPath();ctx.arc(p.x,p.y,r*3.2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(22,35,49,'+(a*.84)+')';ctx.beginPath();ctx.arc(p.x,p.y,r+1.3,0,Math.PI*2);ctx.fill();
    if(hollow){ctx.strokeStyle='rgba(239,211,163,'+a+')';ctx.lineWidth=1.1;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.stroke();}
    else {ctx.fillStyle='rgba(237,207,157,'+a+')';ctx.beginPath();ctx.arc(p.x,p.y,r*.53,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  };
  G.dot=function(ctx,p,pulse,sel){
    originals.dot.call(this,ctx,p,pulse,sel);
    if(tidalB()&&p&&p.z>=0){ctx.save();ctx.fillStyle='rgba(255,242,212,'+(sel?.92:.65)+')';ctx.beginPath();ctx.arc(p.x,p.y,sel?1.1:.8,0,Math.PI*2);ctx.fill();ctx.restore();}
  };
  function foreground(ctx){
    if(scene.baseline||scene.weather!=='clear'||!scene.strength)return;
    const p=config(),off=cameraOffset(p.parallax),t=T,flow=(WIND_DIR+180)*RAD;
    ctx.save();
    if(revisedB()){
      ctx.beginPath();ctx.rect(0,0,W,H);ctx.arc(G.CX,G.CY,G.R,0,Math.PI*2,true);ctx.clip('evenodd');
    }
    for(let i=0;i<p.foreground;i++){
      const a=near[i],speed=.007+a.depth*.006;
      const x=((a.x+t*speed*Math.sin(flow))%1+1)%1*W+off.x*a.depth;
      const y=((a.y-t*speed*.22)%1+1)%1*H+off.y*a.depth+Math.sin(t*.11+a.phase)*3;
      if(!revisedB()&&Math.hypot(x-G.CX,y-G.CY)<G.R*.95)continue;
      ctx.globalAlpha=(scene.dark?.11:.07)*scene.strength*(.6+a.depth*.4);
      ctx.fillStyle=scene.dark?'#d5c8ad':'#776a55';ctx.beginPath();ctx.arc(x,y,a.r*(.8+a.depth*.3),0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  renderGlobe=function(dt){
    const result=originals.renderGlobe(dt);
    if(!sheetOpen&&!heroActive())foreground(sctx);
    return result;
  };
  function weather(){
    _windEpoch++;_windUntil=Date.now()+86400000;_windRequest=null;
    WIND_HERE=scene.weather==='clear'?12:scene.weather==='rain'?24:9;WIND_DIR=210;WIND_GUST=WIND_HERE+7;
    RAIN_HERE=scene.weather==='clear'?0:scene.weather==='rain'?.8:.4;WC_HERE=scene.weather==='snow'?73:scene.weather==='rain'?61:0;
    DUST.length=RAIN.length=SNOW.length=SPLASH.length=0;PILE.fill(0);
  }
  function reset(){G.target=null;G.rotY=home.y;G.rotX=home.x;G.vX=G.vY=0;G.zoom=G.zTarget=1.04;G.R=G.R0*G.zoom;G._key=null;G._nkey=null;}
  function apply(next){
    const prior=Object.assign({},scene);Object.assign(scene,next);
    setSchemePref(scene.dark?'dark':'light');
    Object.assign(SKIN,LIGHT_SKIN,scene.dark?DARK_SKIN:{});
    CFG.FOG=scene.dark?DARK_FOG:LIGHT_FOG;
    document.body.style.removeProperty('background');
    setMotionPreference(scene.reduced);_skyKey=null;_sunK=null;G._key=G._nkey=null;
    // Color edits occur only on this iframe instance, after the theme reset.
    if(!scene.baseline){
      const p=config();CFG.FOG=scene.dark?(scene.direction==='C'?.22:scene.direction==='A'?.26:.18):(scene.direction==='A'?.48:scene.direction==='B'?.44:.42);
      if(scene.dark){SKIN.atmo=scene.direction==='C'?'140,160,190':'198,161,102';SKIN.cityGlow=scene.direction==='C'?'189,179,155':'226,172,88';}
      Object.assign(STAR,{n:p.starCount,a:p.starAlpha,size:p.starSize});
      if(tidalB())CFG.FOG=scene.dark?.115:.29;
    }else Object.assign(STAR,starOriginal);
    if(prior.weather!==scene.weather||!WIND_HERE)weather();
    RENDER.start();
    return {direction:scene.direction,baseline:scene.baseline,weather:scene.weather,reduced:scene.reduced};
  }
  closeSheet();resetHero();previewOff();
  // This viewer exposes globe drag/zoom; a tap must not open the reading flow.
  openRead=function(){};
  selected='living-world-sample';PREVIEW={id:selected,h:2,play:false};
  reset();weather();
  addEventListener('visibilitychange',()=>{if(!document.hidden)setMotionPreference(scene.reduced);});
  window.LivingWorldStudy={apply,reset,state:()=>Object.assign({},scene),evidence:()=>({scene:Object.assign({},scene),camera:{y:G.rotY,x:G.rotX,zoom:G.zoom},clock:RENDER.snapshot(),visualTime:T,particles:{stars:scene.baseline?STARS.length:config().starCount,foreground:scene.baseline?0:config().foreground},depth:{occlusion:revisedB(),layers:['dust','rain','snow','splash','foreground'],maskChecks},surface:{active:revisedB()&&scene.sheen>0,variant:scene.surface,size:tidalB()?earth.size:surface.width,backend:tidalB()?earth.backend():'canvas',landCoverage:earth.landCoverage,landChecks,light:G.rotate(sunVec())},lines:JSON.parse(JSON.stringify(lineDiagnostics)),fog:CFG.FOG,solarMs:sunMs(),scheme:schemeNow})};
  return true;
}

function updateStudyUI(){
  const note=studyNotes[studyUI.direction];
  document.querySelector('#sceneTitle').textContent=studyUI.direction+' — '+note.title;
  document.querySelector('#sceneLabel').textContent=studyUI.baseline?'BASELINE / CURRENT APP':studyUI.direction+' / '+note.english+(studyUI.direction==='B'?(studyUI.previousB?' / BEFORE':studyUI.surface==='tidal'?' / DEEP WATER & WARM LAND':studyUI.surface==='satin'?' / SATIN LIGHT':' / FIRST GLAZE'):'');
  document.querySelector('#lookFor').textContent=note.look;document.querySelector('#tradeoff').textContent=note.risk;
  document.querySelector('#layers').replaceChildren(...note.layers.map(text=>{const el=document.createElement('span');el.textContent=text;return el;}));
  document.querySelectorAll('[data-direction]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.direction===studyUI.direction));
  for(const name of ['baseline','motion','theme'])document.querySelector('#'+name).setAttribute('aria-pressed',name==='motion'?studyUI.reduced:name==='theme'?studyUI.dark:studyUI.baseline);
  document.querySelector('#previousB').setAttribute('aria-pressed',studyUI.previousB);
  document.querySelector('#previousB').disabled=studyUI.direction!=='B'||studyUI.baseline;
  document.querySelector('#theme').textContent=studyUI.dark?'มืด':'สว่าง';document.querySelector('#scene').dataset.theme=studyUI.dark?'dark':'light';
  document.querySelector('#strengthOut').value=Math.round(studyUI.strength*100);
  document.querySelector('#sheenOut').value=Math.round(studyUI.sheen*100);
  document.querySelector('#sheen').disabled=studyUI.direction!=='B'||studyUI.baseline||studyUI.previousB;
  document.querySelector('#surface').disabled=studyUI.direction!=='B'||studyUI.baseline||studyUI.previousB;
  if(studyApp.contentWindow.LivingWorldStudy){
    studyApp.contentWindow.LivingWorldStudy.apply(studyUI);
    document.querySelector('#status').dataset.evidence=JSON.stringify(studyApp.contentWindow.LivingWorldStudy.evidence());
    document.querySelector('#status').textContent=(studyUI.baseline?'กำลังเทียบ renderer เดิม':('กำลังดูแบบ '+studyUI.direction))+' · อากาศและเวลาแสงเป็นตัวอย่างสำหรับศึกษาภาพ'+(studyUI.reduced?' · ลดการเคลื่อนไหว':'');
  }
}
document.querySelectorAll('[data-direction]').forEach(button=>button.onclick=()=>{studyUI.direction=button.dataset.direction;studyUI.baseline=false;studyUI.previousB=false;studyUI.strength=1;document.querySelector('#strength').value=100;updateStudyUI();});
document.querySelector('#theme').onclick=()=>{studyUI.dark=!studyUI.dark;updateStudyUI();};
document.querySelector('#motion').onclick=()=>{studyUI.reduced=!studyUI.reduced;updateStudyUI();};
document.querySelector('#baseline').onclick=()=>{studyUI.baseline=!studyUI.baseline;updateStudyUI();};
document.querySelector('#previousB').onclick=()=>{studyUI.previousB=!studyUI.previousB;updateStudyUI();};
for(const name of ['weather','sun','surface'])document.querySelector('#'+name).onchange=event=>{studyUI[name]=event.target.value;updateStudyUI();};
document.querySelector('#strength').oninput=event=>{studyUI.strength=Number(event.target.value)/100;updateStudyUI();};
document.querySelector('#sheen').oninput=event=>{studyUI.sheen=Number(event.target.value)/100;updateStudyUI();};
document.querySelector('#reset').onclick=()=>studyApp.contentWindow.LivingWorldStudy?.reset();
studyApp.addEventListener('load',()=>{
  try{studyApp.contentWindow.eval('('+installLivingWorldStudy.toString()+')()');updateStudyUI();}
  catch(error){const status=document.querySelector('#status');status.classList.add('error');status.textContent='โหลดแบบศึกษาไม่สำเร็จ: '+error.message;}
});
const sampleLetter={id:'living-world-sample',f:{n:'ผู้เขียนตัวอย่าง',p:'กรุงเทพ',la:13.7,lo:100.5},t:{n:'ผู้รับตัวอย่าง',p:'โตเกียว',la:35.7,lo:139.7},
  s:Date.now()-2*3600000,th:6,ct:0,lo:-1,dir:'out',lg:Array.from({length:12},()=>[.5,0,18,210,0,0,0,25,0]),bd:'จดหมายตัวอย่างสำหรับศึกษาบรรยากาศ'};
DriftStudy.local.setItem('lw.v1.letters',JSON.stringify([sampleLetter]));
DriftStudy.local.setItem('lw.v1.scheme','dark');
updateStudyUI();studyApp.src='index.html?qa=living-world-study&fresh='+Date.now();
