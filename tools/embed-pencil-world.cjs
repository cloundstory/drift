'use strict';
// Keep the offline, single-file app and the study on the same tested math.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const blocks=[['PENCIL_MATH','study-globe-lines.js'],['RELEASE_CHOREOGRAPHY','release-choreography.js'],['PENCIL_WORLD','pencil-world.js']];
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const [name,file] of blocks){
  const source=fs.readFileSync(path.join(__dirname,file),'utf8').trim();
  const start='/* BEGIN '+name+' */',end='/* END '+name+' */';
  const block=start+'\n'+source+'\n'+end;
  const a=html.indexOf(start),b=html.indexOf(end);
  if(a>=0&&b>=a)html=html.slice(0,a)+block+html.slice(b+end.length);
  else if(name==='PENCIL_MATH'||name==='RELEASE_CHOREOGRAPHY'){
    const at=html.indexOf('<script>',html.indexOf('<body'));
    if(at<0)throw new Error('Missing application script');
    html=html.slice(0,at)+'<script>\n'+block+'\n</script>\n'+html.slice(at);
  }else html=html.replace('\nbootRoute();','\n'+block+'\nif(!DRIFT_IS_STUDY) installPencilWorld();\n\nbootRoute();');
}
if(process.argv.includes('--check')){
  if(html!==fs.readFileSync(path.join(root,'index.html'),'utf8'))throw new Error('Run node tools/embed-pencil-world.cjs');
}else fs.writeFileSync(path.join(root,'index.html'),html);
