'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {sample,duration,releaseFrame,releaseTransition}=require('./cinematic-motion.js');
let count=0;
for(const dir of ['B','C'])for(const scene of ['release','arrival'])for(const speed of [5,18,34]){
 const end=duration(scene,dir);let prev=null;
 for(let i=0;i<=Math.ceil(end*120);i++){
   const t=Math.min(end,i/120),p=sample(scene,t,dir,speed);
   for(const [key,val]of Object.entries(p))if(key!=='phase')assert.ok(Number.isFinite(val),key);
   for(const key of ['op','world','contact'])assert.ok(p[key]>=-1e-9&&p[key]<=1+1e-9,key);
   assert.ok(820+p.z>500,'perspective cannot cross camera plane');
   assert.ok(Math.abs(p.x)<.5&&Math.abs(p.y)<.5,'paper center remains inside camera field');
   if(prev){assert.ok(Math.abs(prev.x-p.x)<.025,'no lateral teleport');assert.ok(Math.abs(prev.y-p.y)<.025,'no vertical teleport');if(scene==='arrival'&&p.op>.05)assert.ok(p.z<=prev.z+.001,'approaching paper must not recede while fading in');}
   prev=p;
 }
 if(scene==='release'){
   const p=sample(scene,end,dir,speed);assert.equal(p.op,0);assert.equal(p.world,1);
   const visibleWorld=sample(scene,end*.79,dir,speed);assert.equal(visibleWorld.op,0,'cut follows paper disappearance');
 }else{
   const at=sample(scene,end,dir,speed);assert.equal(at.phase,'wait');assert.equal(at.contact,1);
   for(const t of [end,end+1,end+100])assert.deepEqual(sample(scene,t,dir,speed),at,'no floating idle bob after contact');
   const picked=sample(scene,end,dir,speed,false,1);assert.equal(picked.phase,'read');assert.equal(picked.shadow,0);assert.equal(picked.contact,0);assert.ok(Math.abs(picked.rx)<.05,'ink faces reader');
   const start=sample(scene,end,dir,speed,false,1e-9);for(const key of ['x','y','z','rx','ry','rz','curl'])assert.ok(Math.abs(start[key]-at[key])<1e-7,'pickup begins from settled pose');
 }
 count++;
}
// Continuous camera velocity at internal traveling keyframes, measured on both
// sides. This detects the stop/start feeling of individually eased keyframes.
for(const scene of ['release','arrival'])for(const dir of ['B','C']){
 const d=duration(scene,dir),epsilon=1e-5;
 for(const q of scene==='release'?[.32,.60]:[.44,.67]){
   const t=q*d;
   for(const k of ['x','y','z','rx','ry']){
     const a=sample(scene,t-epsilon,dir),b=sample(scene,t,dir),c=sample(scene,t+epsilon,dir);
     const left=(b[k]-a[k])/epsilon,right=(c[k]-b[k])/epsilon;
     assert.ok(Math.abs(left-right)<.05,`${scene}/${dir}/${q}/${k} velocity continuity`);
   }
 }
}
const still=sample('arrival',0,'B',34,true);for(const t of [1,5,8])assert.deepEqual(sample('arrival',t,'B',34,true),still,'reduced arrival is still');
const departureCases=[];
for(const direction of ['B','C'])for(const hz of [30,60,120]){
 const ms=releaseTransition(0,direction).duration,seconds=ms/1000;let previous=null,previousDepth=0,previousY=-80;
 for(let i=0;i<=Math.ceil(seconds*hz);i++){
   const q=Math.min(1,i/hz/seconds),s=releaseTransition(q,direction),rise=1-Math.pow(1-s.travel,1.5);
   const pose={tx:100*rise,ty:-80-360*rise,tz:-90-5200*Math.pow(rise,1.8),rx:-6-rise*52,ry:rise*205,rz:rise*26,curl:.18+rise,op:s.paperOpacity,mwind:.22};
   const framed=releaseFrame(q,800,pose,direction);
   assert.ok(-framed.tz>=previousDepth-1e-9,'extended retreat remains monotone');previousDepth=-framed.tz;
   assert.ok(framed.ty<=previousY+1e-9,'camera follows lift without reversing it');previousY=framed.ty;
   for(const k of ['travel','paperOpacity','worldProgress','worldOpacity','hintOpacity','uiOpacity'])assert.ok(s[k]>=0&&s[k]<=1,k+' is bounded');
   if(previous){assert.ok(s.worldOpacity>=previous.worldOpacity);assert.ok(s.paperOpacity<=previous.paperOpacity);assert.ok(s.zoomFactor<=previous.zoomFactor);assert.ok(Math.abs(s.worldOpacity-previous.worldOpacity)<.05,'no frame opacity jump');}
   if(s.paperOpacity===0)assert.ok(s.worldOpacity>.25,'globe already visible when paper has gone');
   previous=s;
 }
 const end=releaseTransition(1,direction);assert.equal(end.paperOpacity,0);assert.equal(end.worldOpacity,1);assert.equal(end.zoomFactor,1);assert.equal(end.uiOpacity,1);assert.equal(end.hintOpacity,0);
 const epsilon=1e-5;
 for(const [key,joins]of [['travel',[0,.72]],['paperOpacity',[.55,.72]],['worldOpacity',[.50,.99]],['zoomFactor',[.50,.99]],['uiOpacity',[.85,1]]])for(const q of joins){
   const a=releaseTransition(q-epsilon,direction)[key],b=releaseTransition(q,direction)[key],c=releaseTransition(q+epsilon,direction)[key];
   assert.ok(Math.abs((c-b)/epsilon-(b-a)/epsilon)<.005,'zero velocity at dissolve / endpoint joins');
 }
 departureCases.push({direction,hz,durationMs:ms});
}
fs.writeFileSync(path.join(__dirname,'..','CINEMATIC_RELEASE_TRANSITION_TESTS.json'),JSON.stringify({date:new Date().toISOString(),cases:departureCases,checks:['monotone camera retreat at 30/60/120 Hz','bounded continuous fade and zoom','world visible before paper fully disappears','zero velocity at transition joins','exact final opacity and camera zoom'],passed:true},null,2)+'\n');
for(const direction of ['B','C']){
 const pose={tx:0,ty:-80,tz:-90,rx:-6,ry:0,rz:2.5,curl:.18,mwind:.22,op:1};
 assert.deepEqual(releaseFrame(0,800,pose,direction),pose,'camera starts at the actual handoff pose');
 assert.deepEqual(releaseFrame(.7,800,pose,direction),pose,'camera is back at the native cut pose');
 let lastDepth=0;
 for(let i=0;i<=600;i++){
   const q=i/600,rise=1-Math.pow(1-Math.min(1,q/.7),1.5),native={...pose,tz:-90-Math.pow(rise,1.8)*5200,ty:-80-rise*360,tx:rise*100};
   const frame=releaseFrame(q,800,native,direction),depth=-frame.tz;
   assert.ok(depth>=lastDepth-1e-9,'camera follow does not make released paper approach the hand');lastDepth=depth;
   for(const key of ['rx','ry','rz','curl','mwind','op'])assert.equal(frame[key],native[key],'native wind and paper physics retained');
 }
}
assert.equal(sample('release',1,'B',18,true).op,0);
assert.notEqual(sample('release',2,'B',5).wind,sample('release',2,'B',34).wind,'recorded wind changes flex');
assert.notEqual(sample('release',duration('release','B')*.5,'B').x,sample('release',duration('release','C')*.5,'C').x,'camera studies differ');
const report={date:new Date().toISOString(),cases:count,checks:['finite bounded poses at 120 Hz','release cut after paper disappears','rested arrival has no hover','pickup continuity and readable front','continuous velocity through shots','reduced motion stays still','wind response and camera variants'],passed:true};
fs.writeFileSync(path.join(__dirname,'..','CINEMATIC_MOTION_TESTS.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
