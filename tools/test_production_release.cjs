'use strict';
// Execute the shipped dTick and embedded choreography with synthetic viewport,
// wind and visible clock. No storage, fetch, browser profile or animation loop.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const embedded=html.split('/* BEGIN RELEASE_CHOREOGRAPHY */')[1].split('/* END RELEASE_CHOREOGRAPHY */')[0];
assert.equal(embedded.trim(),fs.readFileSync('tools/release-choreography.js','utf8').trim(),'offline source parity');
const tick=html.slice(html.indexOf('function dTick('),html.indexOf('function openDrift(',html.indexOf('function dTick(')));
const feel=html.slice(html.indexOf('const dWindOf='),html.indexOf('function dBuildTex(',html.indexOf('const dWindOf=')));
const helper=html.slice(html.indexOf('function resetReleaseLight('),html.indexOf('function dPaint(',html.indexOf('function resetReleaseLight(')));
const cases=[];
for(const size of [[733,780],[390,680]])for(const speed of [5,34])for(const hz of [30,60,120]){
 const styles={},stage={style:{opacity:'0'}},state={time:0,paints:[],renders:0};
 const c=vm.createContext({Math,clamp:(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),innerWidth:size[0],innerHeight:size[1],RAD:Math.PI/180,DRIFT_FOC:820,WIND_FULL:45,
  document:{documentElement:{style:{setProperty(k,v){styles[k]=Number(v);},removeProperty(k){delete styles[k];}}}},stage,
  G:{fitZoom:()=>2,R0:100,zoom:2.52,zTarget:2.52},fitKm:()=>600,
  RENDER:{now:()=>state.time},dLaunch(){throw Error('unexpected launch');},
  dPaint(...args){state.paints.push({y:args[1],depth:-args[2],opacity:args[8]});},renderGlobe(){state.renders++;},paintHeroStill(){},
  dCloseDrift(){vm.runInContext("dPHASE='off';stage.style.opacity='1';resetReleaseLight()",c);}});
 vm.runInContext(embedded+`\nlet dPHASE='fly',dT=0,dProg=1,dY=0,dHold=false,dDrag=false,dFly=0,dFlyStart=0,dStreak=0,dLET={},dSPD=${speed},dDIR=210,dRAF=null,REDUCED=false,dReleaseDirection='B';\n`+feel+helper+tick,c);
 let previous={depth:90,y:-size[1]*.1,world:0,zoom:2.52},overlap=false;
 for(let i=0;i<Math.ceil(6.2*hz);i++){
   state.time=i*1000/hz;vm.runInContext(`dTick(${1/hz})`,c);
   if(vm.runInContext('dPHASE',c)==='off')break;
   const p=state.paints.at(-1),world=Number(stage.style.opacity),zoom=c.G.zoom;
   assert(p.depth>=previous.depth-1e-8);assert(p.y<=previous.y+1e-8);assert(world>=previous.world);assert(zoom<=previous.zoom+1e-8);
   if(p.opacity>0&&p.opacity<1&&world>0)overlap=true;
   previous={...p,world,zoom};
 }
 assert.equal(vm.runInContext('dPHASE',c),'off');assert.equal(c.G.zoom,2);assert.equal(c.G.zTarget,2);assert.equal(stage.style.opacity,'1');assert(overlap);assert(!('--release-ui'in styles));
 const hang=Math.round((1-speed/45)*640);assert(state.time>=5400+hang&&state.time<5400+hang+1000/hz+1);
 // Reduced motion must reach the same exact camera after its short still fade.
 vm.runInContext("REDUCED=true;dPHASE='fly';dFlyStart=0;G.zoom=G.zTarget=2.52",c);state.time=180;vm.runInContext('dTick()',c);assert.equal(c.G.zoom,2);assert.equal(vm.runInContext('dPHASE',c),'off');
 cases.push({size,speed,hz,elapsedMs:state.paints.length*1000/hz,passed:true});
}
const report={date:new Date().toISOString(),passed:true,cases,checks:['actual shipped departure at 30/60/120 Hz','desktop and mobile strong/weak wind','monotone camera retreat/lift/zoom','paper and globe overlap','exact final camera and CSS reset','reduced motion final camera','embedded offline source parity']};
fs.writeFileSync('PRODUCTION_CINEMATIC_RELEASE_TESTS.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
