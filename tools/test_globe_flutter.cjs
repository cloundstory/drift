'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const source=html.slice(html.indexOf('function globePaperMotion('),html.indexOf('/* ร่องรอยฝน —'));
function load(source){const ctx=vm.createContext({clamp:(v,a,b)=>Math.max(a,Math.min(v,b))});vm.runInContext(source,ctx);return ctx;}
const current=load(source),before=load(fs.readFileSync('tools/fixtures/flutter-before.js','utf8'));
const plain=v=>JSON.parse(JSON.stringify(v));
function recorder(){const calls=[],ctx={};for(const k of ['save','restore','translate','rotate','beginPath','moveTo','lineTo','closePath','fill','stroke'])ctx[k]=(...a)=>calls.push([k,...a]);for(const k of ['fillStyle','strokeStyle','lineWidth'])Object.defineProperty(ctx,k,{set(v){calls.push([k,v]);}});return {ctx,calls};}
for(const t of [0,1.1,12.7])for(const wind of [0,.2,.8]){
  assert.deepEqual(plain(current.meshPoints(42,58,t,wind,12,15)),plain(before.meshPoints(42,58,t,wind,12,15)));
  const a=recorder(),b=recorder();current.drawFlutter(a.ctx,100,120,42,58,t,wind,0,null);before.drawFlutter(b.ctx,100,120,42,58,t,wind,0,null);assert.deepEqual(a.calls,b.calls,'forecast/default rendering stays unchanged');
}
let lowEnergy=0,highEnergy=0,minArea=Infinity,maxOffset=0;
for(let i=0;i<180;i++){
  const t=i/30;
  for(const [speed,gust] of [[0,0],[8,12],[18,25],[40,65],[90,140],[NaN,undefined]]){
    const motion=current.globePaperMotion(speed,gust,t,1.23,false),mesh=current.meshPoints(47.52,66,t,.2,8,10,motion);
    assert(motion.drive>=0&&motion.drive<=1);maxOffset=Math.max(maxOffset,Math.hypot(motion.x,motion.y));
    for(const row of mesh.pts)for(const p of row)assert(Number.isFinite(p.x+p.y+p.z),'wind extremes cannot break mesh');
    for(let r=0;r<10;r++)for(let c=0;c<8;c++){
      const a=mesh.pts[r][c],b=mesh.pts[r][c+1],d=mesh.pts[r+1][c];
      const area=(b.x-a.x)*(d.y-a.y)-(b.y-a.y)*(d.x-a.x);minArea=Math.min(minArea,area);
    }
    const energy=mesh.pts.flat().reduce((n,p)=>n+p.z*p.z,0);
    if(speed===8)lowEnergy+=energy;if(speed===40)highEnergy+=energy;
  }
}
assert(highEnergy>lowEnergy*2,'strong wind bends paper substantially more than light wind');
assert(minArea>0,'projected cells must not invert into flickering folds');assert(maxOffset<40,'visual glide stays bounded around the route');
let maxFrameStep=0,maxBank=0,lightGlide=0,strongGlide=0;
for(const phase of [.451,1.23,4.9]){
  let previous;
  for(let i=0;i<3600;i++){
    const t=i/60,a=current.globePaperMotion(8,12,t,phase,false),b=current.globePaperMotion(40,65,t,phase,false);
    lightGlide+=a.x*a.x+a.y*a.y;strongGlide+=b.x*b.x+b.y*b.y;
    if(previous)maxFrameStep=Math.max(maxFrameStep,Math.hypot(b.x-previous.x,b.y-previous.y));
    maxBank=Math.max(maxBank,Math.abs(b.roll));previous=b;
  }
  for(const period of [6,12,20,30]){
    let error=0;
    for(let i=0;i<60;i++){const a=current.globePaperMotion(18,25,i/2,phase,false),b=current.globePaperMotion(18,25,i/2+period,phase,false);error+=Math.hypot(a.x-b.x,a.y-b.y);}
    assert(error/60>3,'glide must not repeat a short, recognizable orbit');
  }
  for(const t of [1000,10000,86400]){const a=current.globePaperMotion(90,140,t,phase,false),b=current.globePaperMotion(90,140,t+1/60,phase,false);assert(Math.hypot(a.x-b.x,a.y-b.y)<1,'old journeys retain smooth motion');}
}
assert(maxFrameStep<1,'glide has no per-frame random jumps');assert(maxBank<.95,'bank remains readable without flipping');assert(strongGlide>lightGlide*1.5,'strong wind expands the glide');
const still=current.globePaperMotion(40,65,0,2.4,true);
for(const t of [1,10,100]){const later=current.globePaperMotion(40,65,t,2.4,true);assert.deepEqual(plain(later),plain(still));assert.deepEqual(plain(current.meshPoints(47.52,66,t,.2,8,10,later)),plain(current.meshPoints(47.52,66,0,.2,8,10,still)));}
assert.notDeepEqual(plain(current.globePaperMotion(18,25,2,1,false)),plain(current.globePaperMotion(18,25,2,2,false)),'letters have independent phases');
let oldTravel=0,newTravel=0,oldTip,newTip;
for(let i=0;i<180;i++){
  const t=i/30,old=before.meshPoints(47.52,66,t,.2,12,15).pts[0][12];
  const next=current.meshPoints(47.52,66,t,.2,8,10,current.globePaperMotion(18,25,t,1.23,false)).pts[0][8];
  if(oldTip){oldTravel+=Math.hypot(old.x-oldTip.x,old.y-oldTip.y,old.z-oldTip.z);newTravel+=Math.hypot(next.x-newTip.x,next.y-newTip.y,next.z-newTip.z);}
  oldTip=old;newTip=next;
}
assert(newTravel>oldTravel*1.5,'ordinary route wind produces more visible tip movement than before');
const a=recorder(),b=recorder();current.drawFlutter(a.ctx,100,120,47.52,66,1,.2,0,null,current.globePaperMotion(18,25,1,1,false));before.drawFlutter(b.ctx,100,120,47.52,66,1,.2,0,null);
const cells=a.calls.filter(c=>c[0]==='fill').length,oldCells=b.calls.filter(c=>c[0]==='fill').length;
assert.equal(cells,80);assert.equal(oldCells,180);
const report={passed:true,legacyDrawCases:9,windPoseCases:1080,glideSamples:10800,globeCells:cells,previousCells:oldCells,strongVsLightBend:highEnergy/lowEnergy,ordinaryWindTipTravelRatio:newTravel/oldTravel,minCellArea:minArea,maxAnchorOffset:maxOffset,maxFrameStep,maxBank,strongVsLightGlide:strongGlide/lightGlide,reducedMotion:'static',scope:'Motion/Canvas properties; not physical FPS'};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
