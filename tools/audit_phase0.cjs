'use strict';

// Read-only Phase 0 audit of CURRENT source. The original PHASE0_EVIDENCE.json
// is the pre-patch baseline; write later runs to a different filename.
// Uses synthetic records and an isolated VM;
// never reads browser storage, starts the app, or makes network requests.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const fixedTime = Date.parse('2026-10-05T05:00:00Z');
class AuditDate extends Date {
  constructor(...args) { super(...(args.length ? args : [fixedTime])); }
  static now() { return fixedTime; }
}
function between(start, end) {
  const a = html.indexOf(start);
  const b = html.indexOf(end, a + start.length);
  assert(a >= 0 && b > a, `Source boundary missing: ${start}`);
  return html.slice(a, b);
}
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
for (const [i, match] of scripts.entries()) new vm.Script(match[1], {filename: `index-script-${i}.js`});
new vm.Script(sw, {filename: 'sw.js'});
const memory = new Map();
const downloads = [];
const sandbox = vm.createContext({
  Date: AuditDate, TextEncoder, TextDecoder, Blob, Response,
  CompressionStream, DecompressionStream, AbortController, Uint8Array,
  btoa, atob, setTimeout, clearTimeout,
  DRIFT_LOCAL: {
    getItem: k => memory.get(k) ?? null,
    setItem: (k, v) => memory.set(k, String(v)),
    removeItem: k => memory.delete(k)
  },
  DRIFT_SESSION: {removeItem(){}},
  fetch() { throw new Error('Network forbidden in Phase 0 audit'); },
  download: (blob, name) => downloads.push({blob, name}),
  toast() {}, openRead() {}, refreshDock() {},
  llOf: p => ({lat: p.la, lng: p.lo}),
  G: {focus() {}},
});
const core = between('const CFG = {', '/* ============================================================\n   งานวาด');
vm.runInContext("const K_ERR='drift.err'; const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';\n" + core, sandbox);
vm.runInContext(between('function tracesOf(L,upto){', '/* รหัสจดหมาย →'), sandbox);
vm.runInContext(between('async function ingest(payload){', 'async function receiveFromHash(){'), sandbox);
vm.runInContext(between("const ARCHIVE_PREFS=", "$('#btnExport').onclick"), sandbox);
vm.runInContext(between('function sanitizePort(o){', '/* ---------- อากาศ ณ จุดหนึ่ง'), sandbox);
vm.runInContext(between('function importArchive(d){', "$('#fileIn').onchange"), sandbox);

