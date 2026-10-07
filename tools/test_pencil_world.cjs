'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const [name,file] of [['PENCIL_MATH','study-globe-lines.js'],['PENCIL_WORLD','pencil-world.js']]){
  const a=html.indexOf('/* BEGIN '+name+' */'),b=html.indexOf('/* END '+name+' */');
  assert.equal(html.slice(a+('/* BEGIN '+name+' */').length,b).trim(),fs.readFileSync(path.join(__dirname,file),'utf8').trim());
}
assert(html.includes("new URLSearchParams(location.search).get('renderer')==='production'"));
const events=[],counts={paint:0,sizeWrites:0,legacySegments:0,legacySphere:0};
function context(){return {depth:0,save(){this.depth++;},restore(){this.depth--;},beginPath(){},rect(...a){events.push(['rect',...a]);},arc(...a){events.push(['arc',...a]);},clip(...a){events.push(['clip',...a]);},translate(){},scale(){},setTransform(){},clearRect(){},moveTo(){},lineTo(){},stroke(){events.push(['stroke']);},fill(){},fillRect(){},drawImage(){events.push(['image']);},createRadialGradient(){return {addColorStop(){}};},createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(){events.push(['material']);},createPattern(){return {};}};}
function canvas(){const c=context();return {getContext(){return c;},set width(n){counts.sizeWrites++;this.w=n;},get width(){return this.w;},set height(n){counts.sizeWrites++;this.h=n;},get height(){return this.h;}};}
const line=[[{x:0,y:0,z:1},{x:.1,y:0,z:.99}]],grid=[[{x:0,y:.1,z:.99},{x:.1,y:.1,z:.98}]];
let time=0;
const draw=context();
const fx=vm.createContext({window:{DriftStudyLines:require('./study-globe-lines.js')},document:{createElement:canvas,body:{style:{}}},performance:{now:()=>++time},
  W:390,H:844,T:2,RAD:Math.PI/180,GRID:grid,REDUCED:false,schemeNow:true,RAIN_HERE:0,WIND_HERE:null,WIND_DIR:210,CFG:{},SKIN:{},sheetOpen:null,sctx:draw,
  QUALITY:{effects:()=>({atmosphere:1})},qualityCount:(n)=>n,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),sunKey:()=>1,sunVec:()=>({x:0,y:0,z:1}),snowNow:()=>false,heroActive:()=>false,
  grain(){},stars(){},paintSky(){},renderGlobe(){},dust(){events.push(['dust']);},rain(){events.push(['rain']);},snow(){events.push(['snow']);},splash(){events.push(['splash']);},applyScheme(){},
  G:{rotY:0,rotX:0,zoom:1,R:100,R0:100,CX:195,CY:400,W:390,H:844,rotate:v=>v,pipeV:v=>v,shadeDay:()=>1,shadeNight:()=>0,
    segs(){counts.legacySegments++;},paint(c){counts.paint++;this.segs(c,grid,.13,.7,true,1,'1,2,3',this.shadeDay);this.segs(c,line,.25,.85,true,1,'1,2,3',this.shadeDay);},sphere(){counts.legacySphere++;},liftNight(){},terminator(){return true;},cities(){}}
});
vm.runInContext(fs.readFileSync(path.join(__dirname,'pencil-world.js'),'utf8')+'\nvar world=installPencilWorld();',fx);
fx.G.sphere(draw);const allocated=counts.sizeWrites;fx.G.sphere(draw);
assert.equal(counts.paint,1);assert.equal(counts.sizeWrites,allocated,'idle reuses full globe and material canvases');
assert(events.findIndex(e=>e[0]==='material')<events.findIndex(e=>e[0]==='stroke'),'material below front lines');
fx.G.rotY+=.00001;fx.G.sphere(draw);assert.equal(counts.paint,2,'tiny drag changes repaint without quantizing');assert.equal(counts.sizeWrites,allocated);
fx.qualityCount=n=>Math.ceil(n*.4);fx.G.sphere(draw);assert.equal(counts.paint,2,'quality does not change world topology/cache');
fx.schemeNow=false;fx.applyScheme(false);fx.G.sphere(draw);assert.equal(counts.paint,3);assert.equal(fx.CFG.FOG,.44);
assert.equal(counts.legacySegments,0);assert.equal(counts.legacySphere,0);
events.length=0;
for(const front of [false,true])fx.G.segs(draw,grid,.13,.7,front,1,'1,2,3',()=>1);
assert.equal(events.length,0,'latitude/longitude lines emit no draw commands on either hemisphere');
fx.G.segs(draw,line,.25,.85,true,1,'1,2,3',()=>1);
assert(events.some(e=>e[0]==='stroke'),'coastlines remain visible');
const snap=fx.world.snapshot();assert.equal(snap.marks,900);assert.equal(snap.verticesPerMark,4);assert.equal(snap.lines.fastPaints,0);assert.equal(snap.lines.detailSwitches,0);assert.equal(snap.lines.maxPoseLagPx,0);
for(const name of ['dust','rain','snow','splash']){events.length=0;fx[name](draw,.016);assert(events.some(e=>e[0]==='clip'&&e[1]==='evenodd'));assert(events.some(e=>e[0]===name));assert.equal(draw.depth,0);}
events.length=0;fx.renderGlobe(.016);assert.equal(events.filter(e=>e[0]==='arc').length,0,'unknown wind does not invent foreground flow');
fx.WIND_HERE=18;fx.renderGlobe(.016);assert(events.some(e=>e[0]==='clip'&&e[1]==='evenodd'),'foreground is also occluded');assert.equal(draw.depth,0);
assert.throws(()=>fx.world.outsideWorld(draw,()=>{throw new Error('draw failed');}));assert.equal(draw.depth,0,'failed draw restores mask');
const report={passed:true,checks:['single-file math/source embedding matches canonical source','comparison viewers retain legacy renderer','exact camera cache and stable detail through quality changes','material is below front pencil lines','grid hidden on both hemispheres while coasts/material remain','theme invalidates material and world cache','dust/rain/snow/splash/foreground masks restore state','unknown wind does not invent foreground movement'],scope:'Synthetic render integration; browser pixel masking and timings recorded separately'};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
