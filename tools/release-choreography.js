/* Approved departure math. Pure viewport framing; no delivery clock, storage, network or RAF. */
(function(root){
 'use strict';
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const ease=x=>{x=clamp(x);return x*x*x*(x*(6*x-15)+10);};
 const PI=Math.PI;
 function releaseFrame(flight,height,pose,direction='B'){
   const q=clamp(flight/.70),follow=Math.pow(Math.sin(q*PI),2)*(direction==='C'?.19:.30);
   const lifted=clamp((-pose.ty-height*.10)/(height*.45));
   // Follow the distance traveled beyond the held sheet, not its initial
   // camera distance. This prevents an eased lift from creeping back to hand.
   return {...pose,tx:pose.tx*(1-follow*.42),ty:pose.ty+height*.13*follow*lifted,tz:-90+(pose.tz+90)*(1-follow*.43)};
 }
 // A longer hand-to-wind departure followed by a soft dissolve. The world is
 // already emerging before the tiny distant sheet fades completely; its zoom
 // and opacity settle with zero velocity before returning to the app loop.
 function releaseTransition(flight,direction='B'){
   const q=clamp(flight),worldProgress=clamp((q-.50)/.49);
   return {duration:direction==='C'?4600:5400,travel:ease(q/.72),
     paperOpacity:1-ease((q-.55)/.17),worldProgress,worldOpacity:ease(worldProgress),
     zoomFactor:1+.26*(1-ease(worldProgress)),
     hintOpacity:1-ease((q-.28)/.34),uiOpacity:ease((q-.85)/.15)};
 }

 const api={releaseFrame,releaseTransition};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DriftRelease=api;
})(typeof globalThis!=='undefined'?globalThis:this);
