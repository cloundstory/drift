'use strict';
const assert=require('node:assert/strict');
const {geographic,unwrapRing,create}=require('./study-earth-material.js');
const xyz=(lat,lng)=>{const a=lat*Math.PI/180,b=lng*Math.PI/180;return {x:Math.cos(a)*Math.sin(b),y:Math.sin(a),z:Math.cos(a)*Math.cos(b)};};
assert.deepEqual(geographic(xyz(0,0)),{u:.5,v:.5});
assert.ok(Math.abs(geographic(xyz(90,0)).v)<1e-10);
const ring=unwrapRing([xyz(10,170),xyz(10,-170),xyz(-10,-170),xyz(-10,170),xyz(10,170)],1000,500);
assert.ok(Math.max(...ring.map(p=>p.x))-Math.min(...ring.map(p=>p.x))<60,'dateline polygon keeps its narrow footprint');
const polar=unwrapRing([-180,-90,0,90,180].map(lng=>xyz(-70,lng)),1000,500);
assert.equal(polar.at(-1).y,500,'Antarctic ring closes across the south pole');
const makeCanvas=(w,h)=>{
  const ctx={fillStyle:'',beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},
    getImageData(){return {data:new Uint8ClampedArray(w*h*4)};},
    createImageData(){return {data:new Uint8ClampedArray(w*h*4)};},
    putImageData(image){this.image=new Uint8ClampedArray(image.data);}};
  return {width:w,height:h,getContext:kind=>kind==='2d'?ctx:null,ctx};
};
const material=create([],makeCanvas,64,{gpu:false});
assert.equal(material.backend(),'canvas');
assert.equal(material.size,64);
const g={rotY:0,rotX:0,rotate:v=>v},sun={x:0,y:0,z:1};
const day=material.render(g,sun,{dark:true}).ctx.image;
const night=material.render(g,{x:0,y:0,z:-1},{dark:true}).ctx.image;
const center=(32*64+32)*4;
assert.ok(day[center]+day[center+1]+day[center+2]>night[center]+night[center+1]+night[center+2]+100,'daylight stays brighter than night');
assert.equal(day[3],0,'space remains transparent');
assert.equal(day[center+3],255,'world is opaque');
g.rotY=.0001;const moved=material.render(g,sun,{dark:true}).ctx.image;
let difference=0,count=0;for(let i=0;i<day.length;i+=4)if(day[i+3]){for(let k=0;k<3;k++)difference+=Math.abs(day[i+k]-moved[i+k]);count+=3;}
assert.ok(difference/count<1,'world-anchored material changes continuously during a tiny rotation');
const left=material.sample(.000001,.5),right=material.sample(.999999,.5);
assert.ok(Math.max(...left.map((v,i)=>Math.abs(v-right[i])))<.01,'atlas seam is continuous');
console.log('PASS: geographic orientation, dateline footprint, polar closure, Canvas fallback, opaque world, day/night separation, rotation continuity, atlas seam');
