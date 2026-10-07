'use strict';
// Compare the real refactored pipeline to its pre-refactor drawing reference.
// Synthetic records/Canvas only; never opens storage or requests a frame.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const current=html.slice(html.indexOf('function globeFramePosition('),html.indexOf('/* ---------- ท้องฟ้าในหน้าพยากรณ์ ---------- */'));
const before=fs.readFileSync('tools/fixtures/render-globe-before.js','utf8');
const nowFor=html.slice(html.indexOf('function nowFor('),html.indexOf('function previewOn('));
const motion=html.slice(html.indexOf('function globePaperMotion('),html.indexOf('function meshPoints('));
const records=Array.from({length:7},(_,i)=>({id:'letter-'+i,s:1000,f:{la:13+i,lo:100+i},t:{la:35+i,lo:139+i},
  lg:[[1,0,12,180,0,0,20]],fixture:{arrived:i===5,gone:i===6,prog:.2+i*.04,legIdx:0,parked:i<2,sev:i===0?3:1}}));
function run(source,{letters=records,selected='letter-0',preview=null,reduced=false,zoom=1,z=.6,advance=0}={}){
  const calls=[],papers=[],counts={store:0,state:0,position:{}},times=[];let clock=20000;
  const emit=(name,args)=>calls.push([name,...args.filter(a=>a!==canvas)]);
  const canvas={};for(const name of ['clearRect','save','restore'])canvas[name]=(...a)=>emit('ctx.'+name,a);
  Object.defineProperty(canvas,'globalAlpha',{set(v){calls.push(['ctx.alpha',v]);}});
  const G={R:180,zoom,rotate:v=>v,step(dt){emit('step',[dt]);},pipeV(v){return {x:150+v.x,y:220-v.y,z:v.z};},pipe(lat,lng){return {x:lat,y:lng,z:.6};},fitZoom(){return 1;}};
  for(const name of ['sphere','fog','restoreNight','hatchClouds','fogWx','fall','snowFall','iceFall','bolts','streams','poly','node','ghost','dot'])G[name]=(...a)=>emit(name,a);
  class Clock extends Date {static now(){const value=clock;clock+=advance;return value;}}
  const ctx={Date:Clock,sctx:canvas,W:400,H:500,T:12,REDUCED:reduced,G,store:{letters(){counts.store++;return letters;}},
    PREVIEW:preview?{...preview}:null,SUN_MS:null,selected,HITS:[],CFG:{MAX_ANIM:2,HOLD_PX:8},ER:6371,
    llOf:p=>({lat:p.la,lng:p.lo}),clamp:(v,a,b)=>Math.max(a,Math.min(v,b)),wfOf:()=>null,
    letterState(L,now){counts.state++;times.push(now);return {...L.fixture};},
    posVAt(L,prog){counts.position[L.id]=(counts.position[L.id]||0)+1;return {x:prog*20,y:prog*10,z};},
    previewOff(){ctx.PREVIEW=null;ctx.SUN_MS=null;calls.push(['previewOff']);},
    revealKm:()=>120,trailUpto:(L,p)=>[L.id,p],rainMarks:(L,p)=>[L.id,p,'rain'],driftStreams:(L,p)=>[L.id,p,'wind'],fitKm:()=>100,
    // Body motion is tested separately; route anchors/size/opacity/layers match.
    wcx:()=>0,seedOf:()=>123,drawFlutter:(...a)=>{papers.push({x:a[1],y:a[2],motion:a[9]});emit('paper',a.slice(0,9));}};
  for(const name of ['paintSky','stars','grain','dust','syncDecks','rain','snow','splash','bolt','globeShade'])ctx[name]=(...a)=>emit(name,a);
  const context=vm.createContext(ctx);vm.runInContext(nowFor+motion+source+'\nrenderGlobe(.016);',context);
  const hits=JSON.parse(JSON.stringify(ctx.HITS));
  for(const paper of papers){
    if(!paper.motion)continue;
    const hit=hits.find(h=>Math.abs(h.x-paper.x-paper.motion.x)<1e-8&&Math.abs(h.y-paper.y-paper.motion.y)<1e-8);
    assert(hit,'tap target follows the visible paper center');
    hit.x-=paper.motion.x;hit.y-=paper.motion.y;
  }
  return {calls:JSON.parse(JSON.stringify(calls)),hits,sun:ctx.SUN_MS,preview:ctx.PREVIEW,counts,times,context};
}
let parity=0;
for(const selected of [null,'letter-0','letter-1','letter-5','letter-6','missing'])for(const reduced of [false,true])for(const zoom of [1,1.8,3])for(const z of [.6,-.08]){
  for(const preview of [null,{id:'letter-5',h:2},{id:'missing',h:2}]){
    const options={selected,reduced,zoom,z,preview},old=run(before,options),next=run(current,options);
    assert.deepEqual(next.calls,old.calls,'layer order and Canvas operations must stay identical');
    next.hits.forEach((h,i)=>{assert.equal(h.id,old.hits[i].id);assert(Math.hypot(h.x-old.hits[i].x,h.y-old.hits[i].y)<1e-8,'route anchors retain projected positions after visual glide');});
    assert.equal(next.sun,old.sun,'replay light remains at the same point in the layer order');
    assert.deepEqual(next.preview,old.preview);
    assert.equal(next.counts.store,1,'one list read per globe frame');
    assert.equal(next.counts.state,records.length,'one journey state per record per frame');
    assert(Object.values(next.counts.position).every(n=>n===1),'each used world position is computed once');
    parity++;
  }
}
assert.deepEqual(run(current,{letters:[]}).calls,run(before,{letters:[]}).calls);
const coherent=run(current,{selected:null,advance:1});
assert(coherent.times.every(t=>t===coherent.times[0]),'all real-time records use one wall-clock snapshot');
const replay=run(current,{selected:'letter-5',preview:{id:'letter-5',h:2},advance:1});
assert.equal(replay.times[5],1000+2*3600000,'replay keeps its own journey time');
const original=run(before),optimized=run(current);
assert.equal(original.counts.position['letter-0'],2);assert.equal(optimized.counts.position['letter-0'],1);
// A later frame must recompute positions, rather than persist a stale pose.
const first=optimized.counts.position['letter-0'];vm.runInContext("GLOBE_PAPER_STATES.set('stale',{});renderGlobe(.016)",optimized.context);
assert.equal(optimized.counts.position['letter-0'],first+1);
assert.equal(vm.runInContext('GLOBE_PAPER_STATES.size',optimized.context),0,'paper state is removed when no close paper is visible');
console.log(JSON.stringify({passed:parity+5,scope:'Synthetic drawing parity, not physical FPS',checks:['exact layer/Canvas parity','replay/selection/reduced/zoom/horizon','mesh overflow and hit targets','one list/state/position per frame','coherent wall clock and independent replay','frame-local cache invalidation']},null,2));
