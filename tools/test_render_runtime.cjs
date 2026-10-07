'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function between(start,end){const a=html.indexOf(start),b=html.indexOf(end,a+start.length);assert(a>=0&&b>a);return html.slice(a,b);}
function fn(name){const start=html.indexOf('function '+name+'(');assert(start>=0);const end=html.indexOf('\n}',start)+2;return html.slice(start,end);}
const results=[];
function test(name,run){run();results.push(name);}
function setup(draw=()=>{}){
  let hidden=false,next=0;const queue=new Map(),observed=[];
  const context=vm.createContext({deps:{request:cb=>{queue.set(++next,cb);return next;},cancel:id=>queue.delete(id),hidden:()=>hidden,
    draw:(now,dt)=>{observed.push({now,dt});draw(now,dt);}}});
  vm.runInContext(between('function createRenderRuntime(', '/* ---------- ชุดสภาพอากาศ')+'\nvar runtime=createRenderRuntime(deps);',context);
  return {runtime:context.runtime,queue,observed,hide(v){hidden=v;},tick(stamp){assert.equal(queue.size,1);const [id,cb]=queue.entries().next().value;queue.delete(id);cb(stamp);}};
}
test('start is idempotent and maintains exactly one continuous RAF',()=>{
  const s=setup();s.runtime.start();s.runtime.start();assert.equal(s.queue.size,1);
  for(let i=0;i<120;i++){s.tick(i*1000/60);s.runtime.start();assert.equal(s.queue.size,1);}
  s.runtime.stop();assert.equal(s.queue.size,0);assert.equal(s.runtime.snapshot().scheduled,false);
});
test('hidden cancels RAF; visual clock survives resume without accumulating hidden time',()=>{
  const s=setup();s.runtime.start();s.tick(0);s.tick(20);const before=s.runtime.now();
  s.hide(true);s.runtime.syncVisibility();assert.equal(s.queue.size,0);assert.equal(s.runtime.now(),before);
  s.hide(false);s.runtime.syncVisibility();s.tick(60000);assert.equal(s.runtime.now(),before);
  s.tick(60020);assert.equal(s.runtime.now(),before+20);
});
test('initially hidden page schedules no animation until shown',()=>{
  const s=setup();s.hide(true);s.runtime.start();assert.equal(s.queue.size,0);
  s.hide(false);s.runtime.syncVisibility();s.tick(5000);assert.equal(s.observed[0].dt,0);
});
test('visual delta is capped and does not become negative',()=>{
  const s=setup();s.runtime.start();s.tick(100);s.tick(9000);assert.equal(s.observed.at(-1).dt,.05);
  s.tick(8000);assert.equal(s.observed.at(-1).dt,0);
});
test('30/60/120 Hz advance the same visual time',()=>{
  const times=[30,60,120].map(hz=>{const s=setup();s.runtime.start();for(let i=0;i<=hz*10;i++)s.tick(i*1000/hz);return s.runtime.now();});
  for(const time of times)assert(Math.abs(time-10000)<1e-7);
});
test('stop from within a frame prevents a new callback',()=>{
  let s;s=setup(()=>s.runtime.stop());s.runtime.start();s.tick(0);assert.equal(s.queue.size,0);
});
test('scene dispatch draws one owner and no duplicate globe under a hero',()=>{
  const calls=[];const ctx=vm.createContext({T:0,REDUCED:false,PREVIEW:null,sheetOpen:null,dPHASE:'off',aPHASE:'off',xPHASE:'off',
    renderGlobe:()=>calls.push('globe'),renderSky:()=>calls.push('sky'),writeLoop:()=>calls.push('write'),candleStep:()=>calls.push('candle'),
    dTick:()=>{calls.push('release');ctx.renderGlobe();},aTick:()=>calls.push('arrival'),xTick:()=>calls.push('lost')});
  vm.runInContext(between('function frame(now,dt){','const RENDER='),ctx);
  const step=()=>{calls.length=0;vm.runInContext('frame(100,.016)',ctx);return [...calls];};
  assert.deepEqual(step(),['globe']);ctx.sheetOpen='compose';assert.deepEqual(step(),['write','candle']);
  ctx.sheetOpen='read';assert.deepEqual(step(),['candle']);ctx.sheetOpen='forecast';assert.deepEqual(step(),['sky']);
  ctx.sheetOpen=null;ctx.dPHASE='fly';assert.deepEqual(step(),['release','globe']);
  ctx.dPHASE='off';ctx.aPHASE='fall';assert.deepEqual(step(),['arrival']);ctx.aPHASE='off';ctx.xPHASE='tumble';assert.deepEqual(step(),['lost']);
  ctx.xPHASE='off';ctx.sheetOpen='menu';assert.deepEqual(step(),[]);
});
test('camera inertia and smoothing have matching rates at 30/60/120 Hz',()=>{
  function camera(hz,target=false){
    const context=vm.createContext({REDUCED:false,CFG:{},clamp:(v,a,b)=>Math.min(b,Math.max(a,v))});
    vm.runInContext('var camera={zoom:1,zTarget:2,R0:200,R:200,rotY:0,rotX:0,vY:'+(target?'0':'.01')+',vX:0,drag:false,target:'+(target?'{y:1,x:.5}':'null')+','
      +between('  step(dt=1/60){','  /* ---------- แสง')+'};',context);
    for(let i=0;i<hz;i++)vm.runInContext(`camera.step(${1/hz})`,context);
    return {y:context.camera.rotY,x:context.camera.rotX,z:context.camera.zoom};
  }
  for(const targeted of [false,true]){
    const base=camera(60,targeted);
    for(const hz of [30,120]){const r=camera(hz,targeted);assert(Math.abs(base.y-r.y)<.004);assert(Math.abs(base.x-r.x)<.004);assert(Math.abs(base.z-r.z)<.0002);}
  }
});
test('paper motion uses elapsed delta and stays still while writing or reduced',()=>{
  const box={style:{}};const ctx=vm.createContext({$:()=>box,WIND_HERE:20,penDown:false,REDUCED:false,wTick:0,clamp:(v,a,b)=>Math.min(b,Math.max(a,v))});
  vm.runInContext(fn('breatheWrite'),ctx);
  for(let i=0;i<30;i++)vm.runInContext('breatheWrite(1/30)',ctx);assert(Math.abs(ctx.wTick-1)<1e-8);
  ctx.penDown=true;vm.runInContext('breatheWrite(.05)',ctx);assert.equal(box.style.transform,'none');assert(Math.abs(ctx.wTick-1)<1e-8);
  ctx.penDown=false;ctx.REDUCED=true;vm.runInContext('breatheWrite(.05)',ctx);assert.equal(box.style.transform,'none');
});
test('candle follows known wind at the same rate and stays neutral for reduced/unknown wind',()=>{
  function candle(hz){
    let light;const ctx=vm.createContext({DARK_MODE:true,schemeNow:1,sheetOpen:'compose',REDUCED:false,WIND_HERE:20,cndTick:0,
      clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),candleSet:(...values)=>{light=values;}});
    vm.runInContext(fn('candleStep'),ctx);
    for(let i=0;i<hz;i++)vm.runInContext(`candleStep(${1/hz})`,ctx);
    assert(Math.abs(ctx.cndTick-1)<1e-8);assert.notDeepEqual(light,[50,-7,.15]);
    const moving=light;ctx.REDUCED=true;vm.runInContext('candleStep(.05)',ctx);assert.deepEqual(light,[50,-7,.15]);
    ctx.REDUCED=false;ctx.WIND_HERE=null;vm.runInContext('candleStep(.05)',ctx);assert.deepEqual(light,[50,-7,.15]);
    ctx.sheetOpen='menu';vm.runInContext('candleStep(.05)',ctx);assert(Math.abs(ctx.cndTick-1)<1e-8);
    return moving;
  }
  const base=candle(60);for(const hz of [30,120]) candle(hz).forEach((v,i)=>assert(Math.abs(v-base[i])<1e-8));
});

