'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const source=html.slice(html.indexOf('function globePaperMotion('),html.indexOf('const mix='));
const weather=html.slice(html.indexOf('function wcx('),html.indexOf('const WCX_WORD'));
const ctx=vm.createContext({clamp:(v,a,b)=>Math.max(a,Math.min(v,b))});vm.runInContext(weather+source,ctx);
const plain=v=>JSON.parse(JSON.stringify(v));
const L={id:'condition',ct:0,lg:[[1,1,18,210,10,2,1,25,0],[1,0,18,210,100,2,3,25,0]]};
let a=ctx.globePaperCondition(L,{elapsed:0,legIdx:0});assert.equal(a.condition.wet,0);assert.equal(a.condition.crease,0);
const cache=a.cache;
a=ctx.globePaperCondition(L,{elapsed:.5,legIdx:0},cache);assert.equal(a.cache,cache);assert.equal(a.condition.wet,.125);assert.equal(a.condition.crease,.0875);
a=ctx.globePaperCondition(L,{elapsed:1.5,legIdx:0},cache);assert.equal(a.condition.wet,.375,'rain exposure continues during a hold');
a=ctx.globePaperCondition(L,{elapsed:2.25,legIdx:1},cache);assert.equal(a.condition.wet,1);assert.equal(a.condition.crease,.5);
const rewind=ctx.globePaperCondition(L,{elapsed:.5,legIdx:1},cache);assert.equal(rewind.condition.wet,.125,'rewind never includes future storms');
for(const wc of [71,77,56,66,45,48]){const s={ct:0,lg:[[2,0,18,0,100,2,0,25,wc]]};assert.equal(ctx.globePaperCondition(s,{elapsed:2}).condition.wet,0,'solid precipitation/fog is not liquid rain');}
L.ct=1;a=ctx.globePaperCondition(L,{elapsed:3},cache);assert.equal(a.condition.wet,0);assert(a.condition.crease>0,'water coating does not erase folds');
L.ct=2;a=ctx.globePaperCondition(L,{elapsed:3},cache);assert.equal(a.condition.wet,0);assert.equal(a.condition.crease,0);
const replaced={...L,ct:0,lg:L.lg.map(l=>l.slice())};replaced.lg[0][4]=0;
assert.notEqual(ctx.globePaperCondition(replaced,{elapsed:.5},cache).cache,cache,'updated route replaces exposure prefix');
assert.equal(ctx.globePaperCondition(replaced,{elapsed:.5},cache).condition.wet,0);
ctx.wfOf=()=>null;ctx.seedOf=()=>451;ctx.G={rotate:v=>v};
ctx.globePaperForLetter({...L,ct:0},{elapsed:3,legIdx:1},{x:0,y:0,z:1},0,false);
const replay=ctx.globePaperForLetter({...L,ct:0},{elapsed:0,legIdx:0},{x:0,y:0,z:1},1,false);
assert.equal(replay.condition.wet,0,'replay cannot retain future wetness from live material filtering');
assert.equal(replay.condition.crease,0);
const wind={e:24,n:32,gust:65},phase=.451;
const materials=[{wet:0,crease:0,age:0},{wet:1,crease:0,age:.1},{wet:0,crease:1,age:.1},{wet:1,crease:1,age:1}];
function run(hz,seconds,condition){let state,motion;for(let i=0;i<=hz*seconds;i++)({state,motion}=ctx.stepGlobePaper(state,wind,i/hz,phase,false,condition));return {state,motion};}
let rateError=0,minCellArea=Infinity,maxStep=0,maxOffset=0;
for(const material of materials){
  const reference=run(120,20,material);
  for(const hz of [30,60]){const r=run(hz,20,material);rateError=Math.max(rateError,Math.hypot(r.motion.x-reference.motion.x,r.motion.y-reference.motion.y));assert(rateError<1e-7);}
  const still=plain(ctx.stepGlobePaper(null,wind,0,phase,true,material).motion);
  assert.deepEqual(plain(ctx.stepGlobePaper(null,wind,10000,phase,true,material).motion),still);
  let state;
  for(let i=0;i<=3600;i++){
    const t=i/60,angle=t*.08,w={e:Math.sin(angle)*90,n:Math.cos(angle)*90,gust:140};
    const before=state?{x:state.x,y:state.y}:null,result=ctx.stepGlobePaper(state,w,t,phase,false,material);state=result.state;
    const m=result.motion;maxOffset=Math.max(maxOffset,Math.hypot(m.x,m.y));if(before)maxStep=Math.max(maxStep,Math.hypot(m.x-before.x,m.y-before.y));
    const mesh=ctx.meshPoints(47.52,66,t,1,8,10,m);
    for(let r=0;r<10;r++)for(let c=0;c<8;c++){
      const p=[mesh.pts[r][c],mesh.pts[r][c+1],mesh.pts[r+1][c+1],mesh.pts[r+1][c]];
      for(let j=0;j<4;j++){const a=p[j],b=p[(j+1)%4],d=p[(j+3)%4],area=(b.x-a.x)*(d.y-a.y)-(b.y-a.y)*(d.x-a.x);assert(Number.isFinite(area));minCellArea=Math.min(minCellArea,area);}
    }
  }
}
assert(minCellArea>0);assert(maxStep<1);assert(maxOffset<40);
const dry=run(60,10,materials[0]),wet=run(60,10,materials[1]),creased=run(60,10,materials[2]);
const wetToDryFlutterRate=wet.state.flapPhase/dry.state.flapPhase;
assert(wet.state.flapPhase<dry.state.flapPhase*.8,'wet sheet flutters more slowly');assert(creased.state.flapPhase<dry.state.flapPhase);
const before=plain(dry.state),transition=ctx.stepGlobePaper(dry.state,wind,10+1/60,phase,false,materials[3]);
assert(transition.motion.condition.wet>0&&transition.motion.condition.wet<.02,'material edits ease into the live response');
assert(Math.hypot(transition.motion.x-before.x,transition.motion.y-before.y)<1);assert(transition.state.flapPhase>before.flapPhase);
const report={passed:true,materialCases:4,frames:14404,rateError,minCellArea,maxStep,maxOffset,wetToDryFlutterRate,checks:['partial past-only rain and hold exposure','rewind and route replacement','snow/ice/fog exclusion','both coating levels','cached prefix reuse','30/60/120 Hz material parity','smooth material transitions','static reduced motion per material','all four mesh corner orientations'],scope:'Estimated visual material response; no water mass, drying forecast or device FPS measurement'};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
