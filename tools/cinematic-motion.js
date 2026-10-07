/* Study choreography, independent of delivery time / simulation. Units: seconds,
   viewport fractions, radians. No persistence, fetch, random frame noise, or RAF. */
(function(root){
 'use strict';
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const ease=x=>{x=clamp(x);return x*x*x*(x*(6*x-15)+10);};
 const mix=(a,b,t)=>a+(b-a)*t;
 const PI=Math.PI;
 const base={x:0,y:0,z:0,rx:-.05,ry:.04,rz:-.025,curl:.09,wind:.08,op:1,world:0,zoom:1.25,shadow:0,contact:0};
 function keys(t,frames){
   let a=frames[0],b=a;
   for(let i=1;i<frames.length;i++){b=frames[i];if(t<=b[0])break;a=b;}
   const u=b[0]===a[0]?1:clamp((t-a[0])/(b[0]-a[0]));
   const A={...base,...a[1]},B={...base,...b[1]},out={},ia=frames.indexOf(a),ib=frames.indexOf(b),span=b[0]-a[0];
   // Monotone cubic Hermite: continuous velocity through a traveling shot,
   // zero tangents at a held pose / change of direction, no spatial overshoot.
   function slope(i,k){
     if(i===0||i===frames.length-1)return 0;
     const p=frames[i-1],v=frames[i],n=frames[i+1],h0=v[0]-p[0],h1=n[0]-v[0];
     const val=f=>f[1][k]??base[k],d0=(val(v)-val(p))/h0,d1=(val(n)-val(v))/h1;
     if(d0*d1<=0)return 0;const w0=2*h1+h0,w1=h1+2*h0;return (w0+w1)/(w0/d0+w1/d1);
   }
   for(const k of Object.keys(base))out[k]=(2*u*u*u-3*u*u+1)*A[k]+(u*u*u-2*u*u+u)*span*slope(ia,k)+(-2*u*u*u+3*u*u)*B[k]+(u*u*u-u*u)*span*slope(ib,k);
   return out;
 }
 function duration(scene,direction){return scene==='release'?(direction==='C'?5.9:7.2):scene==='arrival'?(direction==='C'?6.4:8.0):0;}
 function sample(scene,t,direction='B',speed=18,reduced=false,pick=0){
   const w=clamp(speed/45), flowing=direction==='C';
   t=clamp(t,0,duration(scene,direction));
   if(scene==='paper')return {...base,rx:-.06,ry:-.13,rz:-.038,curl:.075,wind:0,phase:'material'};
   if(reduced){
     if(scene==='release')return {...base,world:t>.4?1:0,op:t>.4?0:1,wind:0,phase:t>.4?'world':'hold'};
     return {...base,rx:pick>0?-.05:PI,wind:0,phase:pick>0?'read':'wait',shadow:0};
   }
   if(scene==='release'){
     // The camera follows only part of the lift. Paper continues rising in world
     // space while its screen motion briefly eases; it never reverses gravity.
     const d=flowing?5.9:7.2, q=t/d;
     const s=keys(q,[
       [0,{shadow:.46}],
       [.14,{y:-.014,z:-18,rx:-.10,ry:.055,rz:-.04,curl:.23,wind:.12+w*.09,shadow:.22}],
       [.32,{x:.06,y:-.10,z:90,rx:-.27,ry:.22,rz:.11,curl:.31,wind:.14+w*.20}],
       [.60,{x:.18,y:-.23,z:690,rx:-.37,ry:.63,rz:.24,curl:.43,wind:.18+w*.24}],
       [.75,{x:.24,y:-.34,z:2050,rx:-.49,ry:.98,rz:.30,curl:.58,wind:.18+w*.25,op:0}],
       [.82,{x:.24,y:-.34,z:2050,rx:-.49,ry:.98,rz:.30,curl:.58,op:0,world:1,zoom:1.17}],
       [1,{op:0,world:1,zoom:1.02}]
     ]);
     const flight=ease((q-.14)/.61)*(1-ease((q-.69)/.06));
     s.x+=flight*w*.016*(Math.sin(t*1.37)+.42*Math.sin(t*2.17+.5));
     s.rz+=flight*w*.07*Math.sin(t*1.37+.9);
     if(flowing){s.x*=.57;s.y*=.76;s.z*=.76;s.ry*=.86;}
     return {...s,phase:q<.14?'edge':q<.32?'lift':q<.75?'glide':q<.82?'cut':'world'};
   }
   if(scene==='arrival'){
     const d=flowing?6.4:8.0,q=t/d;
     const end={x:.035,y:.21,z:0,rx:PI/2+.15,ry:.025,rz:-.09,curl:.025,wind:0,shadow:.62,contact:1};
     const far={x:-.16,y:-.27,z:1900,rx:1.08,ry:-.22,rz:-.22,curl:.26,wind:.18+w*.16};
     const s=keys(q,[
       [0,{...far,world:1,op:0,zoom:1.10}],
       [.14,{...far,world:1,op:0,zoom:1.20}],
       [.22,far],
       [.44,{x:.15,y:-.11,z:850,rx:1.28,ry:.27,rz:.17,curl:.22,wind:.16+w*.20}],
       [.67,{x:-.055,y:.10,z:170,rx:1.44,ry:-.12,rz:-.13,curl:.14,wind:.13+w*.11,shadow:.25}],
       [.84,{...end,curl:.08,wind:.045,shadow:.56}],
       [.92,end],[1,end]
     ]);
     // A damped flex after contact is applied to the edge, never to a floating
     // sheet center. At rest there is no sinusoidal bobbing above the surface.
     if(q>=.84&&q<.92){const u=(q-.84)/.08;s.curl+=.06*Math.exp(-u*5)*Math.sin(u*10)*(1-u);}
     if(flowing){const track=1-ease((q-.67)/.17);s.x*=1-.42*track;s.z*=1-.10*track;s.rz*=1-.12*track;}
     if(pick>0){
       const e=ease(pick);for(const k of ['x','y','z','rx','ry','rz','curl','shadow','contact'])s[k]=mix(end[k],k==='rx'?-.035:k==='ry'?.025:k==='curl'?.04:0,e);
       s.wind=.02*(1-e);s.op=1;s.world=0;
       return {...s,phase:pick>=1?'read':'pick'};
     }
     return {...s,phase:q<.14?'world':q<.22?'approach':q<.67?'glide':q<.84?'descend':q<.92?'contact':'wait'};
   }
   return {...base,phase:'hold'};
 }
 const {releaseFrame,releaseTransition}=typeof module!=='undefined'&&module.exports?require('./release-choreography.js'):root.DriftRelease;
 const api={sample,duration,ease,releaseFrame,releaseTransition};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DriftCinema=api;
})(typeof globalThis!=='undefined'?globalThis:this);