async function run() {
  const report = {
    auditDate: new Date().toISOString().slice(0,10),
    fixtureClockUtc: new Date(fixedTime).toISOString(),
    scope: 'Local source, synthetic VM checks, local wind binary; no browser/mobile/live-site measurements',
    runtime: process.version,
    syntax: {indexScriptBlocks: scripts.length, serviceWorker: 'pass'},
    files: {},
    checks: [],
  };
  const man = JSON.parse(fs.readFileSync(path.join(root, 'wind/index.json'), 'utf8'));
  const tile = man.tiles[0];
  for (const file of ['index.html', 'sw.js', 'drift-demo.html', 'drift-th.html', 'wind/'+tile.file]) {
    const data = fs.readFileSync(path.join(root, file));
    report.files[file] = {bytes: data.length, gzipBytes: zlib.gzipSync(data).length};
  }
  report.files['index.html'].lines = html.split(/\r?\n/).length;
  report.files['index.html'].inlineDataUrls = [...html.matchAll(/data:[^;\s'"<>]+;base64,[A-Za-z0-9+/=]+/g)].reduce((a, m) => {
    a.count++; a.characters += m[0].length; return a;
  }, {count: 0, characters: 0});
  report.files['index.html'].scriptCharacters = scripts.reduce((n, s) => n + s[1].length, 0);
  report.sheets = [...html.matchAll(/<(?:div|section)\b[^>]*>/g)].filter(m => /class="[^"]*\bsheet\b/.test(m[0]))
    .map(m => /\bid="([^"]+)"/.exec(m[0])?.[1]).filter(Boolean);

  const unpacked = zlib.inflateSync(fs.readFileSync(path.join(root, 'wind', tile.file)));
  assert.equal(unpacked.length, tile.nv * tile.slices * tile.nx * tile.ny);
  report.windCache = {
    issued: man.issued, version: man.v, points: tile.nx * tile.ny,
    compressedBytes: fs.statSync(path.join(root, 'wind', tile.file)).size, uncompressedBytes: unpacked.length,
    expectedBytes: tile.nv * tile.slices * tile.nx * tile.ny,
    lastSampleUtc: new Date(Date.parse(tile.t0 + ':00Z') + (tile.slices - 1) * tile.stepH * 3600000).toISOString(),
    eligibleAtAuditTime: (()=>{
      const live=vm.createContext({Date,WCACHE:{COVER_H:36}});
      vm.runInContext(between('function wcPick(man,pts){','async function wcLoad(man,t){'),live);
      return vm.runInContext(`wcPick(${JSON.stringify(man)},[{lat:13.7,lng:100.5}]) !== null`,live);
    })()
  };

  const cases = [
    ['clear', 12, 210, 0, 18, 0, 1013, 0],
    ['rain', 25, 250, 3, 40, 63, 1013, 1],
    ['snow', 15, 80, 1, 20, 73, 1013, 0],
    ['storm', 50, 100, 4, 105, 95, 980, 2],
  ];
  report.simulation = [];
  for (const [name, spd, dir, pre, gst, wc, prs, ct] of cases) {
    sandbox.fixture = {name, spd, dir, pre, gst, wc, prs, ct};
    const result = await vm.runInContext(`(async()=>{
      const A={lat:13.7,lng:100.5}, B={lat:18.8,lng:99.0};
      const pts=wfPoints(A,B), dist=gcDist(A,B);
      const time=Array.from({length:96},(_,i)=>new Date(Date.now()+i*3600000).toISOString().slice(0,16));
      const f=fixture;
      const hourly={time,wind_speed_10m:time.map(()=>f.spd),wind_direction_10m:time.map(()=>f.dir),
        precipitation:time.map(()=>f.pre),wind_gusts_10m:time.map(()=>f.gst),
        weather_code:time.map(()=>f.wc),pressure_msl:time.map(()=>f.prs)};
      const wx=pts.map(()=>({hourly}));
      const a=simulate(pts,wx,dist,f.ct,'phase0-'+f.name);
      const b=simulate(pts,wx,dist,f.ct,'phase0-'+f.name);
      const rec={id:'phase0-'+f.name,f:{n:'Synthetic sender',la:A.lat,lo:A.lng,p:'Origin'},
        t:{n:'Synthetic recipient',la:B.lat,lo:B.lng,p:'Destination'},
        s:Date.now(),th:a.total,ct:f.ct,lg:a.legs,lo:a.lost,wf:a.wf,bd:'Phase 0 synthetic letter'};
      const payload=await packPayload(rec);
      const decoded=await unpackPayload(payload), received=sanitizeRec(decoded);
      _driftCache.clear(); _wfCache.clear();
      const sender=[0,.25,.5,.75,1].map(p=>posAt(rec,p));
      _driftCache.clear(); _wfCache.clear();
      const receiver=[0,.25,.5,.75,1].map(p=>posAt(received,p));
      return {name:f.name,points:pts.length,legs:a.legs.length,totalHours:a.total,lostLeg:a.lost,
        deterministic:JSON.stringify(a)===JSON.stringify(b),
        totalMatchesLegs:a.total===r2(a.legs.reduce((v,l)=>v+l[0]+l[1],0)),
        senderReceiverPositionMatch:JSON.stringify(sender)===JSON.stringify(receiver),
        finitePositions:sender.every(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)),
        bodyRecoverableBeforeArrival:decoded.bd===rec.bd && !letterState(received,Date.now()).arrived,
        wireKeys:Object.keys(decoded).sort(),payloadCharacters:payload.length};
    })()`, sandbox);
    assert(result.deterministic && result.totalMatchesLegs && result.senderReceiverPositionMatch && result.finitePositions);
    assert(result.bodyRecoverableBeforeArrival);
    report.simulation.push(result);
  }
  const baselineFile=path.join(root,'PHASE0_EVIDENCE.json');
  if(fs.existsSync(baselineFile)){
    const baseline=JSON.parse(fs.readFileSync(baselineFile,'utf8'));
    for(const result of report.simulation){
      const before=baseline.simulation.find(x=>x.name===result.name);
      assert(before,`Missing baseline case: ${result.name}`);
      for(const key of ['totalHours','legs','lostLeg']) assert.equal(result[key],before[key],`${result.name}: ${key} changed`);
      assert.deepEqual(Array.from(result.wireKeys),before.wireKeys);
    }
    report.baselineSimulationParity='pass (totals, legs, loss, wire fields)';
  }
  const observe = (name, expr) => {
    const value = vm.runInContext(expr, sandbox);
    report.checks.push({name, observed: value});
    return value;
  };
  observe('zero_duration_and_inconsistent_total_are_accepted', `(()=>{
    const r=sanitizeRec({id:'synthetic',lg:[[0,0,12,180,0,0,0]],th:100});
    return !!r && r.lg[0][0]===0 && r.th===100;
  })()`);
  observe('sanitized_letter_coordinates_are_not_coarsened', `(()=>{
    const r=sanitizeRec({id:'synthetic',th:1,lg:[[1,0,12,180,0,0,0]],f:{la:13.756789,lo:100.501234}});
    return r.f.la===13.756789 && r.f.lo===100.501234;
  })()`);
  observe('port_coordinates_are_coarsened', `(()=>{
    const r=sanitizePort({i:'SYNTHETIC',a:13.756789,o:100.501234});
    return r.a===13.8 && r.o===100.5;
  })()`);
  observe('snow_also_produces_wet_trace', `tracesOf({id:'snow',lg:[[1,0,12,180,1,0,0,18,73]],ct:0,th:1}).wet>0`);

  const sameName = await vm.runInContext(`(async()=>{
    store.setMe({name:'Same synthetic name',lat:13.7,lng:100.5});
    const r={id:'same-name',f:{n:'Same synthetic name',la:13.7,lo:100.5},
      t:{n:'Other synthetic name',la:18.8,lo:99},s:Date.now(),th:6,ct:0,
      lg:[[6,0,12,180,0,0,0,18,0]],lo:-1,bd:'Synthetic content'};
    const l=await ingest(await packPayload(r));
    return {classifiedAs:l.dir,arrived:letterState(l,Date.now()).arrived};
  })()`, sandbox);
  assert.equal(sameName.classifiedAs, 'out');
  assert.equal(sameName.arrived, false);
  report.checks.push({name:'sender_name_is_used_as_identity', observed: sameName});

  memory.set('lw.v1.ports', JSON.stringify([{i:'SYNTHETICPORT', n:'Synthetic contact'}]));
  vm.runInContext('exportJSON(true)', sandbox);
  const backup = JSON.parse(await downloads.at(-1).blob.text());
  assert.equal(Object.hasOwn(backup, 'ports'), true);
  report.checks.push({name:'archive_backup_omits_ports', observed:false});
  report.staticFindings = {
    releaseSavedBeforeSwipe: html.indexOf("store.put(Object.assign({dir:'out'}, rec") < html.indexOf('openDrift(store.letters().find'),
    wipeKeys: vm.runInContext('OWN_KEYS',sandbox),
    cryptoSubtleCalls: (html.match(/crypto\.subtle/g)||[]).length,
    cspMetaPresent: /http-equiv\s*=\s*["']Content-Security-Policy/i.test(html),
    rafLoops: [...html.matchAll(/requestAnimationFrame\((frame|writeLoop|candleStep|dTick|aTick|xTick)\)/g)].map(m=>m[1]),
    externalFetchUrls: [...html.matchAll(/(?:const u=|fetch\(|requestData\()['"](https:\/\/[^'"?]+)/g)].map(m=>m[1])
  };
  const out = process.argv[2];
  const json = JSON.stringify(report, null, 2) + '\n';
  if (out){
    assert(path.resolve(root,out)!==baselineFile,'Preserve PHASE0_EVIDENCE.json; use a new evidence filename');
    fs.writeFileSync(path.resolve(root, out), json, 'utf8');
  }
  console.log(json);
}
module.exports={sandbox,memory,downloads,between,run,root,html};
if(require.main===module) run().catch(err => { console.error(err); process.exitCode = 1; });
