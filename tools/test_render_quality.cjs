'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const source=html.slice(html.indexOf('const QUALITY_LEVELS='),html.indexOf('const K_QUALITY='));
const ctx=vm.createContext({});vm.runInContext(source,ctx);
function feed(q,seconds,cost=()=>18,hz=60,scene='globe',start=0){for(let i=0;i<hz*seconds;i++){const t=start+i*1000/hz;q.observe({costMs:cost(t),gapMs:1000/hz,nowMs:t,scene});}return start+seconds*1000;}
const auto=ctx.createRenderQuality('auto');let time=feed(auto,6);assert.equal(auto.snapshot().level,'balanced');
time=feed(auto,10,()=>18,60,'globe',time);assert.equal(auto.snapshot().level,'low');
const transitions=auto.snapshot().changes.length;
time=feed(auto,10,()=>2,60,'globe',time);assert.equal(auto.snapshot().level,'low','recovery needs sustained headroom');
time=feed(auto,40,()=>2,60,'globe',time);assert.equal(auto.snapshot().level,'high');assert.equal(auto.snapshot().changes.length,transitions+2);
for(const mode of ['high','low']){const q=ctx.createRenderQuality(mode);feed(q,60,()=>mode==='high'?30:1);assert.equal(q.snapshot().level,mode,'manual modes cannot auto-switch');}
const burst=ctx.createRenderQuality();feed(burst,20,t=>t<500?35:3);assert.equal(burst.snapshot().level,'high','load warmup/spike cannot lower quality');
const refresh=ctx.createRenderQuality();feed(refresh,30,()=>3,30);assert.equal(refresh.snapshot().level,'high','30 Hz cadence is not expensive rendering');
const hero=ctx.createRenderQuality();time=feed(hero,10,()=>40,60,'hero');feed(hero,20,()=>4,60,'globe',time);assert.equal(hero.snapshot().level,'high','hero cost cannot degrade globe effects');
const interrupted=ctx.createRenderQuality();time=feed(interrupted,3,()=>20);interrupted.observe({costMs:2,gapMs:60000,nowMs:time+60000,scene:'globe'});feed(interrupted,2,()=>3,60,'globe',time+60000);assert.equal(interrupted.snapshot().level,'high');
const bounded=ctx.createRenderQuality();for(let i=0;i<4000;i++)bounded.observe({costMs:1,gapMs:16,nowMs:i*16,scene:'unrecognized-'+i});
assert.equal(Object.keys(bounded.snapshot().scenes).length,1);assert.equal(bounded.snapshot().scenes.sheet.sampleCount,180);
bounded.resetMetrics();assert.deepEqual(Object.keys(bounded.snapshot().scenes),[]);
const histogram=ctx.createRenderQuality('high');feed(histogram,1,()=>30);feed(histogram,4,()=>1);
assert.equal(histogram.snapshot().scenes.globe.p95CostMs,30,'whole-window p95 retains early expensive frames outside the recent ring');
assert.equal(histogram.snapshot().scenes.globe.recentP95CostMs,1);
// Exercise actual draw loops, not just policy constants. Positions continue
// advancing while a stable prefix is hidden; weather pools are bounded.
const fx=vm.createContext({LS:{get:()=>null},document:{documentElement:{classList:{contains:()=>true}}},
  clamp:(v,a,b)=>Math.max(a,Math.min(v,b)),W:390,H:844,RAIN_HERE:0,WIND_HERE:18,WIND_DIR:210,WIND_GUST:25,RAD:Math.PI/180,
  SKIN:{dust:'1,2,3',rainBg:'1,2,3',snowBg:'1,2,3'},REDUCED:true,
  G:{CX:195,CY:400,R:120,pipeV:()=>({x:50,y:40,z:0})},sunVec:()=>({}),snowNow:()=>false,deckAt:()=>null});
