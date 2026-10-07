'use strict';
// Synthetic network accounting: never requests the provider or real coordinates.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=html.slice(html.indexOf('async function fetchWx(pts){'),html.indexOf("let WX_SRC=''"));
const pts=Array.from({length:238},(_,i)=>({lat:i,lng:0}));
async function run({cache=false,broken=false,offline=false}={}){
  const calls=[],man={tiles:[{}]},tile={id:'fixture'},fieldData=Symbol('cache');
  const fx=vm.createContext({CFG:{SEGS:12},WX_SRC:'',wcManifest:async()=>cache?man:null,wcPick:()=>tile,
    wcLoad:async()=>{if(broken)throw Error('cache failed');return fieldData;},wcSeries:(_t,d,p)=>({from:'cache',id:p.lat}),
    fetchWxLive:async list=>{calls.push(list.map(p=>p.lat));if(offline)throw Error('offline');return list.map(p=>({from:'api',id:p.lat}));}});
  vm.runInContext(source,fx);return {calls,fx,job:()=>fx.fetchWx(pts)};
}
(async()=>{
  const noCache=await run(),all=await noCache.job();assert.equal(noCache.calls.length,1);assert.equal(noCache.calls[0].length,238);assert.equal(all.length,238);assert.equal(noCache.fx.WX_SRC,'api');assert.deepEqual(Array.from(all,x=>x.id),pts.map(p=>p.lat));
  const cached=await run({cache:true}),hybrid=await cached.job();assert.equal(cached.calls.length,1);assert.equal(cached.calls[0].length,13);assert.equal(hybrid.length,238);assert.equal(hybrid[224].from,'cache');assert.equal(hybrid[225].from,'api');assert.equal(cached.fx.WX_SRC,'cache:fixture+api');
  const broken=await run({cache:true,broken:true});await broken.job();assert.equal(broken.calls.length,1);assert.equal(broken.calls[0].length,238);
  const fallback=await run({cache:true,offline:true}),out=await fallback.job();assert.equal(fallback.calls.length,1);assert.equal(out.length,238);assert(out.every(x=>x.from==='cache'));assert.equal(fallback.fx.WX_SRC,'cache-only');
  const fail=await run({offline:true});await assert.rejects(fail.job,/offline/);assert.equal(fail.calls.length,1);
  const report={passed:true,checks:['no-cache full field is requested once without redundant 13-point request','valid cache requests only 13 route points','broken cache uses one full request','route failure uses cache-only without repeat API request','no-cache API failure propagates without retry'],locationsPerJourney:{validCache:13,noCache:238,previousNoCache:251},scope:'Mocked fetch selection and complete point order; provider quota is documented separately'};
  if(process.argv[2])fs.writeFileSync(path.resolve(root,process.argv[2]),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
