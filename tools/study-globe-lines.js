'use strict';
// Shared pencil-world math. Embedded in the offline app and used by the study.
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DriftStudyLines=api;
})(typeof window==='object'?window:this,function(){
  function poseKey(g,sun,dpr){
    return [g.rotY,g.rotX,g.zoom,g.R,g.CX,g.CY,g.W,g.H,dpr,sun].join(',');
  }
  function clipHorizon(a,b,front,g){
    const aVisible=front?a.z>=0:a.z<=0,bVisible=front?b.z>=0:b.z<=0;
    if(!aVisible&&!bVisible)return null;
    if(aVisible&&bVisible)return {a,b,t0:0,t1:1};
    const t=a.z/(a.z-b.z),x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
    const len=Math.hypot(x,y);
    if(len<1e-10)return null;
    // The horizon is on the circle, not the interior of its straight chord.
    const edge={x:x/len,y:y/len,z:0,px:g.CX+x/len*g.R,py:g.CY-y/len*g.R};
    return aVisible?{a,b:edge,t0:0,t1:t}:{a:edge,b,t0:t,t1:1};
  }
  // Exact rotation coefficients are shared by all vertices at the same pose.
  function createProjector(){
    let y,x,cy,sy,cx,sx;
    return function projectInto(g,v,out){
      if(y!==g.rotY||x!==g.rotX){y=g.rotY;x=g.rotX;cy=Math.cos(y);sy=Math.sin(y);cx=Math.cos(x);sx=Math.sin(x);}
      const rx=v.x*cy-v.z*sy,rz=v.x*sy+v.z*cy;
      out.x=rx;out.y=v.y*cx-rz*sx;out.z=v.y*sx+rz*cx;
      out.px=g.CX+out.x*g.R;out.py=g.CY-out.y*g.R;
    };
  }
  function createPainter({projectInto}={}){
    const projected=new WeakMap(),pressures=new WeakMap(),bins=160;
    return function paint(g,c,lines,baseA,lw,front,rgb,shade,{pressure=false}={}){
      let weights;
      if(pressure){
        weights=pressures.get(lines);
        if(!weights){weights=lines.map(vertices=>vertices.map(v=>v.pencilWeight??(.98+.15*Math.sin(v.x*18+v.y*13+v.z*7)+.06*Math.sin(v.z*31-v.y*19+v.x*11))));pressures.set(lines,weights);}
      }
      const widthSteps=pressure?3:1;
      const key=poseKey(g,'geometry',1);
      let cached=projected.get(lines);
      if(!cached){
        cached={key:null,lines:lines.map(vertices=>vertices.map(()=>({x:0,y:0,z:0,px:0,py:0})))};
        projected.set(lines,cached);
      }
      if(cached.key!==key){
        for(let k=0;k<lines.length;k++)for(let i=0;i<lines[k].length;i++){
          const v=lines[k][i],out=cached.lines[k][i];
          if(projectInto)projectInto(g,v,out);
          else {const r=g.rotate(v),p=g.project(r);out.x=r.x;out.y=r.y;out.z=r.z;out.px=p.x;out.py=p.y;}
        }
        cached.key=key;
      }
      const batches=new Map();
      for(let k=0;k<lines.length;k++){
        const vertices=lines[k],points=cached.lines[k];
        let previousAlpha=points.length?baseA*shade.call(g,vertices[0],points[0].z)*(pressure?weights[k][0]:1):0;
        for(let i=1;i<points.length;i++){
          const alpha=baseA*shade.call(g,vertices[i],points[i].z)*(pressure?weights[k][i]:1);
          const p0=points[i-1],p1=points[i];
          const visible0=front?p0.z>=0:p0.z<=0,visible1=front?p1.z>=0:p1.z<=0;
          if(visible0||visible1){
            // Most segments never cross the horizon. Reuse their endpoints;
            // only the few crossing segments need an intersection object.
            const cut=visible0&&visible1?null:clipHorizon(p0,p1,front,g);
            if(!(visible0&&visible1)&&!cut){previousAlpha=alpha;continue;}
            const a=cut?cut.a:p0,b=cut?cut.b:p1;
            const outside=(a.px<-8&&b.px<-8)||(a.px>g.W+8&&b.px>g.W+8)
              ||(a.py<-8&&b.py<-8)||(a.py>g.H+8&&b.py>g.H+8);
            if(!outside){
              const meanT=cut?(cut.t0+cut.t1)*.5:.5;
              const bucket=Math.round((previousAlpha+(alpha-previousAlpha)*meanT)*bins);
              if(bucket>0){
                // Width is attached to the world segment, never camera/time/LOD.
                const weight=pressure?(weights[k][i-1]+weights[k][i])*.5:1;
                const width=pressure?(weight<.90?0:weight<1.07?1:2):0,batchKey=bucket*widthSteps+width;
                let batch=batches.get(batchKey);if(!batch)batches.set(batchKey,batch=[]);
                batch.push(a.px,a.py,b.px,b.py);
              }
            }
          }
          previousAlpha=alpha;
        }
      }
      c.save();c.lineWidth=lw;c.lineCap='round';c.lineJoin='round';
      for(const [batchKey,batch] of batches){
        const bucket=Math.floor(batchKey/widthSteps),width=batchKey%widthSteps;
        c.lineWidth=lw*(pressure?[.76,.95,1.13][width]:1);
        c.strokeStyle='rgba('+rgb+','+(bucket/bins).toFixed(5)+')';c.beginPath();
        for(let i=0;i<batch.length;i+=4){c.moveTo(batch[i],batch[i+1]);c.lineTo(batch[i+2],batch[i+3]);}
        c.stroke();
      }
      c.restore();
    };
  }
  // Screen-space sphere shape is static. Keep its normals, edge weights and
  // output pixels; only lighting changes during a camera turn.
  function createSurface(size){
    const pixels=[],data=new Uint8ClampedArray(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const nx=(x+.5)/size*2-1,ny=1-(y+.5)/size*2,q=nx*nx+ny*ny;
      if(q>=1)continue;
      const nz=Math.sqrt(1-q);
      pixels.push({nx,ny,nz,i:(y*size+x)*4,edge:Math.pow(1-nz,3),form:Math.pow(1-nz,2.1),glaze:Math.pow(1-nz,1.5)});
    }
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    return function render({light,dark,variant,sheen,pencil}){
      const halfLength=Math.hypot(light.x,light.y,light.z+1);
      const half=halfLength>1e-5?{x:light.x/halfLength,y:light.y/halfLength,z:(light.z+1)/halfLength}:{x:0,y:0,z:1};
      const base=dark?[68,85,107]:[155,170,181],night=dark?[19,25,39]:[105,119,143];
      const gain=dark?[125,120,107]:[75,66,42],pearl=[255,250,234];
      for(const p of pixels){
        const {nx,ny,nz,i}=p,dot=nx*light.x+ny*light.y+nz*light.z,day=Math.max(0,dot);
        const facing=Math.max(0,nx*half.x+ny*half.y+nz*half.z);
        if(variant==='first'){
          const gloss=Math.pow(facing,22)*.34*Math.min(1,day*6),lift=Math.pow(day,.8)*.13;
          const shade=p.glaze*.21*(.35+.65*Math.min(1,day*4));
          const value=(lift+gloss-shade)*sheen*(dark?1:.8),rgb=value>=0?[255,243,215]:[13,23,40];
          data[i]=rgb[0];data[i+1]=rgb[1];data[i+2]=rgb[2];data[i+3]=Math.round(Math.min(.65,Math.abs(value))*255);
        }else{
          const k=clamp((dot+.40)/.25,0,1),lit=k*k*(3-2*k),diffuse=Math.pow(day,.7);
          const dawn=clamp((dot+.20)/.40,0,1),warm=dawn*dawn*(3-2*dawn);
          const reflection=(Math.pow(facing,10)*.36+Math.pow(facing,42)*.58)*Math.min(1,day*5);
          const edge=p.edge*day,form=pencil?p.form*(.10+.13*(1-day)):0;
          for(let channel=0;channel<3;channel++){
            const body=night[channel]+(base[channel]-night[channel])*warm+gain[channel]*diffuse-edge*(channel===0?14:8);
            data[i+channel]=Math.round((body+(pearl[channel]-body)*reflection)*(1-form));
          }
          data[i+3]=Math.round(clamp(.88*lit*sheen,0,1)*255);
        }
      }
      return data;
    };
  }
  return {poseKey,clipHorizon,createPainter,createProjector,createSurface};
});
