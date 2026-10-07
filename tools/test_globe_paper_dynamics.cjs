'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),source=html.slice(html.indexOf('function globePaperMotion('),html.indexOf('function meshPoints('));
const ctx=vm.createContext({clamp:(v,a,b)=>Math.max(a,Math.min(v,b)),CUR_STORMS:null,
  wfOf:()=>null,seedOf:()=>451});vm.runInContext(source,ctx);
const plain=v=>JSON.parse(JSON.stringify(v));
const wind={e:24,n:32,gust:65},phase=.451;
function run(hz,seconds,windAt=()=>wind){let state,motion;for(let i=0;i<=hz*seconds;i++)({state,motion}=ctx.stepGlobePaper(state,windAt(i/hz),i/hz,phase,false));return {state,motion};}
const reference=run(120,30);let rateError=0;
for(const hz of [30,60]){const value=run(hz,30);rateError=Math.max(rateError,Math.hypot(value.motion.x-reference.motion.x,value.motion.y-reference.motion.y));assert(rateError<1e-7,'30/60/120 Hz integrate identical constant-wind motion');assert(Math.abs(value.motion.roll-reference.motion.roll)<1e-7);}
// Direction is meteorological "from": west means eastward flow.
const letter={id:'sample',lg:[[1,0,40,270,0,0,0,65]]};
const east=ctx.globeLetterWind(letter,{legIdx:0,prog:.5},{x:0,y:0,z:1});assert(Math.abs(east.e-40)<1e-8);assert(Math.abs(east.n)<1e-8);assert.equal(east.source,'recorded-leg');
letter.lg[0][3]=0;const south=ctx.globeLetterWind(letter,{legIdx:0,prog:.5},{x:0,y:0,z:1});assert(Math.abs(south.n+40)<1e-8);
// Local axes follow camera rotation and foreshorten at the horizon.
const motion={x:10,y:5,roll:.4};
const front=ctx.projectGlobePaper({x:0,y:0,z:1},motion,v=>v);assert.equal(front.x,10);assert.equal(front.y,-5);
const rolled=ctx.projectGlobePaper({x:0,y:0,z:1},motion,v=>({x:-v.y,y:v.x,z:v.z}));assert.equal(rolled.x,-5);assert.equal(rolled.y,-10);
const edge=ctx.projectGlobePaper({x:1,y:0,z:0},motion,v=>v);assert(Math.abs(edge.x)<1e-8);assert.equal(edge.y,-5);assert(Math.abs(edge.roll)<1e-8);
// Use the same recorded field/storm context as the route's streamlines.
ctx.wfOf=()=>({fixture:true});ctx.fromXYZ=()=>({lat:13,lng:100});const prior={prior:true};ctx.CUR_STORMS=prior;
ctx.stormsOf=()=>({storm:true});ctx.wfAt=(field,lat,lng,progress)=>{assert(field.fixture);assert.equal(lat,13);assert.equal(lng,100);assert.equal(progress,.5);assert(ctx.CUR_STORMS.storm);return {e:-12,n:8};};
assert.equal(ctx.globeLetterWind(letter,{legIdx:0,prog:.5},{x:0,y:0,z:1}).source,'recorded-field');assert.equal(ctx.CUR_STORMS,prior);
ctx.wfAt=()=>{throw Error('fixture');};assert.throws(()=>ctx.globeLetterWind(letter,{legIdx:0,prog:.5},{x:0,y:0,z:1}));assert.equal(ctx.CUR_STORMS,prior);
// A sudden reversal must preserve velocity and gradually turn, without a snap.
let moving=run(60,8).state;
const before={e:moving.e,n:moving.n,vx:moving.vx,vy:moving.vy,x:moving.x,y:moving.y,flap:moving.flapPhase};
const reversed=ctx.stepGlobePaper(moving,{e:-24,n:-32,gust:65},8+1/60,phase,false);
assert(reversed.state.e>0&&reversed.state.n>0,'wind response has inertia');
assert(Math.hypot(reversed.motion.x-before.x,reversed.motion.y-before.y)<1,'direction change cannot teleport');
assert(reversed.state.flapPhase>before.flap&&reversed.state.flapPhase-before.flap<.08,'flutter phase continues through wind reversal');
for(let i=2;i<=240;i++)moving=ctx.stepGlobePaper(moving,{e:-24,n:-32,gust:65},8+i/60,phase,false).state;
assert(moving.e<0&&moving.n<0,'response eventually follows the changed wind');
// Reduced motion is static at any clock time, and live resumes from rest.
const still=ctx.stepGlobePaper(null,wind,0,phase,true).motion;
for(const t of [1,100,10000])assert.deepEqual(plain(ctx.stepGlobePaper(null,wind,t,phase,true).motion),plain(still));
const reduced=ctx.stepGlobePaper(moving,wind,12,phase,true);assert.equal(reduced.motion.x,0);assert.equal(reduced.motion.y,0);assert.equal(reduced.motion.roll,0);
const resume=ctx.stepGlobePaper(reduced.state,wind,13,phase,false);assert.equal(resume.motion.x,0);assert.equal(resume.motion.y,0);
// Long runtime, wind changes and camera poses remain finite and bounded.
let state,maxOffset=0,maxStep=0,maxBank=0,minCellArea=Infinity;
const meshSource=html.slice(html.indexOf('function meshPoints('),html.indexOf('const mix='));vm.runInContext(meshSource,ctx);
for(let i=0;i<=7200;i++){
  const t=i/60,angle=t*.08,w={e:Math.sin(angle)*90,n:Math.cos(angle)*90,gust:140};
  const previous=state?{x:state.x,y:state.y}:null,result=ctx.stepGlobePaper(state,w,t,phase,false);state=result.state;
  const m=result.motion;maxOffset=Math.max(maxOffset,Math.hypot(m.x,m.y));maxBank=Math.max(maxBank,Math.abs(m.roll));
  if(previous)maxStep=Math.max(maxStep,Math.hypot(m.x-previous.x,m.y-previous.y));
  const mesh=ctx.meshPoints(47.52,66,t,1,8,10,m);
  for(let r=0;r<10;r++)for(let c=0;c<8;c++){const a=mesh.pts[r][c],b=mesh.pts[r][c+1],d=mesh.pts[r+1][c];const area=(b.x-a.x)*(d.y-a.y)-(b.y-a.y)*(d.x-a.x);assert(Number.isFinite(area));minCellArea=Math.min(minCellArea,area);}
}
assert(maxOffset<40);assert(maxStep<1);assert(maxBank<=.7);assert(minCellArea>0);
const report={passed:true,rateError,maxOffset,maxStep,maxBank,minCellArea,checks:['meteorological from/to direction','recorded field and storm context','camera-aligned tangent projection','wind reversal inertia','continuous flutter phase','30/60/120 Hz parity','static reduced motion and clean resume','7201 strong-wind frames with stable cells'],scope:'Visual dynamics only; no geographic trajectory or physical-device FPS claim'};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
