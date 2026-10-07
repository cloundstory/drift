'use strict';
// Procedural study material, using the application's existing geographic rings.
// The atlas is built once. Nothing is fetched, persisted, or animated separately.
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DriftEarthMaterial=api;
})(typeof window==='object'?window:this,function(){
  const TAU=Math.PI*2;
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  function smooth(a,b,v){const t=clamp((v-a)/(b-a));return t*t*(3-2*t);}
  function geographic(v){return {u:(Math.atan2(v.x,v.z)/TAU+.5),v:.5-Math.asin(clamp(v.y,-1,1))/Math.PI};}
  function unwrapRing(vertices,width,height){
    const points=[];let prior;
    for(const p of vertices){const uv=geographic(p);let x=uv.u*width;
      if(prior!==undefined){while(x-prior>width/2)x-=width;while(x-prior<-width/2)x+=width;}
      points.push({x,y:uv.v*height});prior=x;
    }
    if(points.length>2&&Math.abs(points.at(-1).x-points[0].x)>width*.6){
      const pole=points.reduce((s,p)=>s+p.y,0)/points.length>height/2?height:0;
      points.push({x:points.at(-1).x,y:pole},{x:points[0].x,y:pole});
    }
    return points;
  }
  function create(coasts,makeCanvas,size=224,{gpu:useGPU=true}={}){
    const aw=1536,ah=768,atlas=makeCanvas(aw,ah),ac=atlas.getContext('2d',{willReadFrequently:true});
    ac.fillStyle='#fff';
    for(const ring of coasts){const points=unwrapRing(ring,aw,ah);if(points.length<3)continue;
      for(const offset of [-aw*2,-aw,0,aw,aw*2]){ac.beginPath();ac.moveTo(points[0].x+offset,points[0].y);
        for(let i=1;i<points.length;i++)ac.lineTo(points[i].x+offset,points[i].y);ac.closePath();ac.fill();}
    }
    const raw=ac.getImageData(0,0,aw,ah).data,field=new Uint8Array(aw*ah*3);
    for(let y=0;y<ah;y++){
      const latitude=(.5-(y+.5)/ah)*Math.PI,cy=Math.cos(latitude),sy=Math.sin(latitude);
      for(let x=0;x<aw;x++){
        const longitude=((x+.5)/aw-.5)*TAU,wx=cy*Math.sin(longitude),wz=cy*Math.cos(longitude),i=(y*aw+x)*3;
        field[i]=raw[(y*aw+x)*4+3];
        // Smooth spherical fields: grain stays on the land and joins at the seam.
        const n=Math.sin(wx*24+sy*17+wz*11)*Math.sin(wz*19-sy*13+wx*7);
        field[i+1]=Math.round(127+n*76);
        const cloud=Math.sin(wx*8+sy*13+wz*4)+.55*Math.sin(wz*17-sy*9+wx*6);
        field[i+2]=Math.round(smooth(.35,1.35,cloud)*255);
      }
    }
    const gpu=useGPU?createGPU(field,aw,ah,makeCanvas,512):null;
    const canvas=makeCanvas(size,size),ctx=canvas.getContext('2d'),image=ctx.createImageData(size,size);
    const normals=[];
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const nx=(x+.5)/size*2-1,ny=1-(y+.5)/size*2,q=nx*nx+ny*ny;
      if(q<1)normals.push({i:(y*size+x)*4,x:nx,y:ny,z:Math.sqrt(1-q)});
    }
    function sample(u,v,values=[]){
      const fx=((u%1+1)%1)*aw-.5,fy=clamp(v)*(ah-1),x0=Math.floor(fx),y0=Math.floor(fy),tx=fx-x0,ty=fy-y0;
      const xa=(x0+aw)%aw,xb=(xa+1)%aw,yb=Math.min(ah-1,y0+1);
      const a=(y0*aw+xa)*3,b=(y0*aw+xb)*3,c=(yb*aw+xa)*3,d=(yb*aw+xb)*3;
      for(let k=0;k<3;k++)values[k]=((field[a+k]*(1-tx)+field[b+k]*tx)*(1-ty)+(field[c+k]*(1-tx)+field[d+k]*tx)*ty)/255;
      return values;
    }
    function render(g,sun,{dark=true,weather='clear',sheen=1}={}){
      if(gpu&&gpu.usable())return gpu.render(g,sun,{dark,weather,sheen});
      const light=g.rotate(sun),hLen=Math.hypot(light.x,light.y,light.z+1)||1;
      const hx=light.x/hLen,hy=light.y/hLen,hz=(light.z+1)/hLen;
      const cx=Math.cos(g.rotX),sx=Math.sin(g.rotX),cy=Math.cos(g.rotY),sy=Math.sin(g.rotY);
      const ocean=dark?[37,58,80]:[69,99,123],land=dark?[129,139,137]:[157,161,149];
      const oceanGain=[63,77,84],landGain=[86,74,51],night=dark?[15,23,36]:[60,74,93];
      const atmosphere=[136,169,206],gold=[227,166,97],pearl=[250,240,211];
      const tex=new Float64Array(3);
      for(const n of normals){
        const wy=n.y*cx+n.z*sx,z1=-n.y*sx+n.z*cx,wx=n.x*cy+z1*sy,wz=-n.x*sy+z1*cy;
        const latitude=Math.asin(clamp(wy,-1,1));
        sample(Math.atan2(wx,wz)/TAU+.5,.5-latitude/Math.PI,tex);
        const ground=tex[0],noise=(tex[1]-.5)*2;
        const dot=n.x*light.x+n.y*light.y+n.z*light.z,day=Math.max(0,dot),lit=smooth(-.20,.24,dot);
        const diffuse=Math.pow(day,.63),half=Math.max(0,n.x*hx+n.y*hy+n.z*hz);
        const h2=half*half,h4=h2*h2,h8=h4*h4,h16=h8*h8,h32=h16*h16,h64=h32*h32;
        const gloss=(h16*.16+h64*h16*h8*h4*h2*.46)*(1-ground*.94)*smooth(0,.17,dot)*sheen;
        const limb=Math.pow(1-n.z,3.3)*(.09+.23*smooth(-.2,.5,dot));
        const dusk=Math.exp(-Math.pow((dot+.015)/.105,2))*.10*(.3+.7*n.z);
        const ice=smooth(1.10,1.48,Math.abs(latitude))*.38;
        const cloud=tex[2]*(weather==='rain'?.10:weather==='snow'?.075:.045)*lit;
        for(let k=0;k<3;k++){
          const albedo=ocean[k]+(land[k]-ocean[k])*ground;
          const gain=oceanGain[k]+(landGain[k]-oceanGain[k])*ground;
          let body=night[k]+(albedo+gain*diffuse-night[k])*lit;
          body+=noise*(ground*8.0+.85)*lit;
          body+=(pearl[k]-body)*gloss;
          body+=(pearl[k]-body)*ice*lit;
          body+=(pearl[k]-body)*cloud;
          body+=(atmosphere[k]-body)*limb;
          body+=(gold[k]-body)*dusk;
          image.data[n.i+k]=body;
        }
        image.data[n.i+3]=255;
      }
      ctx.putImageData(image,0,0);return canvas;
    }
    return {render,sample,get size(){return gpu&&gpu.usable()?512:size;},backend:()=>gpu&&gpu.usable()?'webgl':'canvas',landCoverage:field.filter((v,i)=>i%3===0&&v>127).length/(aw*ah)};
  }
  function createGPU(field,aw,ah,makeCanvas,size){
    const canvas=makeCanvas(size,size);
    let gl;try{gl=canvas.getContext('webgl',{alpha:true,antialias:false,preserveDrawingBuffer:true,depth:false,stencil:false});}catch(_){return null;}
    if(!gl)return null;
    let lost=false;canvas.addEventListener('webglcontextlost',()=>{lost=true;});
    const vertex='attribute vec2 p; varying vec2 uv; void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
    const fragment=`precision highp float;
      varying vec2 uv; uniform sampler2D atlas; uniform vec3 light; uniform vec4 rotation;
      uniform float dark,cloudWeight,sheen;
      float soft(float a,float b,float v){float t=clamp((v-a)/(b-a),0.,1.);return t*t*(3.-2.*t);}
      void main(){
        vec2 q=uv*2.-1.;float radius=dot(q,q);if(radius>=1.){gl_FragColor=vec4(0.);return;}
        vec3 n=vec3(q,sqrt(1.-radius));
        float wy=n.y*rotation.x+n.z*rotation.y,z1=-n.y*rotation.y+n.z*rotation.x;
        vec3 world=vec3(n.x*rotation.z+z1*rotation.w,wy,-n.x*rotation.w+z1*rotation.z);
        float latitude=asin(clamp(wy,-1.,1.));
        vec3 tex=texture2D(atlas,vec2(atan(world.x,world.z)/6.28318530718+.5,.5-latitude/3.14159265359)).rgb;
        float ground=tex.r,noise=(tex.g-.5)*2.,d=dot(n,light),day=max(0.,d),lit=soft(-.20,.24,d);
        float diffuse=pow(day,.63),facing=max(0.,dot(n,normalize(light+vec3(0.,0.,1.00001))));
        float gloss=(pow(facing,16.)*.16+pow(facing,94.)*.46)*(1.-ground*.94)*soft(0.,.17,d)*sheen;
        float limb=pow(1.-n.z,3.3)*(.09+.23*soft(-.2,.5,d));
        float dusk=exp(-pow((d+.015)/.105,2.))*.10*(.3+.7*n.z);
        float ice=soft(1.10,1.48,abs(latitude))*.38;
        vec3 ocean=mix(vec3(69.,99.,123.),vec3(37.,58.,80.),dark);
        vec3 land=mix(vec3(157.,161.,149.),vec3(129.,139.,137.),dark);
        vec3 night=mix(vec3(60.,74.,93.),vec3(15.,23.,36.),dark),pearl=vec3(250.,240.,211.);
        vec3 body=mix(night,mix(ocean,land,ground)+mix(vec3(63.,77.,84.),vec3(86.,74.,51.),ground)*diffuse,lit);
        body+=noise*(ground*8.+.85)*lit;
        body=mix(body,pearl,gloss);body=mix(body,pearl,ice*lit);
        body=mix(body,pearl,tex.b*cloudWeight*lit);
        body=mix(body,vec3(136.,169.,206.),limb);body=mix(body,vec3(227.,166.,97.),dusk);
        gl_FragColor=vec4(body/255.,1.);
      }`;
    function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);throw Error('Material shader unavailable');}return shader;}
    let program;try{
      program=gl.createProgram();const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
      gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Material program unavailable');
    }catch(_){if(program)gl.deleteProgram(program);return null;}
    gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    // RGBA uploads are portable in WebGL 1, including odd atlas row widths.
    const pixels=new Uint8Array(aw*ah*4);for(let i=0,j=0;i<field.length;i+=3,j+=4){pixels[j]=field[i];pixels[j+1]=field[i+1];pixels[j+2]=field[i+2];pixels[j+3]=255;}
    const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,aw,ah,0,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    const uniforms=Object.fromEntries(['light','rotation','dark','cloudWeight','sheen'].map(key=>[key,gl.getUniformLocation(program,key)]));
    gl.viewport(0,0,size,size);
    return {gl,usable:()=>!lost&&!gl.isContextLost(),render(g,sun,scene){
      const light=g.rotate(sun);gl.useProgram(program);
      gl.uniform3f(uniforms.light,light.x,light.y,light.z);
      gl.uniform4f(uniforms.rotation,Math.cos(g.rotX),Math.sin(g.rotX),Math.cos(g.rotY),Math.sin(g.rotY));
      gl.uniform1f(uniforms.dark,scene.dark?1:0);gl.uniform1f(uniforms.sheen,scene.sheen);
      gl.uniform1f(uniforms.cloudWeight,scene.weather==='rain'?.10:scene.weather==='snow'?.075:.045);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);return canvas;
    }};
  }
  return {create,geographic,unwrapRing,smooth};
});
