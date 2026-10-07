'use strict';
// Synthetic fixtures only. Never accesses the user's browser or real storage.
const {sandbox:s,memory,between,root,html}=require('./audit_phase0.cjs');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict'),zlib=require('node:zlib');
let passed=0; const results=[];
async function test(name,fn){ await fn(); passed++; results.push(name); }
const ev=code=>vm.runInContext(code,s);
s.ReadableStream=ReadableStream;
const notices=[]; s.toast=msg=>notices.push(msg);
const letter={id:'test-letter',f:{n:'Writer',la:13.7,lo:100.5,p:'Bangkok'},
  t:{n:'Reader',la:18.8,lo:99,p:'Chiang Mai'},s:Date.parse('2026-10-05T05:00:00Z'),
  th:6,ct:0,lg:[[6,0,12,180,0,0,0,18,0]],lo:-1,bd:'Synthetic private body',
  dir:'out',read:true,pk:true,tp:'READER0000000001'};
const me={name:'Writer',place:'Bangkok',lat:13.756789,lng:100.501234,pid:'WRITER0000000001'};
const port={i:letter.tp,n:'Reader',a:18.8,o:99,p:'Chiang Mai',gave:1,at:Date.now()};
s.fixture={letter,me,port};
const reset=()=>{ memory.clear(); ev('for(const k of Object.keys(memo)) delete memo[k]; LIST_CACHE.clear(); invalidateJourneyCaches();'); };
async function run(){
  await test('all application/study inline scripts parse',()=>{
    for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.html'))){
      const source=fs.readFileSync(path.join(root,file),'utf8');
      for(const m of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
        if(/type=["'](?:application\/json|importmap)["']/.test(m[1])) continue;
        new vm.Script(m[2],{filename:file});
      }
    }
  });
  await test('all studies/previews use memory and cannot clear production storage',()=>{
    const files=fs.readdirSync(root).filter(f=>f.endsWith('-studies.html')).concat(['sky-mobile.html','storm-mobile.html','all-on-globe.html','pencil-world-preview.html']);
    assert(files.length>=26,'baseline study inventory must remain present');
    for(const file of files){
      const source=fs.readFileSync(path.join(root,file),'utf8');
      assert(source.includes('tools/study-storage.js'),file);
      assert(!/\b(?:localStorage|sessionStorage)\s*\./.test(source),file);
    }
    const window={}; const context=vm.createContext({window,Date,localStorage:{clear(){throw Error('real storage accessed');}}});
    vm.runInContext(fs.readFileSync(path.join(root,'tools/study-storage.js'),'utf8'),context);
    assert(window.DriftStudy.local.getItem('lw.v1.letters').includes('study-synthetic-letter'));
    window.DriftStudy.local.clear(); assert.equal(window.DriftStudy.local.length,0);
  });
  await test('v2 backup roundtrip retains identity, contacts, associations, flags, preferences',()=>{
    reset(); ev('store.setMe(fixture.me); store.put(fixture.letter); store.putPort(fixture.port); LS.set("lw.v1.scheme","dark"); LS.set("lw.v1.quality","low");');
    const backup=ev('backupData()'); reset(); s.archive=backup;
    const result=ev('importArchive(archive)'); assert.equal(result.saved,true);
    assert.equal(result.added,1); assert.equal(result.addedPorts,1);
    assert.equal(ev('store.me().pid'),me.pid); assert.equal(ev('store.me().lat'),13.8);
    assert.equal(ev('store.ports()[0].i'),letter.tp); assert.equal(ev('store.ports()[0].gave'),1);
    assert.equal(ev('store.letters()[0].tp'),letter.tp); assert.equal(ev('store.letters()[0].read'),true);
    assert.equal(ev('store.letters()[0].bd'),letter.bd); assert.equal(ev('LS.get("lw.v1.scheme")'),'dark');
    assert.equal(ev('LS.get("lw.v1.quality")'),'low');
    assert.equal(ev('importArchive(archive).added'),0);
  });
  await test('legacy v1 incoming archive and existing-profile merge remain usable',()=>{
    reset(); ev('store.setMe(fixture.me); LS.set("lw.v1.scheme","light"); LS.set("lw.v1.quality","high");');
    s.archive={app:'letter-wind',v:1,letters:[{...letter,dir:undefined,read:undefined,tp:undefined}]};
    assert.equal(ev('importArchive(archive).added'),1); assert.equal(ev('store.letters()[0].dir'),'out');
    s.archive={app:'letter-wind',v:2,me:{...me,name:'Other',pid:'OTHER00000000001'},letters:[],ports:[port],settings:{'lw.v1.scheme':'dark','lw.v1.quality':'low'}};
    ev('importArchive(archive)'); assert.equal(ev('store.me().pid'),me.pid); assert.equal(ev('LS.get("lw.v1.scheme")'),'light');
    assert.equal(ev('LS.get("lw.v1.quality")'),'high');
  });
  await test('invalid archive is rejected before changing persisted letters or contacts',()=>{
    const before=JSON.stringify([...memory]);
    const bads=[{...letter,th:2},{...letter,lg:[[0,0,12,180,0,0,0]]},{...letter,lg:[[1,-1,12,180,0,0,0]]}];
    for(const bad of bads){s.archive={letters:[{...letter,id:'new'},bad]}; assert.throws(()=>ev('importArchive(archive)')); assert.equal(JSON.stringify([...memory]),before);}
    for(const extra of [{me:{lat:NaN,lng:1}},{ports:[{i:'X',a:99,o:0}]},{v:3},{settings:{'lw.v1.scheme':'broken'}},{settings:{'lw.v1.quality':'broken'}}]){
      s.archive={letters:[],...extra}; assert.throws(()=>ev('importArchive(archive)')); assert.equal(JSON.stringify([...memory]),before);
    }
  });
  await test('shape-corrupt persisted arrays do not break selectors',()=>{
    memory.set('lw.v1.letters','{"bad":true}'); memory.set('lw.v1.ports','[null,{"i":"bad"}]');
    assert.equal(ev('store.letters().length'),0); assert.equal(ev('store.ports().length'),0);
    memory.set('lw.v1.letters','bad JSON'); assert.equal(ev('store.letters().length'),0);
  });
  await test('quota failure rolls back persisted import and retains complete session backup',()=>{
    reset(); ev('store.setMe(fixture.me)'); const before=JSON.stringify([...memory]);
    const original=s.DRIFT_LOCAL.setItem; let calls=0;
    s.DRIFT_LOCAL.setItem=(k,v)=>{if(++calls===2) throw Error('QuotaExceededError'); memory.set(k,String(v));};
    s.archive={app:'letter-wind',v:2,letters:[letter],ports:[port]};
    try{assert.equal(ev('importArchive(archive).saved'),false); assert.equal(JSON.stringify([...memory]),before);
      assert.equal(ev('backupData().ports.length'),1); assert.equal(ev('backupData().letters.length'),1);
    }finally{s.DRIFT_LOCAL.setItem=original;}
    const remove=s.DRIFT_LOCAL.removeItem; s.DRIFT_LOCAL.removeItem=()=>{throw Error('blocked');};
    try{assert.equal(ev('wipeLocalData()'),false); assert.equal(ev('store.me()'),null); assert.equal(ev('store.letters().length'),0);}
    finally{s.DRIFT_LOCAL.removeItem=remove;}
  });
  await test('identity/contact write failures notify and remain exportable in-session',()=>{
    reset(); const original=s.DRIFT_LOCAL.setItem; s.DRIFT_LOCAL.setItem=()=>{throw Error('quota');};
    try{notices.length=0; assert.equal(ev('store.setMe(fixture.me)'),false); ev('store.putPort(fixture.port)');
      assert.equal(notices.length,2); assert.equal(ev('backupData().me.pid'),me.pid); assert.equal(ev('backupData().ports.length'),1);
    }finally{s.DRIFT_LOCAL.setItem=original;}
  });
  await test('incoming link remains readable/exportable and warns when persistence fails',async()=>{
    reset(); notices.length=0; const original=s.DRIFT_LOCAL.setItem;
    s.DRIFT_LOCAL.setItem=()=>{throw Error('quota');};
    try{
      await ev('(async()=>ingest(await packPayload(fixture.letter)))()');
      assert.equal(ev('store.saved'),false); assert.equal(ev('backupData().letters[0].bd'),letter.bd);
      assert.equal(notices.length,1); assert(notices[0].includes('ส่งออกไฟล์สำรอง'));
    }finally{s.DRIFT_LOCAL.setItem=original;}
  });
  await test('wipe clears owned keys and all derived caches but preserves unrelated origin data',()=>{
    reset(); ev('store.setMe(fixture.me); store.put(fixture.letter); store.putPort(fixture.port); for(const k of OWN_KEYS) LS.set(k,"1");');
    memory.set('unrelated-app','keep'); ev('for(const c of [_driftCache,_wfCache,_streamCache,_rainCache,_rainMarks,_ssCache]) c.set("old",{});');
    assert.equal(ev('wipeLocalData()'),true); assert.deepEqual([...memory],[['unrelated-app','keep']]);
    assert.equal(ev('[_driftCache,_wfCache,_streamCache,_rainCache,_rainMarks,_ssCache].every(c=>c.size===0)'),true);
  });
  await test('record overwrite invalidates rain/path caches; insertion is bounded',()=>{
    reset(); ev('store.put(fixture.letter); for(const c of [_driftCache,_wfCache,_streamCache,_rainCache,_rainMarks,_ssCache]) c.set(fixture.letter.id,{}); store.put({...fixture.letter,bd:"Replacement"});');
    assert.equal(ev('[_driftCache,_wfCache,_streamCache,_rainCache,_rainMarks,_ssCache].every(c=>c.size===0)'),true);
    assert.equal(ev('(()=>{const c=new Map(); for(let i=0;i<1000;i++) cachePut(c,i,i,24); return c.size;})()'),24);
  });
  await test('plain/compressed ingress bounds reject oversized payload and decompression bomb',async()=>{
    await assert.rejects(()=>ev('unpackPayload("r"+"A".repeat(64000))'));
    s.bomb='z'+zlib.deflateRawSync(Buffer.from(JSON.stringify({bd:'x'.repeat(100000)}))).toString('base64url');
    await assert.rejects(()=>ev('unpackPayload(bomb)'),/too large/);
    assert.equal(await ev('(async()=>{const p=await packPayload(fixture.letter); return (await unpackPayload(p)).id;})()'),letter.id);
  });
  await test('diagnostics redact old/raw bodies, URL fragments and exception text',()=>{
    vm.runInContext(between('function diagnosticMessage(msg){','function logErr(kind,msg,where){'),s);
    assert(!ev('diagnosticMessage("network failed Synthetic private body #zSECRET")').includes('SECRET'));
    assert.equal(ev('diagnosticLocation("https://host/index.html#zSECRET")'),'');
    assert.equal(ev('diagnosticLocation("PRIVATE_BODY.js:9:2")'),'');
    assert.equal(ev('diagnosticLocation("https://host/index.html:17:2#zSECRET")'),'index.html:17:2');
    assert.equal(ev('diagnosticMessage(diagnosticMessage("quota"))'),'พื้นที่เก็บข้อมูลมีปัญหา');
  });
  await test('HTTP failure never becomes valid data; timeout aborts a stalled request',async()=>{
    const fetchBefore=s.fetch, timerBefore=s.setTimeout;
    try{s.fetch=async()=>new Response('bad',{status:503}); await assert.rejects(()=>ev('requestData("fixture")'),/503/);
      s.setTimeout=fn=>setTimeout(fn,10);
      s.fetch=(_url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(Error('timeout'),{name:'AbortError'})),{once:true}));
      await assert.rejects(()=>ev('requestData("stalled")'),/timeout/);
    }finally{s.fetch=fetchBefore;s.setTimeout=timerBefore;}
  });
  await test('manifest is reused while fresh and revalidated after TTL',async()=>{
    const original=s.fetch; let calls=0; const manifest=JSON.parse(fs.readFileSync(path.join(root,'wind/index.json'),'utf8'));
    s.fetch=async()=>{calls++;return new Response(JSON.stringify(manifest));};
    try{ev('_wcMan=null; _wcUntil=0'); await ev('wcManifest()'); await ev('wcManifest()'); assert.equal(calls,1);
      ev('_wcUntil=0'); await ev('wcManifest()'); assert.equal(calls,2);
    }finally{s.fetch=original;}
  });
  await test('origin change ignores old weather response; unknown refresh clears rain and snow',async()=>{
    let current={lat:13.7,lng:100.5}; const waiting=[];
    const ctx=vm.createContext({Date,WCACHE:{TTL:300000},DUST:[],store:{me:()=>current},
      wxAt:()=>new Promise(resolve=>waiting.push(resolve))});
    vm.runInContext('let WIND_HERE=null,WIND_DIR=null,WIND_GUST=null,RAIN_HERE=null,WC_HERE=null,WH_NOTE="",_windEpoch=0,_windUntil=0,_windRequest=null;'
      +between('function windAgain(){','/* หิมะตกอยู่จริงไหม'),ctx);
    const first=vm.runInContext('windHere()',ctx); current={lat:18.8,lng:99}; vm.runInContext('windAgain()',ctx);
    waiting[0]({spd:40,dir:80,gst:50,pre:5,wc:73}); await first;
    assert.equal(vm.runInContext('WC_HERE',ctx),null);
    waiting[1]({spd:12,dir:210,gst:18,pre:0,wc:0}); await vm.runInContext('_windRequest',ctx);
    assert.equal(vm.runInContext('WIND_HERE',ctx),12); assert.equal(vm.runInContext('WC_HERE',ctx),0);
    await vm.runInContext('windHere()',ctx); assert.equal(waiting.length,2);
    const refreshed=vm.runInContext('_windUntil=0; windHere()',ctx); waiting[2](null); await refreshed;
    assert.equal(vm.runInContext('WC_HERE===null&&RAIN_HERE===null&&WIND_HERE===null',ctx),true);
  });
  await test('geocoding aborts old input and ignores responses arriving out of order',async()=>{
    const inp={value:'',addEventListener:(_type,fn)=>inp.input=fn};
    const hits={children:[],_html:'',set innerHTML(v){this._html=v;this.children=[];},get innerHTML(){return this._html;},appendChild(v){this.children.push(v);}};
    const timers=[],jobs=[];
    const ctx=vm.createContext({$:selector=>selector==='input'?inp:hits,
      clearTimeout(){},setTimeout:fn=>{timers.push(fn);return timers.length;},AbortController,
      geocode:(q,signal)=>new Promise(resolve=>jobs.push({q,signal,resolve})),
      esc:v=>v,coarseLL:v=>v,document:{createElement:()=>({})}});
    vm.runInContext(between('function wireSearch(inputSel,hitsSel,onPick){','/* ---------- คลัง / ตัวตน'),ctx);
    vm.runInContext('wireSearch("input","hits",()=>{})',ctx);
    inp.value='old city'; inp.input(); const old=timers[0]();
    inp.value='new city'; inp.input(); const fresh=timers[1](); assert(jobs[0].signal.aborted);
    jobs[1].resolve([{name:'New',place:'New city'}]); await fresh;
    jobs[0].resolve([{name:'Old',place:'Old city'}]); await old;
    assert.equal(hits.children.length,1); assert(hits.children[0].innerHTML.includes('New'));
  });
  await test('inactive hero callbacks schedule no frame',()=>{
    for(const name of ['d','a','x']){
      const context=vm.createContext({[name+'PHASE']:'off',[name+'RAF']:123,
        requestAnimationFrame(){throw Error('idle RAF leaked');}});
      const start=html.indexOf(`function ${name}Tick(`), end=html.indexOf('\n}',start)+2;
      vm.runInContext(html.slice(start,end)+`;${name}Tick();`,context);
      assert.equal(context[name+'RAF'],null);
    }
  });
  await test('service worker owns its caches, ignores error responses and caps wind versions',async()=>{
    const cache=new Map(),deleted=[],handlers={};
    const c={put:async(req,res)=>cache.set(req.url||req,res),keys:async()=>[...cache.keys()].map(url=>({url})),
      delete:async req=>cache.delete(req.url||req),match:async req=>cache.get(req.url||req)};
    const ctx=vm.createContext({URL,Response,self:{location:{origin:'https://test'},clients:{claim(){}},addEventListener:(k,fn)=>handlers[k]=fn},
      caches:{open:async()=>c,keys:async()=>['unrelated-cache','letter-wind-v1','letter-wind-v2'],delete:async k=>deleted.push(k)}});
    vm.runInContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),ctx);
    let pending; handlers.activate({waitUntil:p=>pending=p}); await pending; assert.deepEqual(deleted,['letter-wind-v1']);
    ctx.req={url:'https://test/wind/th.bin?v=bad'}; ctx.res=new Response('bad',{status:500});
    await vm.runInContext('remember(req,res,true)',ctx); assert.equal(cache.size,0);
    for(let i=0;i<9;i++){ctx.req={url:'https://test/wind/th.bin?v='+i};ctx.res=new Response('fixture');await vm.runInContext('remember(req,res,true)',ctx);}
    assert.equal(cache.size,4); assert(cache.has('https://test/wind/th.bin?v=8'));
    for(const url of ['https://test/pencil-world-preview.html','https://test/index.html?qa=living-world-study&renderer=production']){
      handlers.fetch({request:{method:'GET',url},respondWith(){throw Error('Preview must not enter production cache');}});
    }
  });
  const report={date:'2026-10-05',scope:'Synthetic VM and service-worker fixtures; no real profile or external network',passed,tests:results};
  fs.writeFileSync(path.resolve(root,process.argv[2]||'PHASE0_REGRESSION_RESULTS.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