vm.runInContext(html.slice(html.indexOf('const QUALITY_LEVELS='),html.indexOf('/* One continuous frame owner;')),fx);
vm.runInContext(html.slice(html.indexOf('const STAR_COOL='),html.indexOf('/* ---------- ฝุ่นที่ลอยตามลมจริง')),fx);
vm.runInContext(html.slice(html.indexOf('const DUST=[]'),html.indexOf('/* ---------- ฝนที่ตกอยู่จริง')),fx);
vm.runInContext(html.slice(html.indexOf('const RAIN=[]'),html.indexOf('let GRAIN=',html.indexOf('const RAIN=[]'))),fx);
vm.runInContext('var SPLASH=[];',fx);
let arcs=0,strokes=0;const canvas={beginPath(){},closePath(){},arc(){arcs++;},fill(){},moveTo(){},lineTo(){},stroke(){strokes++;}};
vm.runInContext("QUALITY.setMode('high')",fx);fx.dust(canvas,1/60);assert.equal(arcs,26);
vm.runInContext("QUALITY.setMode('low')",fx);arcs=0;fx.dust(canvas,1/60);assert.equal(arcs,7);assert.equal(vm.runInContext('DUST.length',fx),26,'density changes do not recreate dust positions');
fx.RAIN_HERE=3;fx.rain(canvas,1/60);assert.equal(vm.runInContext('RAIN.length',fx),26);
vm.runInContext("QUALITY.setMode('high')",fx);fx.rain(canvas,1/60);assert.equal(vm.runInContext('RAIN.length',fx),40);
assert.equal(vm.runInContext("qualityCount(75,'distant')",fx),75);
vm.runInContext("QUALITY.setMode('low')",fx);assert.equal(vm.runInContext("qualityCount(75,'distant')",fx),30);
vm.runInContext(html.slice(html.indexOf('const SNOW=[]'),html.indexOf('/* ---------- ฟ้าคะนองตรงที่คุณอยู่')),fx);
fx.snowNow=()=>true;vm.runInContext("QUALITY.setMode('high')",fx);fx.snow(canvas,1/60);assert.equal(vm.runInContext('SNOW.length',fx),42);
vm.runInContext("QUALITY.setMode('low')",fx);fx.snow(canvas,1/60);assert.equal(vm.runInContext('SNOW.length',fx),27);assert(vm.runInContext('Math.max(...PILE)<=PILE_CAP',fx));
fx.snowNow=()=>false;fx.RAIN_HERE=0;
vm.runInContext('for(const p of STARS)Object.assign(p,{x:.1,y:.1,b:.5,r:1,h:.3,ph:0,ph2:0,sp:1,sp2:.1});',fx);
vm.runInContext("QUALITY.setMode('high')",fx);arcs=0;fx.stars(canvas,0);assert.equal(arcs,55);
vm.runInContext("QUALITY.setMode('low')",fx);arcs=0;fx.stars(canvas,0);assert.equal(arcs,22);
// Runtime reports full callback draw cost and uncapped intervals without
// changing the visual delta cap or owning another frame.
const runtimeSource=html.slice(html.indexOf('function createRenderRuntime('),html.indexOf('/* ---------- ชุดสภาพอากาศ'));
let next,clock=0;const samples=[];const runtimeContext=vm.createContext({deps:{request:cb=>(next=cb,1),cancel:()=>{},hidden:()=>false,clock:()=>clock,draw:()=>{clock+=7;},observe:s=>samples.push(s)}});
vm.runInContext(runtimeSource+'\nvar runtime=createRenderRuntime(deps);',runtimeContext);runtimeContext.runtime.start();next(0);next(5000);
assert.equal(samples[0].costMs,7);assert.equal(samples[1].gapMs,5000);assert.equal(runtimeContext.runtime.now(),50);
const report={passed:true,checks:['persistent overload steps down secondary effects','20-second recovery and cooldown','manual high/low stay fixed','load spike and 30Hz display stay high','hero and hidden gaps do not drive adaptation','bounded metrics and reset','actual dust/star/rain/snow caps and stable dust identities','whole-window histogram retains early spikes','full callback timing with unchanged visual delta'],lowCaps:{dust:7,rain:26,studyStars:30},scope:'Synthetic renderer/quality properties; actual browser timings are separate'};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