test('keyboard release hold integrates elapsed time and clears when input is released',()=>{
  function hold(hz){
    const ctx=vm.createContext({REDUCED:true,innerHeight:1000,dHold:true,dDrag:true,dPHASE:'wait',dSPD:12,dY:0,dProg:0,dRAF:null,dT:0,
      G:{drag:true,vX:2,vY:2},PTR:new Map([[1,{}]]),RENDER:{now:()=>0},dFeel:()=>({assist:.5,need:1000}),dLaunch(){throw Error('too early');},paintHeroStill(){}});
    vm.runInContext(fn('dTick')+fn('releaseHeldInput'),ctx);
    for(let i=0;i<hz;i++)vm.runInContext(`dTick(${1/hz})`,ctx);
    const progress=ctx.dProg;vm.runInContext('releaseHeldInput()',ctx);
    assert.equal(ctx.dHold,false);assert.equal(ctx.dDrag,false);assert.equal(ctx.G.drag,false);assert.equal(ctx.G.vX,0);assert.equal(ctx.dY,0);assert.equal(ctx.PTR.size,0);
    return progress;
  }
  for(const hz of [30,60,120]) assert(Math.abs(hold(hz)-.5625)<1e-8);
});

test('reduced arrival requires pickup; reduced release and loss complete once without 3D drawing',()=>{
  let time=0,picks=0,releases=0,losses=0;const word={textContent:''};
  const ctx=vm.createContext({REDUCED:true,RENDER:{now:()=>time},dHold:false,dPHASE:'fly',dRAF:null,dT:0,dFlyStart:0,
    aPHASE:'fall',aRAF:null,aT0:0,xPHASE:'tumble',xRAF:null,xT0:0,$:()=>word,
    dLET:null,renderGlobe(){},paintHeroStill(){},dCloseDrift:()=>{ctx.dPHASE='off';releases++;},aFinish:()=>{ctx.aPHASE='off';picks++;},xFinish:()=>{ctx.xPHASE='off';losses++;}});
  vm.runInContext(fn('settleReleaseWorld')+fn('dTick')+fn('aTick')+fn('xTick'),ctx);
  vm.runInContext('aTick(.016)',ctx);assert.equal(ctx.aPHASE,'wait');assert.equal(picks,0);assert.equal(word.textContent,'แตะเพื่อหยิบขึ้นมา');
  time=300;vm.runInContext('aTick(.016);dTick(.016);xTick(.016)',ctx);assert.equal(picks,0);assert.equal(releases,1);assert.equal(losses,1);
  ctx.aPHASE='pick';ctx.aT0=time;time+=200;vm.runInContext('aTick(.016);aTick(.016);dTick(.016);xTick(.016)',ctx);
  assert.equal(picks,1);assert.equal(releases,1);assert.equal(losses,1);assert.equal(ctx.dT,0);
});
test('hero replacement cancels previous callback and held input',()=>{
  const style={opacity:'0'},classes={remove(){}};let previews=0;
  const ctx=vm.createContext({dPHASE:'wait',aPHASE:'off',xPHASE:'off',dRAF:null,aRAF:null,xRAF:null,
    releaseSession:null,
    dDone(){throw Error('stale callback');},aDone:null,xDone:null,dHold:true,dDrag:true,
    $:()=>({classList:classes}),document:{body:{classList:classes},documentElement:{style:{removeProperty(){}}}},stage:{style},previewOff:()=>previews++});
  vm.runInContext(fn('resetReleaseLight')+fn('heroActive')+fn('resetHero')+'resetHero();',ctx);
  assert.equal(ctx.dPHASE,'off');assert.equal(ctx.dDone,null);assert.equal(ctx.dHold,false);assert.equal(style.opacity,'1');assert.equal(previews,1);
});
test('no hero/paper/candle callback owns a continuous RAF or wall-clock scene timer',()=>{
  for(const name of ['dTick','aTick','xTick','writeLoop','candleStep','aPaint','xPaint']){
    const source=fn(name);assert(!/requestAnimationFrame|performance\.now/.test(source),name);
  }
  assert(!/dHold=setInterval/.test(html));
});
test('journey arrival still uses wall clock while visual clock is paused',()=>{
  const {sandbox}=require('./audit_phase0.cjs');const before=sandbox.Date.now;
  try{
    sandbox.start=before();vm.runInContext('var journey={id:"clock",s:start,th:1/3600,lg:[[1/3600,0,12,180,0,0,0]],lo:-1};',sandbox);
    assert.equal(vm.runInContext('letterState(journey,Date.now()).arrived',sandbox),false);
    const visual=setup();visual.runtime.start();visual.tick(0);visual.hide(true);visual.runtime.syncVisibility();
    sandbox.Date.now=()=>sandbox.start+2000;
    assert.equal(vm.runInContext('letterState(journey,Date.now()).arrived',sandbox),true);assert.equal(visual.runtime.now(),0);
  }finally{sandbox.Date.now=before;}
});
const report={date:'2026-10-05',scope:'Synthetic render clock and scene fixtures; not physical-device FPS measurements',passed:results.length,tests:results};
fs.writeFileSync(path.join(root,'PHASE1_RENDER_TEST_RESULTS.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
