'use strict';
// Real local bundle + real application functions; all HTTP is intercepted here.
const {sandbox:s,root}=require('./audit_phase0.cjs');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'wind/index.json'),'utf8'));
const packed=fs.readFileSync(path.join(root,'wind',manifest.tiles[0].file));
s.Date=Date;s.ReadableStream=ReadableStream;
const apiCalls=[],fileReads=[];
s.fetch=async url=>{
  if(url==='wind/index.json'){fileReads.push(url);return new Response(JSON.stringify(manifest));}
  if(url.startsWith('wind/'+manifest.tiles[0].file+'?v=')){fileReads.push(url);return new Response(packed);}
  if(url.startsWith('https://api.open-meteo.com/v1/forecast?')){
    const count=new URL(url).searchParams.get('latitude').split(',').length;
    apiCalls.push(count);return new Response(JSON.stringify(Array.from({length:count},(_,i)=>({hourly:{fixture:'route',i}}))));
  }
  throw Error('Unexpected request: '+url);
};
const ev=code=>vm.runInContext(code,s);
(async()=>{
  ev('_wcMan=null; _wcUntil=0');
  const pts=ev('wfPoints({lat:13.7,lng:100.5},{lat:18.8,lng:99})');
  s.fixturePoints=pts;
  const result=await ev('fetchWx(fixturePoints)');
  assert.equal(pts.length,238);assert.equal(result.length,238);
  assert.deepEqual(apiCalls,[13]);assert.equal(ev('WX_SRC'),'cache:th+api');
  assert.equal(fileReads.length,2);
  for(const r of result.slice(0,225)){
    assert.equal(r.hourly.time.length,24);
    for(const key of ['wind_speed_10m','wind_direction_10m','precipitation','wind_gusts_10m','weather_code','pressure_msl'])
      assert(r.hourly[key].every(Number.isFinite),key);
  }
  assert(result.slice(225).every(r=>r.hourly.fixture==='route'));
  const tile=manifest.tiles[0],expires=Date.parse(tile.t0+':00Z')+(tile.slices-1)*tile.stepH*3600000;
  class ExpiredDate extends Date {static now(){return expires;}}
  s.Date=ExpiredDate;
  s.awaitManifest=manifest;
  assert.equal(ev('wcPick(awaitManifest,fixturePoints)'),null);
  const report={passed:true,checkedAtUtc:new Date().toISOString(),scope:'Real local weather bundle and application decoder; intercepted HTTP, no provider calls',
    issued:manifest.issued,tile:tile.file,points:pts.length,fieldFromCache:225,routeLocationsRequested:apiCalls,
    fileReads,expiredCacheRejected:true,checks:['current regional bundle is eligible','actual decoder yields finite six-variable series','238-point order keeps 225 cached field + 13 live route','expired coverage is rejected']};
  if(process.argv[2])fs.writeFileSync(path.resolve(root,process.argv[2]),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
