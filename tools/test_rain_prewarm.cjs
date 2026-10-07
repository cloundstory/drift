'use strict';
// Compare the actual chunked builder with its frozen pre-change implementation.
// Synthetic weather, no browser storage/provider requests.
const {sandbox:s,root}=require('./audit_phase0.cjs');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ev=code=>vm.runInContext(code,s);
s.performance=require('node:perf_hooks').performance;
vm.runInContext(fs.readFileSync(path.join(root,'tools/fixtures/rain-marks-before.js'),'utf8')
  .replace('function rainMarks(','function referenceRainMarks('),s);
const cases=[['clear',0,0],['rain',1.2,63],['snow',1,73],['ice',1,67],['fog',0,45],['storm',3,95]];
const checks=[];
(async()=>{
  for(const [name,pre,wc] of cases){
    s.fixture={name,pre,wc};
    ev(`{
      const A={lat:13.7,lng:100.5},B={lat:18.8,lng:99},pts=wfPoints(A,B);
      const time=Array.from({length:96},(_,i)=>new Date(Date.now()+i*3600000).toISOString().slice(0,16));
      const hourly={time,wind_speed_10m:time.map(()=>12),wind_direction_10m:time.map(()=>210),
        precipitation:time.map(()=>fixture.pre),wind_gusts_10m:time.map(()=>18),
        weather_code:time.map(()=>fixture.wc),pressure_msl:time.map(()=>1013)};
      const sim=simulate(pts,pts.map(()=>({hourly})),gcDist(A,B),0,'warm-'+fixture.name);
      globalThis.rec={id:'warm-'+fixture.name,f:{n:'Writer',p:'Bangkok',la:A.lat,lo:A.lng},
        t:{n:'Reader',p:'Chiang Mai',la:B.lat,lo:B.lng},s:1000,th:sim.total,ct:0,
        lg:sim.legs,lo:sim.lost,wf:sim.wf,bd:'Synthetic'};
    }`);
    for(const tf of [0,.5]){
      s.tf=tf;
      const expected=ev('invalidateJourneyCaches(); JSON.stringify(Object.assign({},referenceRainMarks(rec,tf)))');
      ev('invalidateJourneyCaches()');let yields=0;s.yieldTask=async()=>{yields++;};
      assert.equal(await ev('warmRainMarks(rec,tf,()=>true,yieldTask)'),true);
      const actual=ev('JSON.stringify(Object.assign({},rainMarks(rec,tf)))');
      assert.equal(actual,expected,name+' '+tf+' geometry/attributes must match exactly');
      assert(yields>0,'expensive build must yield tasks');
      checks.push({weather:name,progress:tf,exact:true,taskYields:yields});
    }
  }
  ev('invalidateJourneyCaches()');s.keepWorking=true;let cancelledYields=0;
  s.yieldTask=async()=>{cancelledYields++;s.keepWorking=false;};
  assert.equal(await ev('warmRainMarks(rec,0,()=>keepWorking,yieldTask)'),false);
  assert(cancelledYields>0);assert.equal(ev('_rainMarks.has(rec.id+":0")'),false);
  s.yieldTask=async()=>{};assert(await ev('warmRainMarks(rec,0,()=>true,yieldTask)'));
  assert(ev('globalThis.warmed=rainMarks(rec,0);saveReleasedRecord(Object.assign({},rec,{s:5000}),null)'));
  assert(ev('rainMarks(store.letters()[0],0)===warmed'),'durable append keeps prepared geometry');
  const report={passed:true,date:new Date().toISOString(),scope:'Exact geometry/attributes versus frozen reference; cooperative task yielding, cancelled builds and cache preservation',checks,cancellation:true,releaseCacheReuse:true};
  fs.writeFileSync(path.join(root,'PHASE2_RAIN_PREWARM_TESTS.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
