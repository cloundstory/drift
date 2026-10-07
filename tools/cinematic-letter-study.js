/* Isolated visual study. The production file supplies its actual paper mesh,
   fonts and pencil world; only this page's memory fixture is touched. */
(function(){
 'use strict';
 const $=s=>document.querySelector(s), app=$('#app'),cv=$('#film'),ctx=cv.getContext('2d');
 const caption=$('#caption'),phase=$('#phase'),seek=$('#seek'),play=$('#play');
 let bridge=null,direction='B',scene='paper',speed=18,dark=false,reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
 let clock=0,pick=0,playing=false,raf=null,last=null,closeup=false,ready=false,frameCost=[],lastEvidence=0;
 let paperDraws=0,textureBuilds=0,lastPhase='',lastShadow=null,composeVisited=false,paperCacheHits=0;
 let paperSample=null,releaseTrace=[],releaseSamples=[],lastReleasePaint=null;
 const surfaceCache=new Map();let cachePixels=0;
 const letter={id:'cinematic-study-letter',dir:'out',f:{n:'กอล์ฟ',p:'กรุงเทพ',la:13.7,lo:100.5},t:{n:'ช',p:'เชียงใหม่',la:18.8,lo:99},
   s:Date.now(),th:6,ct:0,lo:-1,lg:Array.from({length:12},()=>[.5,0,18,210,0,0,0,24,0]),
   bd:'ที่นี่ฝนตกทั้งวัน ฉันนั่งดูน้ำไหลลงจากชายคา\nแล้วนึกถึงตอนที่เรายืนรอรถเมล์ด้วยกันเมื่อสามปีก่อน\n\nเธอบอกว่าฝนทำให้เวลาช้าลง\nฉันเพิ่งเข้าใจวันนี้เอง\n\nไม่มีอะไรด่วน แค่อยากให้รู้ว่ายังคิดถึง'};
 DriftStudy.local.setItem('lw.v1.letters',JSON.stringify([letter]));
 DriftStudy.local.setItem('lw.v1.me',JSON.stringify({name:'กอล์ฟ',place:'กรุงเทพ',lat:13.7,lng:100.5,pid:'CINEMATICSTUDY01'}));
 DriftStudy.local.setItem('lw.v1.scheme','light');
 function press(selector,key,value){document.querySelectorAll(selector).forEach(b=>b.setAttribute('aria-pressed',b.dataset[key]===value));}
 function stop(){if(raf!==null)cancelAnimationFrame(raf);raf=null;last=null;}
 function request(){if(ready&&!document.hidden&&scene!=='compose'&&scene!=='release'&&direction!=='A'&&raf===null&&playing)raf=requestAnimationFrame(tick);}
 function fail(error){stop();playing=false;$('#error').hidden=false;$('#error').textContent='เปิดหน้าศึกษาไม่สำเร็จ · '+error.message;console.error(error);}
 function command(code){return app.contentWindow.eval(code);}
 function material(canvas){
   if(direction==='A')return;
   const w=canvas.clientWidth,h=canvas.clientHeight,g=canvas.getContext('2d');if(!w||!h)return;
   paperDraws++;
   // Deterministic, normalized coordinates: fibers stay attached to the sheet,
   // including after a resize. All marks bake once; none are made in a frame.
   let seed=812931;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
   g.save();
   const wash=g.createLinearGradient(0,0,w,h*.6);
   wash.addColorStop(0,'rgba(255,255,255,.20)');wash.addColorStop(.45,'rgba(255,255,255,0)');wash.addColorStop(1,'rgba(94,101,110,.035)');g.fillStyle=wash;g.fillRect(0,0,w,h);
   for(let i=0;i<6500;i++){
     const x=rnd()*w,y=rnd()*h,a=.025+rnd()*.065;
     g.fillStyle=i%3===0?'rgba(255,255,255,'+a+')':'rgba(99,104,112,'+(a*.4)+')';
     g.fillRect(x,y,.35+rnd()*.75,.3+rnd()*.65);
   }
   for(let i=0;i<1250;i++){
     const x=rnd()*w,y=rnd()*h,len=.8+rnd()*4.5,angle=rnd()*Math.PI;
     g.strokeStyle=i%3===0?'rgba(255,255,255,.17)':'rgba(99,104,112,.034)';g.lineWidth=.28+rnd()*.35;
     g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+Math.cos(angle)*len*.5,y+Math.sin(angle)*len*.7,x+Math.cos(angle)*len,y+Math.sin(angle)*len);g.stroke();
   }
   // Subtle compressed fibers near the edge, not printed lines over the text.
   const edge=g.createLinearGradient(0,0,w,0);edge.addColorStop(0,'rgba(97,82,56,.13)');edge.addColorStop(.013,'rgba(97,82,56,0)');edge.addColorStop(.975,'rgba(97,82,56,0)');edge.addColorStop(1,'rgba(88,74,51,.16)');g.fillStyle=edge;g.fillRect(0,0,w,h);
   const rim=g.createLinearGradient(0,0,0,h);rim.addColorStop(0,'rgba(255,255,244,.46)');rim.addColorStop(.012,'rgba(255,255,244,0)');rim.addColorStop(.984,'rgba(102,84,56,0)');rim.addColorStop(1,'rgba(102,84,56,.15)');g.fillStyle=rim;g.fillRect(0,0,w,h);
   // Tiny, irregular deckle silhouette. Bake alpha on both sides of the same
   // paper. A fresh letter has no invented aging / weather / folding scars.
   g.globalCompositeOperation='destination-in';g.fillStyle='#000';g.beginPath();
   for(let i=0;i<=80;i++){const x=w*i/80,y=.45+(.5+.5*Math.sin(i*2.31))*.9;i?g.lineTo(x,y):g.moveTo(x,y);}
   for(let i=0;i<=110;i++)g.lineTo(w-.45-(.5+.5*Math.sin(i*2.43))*.8,h*i/110);
   for(let i=80;i>=0;i--)g.lineTo(w*i/80,h-.55-(.5+.5*Math.sin(i*1.93))*.8);
   for(let i=110;i>=0;i--)g.lineTo(.4+(.5+.5*Math.sin(i*2.17))*.8,h*i/110);
   g.closePath();g.fill();g.restore();
 }
 function weather(){
   letter.lg=Array.from({length:12},()=>[.5,0,speed,210,0,0,0,speed+6,0]);
   // Changes affect the study's recorded wind only; no provider API calls.
   command('_windEpoch++;_windUntil=Date.now()+86400000;_windRequest=null;WIND_HERE='+speed+';WIND_DIR=210;WIND_GUST='+ (speed+6)+';RAIN_HERE=0;WC_HERE=0;DUST.length=RAIN.length=SNOW.length=SPLASH.length=0;PILE.fill(0);');
 }
 function build(){bridge.build(letter);textureBuilds++;}
 function fitWriting(repaint=false){
   if(!bridge||scene!=='compose')return;
   const body=app.contentDocument.querySelector('#cBody');
   if(direction==='A'){body.style.height='';body.style.flex='';return;}
   const before=body.getBoundingClientRect().height;body.style.flex='0 0 auto';body.style.height='auto';
   const min=parseFloat(app.contentWindow.getComputedStyle(body).minHeight)||0;
   const h=Math.max(min,body.scrollHeight);body.style.height=h+'px';
   if(repaint&&Math.abs(before-h)>1)bridge.paintWrite();
   if(repaint)evidence({phase:'compose'});
 }
 function captureText(){if(!bridge||!composeVisited)return;letter.bd=app.contentDocument.querySelector('#cBody').value;letter.t.n=app.contentDocument.querySelector('#cTo').value.trim();letter.f.n=app.contentDocument.querySelector('#cFrom').value.trim();}
 function original(){
   app.inert=false;app.removeAttribute('aria-hidden');app.tabIndex=0;
   $('#film').hidden=true;caption.hidden=true;seek.disabled=true;bridge.owner(false);bridge.reset();
   if(scene==='compose'){showCompose();return;}
   if(scene==='paper'){bridge.openDrift(letter);command("document.querySelector('#driftSub').textContent='กระดาษปัจจุบัน · ยังไม่ปล่อย';");play.textContent='ปล่อย';}
   else if(scene==='release'){bridge.openDrift(letter);if(direction!=='A')bridge.prepareRelease(DriftCinema.releaseTransition(0,direction).zoomFactor);play.textContent='เริ่มใหม่';}
   else {bridge.openArrive(letter,()=>{phase.textContent='อ่าน';});play.textContent='เริ่มใหม่';}
   phase.textContent=scene==='release'?'ปัดขึ้นเพื่อปล่อย':'แอปเดิม';
   evidence({phase:'reference'});
 }
 function showCompose(){
   app.inert=false;app.removeAttribute('aria-hidden');app.tabIndex=0;
   stop();playing=false;bridge.owner(false);bridge.reset();$('#film').hidden=true;caption.hidden=true;seek.disabled=true;play.disabled=false;play.textContent='ดูฉากปล่อย';phase.textContent='ลองเขียนได้';
   app.contentDocument.documentElement.classList.toggle('study-write',direction!=='A');
   app.contentDocument.documentElement.classList.remove('study-film');
   bridge.openCompose();composeVisited=true;const d=app.contentDocument;d.querySelector('#cBody').value=letter.bd;d.querySelector('#cTo').value=letter.t.n;d.querySelector('#cPlace').value=letter.t.p;d.querySelector('#cFrom').value=letter.f.n;
   // Preview action goes to the cinematic study; never a real send request.
   d.querySelector('#btnSend').onclick=()=>{captureText();scene='release';sync();};
   d.querySelector('#btnSend').textContent='ลองปล่อยในหน้าศึกษา';
   d.querySelector('#cTop [data-close]').onclick=()=>{captureText();scene='paper';sync();};
   fitWriting();bridge.paintWrite();
   evidence({phase:'compose'});
 }
 function sync(){
   if(!bridge)return;captureText();stop();playing=false;clock=0;pick=0;lastPhase='';closeup=false;frameCost=[];releaseTrace=[];releaseSamples=[];lastReleasePaint=null;
   press('[data-scene]','scene',scene);press('[data-direction]','direction',direction);
   document.body.classList.toggle('paper-study',scene==='paper');
   app.contentDocument.documentElement.classList.toggle('study-write',direction!=='A');
   app.contentDocument.documentElement.classList.remove('study-film');
   app.contentDocument.documentElement.classList.toggle('study-release',scene==='release'&&direction!=='A');
   app.contentDocument.documentElement.style.setProperty('--release-ui','0');
   app.contentDocument.documentElement.style.setProperty('--release-hint','1');
   bridge.reset();weather();bridge.motion(reduced);build();
   cv.classList.remove('pickable');cv.tabIndex=-1;cv.removeAttribute('role');
   $('#description').innerHTML=scene==='release'?'ปัดขึ้นเพื่อปล่อยแบบเดิม<br>เพิ่มระยะกล้องและจังหวะลม<br>กระดาษขาวฉบับเดิม':direction==='A'?'จังหวะและผิวกระดาษ<br>จากแอปที่ใช้ตอนนี้':direction==='B'?'กล้องตามลมเบา ๆ<br>กระดาษขาว · แสงเทียนบนผิว<br>ความเงียบก่อนแตะถึงมือ':'กล้องไหลตามแนวร่อน<br>เห็นการเบนและน้ำหนัก<br>กระดาษฉบับเดียวกันตลอดฉาก';
   if(direction==='A'||scene==='release'){original();return;}
   if(scene==='compose'){showCompose();return;}
   bridge.owner(true);app.contentDocument.documentElement.classList.add('study-film');
   app.inert=true;app.setAttribute('aria-hidden','true');app.tabIndex=-1;
   bridge.prepareWorld(letter,scene==='arrival');
   $('#film').hidden=false;caption.hidden=false;play.disabled=false;seek.disabled=scene==='paper';seek.value=0;play.textContent=scene==='paper'?'ดูเนื้อใกล้':'เล่นฉาก';
   draw();request();
 }
 const messages={material:['กระดาษฉบับเดียวกัน','เส้นใย · ขอบบาง · แสงเฉียง'],edge:['ก่อนปล่อยให้ลมพา','ขอบกระดาษเริ่มรับลม'],lift:['ลมกำลังรับไว้',''],glide:['',''],cut:['',''],world:['ระหว่างเรา ยังมีสายลม',''],approach:['มีจดหมายมาถึง',''],descend:['',''],contact:['',''],wait:['แตะเพื่อหยิบขึ้นมา','หรือกดปุ่มหยิบ / Enter'],pick:['',''],read:['ข้อความจากใครบางคน','กระดาษหยุดนิ่งให้อ่าน']};
 function renderBackground(W,H){
   const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,dark?'#353c48':'#f0ece3');g.addColorStop(.5,dark?'#2d3440':'#e9e5da');g.addColorStop(1,dark?'#272d37':'#dad5ca');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
   const l=ctx.createRadialGradient(W*.28,H*.18,0,W*.28,H*.18,W*.75);l.addColorStop(0,dark?'rgba(205,191,157,.045)':'rgba(255,254,246,.36)');l.addColorStop(1,'rgba(255,254,246,0)');ctx.fillStyle=l;ctx.fillRect(0,0,W,H);
 }
 function shadow(W,H,p,bw,bh){
   if(p.shadow<.001){lastShadow=null;return;}
   const persp=820/(820+p.z),x=W*.5+p.x*W*persp;
   const y=scene==='arrival'?H*.71+bh*.075:H*.5+bh*.43;
   const sw=bw*persp*(.55+.45*p.contact),sh=sw*(.18-.10*p.contact);
   ctx.save();ctx.translate(x,y);ctx.scale(1,sh/sw);
   const g=ctx.createRadialGradient(0,0,0,0,0,sw*.66);g.addColorStop(0,'rgba(61,55,45,'+(p.shadow*(dark?.38:.28))+')');g.addColorStop(.45,'rgba(61,55,45,'+(p.shadow*.11)+')');g.addColorStop(1,'rgba(61,55,45,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,sw*.66,0,Math.PI*2);ctx.fill();ctx.restore();
   lastShadow={x,y,width:sw,height:sh,contact:p.contact};
 }
 function draw(){
   if(!bridge||scene==='compose'||scene==='release'||direction==='A')return;
   const start=performance.now(),W=cv.clientWidth,H=cv.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
   if(!W||!H)return;
   if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);}
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
   const p=DriftCinema.sample(scene,clock,direction,speed,reduced,pick),duration=DriftCinema.duration(scene,direction);
   if(p.world<1){renderBackground(W,H);ctx.globalAlpha=1-p.world;}
   if(p.world>.001){bridge.world(clock,p.zoom);ctx.clearRect(0,0,W,H);if(p.world<1){ctx.globalAlpha=1-p.world;renderBackground(W,H);ctx.globalAlpha=1;} }
   // The globe is the actual production canvas behind this overlay. No copied
   // globe shader/material and no second running renderer hidden underneath.
   const bw=Math.min(W*.80,scene==='paper'?470:380,H*(scene==='paper'?.77:.61)/1.42)*(closeup?1.8:1),bh=bw*1.42;
   const time=clock;bridge.time(time);
   if(p.op>.001){
     ctx.globalAlpha=p.op;shadow(W,H,p,bw,bh);
     const flutter=reduced||scene==='paper'?0:p.wind;
     if(scene!=='paper'&&!reduced)bridge.streaks(ctx,p.wind*.9,{w:speed/45},Math.PI/6,true,p.z,W,H);
     const lod=820/(820+p.z)>.5?[13,16]:[8,10];
     // Read and close-up are static: no perpetual movement of ink under eyes.
     bridge.warp(ctx,W*.5,H*(closeup?.67:.5),bw,bh,time,flutter,p.ry,p.rx,p.rz,p.z,p.curl,lod[0],lod[1],p.x*W,p.y*H);
     if(scene!=='paper'&&!reduced)bridge.streaks(ctx,p.wind*.9,{w:speed/45},Math.PI/6,false,p.z,W,H);
     ctx.globalAlpha=1;
   }
   if(p.phase!==lastPhase){
     lastPhase=p.phase;const msg=messages[p.phase]||['',''];caption.replaceChildren();caption.append(document.createTextNode(msg[0]));if(msg[1]){const small=document.createElement('small');small.textContent=msg[1];caption.append(small);}
     const wait=p.phase==='wait';cv.classList.toggle('pickable',wait);cv.tabIndex=wait?0:-1;if(wait){cv.setAttribute('role','button');cv.setAttribute('aria-label','หยิบจดหมายขึ้นมาอ่าน');play.textContent='หยิบจดหมาย';}else {cv.removeAttribute('role');cv.setAttribute('aria-label','ฉากจดหมาย');}
   }
   phase.textContent={edge:'รับลม',lift:'ยกตัว',glide:'ร่อน',cut:'เปิดระยะ',world:'โลก',approach:'เข้าใกล้',descend:'ลดระดับ',contact:'แตะพื้น',wait:'รอหยิบ',pick:'หยิบ',read:'อ่าน',material:closeup?'เส้นใยใกล้':'ผิวกระดาษ'}[p.phase]||p.phase;
   if(scene!=='paper')seek.value=Math.round(duration?clock/duration*1000:0);
   frameCost.push(performance.now()-start);if(frameCost.length>600)frameCost.shift();
   if(performance.now()-lastEvidence>200||!playing){evidence(p);lastEvidence=performance.now();}
 }
 function evidence(p){
   const costs=frameCost.slice().sort((a,b)=>a-b);
   const release=bridge.releaseState(),transition=scene==='release'&&direction!=='A'&&!reduced?DriftCinema.releaseTransition(release.flight,direction):null;
   if(scene==='release'&&['fly','off'].includes(release.phase)&&lastReleasePaint){releaseSamples.push({...release,paperOpacity:lastReleasePaint.op,depth:-lastReleasePaint.tz});if(releaseSamples.length>48)releaseSamples.shift();}
   $('#evidence').textContent=JSON.stringify({direction,scene,clock,pick,speed,dark,reduced,playing,closeup,pose:p,shadow:lastShadow,paperDraws,paperCacheHits,cache:{entries:surfaceCache.size,pixels:cachePixels,limit:6000000},textureBuilds,surface:bridge.surface(),paperBase:[253,253,252],paperSample,candle:scene==='compose'&&dark,release,transition,releaseTrace,releaseSamples,storage:'study-memory',runtime:bridge.runtime(),owner:scene==='compose'||scene==='release'||direction==='A'?'app':'study',viewport:{w:cv.clientWidth,h:cv.clientHeight,dpr:Math.min(devicePixelRatio||1,2)},draw:{samples:costs.length,p95:costs[Math.floor((costs.length-1)*.95)]||0,max:costs.at(-1)||0}});
 }
 function tick(stamp){
   // Analytic poses use elapsed visible time, not integration steps. A slow
   // device must not stretch an eight-second shot into a minute. Hidden tabs
   // reset last in visibilitychange, so returning never skips the whole film.
   raf=null;const dt=last===null?0:Math.max(0,(stamp-last)/1000);last=stamp;
   if(playing){
     if(pick>0){pick=Math.min(1,pick+dt/(direction==='C'?1.1:1.6));if(pick>=1){playing=false;play.textContent='เริ่มใหม่';}}
     else {clock=Math.min(DriftCinema.duration(scene,direction),clock+dt);if(clock>=DriftCinema.duration(scene,direction)){playing=false;play.textContent=scene==='arrival'?'หยิบจดหมาย':'เริ่มใหม่';}}
   }
   draw();request();
 }
 function togglePlay(){
   if(!bridge)return;
   if(scene==='compose'){captureText();scene='release';sync();return;}
   if(scene==='release'){sync();return;}
   if(direction==='A'){
     if(scene==='arrival')bridge.openArrive(letter,()=>{phase.textContent='อ่าน';});else{bridge.openDrift(letter);bridge.launch();}return;
   }
   if(scene==='paper'){closeup=!closeup;play.textContent=closeup?'ดูทั้งแผ่น':'ดูเนื้อใกล้';draw();request();return;}
   const pose=DriftCinema.sample(scene,clock,direction,speed,reduced,pick);
   if(pose.phase==='wait'){pick=.00001;playing=true;play.textContent='กำลังหยิบ';request();return;}
   if((clock>=DriftCinema.duration(scene,direction)&&pick===0)||pick>=1){clock=0;pick=0;lastPhase='';}
   playing=!playing;play.textContent=playing?'หยุด':'เล่นต่อ';if(playing)request();else {stop();draw();}
 }
 play.onclick=togglePlay;
 cv.onclick=()=>{if(cv.classList.contains('pickable'))togglePlay();};cv.onkeydown=e=>{if(cv.classList.contains('pickable')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();togglePlay();}};
 seek.oninput=()=>{playing=false;stop();pick=0;clock=Number(seek.value)/1000*DriftCinema.duration(scene,direction);play.textContent='เล่นต่อ';draw();};
 document.querySelectorAll('[data-direction]').forEach(b=>b.onclick=()=>{captureText();direction=b.dataset.direction;sync();});
 document.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>{captureText();scene=b.dataset.scene;sync();});
 $('#wind').onchange=e=>{captureText();speed=Number(e.target.value);sync();};
 $('#theme').onclick=()=>{dark=!dark;document.body.classList.toggle('dark',dark);$('#theme').textContent=dark?'กลางคืน':'กลางวัน';$('#theme').setAttribute('aria-pressed',dark);if(bridge){bridge.scheme(dark?'dark':'light');if(scene==='compose')bridge.paintWrite();else{build();if(scene==='release'&&direction!=='A')bridge.prepareRelease(DriftCinema.releaseTransition(bridge.releaseState().flight,direction).zoomFactor);draw();}}};
 function setReduced(value){reduced=value;$('#motion').setAttribute('aria-pressed',reduced);if(bridge){bridge.motion(reduced);if(scene!=='compose'&&scene!=='release'&&direction!=='A')bridge.owner(true);playing=false;stop();draw();}}
 $('#motion').onclick=()=>setReduced(!reduced);
 matchMedia('(prefers-reduced-motion:reduce)').addEventListener('change',e=>setReduced(e.matches));
 document.addEventListener('visibilitychange',()=>{stop();request();});
 window.addEventListener('pagehide',()=>{stop();bridge?.owner(true);});
 const resize=new ResizeObserver(()=>{if(ready){if(scene==='compose')fitWriting(true);else draw();}});resize.observe($('#viewport'));
 app.addEventListener('load',async()=>{
   try{
     const win=app.contentWindow,d=app.contentDocument;
     bridge=command(`(()=>{const nativeStart=RENDER.start;return {
       owner(study){RENDER.stop();RENDER.start=study?()=>{}:nativeStart;if(!study)RENDER.start();},
       reset(){resetHero();closeSheet(false);previewOff();},build(L){dBuildTex(L);},
       openDrift,openArrive,launch:dLaunch,openCompose,paintWrite:paintWritePaper,
       releaseState:()=>({phase:dPHASE,progress:dProg,flight:dFly,drag:dDrag,need:dFeel(dSPD).need,globeOpacity:Number(stage.style.opacity),zoom:G.zoom,elapsedMs:Math.max(0,RENDER.now()-dFlyStart)}),
       prepareRelease(factor){if(!dLET)return;const opacity=stage.style.opacity;G.zoom=G.zTarget=G.fitZoom(fitKm(dLET))*factor;G.R=G.R0*G.zoom;renderGlobe(0);stage.style.opacity=opacity;},
       motion:setMotionPreference,scheme:setSchemePref,runtime:()=>RENDER.snapshot(),surface:()=>({width:dTW,height:dTH,frontWidth:dTEX?.width,backWidth:dTEX_BACK?.width}),
       warp:dWarp,streaks:dStreaks,time(time){T=time;dT=time;},
       prepareWorld(L,arrival){selected=L.id;PREVIEW={id:L.id,h:arrival?L.th:0,play:false};G.target=null;G.rotY=(arrival?99:100.5)*RAD;G.rotX=(arrival?18.8:13.7)*RAD;G.vX=G.vY=0;G.zoom=G.zTarget=1.2;G.R=G.R0*G.zoom;G._key=null;stage.style.opacity='1';sizeStage();},
       world(time,zoom){T=time;dT=time;G.zoom=G.zTarget=zoom;G.R=G.R0*zoom;renderGlobe(0);},
       warm:async L=>{await warmRainMarks(L,0);driftStreams(L,0);}
     };})()`);
     bridge.owner(true);weather();
     // White is the substrate in both schemes. Candle color is a separate CSS
     // illumination layer on the writing sheet, never baked into its texture.
     const paperSource=win.drawPaper.toString();
     const originalPaper=win.drawPaper;
     const sampleSurface=c=>{if(!c.width||!c.height)return;const g=c.getContext('2d');paperSample={width:c.width,height:c.height,rgba:[[.5,.15],[.5,.8]].map(([x,y])=>Array.from(g.getImageData(Math.floor(c.width*x),Math.floor(c.height*y),1,1).data))};};
     win.drawPaper=(c,traces)=>{
       if(direction==='A'){originalPaper(c,traces);sampleSurface(c);return;}
       const dp=Math.min(win.devicePixelRatio||1,2),w=c.clientWidth,h=c.clientHeight;
       if(!w||!h)return;
       const key=JSON.stringify([w,h,dp,dark,traces]),cached=surfaceCache.get(key);
       if(cached){
         paperCacheHits++;surfaceCache.delete(key);surfaceCache.set(key,cached);
         c.width=cached.width;c.height=cached.height;const g=c.getContext('2d');g.drawImage(cached,0,0);g.setTransform(dp,0,0,dp,0,0);sampleSurface(c);return;
       }
       originalPaper(c,traces);material(c);sampleSurface(c);
       if(c.width*c.height>6000000)return;
       const copy=d.createElement('canvas');copy.width=c.width;copy.height=c.height;copy.getContext('2d').drawImage(c,0,0);
       const pixels=copy.width*copy.height;
       if(pixels<=6000000){
         while(surfaceCache.size&&(surfaceCache.size>=3||cachePixels+pixels>6000000)){
           const oldest=surfaceCache.keys().next().value,old=surfaceCache.get(oldest);cachePixels-=old.width*old.height;surfaceCache.delete(oldest);
         }
         surfaceCache.set(key,copy);cachePixels+=pixels;
       }
     };
     // Keep A byte-for-byte renderer behavior. B/C share its exact text layout
     // at 2x pixel density; UVs and dimensions scale together in the real mesh.
     const nativeBuilder=win.dBuildTex,source=nativeBuilder.toString(),split=source.indexOf('  const F=');
     if(split<0)throw new Error('รูปแบบ renderer กระดาษเปลี่ยน ต้องตรวจตัวเชื่อมหน้าศึกษา');
     const denseSource=source.slice(0,split).replace('dTW=380','dTW=760')+
       '  const paperW=dTW/2,paperH=dTH/2;g.scale(2,2);\n'+source.slice(split).replace(/\bdTW\b/g,'paperW').replace(/\bdTH\b/g,'paperH')
       .replace('if(line&&lines.length<MAXL) lines.push(line);','if(lines.length<MAXL) lines.push(line);');
     const denseBuilder=command('('+denseSource+')');win.dBuildTex=L=>direction==='A'?nativeBuilder(L):denseBuilder(L);
     // Keep the actual gesture, wind resistance, threshold and held pose.
     // Only the departure timing, camera follow and dissolve are extended.
     const productionPaint=win.dPaint,productionTick=win.dTick;
     const nativePaint=command('('+DriftReleaseReference.paint+')'),nativeTick=command('('+DriftReleaseReference.tick+')');
     const softPaint=productionPaint;
     const quietTick=dt=>{command("dReleaseDirection='B'");productionTick(dt);};
     const flowTick=dt=>{command("dReleaseDirection='C'");productionTick(dt);};
     win.dTick=dt=>{
       (direction==='A'?nativeTick:direction==='B'?quietTick:flowTick)(dt);
       if(scene==='release'){
         const state=bridge.releaseState(),changed=releaseTrace.at(-1)?.phase!==state.phase;
         const light=direction!=='A'&&!reduced?DriftCinema.releaseTransition(state.flight,direction):null;
         if(light){d.documentElement.style.setProperty('--release-ui',light.uiOpacity.toFixed(5));d.documentElement.style.setProperty('--release-hint',light.hintOpacity.toFixed(5));}
         if(changed){releaseTrace.push(state);if(releaseTrace.length>12)releaseTrace.shift();phase.textContent={wait:'ปัดขึ้นเพื่อปล่อย',fly:'ร่อนตามลม',off:'ออกเดินทาง'}[state.phase]||state.phase;}
         if(state.phase==='fly'&&direction!=='A'&&!reduced){const label=state.flight>=.66?'กลับสู่โลก':'ร่อนตามลม';if(phase.textContent!==label)phase.textContent=label;}
         if(changed||performance.now()-lastEvidence>200){evidence({phase:'native-release'});lastEvidence=performance.now();}
       }
     };
     win.dPaint=(tx,ty,tz,rx,ry,rz,curl,mwind,op,f)=>{
       const state=bridge.releaseState();
       if(scene==='release')lastReleasePaint={tx,ty,tz,op};
       (direction==='A'?nativePaint:softPaint)(tx,ty,tz,rx,ry,rz,curl,mwind,op,f);
     };
     const localFonts=d.querySelector('style').textContent.match(/@font-face\s*\{[^}]*\}/g)||[];
     const fontStyle=document.createElement('style');fontStyle.textContent=localFonts.join('\n');document.head.append(fontStyle);
     await d.fonts.ready;
     const style=d.createElement('style');style.textContent=`
       .study-release body.drifting header.bar,.study-release body.drifting #play,.study-release body.drifting #status,.study-release body.drifting #btnWrite{opacity:var(--release-ui,0);pointer-events:none;transition:none}
       .study-release #driftHint{opacity:var(--release-hint,1);transition:none}
       .study-film .sheet,.study-film .veil,.study-film #dock,.study-film #top,.study-film .play,.study-film #toast,.study-film #drift{display:none!important}
       .study-write #compose{background:radial-gradient(ellipse at 30% 8%,rgba(252,249,235,.32),transparent 65%),var(--bg-a)}
       .study-write #cTop{padding:14px 22px;color:var(--dim)}.study-write #cStage{padding:16px 24px 22px}
       .study-write #cSheet{max-width:620px;overflow:visible;border-radius:1px;box-shadow:0 1px 2px rgba(65,54,37,.13),4px 13px 28px rgba(65,54,37,.13),0 36px 55px -38px rgba(65,54,37,.30)}
       .study-write #cPaper{border-radius:0}.study-write #cSheet .ink{padding:42px 45px 38px;min-height:66vh}
       #cSheet{--paper-ink-rgb:43,43,47;background:#fdfdfc}
       .study-write.dm #cSheet::before{background:radial-gradient(105% 92% at var(--cnd-x,50%) var(--cnd-y,-7%),rgba(255,178,73,calc(var(--cnd-a,.15)*1.35)),rgba(255,200,128,calc(var(--cnd-a,.15)*.46)) 38%,transparent 72%)}
       .study-write #cSheet #cOrigin{font-size:11px;margin-bottom:25px;color:rgba(var(--paper-ink-rgb),.60)}
       .study-write #cSheet .wfoot .lb{color:rgba(var(--paper-ink-rgb),.65)}
       .study-write #cSheet .wline input,.study-write #cSheet .wfoot input{border-bottom-color:transparent}.study-write #cSheet .wline input:focus,.study-write #cSheet .wfoot input:focus{border-bottom-color:rgba(157,125,73,.35)}
       .study-write #cSheet #cBody{font-size:17px;line-height:2.12;min-height:36vh;margin:26px 0 30px;color:rgba(var(--paper-ink-rgb),.92);caret-color:#aa8651}
       .study-write #cStage{scrollbar-width:thin;scrollbar-color:rgba(128,118,97,.22) transparent}
       .study-write #cCount{font-size:9px;opacity:.5}.study-write #cDist{font-size:10px;opacity:.6}
       .study-write #cBar{padding:8px 22px 13px;background:transparent}.study-write #btnSend{font-size:11px;background:none;box-shadow:none;border:0;color:var(--dim);padding:9px}
       @media(max-width:520px){.study-write #cStage{padding:8px 15px 18px}.study-write #cSheet .ink{padding:25px 23px 26px;min-height:66vh}.study-write #cSheet #cBody{font-size:16px;line-height:2.02;min-height:35vh;margin:22px 0 24px}.study-write #cSheet #cOrigin{margin-bottom:19px;font-size:10px}.study-write #cTop{padding:10px 15px}.study-write #cBar{padding:6px 15px 10px}}
       @media(max-height:500px) and (orientation:landscape){.study-write #cSheet .ink{padding:18px 25px;min-height:0}.study-write #cSheet #cBody{min-height:100px;margin:15px 0}.study-write #cStage{padding:8px 20px}.study-write #cTop{position:relative}.study-write #cSheet #cOrigin{margin-bottom:12px}}
       @media(prefers-reduced-motion:reduce){.study-write #cSheet{transform:none!important}}`;
     d.head.appendChild(style);
     d.querySelector('#cBody').addEventListener('input',()=>fitWriting(true));
     d.querySelectorAll('#cSheet input,#cSheet textarea').forEach(el=>el.addEventListener('focus',()=>{
       if(direction!=='A')d.querySelector('#cSheet').style.transform='none';
     }));
     // App boot's cache lookup may already be in flight, but the local Bangkok
     // fixture never invokes live weather. Future writes use the fixture above.
     await bridge.warm(letter);ready=true;$('#error').hidden=true;play.disabled=false;sync();
     $('#motion').setAttribute('aria-pressed',reduced);
   }catch(error){fail(error);}
 });
 app.src='index.html?qa=living-world-study&renderer=production';
})();
