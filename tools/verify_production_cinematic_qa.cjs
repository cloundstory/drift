'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {releaseTransition}=require('./release-choreography.js');
const file='PRODUCTION_CINEMATIC_BROWSER_QA.json',r=JSON.parse(fs.readFileSync(file,'utf8'));
assert.equal(r.storageFailure.state.release,'wait');assert.equal(r.storageFailure.state.letters,3);assert(r.storageFailure.state.draft);assert(r.storageFailure.state.actionsVisible);
assert.equal(r.afterCancelReload.state.letters,3);assert(r.afterCancelReload.state.draft);
assert.deepEqual(r.dayPaper.rgba,r.nightPaper.rgba,'substrate pixels identical across schemes');assert.equal(r.dayPaper.candle,'none');assert(r.nightPaper.candle.includes('radial-gradient'));assert.equal(r.dayPaper.ink,r.nightPaper.ink);
assert.equal(r.mobileLayout.width,390);assert(!r.mobileLayout.outerOverflow);assert(r.mobilePaper.width<=390);
assert(r.reducedRelease.state.reduced);assert.equal(r.reducedRelease.state.release,'off');assert.equal(r.reducedRelease.state.letters,4);assert(!r.reducedRelease.state.draft);assert.equal(r.reducedRelease.state.worldOpacity,1);assert.equal(r.reducedRelease.state.zoom,r.reducedRelease.state.targetZoom);
for(const s of [r.shortSwipe,r.mobileShortSwipe]){assert.equal(s.release,'wait');assert.equal(s.progress,0);assert.equal(s.letters,3);assert(s.draft);}
for(const [name,test]of [['desktop',r.desktopRelease],['mobile',r.mobileRelease]]){
 const {state,releaseSamples:samples}=test;assert.equal(state.release,'off');assert.equal(state.flight,1);assert.equal(state.worldOpacity,1);assert.equal(state.zoom,state.targetZoom);assert.equal(state.letters,4);assert(!state.draft);assert.equal(state.sheet,'sent');assert(samples.length>=20);
 let prev=null,overlap=false;
 for(const s of samples){
   const m=releaseTransition(s.flight);assert(Math.abs(s.worldOpacity-m.worldOpacity)<.00051);assert(Math.abs(s.uiOpacity-m.uiOpacity)<.001);assert(Math.abs(s.hintOpacity-m.hintOpacity)<.001);assert(Math.abs(s.zoom/state.zoom-m.zoomFactor)<1e-8);
   assert.equal(s.background,samples[0].background,'palette does not jump at globe appearance');
   if(prev){assert(s.flight>=prev.flight);assert(s.paint.depth>=prev.paint.depth);assert(s.paint.ty<=prev.paint.ty);assert(s.worldOpacity>=prev.worldOpacity);assert(s.zoom<=prev.zoom);}
   if(s.paint.opacity>0&&s.paint.opacity<1&&s.worldOpacity>0)overlap=true;prev=s;
 }
 assert(overlap,name+' paper/globe dissolve overlap');
}
r.passed=true;r.checks=['actual production desktop/mobile gestures','short swipe returns held paper','one durable send per gesture','storage failure stays held; cancel/reload retains draft','identical white substrate across schemes with separate candle light','globe/paper fade overlap and exact final zoom','late UI return matches approved curve','background stays continuous'];r.limits=['Synthetic memory-only profile and fixture network','390 px browser viewport, not a physical phone benchmark','No deployment or messages sent'];
fs.writeFileSync(file,JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify({passed:r.passed,checks:r.checks,desktopSamples:r.desktopRelease.releaseSamples.length,mobileSamples:r.mobileRelease.releaseSamples.length}));
