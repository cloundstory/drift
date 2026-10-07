'use strict';
// Real transaction/storage helpers, synthetic records; no browser or external API.
const {sandbox:s,root,between,memory}=require('./audit_phase0.cjs');
const vm=require('node:vm'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const checks=[];
async function test(name,fn){await fn();checks.push(name);}
const ev=code=>vm.runInContext(code,s);
const base={id:'release-fixture',f:{n:'Writer',p:'Bangkok',la:13.7,lo:100.5},t:{n:'Reader',p:'Chiang Mai',la:18.8,lo:99},
  s:1,th:6,ct:0,lg:[[6,0,12,180,0,0,0,18,0]],lo:-1,bd:'Synthetic draft'};
const ctx=vm.createContext({});vm.runInContext(between('function createReleaseTransaction(','const DRAFT_KEY='),ctx);
function fixture({pack=async r=>'payload-'+r.s,save=()=>true,fresh=()=>true}={}){
  let now=1000;const writes=[],tx=ctx.createReleaseTransaction(base,{now:()=>now,pack,fresh,save:r=>{writes.push(r);return save(r);}});
  return {tx,writes,time:t=>{now=t;}};
}
(async()=>{
  await test('prepared and cancelled paper has no stored journey or start clock',async()=>{
    const f=fixture();assert.equal(f.tx.snapshot().phase,'prepared');assert.equal(f.writes.length,0);
    assert(f.tx.cancel());await assert.rejects(f.tx.commit(),e=>e.code==='cancelled');assert.equal(f.writes.length,0);
  });
  await test('gesture time sets s and concurrent/repeated commits save exactly once',async()=>{
    const f=fixture();f.time(8500);const [a,b]=await Promise.all([f.tx.commit(),f.tx.commit()]);
    assert.equal(a.rec.s,8500);assert.equal(a,b);assert.equal(f.writes.length,1);
    f.time(9000);assert.equal(await f.tx.commit(),a);assert.equal(f.writes.length,1);assert.equal(f.tx.cancel(),false);
    assert.deepEqual(JSON.parse(JSON.stringify(a.rec.lg)),base.lg);assert.equal(a.rec.id,base.id);
  });
  await test('pack failure cannot save and preserves retry with a new release timestamp',async()=>{
    let count=0;const f=fixture({pack:async()=>{if(++count===1)throw Error('packing');return 'packed';}});
    await assert.rejects(f.tx.commit(),/packing/);assert.equal(f.writes.length,0);assert.equal(f.tx.snapshot().phase,'prepared');
    f.time(2000);assert.equal((await f.tx.commit()).rec.s,2000);assert.equal(f.writes.length,1);
  });
  await test('cancellation during compression prevents any durable write',async()=>{
    let resolve;const f=fixture({pack:()=>new Promise(r=>resolve=r)}),job=f.tx.commit();
    assert(f.tx.cancel());resolve('packed');await assert.rejects(job,e=>e.code==='cancelled');assert.equal(f.writes.length,0);
  });
  await test('stale prepared weather stops before packing or saving',async()=>{
    let packs=0;const f=fixture({fresh:()=>false,pack:()=>{packs++;}});
    await assert.rejects(f.tx.commit(),e=>e.code==='stale');assert.equal(packs,0);assert.equal(f.writes.length,0);
  });
  await test('storage failure does not report committed; explicit retry can succeed',async()=>{
    let available=false;const f=fixture({save:()=>available});
    await assert.rejects(f.tx.commit(),e=>e.code==='storage');assert.equal(f.tx.snapshot().phase,'prepared');
    available=true;f.time(6000);assert.equal((await f.tx.commit()).rec.s,6000);assert.equal(f.tx.snapshot().phase,'committed');
  });
  await test('failed critical write keeps draft; failed cleanup still commits one durable journey',async()=>{
    memory.clear();ev('for(const k of Object.keys(memo)) delete memo[k]; LIST_CACHE.clear();');
    s.rec=base;s.draft={v:1,ownerPid:'WRITER0000000001',preparedAt:1000,record:base,tp:'READER0000000001'};
    ev('LS.set(DRAFT_KEY,JSON.stringify(draft));');const before=JSON.stringify([...memory]);
    const original=s.DRIFT_LOCAL.setItem;let calls=0;
    s.DRIFT_LOCAL.setItem=(k,v)=>{if(++calls===1)throw Error('quota');memory.set(k,String(v));};
    try{assert.equal(ev('saveReleasedRecord(rec,draft.tp)'),false);assert.equal(ev('store.letters().length'),0);
      assert.equal(ev('readPreparedDraft().record.bd'),base.bd);assert.equal(JSON.stringify([...memory]),before);
    }finally{s.DRIFT_LOCAL.setItem=original;}
    calls=0;s.DRIFT_LOCAL.setItem=(k,v)=>{if(++calls===2)throw Error('cleanup quota');memory.set(k,String(v));};
    try{assert.equal(ev('saveReleasedRecord(rec,draft.tp)'),true);}finally{s.DRIFT_LOCAL.setItem=original;}
    assert.equal(ev('store.letters().length'),1);
    assert.equal(ev('readPreparedDraft()'),null);assert.equal(ev('store.letters()[0].tp'),'READER0000000001');
    assert(JSON.parse(memory.get('lw.v1.draft')),'interrupted cleanup leaves the old draft in durable storage');
    ev('for(const k of Object.keys(memo)) delete memo[k]; LIST_CACHE.clear();');
    assert.equal(ev('readPreparedDraft()'),null,'reload must not resurrect a committed id');
    assert.equal(ev('store.letters().length'),1);
    assert.throws(()=>ev('saveReleasedRecord(rec,draft.tp)'),/duplicate release/);
  });
  await test('draft survives reload and backup/import; never counts as a sent letter',async()=>{
    memory.clear();ev('for(const k of Object.keys(memo)) delete memo[k]; LIST_CACHE.clear();');
    s.profile={name:'Writer',place:'Bangkok',lat:13.7,lng:100.5,pid:'WRITER0000000001'};
    ev('store.setMe(profile); LS.set(DRAFT_KEY,JSON.stringify(draft));');
    ev('for(const k of Object.keys(memo)) delete memo[k]; LIST_CACHE.clear();');
    assert.equal(ev('readPreparedDraft().record.bd'),base.bd);assert.equal(ev('store.letters().length'),0);
    const backup=ev('backupData()');assert(backup.draft);assert.equal(backup.letters.length,0);
    memory.clear();ev('for(const k of Object.keys(memo)) delete memo[k]; LIST_CACHE.clear();');s.archive=backup;
    assert.equal(ev('importArchive(archive).saved'),true);assert.equal(ev('readPreparedDraft().record.id'),base.id);
    assert.equal(ev('store.letters().length'),0);
  });
  await test('corrupt draft is rejected before import changes persisted data',async()=>{
    const before=JSON.stringify([...memory]);s.archive={letters:[],draft:{...s.draft,record:{...base,th:0}}};
    assert.throws(()=>ev('importArchive(archive)'),/draft/);assert.equal(JSON.stringify([...memory]),before);
  });
  const report={passed:true,date:new Date().toISOString(),scope:'Synthetic release transactions, real storage/backup helpers; no provider or user profile',checks};
  fs.writeFileSync(path.join(root,'PHASE2_RELEASE_TESTS.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
