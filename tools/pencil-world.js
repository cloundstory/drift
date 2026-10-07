'use strict';
// Chosen B: pencil lines, soft light and weather occlusion. Installed once,
// only in the app; comparison viewers retain their original renderer.
function installPencilWorld(){
  const scene={strength:1,sheen:1.5,surface:'pencil-detail',get dark(){return !!schemeNow;},get weather(){return snowNow()?'snow':RAIN_HERE>0?'rain':'clear';}};
  const preset={haze:.12,rim:.16,foreground:12,starCount:75,starAlpha:.44,starSize:.55,parallax:.055,grain:.025,dark:['#202735','#303747'],light:['#f0ece2','#e2e5e3']};
  const originals={renderGlobe,dust,rain,snow,splash,paint:G.paint,cities:G.cities};
  const home={y:108*RAD,x:19*RAD};
  let seed=4415;
  function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  const distant=Array.from({length:112},()=>({x:rnd(),y:rnd(),r:.25+rnd()*.68,a:.25+rnd()*.7,phase:rnd()*Math.PI*2,rate:.17+rnd()*.27,depth:rnd()>.75?1:0}));
  const near=Array.from({length:17},()=>({x:rnd(),y:rnd(),r:.65+rnd()*.9,phase:rnd()*Math.PI*2,depth:.35+rnd()*.65}));
  const texture=document.createElement('canvas');texture.width=texture.height=128;
  const textureCtx=texture.getContext('2d'),noise=textureCtx.createImageData(128,128);
  for(let i=0;i<noise.data.length;i+=4){const v=rnd()>.5?255:0;noise.data[i]=noise.data[i+1]=noise.data[i+2]=v;noise.data[i+3]=70+Math.floor(rnd()*110);}
  textureCtx.putImageData(noise,0,0);
  const fixedGrain=textureCtx.createPattern(texture,'repeat');
  const stableLines=window.DriftStudyLines,paintLines=stableLines.createPainter({projectInto:stableLines.createProjector()});
  function config(){return preset;}
  const detailMarks=Array.from({length:900},(_,i)=>{
    const y=1-2*(i+.5)/900,lat=Math.asin(y),lng=i*2.399963229728653;
    const normal={x:Math.cos(lat)*Math.sin(lng),y,z:Math.cos(lat)*Math.cos(lng)};
    const east={x:Math.cos(lng),y:0,z:-Math.sin(lng)},north={x:-y*Math.sin(lng),y:Math.cos(lat),z:-y*Math.cos(lng)};
    const angle=.57+.19*Math.sin(i*1.73),length=.015+.023*(.5+.5*Math.sin(i*2.13));
    const tangent={x:east.x*Math.cos(angle)+north.x*Math.sin(angle),y:north.y*Math.sin(angle),z:east.z*Math.cos(angle)+north.z*Math.sin(angle)};
    const across={x:east.x*Math.sin(angle)-north.x*Math.cos(angle),y:-north.y*Math.cos(angle),z:east.z*Math.sin(angle)-north.z*Math.cos(angle)};
    return [-1,-.28,.28,1].map((t,k)=>{
      const arc=t*length,bend=.0035*Math.sin(i*.83)*(1-t*t);
      const x=normal.x*Math.cos(arc)+tangent.x*Math.sin(arc)+across.x*bend,y=normal.y*Math.cos(arc)+tangent.y*Math.sin(arc)+across.y*bend,z=normal.z*Math.cos(arc)+tangent.z*Math.sin(arc)+across.z*bend,n=Math.hypot(x,y,z);
      return {x:x/n,y:y/n,z:z/n,pencilWeight:[.48,1.04,.98,.36][k]};
    });
  });
  function graphite(ctx){
    if(!scene.sheen)return;
    const sun=sunVec();
    function midtone(v,z){const d=v.x*sun.x+v.y*sun.y+v.z*sun.z;return clamp((d+.15)/.45,0,1)*(1-clamp((d-.35)/.65,0,1)*.8)*Math.sqrt(Math.max(0,z));}
    paintLines(G,ctx,detailMarks,.112*scene.sheen,.57,true,'40,45,56',midtone,{pressure:true});
    paintLines(G,ctx,detailMarks,.027*scene.sheen,.45,true,'182,192,204',G.shadeNight,{pressure:true});
  }
  // Mask whole primitives (including a drop's tail), not just their centre.
  // Simulation continues behind the world; routes and weather on the world stay visible.
  function outsideWorld(ctx,draw,box={w:W,h:H,x:G.CX,y:G.CY,r:G.R}){
    ctx.save();
    try{
      ctx.beginPath();ctx.rect(0,0,box.w,box.h);
      ctx.arc(box.x,box.y,box.r,0,Math.PI*2,true);ctx.clip('evenodd');draw();
    }finally{ctx.restore();}
  }
  for(const name of ['dust','rain','snow','splash']){
    const draw=originals[name];
    const wrapped=(ctx,dt)=>outsideWorld(ctx,()=>draw(ctx,dt));
    if(name==='dust')dust=wrapped;else if(name==='rain')rain=wrapped;else if(name==='snow')snow=wrapped;else splash=wrapped;
  }
  // Small normal/half-vector material map, baked only when G.paint's existing
  // camera/solar cache invalidates. No per-frame pixel pass or new frame owner.
  const surface=document.createElement('canvas');surface.width=surface.height=192;
  const surfaceCtx=surface.getContext('2d'),surfaceImage=surfaceCtx.createImageData(surface.width,surface.height);
  const renderSurface=stableLines.createSurface(surface.width);
  function material(ctx){
    if(!scene.sheen)return;
    surfaceImage.data.set(renderSurface({light:G.rotate(sunVec()),dark:scene.dark,variant:scene.surface,sheen:scene.sheen,pencil:true}));
    surfaceCtx.putImageData(surfaceImage,0,0);
    ctx.save();ctx.beginPath();ctx.arc(G.CX,G.CY,G.R,0,Math.PI*2);ctx.clip();
    ctx.drawImage(surface,G.CX-G.R,G.CY-G.R,G.R*2,G.R*2);graphite(ctx);ctx.restore();
  }
  let painting=false,materialDrawn=false;
  const lineDiagnostics={paints:0,fastPaints:0,detailSwitches:0,maxPoseLagPx:0,last:null,recent:[]};
  G.paint=function(ctx,fast){
    const start=performance.now();painting=true;materialDrawn=false;
    try{return originals.paint.call(this,ctx,fast);}finally{
      painting=false;const last=lineDiagnostics.last;
      if(last&&last.fast!==fast)lineDiagnostics.detailSwitches++;
      const entry={y:this.rotY,x:this.rotX,zoom:this.zoom,fast,costMs:performance.now()-start};
      lineDiagnostics.last=entry;lineDiagnostics.paints++;if(fast)lineDiagnostics.fastPaints++;
      lineDiagnostics.recent.push(entry);if(lineDiagnostics.recent.length>120)lineDiagnostics.recent.shift();
    }
  };
  G.segs=function(ctx,lines,a,lw,front,...args){
    // Surface goes above the old day/night film but below front coast/grid lines.
    if(painting&&front&&!materialDrawn){materialDrawn=true;material(ctx);}
    // Geographic coordinates and weather sampling remain available internally.
    if(lines===GRID)return;
    const pressure=front&&lines!==GRID;
    return paintLines(this,ctx,lines,a*(pressure?.94:1),lw,front,args[1],args[2],{pressure});
  };
  function cameraOffset(k){let d=G.rotY-home.y;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return {x:clamp(d*G.R0*k,-32,32),y:clamp((G.rotX-home.x)*G.R0*k,-22,22)};}
  function atmosphere(ctx,front){
    const p=config(),weight=scene.strength*QUALITY.effects().atmosphere;
    if(!weight)return;
    const t=T,off=cameraOffset(.05),cloud=scene.weather==='clear'?1:1.6;
    if(!front){
      const bands=QUALITY.effects().atmosphere<1?1:2;
      ctx.save();
      for(let i=0;i<bands;i++){
        const x=W*(i===0?.18:.82)+off.x+Math.sin(t*.035+i*2.7)*W*.018;
        const y=H*(i===0?.31:.64)+off.y+Math.sin(t*.024+i)*H*.012;
        ctx.save();ctx.translate(x,y);ctx.scale(1,.30+i*.1);
        const radius=Math.max(W,H)*(.46+i*.04),g=ctx.createRadialGradient(0,0,0,0,0,radius);
        const color=scene.dark?(i===0?'198,154,84':'142,157,177'):(i===0?'180,157,119':'135,156,174');
        g.addColorStop(0,'rgba('+color+','+(p.haze*weight*cloud*(scene.dark?1:.6))+')');g.addColorStop(1,'rgba('+color+',0)');
        ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();ctx.restore();
      }
      ctx.restore();return;
    }
    // Narrow rim stays behind journey/weather and never covers a letter.
    const breathe=1+Math.sin(t*.12)*.025+Math.sin(t*.071+1.4)*.014;
    const r=G.R,outer=r*(1.025+.006*breathe),alpha=p.rim*weight*(scene.dark?1:.5)*breathe*.36;
    const rgb='198,165,113';
    const glow=ctx.createRadialGradient(G.CX,G.CY,r*.985,G.CX,G.CY,outer);
    glow.addColorStop(0,'rgba('+rgb+',0)');glow.addColorStop(.24,'rgba('+rgb+','+alpha+')');glow.addColorStop(1,'rgba('+rgb+',0)');
    ctx.save();ctx.fillStyle=glow;ctx.beginPath();ctx.arc(G.CX,G.CY,outer,0,Math.PI*2);ctx.arc(G.CX,G.CY,r*.985,0,Math.PI*2,true);ctx.fill();ctx.restore();
  }
  grain=function(ctx){
    ctx.save();ctx.globalAlpha=config().grain;ctx.fillStyle=fixedGrain;ctx.fillRect(0,0,W,H);ctx.restore();atmosphere(ctx,false);
  };
  stars=function(ctx,dt){
    if(!scene.dark)return;
    const p=config(),off=cameraOffset(.02),weatherFade=scene.weather==='clear'?1:.12;
    const solar=G.pipeV(sunVec()),sunFade=1-clamp(solar.z,0,1)*.75;
    ctx.save();
    for(let i=0;i<qualityCount(p.starCount,'distant');i++){
      const s=distant[i],depth=1;
      const x=s.x*W+off.x*depth,y=s.y*H+off.y*depth;
      if(Math.hypot(x-G.CX,y-G.CY)<G.R*1.085)continue;
      const flicker=.83+.09*Math.sin(T*s.rate+s.phase)+.04*Math.sin(T*s.rate*.43+s.phase*1.7);
      ctx.globalAlpha=p.starAlpha*s.a*flicker*weatherFade*sunFade;
      ctx.fillStyle=s.depth?'#ecdcc1':'#bcc8dc';ctx.beginPath();ctx.arc(x,y,s.r*p.starSize*depth,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  };
  let skyPalette=null;
  paintSky=function(){
    const p=config(),palette=scene.dark?p.dark:p.light;
    const key=palette.join(',');
    if(skyPalette!==key){skyPalette=key;document.body.style.background='linear-gradient(150deg,'+palette[0]+','+palette[1]+')';}
  };
  G.sphere=function(ctx){
    atmosphere(ctx,true);
      // One stable topology during drag and rest. Exact pose keeps the baked
      // coast/grid aligned with the live routes; 2x sampling smooths thin strokes.
      const dpr=2,key='pencil-world:'+stableLines.poseKey(this,sunKey(),dpr);
      if(!this._cv){this._cv=document.createElement('canvas');this._cx=this._cv.getContext('2d');}
      if(this._key!==key){
        this._key=key;
        const width=Math.round(this.W*dpr),height=Math.round(this.H*dpr);
        if(this._cv.width!==width||this._cv.height!==height){this._cv.width=width;this._cv.height=height;}
        this._cx.setTransform(dpr,0,0,dpr,0,0);this._cx.clearRect(0,0,this.W,this.H);
        this.paint(this._cx,false);
      }
      ctx.drawImage(this._cv,0,0,this.W,this.H);this.liftNight(ctx);
      if(this.terminator())this.cities(ctx,false);
    const last=lineDiagnostics.last;
    if(last)lineDiagnostics.maxPoseLagPx=Math.max(lineDiagnostics.maxPoseLagPx,this.R*Math.hypot(this.rotY-last.y,this.rotX-last.x));
  };
  G.cities=function(ctx,fast){ctx.save();ctx.globalAlpha=.94;originals.cities.call(this,ctx,fast);ctx.restore();};
  function foreground(ctx){
    if(scene.weather!=='clear'||!scene.strength||WIND_HERE==null||WIND_HERE<=0)return;
    const p=config(),off=cameraOffset(p.parallax),t=T,flow=(WIND_DIR+180)*RAD;
    ctx.save();
    ctx.beginPath();ctx.rect(0,0,W,H);ctx.arc(G.CX,G.CY,G.R,0,Math.PI*2,true);ctx.clip('evenodd');
    for(let i=0;i<qualityCount(p.foreground,'foreground');i++){
      const a=near[i],speed=.007+a.depth*.006;
      const x=((a.x+t*speed*Math.sin(flow))%1+1)%1*W+off.x*a.depth;
      const y=((a.y-t*speed*.22)%1+1)%1*H+off.y*a.depth+Math.sin(t*.11+a.phase)*3;
      ctx.globalAlpha=(scene.dark?.11:.07)*scene.strength*(.6+a.depth*.4);
      ctx.fillStyle=scene.dark?'#d5c8ad':'#776a55';ctx.beginPath();ctx.arc(x,y,a.r*(.8+a.depth*.3),0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  renderGlobe=function(dt){
    const result=originals.renderGlobe(dt);
    if(!sheetOpen&&!heroActive())foreground(sctx);
    return result;
  };

  // B changes the world palette only. Paper, routes and real solar time retain
  // the app's theme and journey logic. Theme changes invalidate the same cache.
  const originalScheme=applyScheme;
  applyScheme=function(dark){originalScheme(dark);CFG.FOG=dark?.18:.44;if(dark){SKIN.atmo='198,161,102';SKIN.cityGlow='226,172,88';}G._key=null;};
  applyScheme(!!schemeNow);
  return {snapshot:()=>({style:'B / pencil-detail',gridVisible:false,sheen:scene.sheen,marks:detailMarks.length,verticesPerMark:4,worldAnchored:true,occlusion:true,cacheSampling:2,lines:{paints:lineDiagnostics.paints,fastPaints:lineDiagnostics.fastPaints,detailSwitches:lineDiagnostics.detailSwitches,maxPoseLagPx:lineDiagnostics.maxPoseLagPx},particles:{stars:qualityCount(preset.starCount,'distant'),foreground:qualityCount(preset.foreground,'foreground')},reduced:REDUCED}),outsideWorld};
}
