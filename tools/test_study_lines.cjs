'use strict';
const assert=require('node:assert/strict');
const {poseKey,clipHorizon,createPainter,createProjector,createSurface}=require('./study-globe-lines.js');
const g={rotY:0,rotX:0,zoom:1,R:100,CX:120,CY:120,W:240,H:240};
const key=poseKey(g,'sun',2);
assert.notEqual(poseKey({...g,rotY:0.00001},'sun',2),key);
assert.notEqual(poseKey({...g,zoom:1.00001},'sun',2),key);
assert.notEqual(poseKey(g,'sun',1),key);
assert.notEqual(poseKey(g,'other-sun',2),key);
const a={x:.6,y:.2,z:.5,px:180,py:100},b={x:.6,y:.4,z:-.5,px:180,py:80};
const front=clipHorizon(a,b,true,g),back=clipHorizon(a,b,false,g);
assert.deepEqual(front.b,back.a);
assert.ok(Math.abs(Math.hypot(front.b.px-g.CX,front.b.py-g.CY)-g.R)<1e-10);
assert.equal(front.t1,back.t0);
assert.equal(clipHorizon(a,a,false,g),null);
assert.equal(clipHorizon(b,b,true,g),null);
let rotations=0,segments=0,styles=[];
g.rotate=v=>{rotations++;return v;};g.project=v=>({x:120+100*v.x,y:120-100*v.y});
const ctx={save(){},restore(){},beginPath(){},moveTo(){},lineTo(){segments++;},stroke(){styles.push(this.strokeStyle);}};
const lines=[[a,{...a,x:.7,px:190}]],paint=createPainter();
paint(g,ctx,lines,.25,1,true,'1,2,3',()=>1);
paint(g,ctx,lines,.251,1,true,'1,2,3',()=>1);
assert.equal(rotations,2,'shade passes reuse projected vertices');
assert.equal(segments,2,'all segments remain present across opacity changes');
const opacity=styles.map(s=>Number(s.slice(s.lastIndexOf(',')+1,-1)));
assert.ok(Math.abs(opacity[1]-opacity[0])<=1/160+.00001);
g.rotY+=.00001;paint(g,ctx,lines,.25,1,true,'1,2,3',()=>1);
assert.equal(rotations,4,'tiny camera changes invalidate projection cache');
// Pressure stays on its world segment through camera and light changes.
const pressureLines=[.8,1,1.2].map((pencilWeight,i)=>[
  {...a,x:.1+i*.1,pencilWeight}, {...a,x:.15+i*.1,pencilWeight}
]);
let strokes=[];
const pressureCtx={...ctx,stroke(){strokes.push(this.lineWidth);}};
const beforePressure=rotations;
paint(g,pressureCtx,pressureLines,.25,1,true,'1,2,3',()=>1,{pressure:true});
assert.deepEqual(strokes.slice().sort(),[.76,.95,1.13]);
const firstWidths=strokes;strokes=[];g.rotY+=.00001;
paint(g,pressureCtx,pressureLines,.25,1,true,'1,2,3',()=>.9,{pressure:true});
assert.deepEqual(strokes,firstWidths,'camera/light cannot switch pressure widths');
assert.equal(rotations-beforePressure,12,'pressure preserves vertex count');
strokes=[];
paint(g,pressureCtx,pressureLines,.25,1,true,'1,2,3',()=>1);
assert.deepEqual(strokes,[1],'comparison restores uniform weight');
assert.equal(rotations-beforePressure,12,'pressure toggle reuses geometry');
console.log('PASS: exact pose cache, shared circular horizon, stable topology, opacity continuity, projection reuse, world-anchored pressure');
const projectInto=createProjector();
for(const rotY of [0,.00001,-2.6,Math.PI])for(const rotX of [-1.3,.33161255787892263,1.3]){
  const pose={...g,rotY,rotX,R:230.5,CX:320.7,CY:220.2};
  for(const v of [a,b,{x:-.2,y:.8,z:.4}]){
    const rx=v.x*Math.cos(rotY)-v.z*Math.sin(rotY),rz=v.x*Math.sin(rotY)+v.z*Math.cos(rotY);
    const y=v.y*Math.cos(rotX)-rz*Math.sin(rotX),z=v.y*Math.sin(rotX)+rz*Math.cos(rotX),out={};
    projectInto(pose,v,out);
    assert.deepEqual(out,{x:rx,y,z,px:pose.CX+rx*pose.R,py:pose.CY-y*pose.R});
    pose.R+=.25;projectInto(pose,v,out);
    assert.equal(out.px,pose.CX+rx*pose.R,'zoom stays exact with cached angle coefficients');
  }
}
const references=require('./fixtures/study-surface-reference.json'),crypto=require('node:crypto');
const renderSurface=createSurface(192);let priorPixels;
for(const ref of references){
  const pixels=renderSurface({...ref,pencil:ref.variant==='pencil'||ref.variant==='pencil-detail'});
  assert.equal(crypto.createHash('sha256').update(pixels).digest('hex'),ref.sha256,'all surface RGBA pixels match before optimization');
  if(priorPixels)assert.equal(pixels,priorPixels,'reuse one bounded pixel buffer');
  priorPixels=pixels;
}
console.log('PASS: exact cached rotation/zoom; '+references.length+' complete surface pixel references unchanged');
// The allocation-free projector must keep every Canvas command identical.
const oldProjection=createPainter(),fastProjection=createPainter({projectInto:createProjector()});
const testLines=Array.from({length:7},(_,k)=>Array.from({length:24},(_,i)=>{
  const lat=(k-3)*.4,lng=i*.29;
  return {x:Math.cos(lat)*Math.sin(lng),y:Math.sin(lat),z:Math.cos(lat)*Math.cos(lng)};
}));
const recorder=()=>({commands:[],save(){},restore(){},beginPath(){this.path=[];},moveTo(x,y){this.path.push(['M',x,y]);},lineTo(x,y){this.path.push(['L',x,y]);},stroke(){this.commands.push([this.lineWidth,this.strokeStyle,this.path]);}});
for(const rotY of [.03,1.8,1.80001,-2])for(const zoom of [1,4])for(const front of [true,false])for(const pressure of [true,false]){
  const pose={...g,rotY,rotX:.33,zoom,R:100*zoom,project(v){return {x:this.CX+v.x*this.R,y:this.CY-v.y*this.R};},rotate(v){const rx=v.x*Math.cos(this.rotY)-v.z*Math.sin(this.rotY),rz=v.x*Math.sin(this.rotY)+v.z*Math.cos(this.rotY);return {x:rx,y:v.y*Math.cos(this.rotX)-rz*Math.sin(this.rotX),z:v.y*Math.sin(this.rotX)+rz*Math.cos(this.rotX)};}};
  const slow=recorder(),quick=recorder(),shade=(v,z)=>.5+.3*v.x+.2*Math.abs(z);
  oldProjection(pose,slow,testLines,.25,.8,front,'1,2,3',shade,{pressure});
  fastProjection(pose,quick,testLines,.25,.8,front,'1,2,3',shade,{pressure});
  assert.deepEqual(quick.commands,slow.commands);
}
console.log('PASS: optimized and original projection emit identical paths, pressure and horizon clipping');
