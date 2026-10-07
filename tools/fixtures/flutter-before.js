function meshPoints(W,H,t,wind,cols,rows){
  const sway=8+wind*46, freq=1.2+wind*3.2, speed=.6+wind*2.6, flap=wind*wind;
  const pts=[];
  for(let r=0;r<=rows;r++){
    const row=[], v=r/rows;
    for(let c=0;c<=cols;c++){
      const u=c/cols;
      let x=(u-.5)*W, y=(v-.5)*H;
      const ripple=Math.sin(u*freq*Math.PI*2+v*1.5-t*speed);
      const edge=Math.pow(u,1.6);
      const cornerBoost=1+flap*edge*Math.abs(v-.5)*2.4;
      x+=ripple*sway*.25*(.4+edge);
      const z=ripple*(sway*.5)*edge*cornerBoost;
      y+=z*.35;
      x+=Math.sin(v*Math.PI)*-sway*.15;
      row.push({x,y,z,u,v});
    }
    pts.push(row);
  }
  return {pts,sway};
}
const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const c255=v=>Math.max(0,Math.min(255,v))|0;

/* จดหมายปลิว (ใช้ตอนพยากรณ์/ส่ง) — LOD ใกล้: mesh เต็ม ฉบับเดียวเท่านั้น */
/* ---------- สีของกระดาษ (ข้อ 130) ----------
   📌 ต่างจาก SKIN ตรงที่กระดาษ *มีเนื้อของตัวเอง* — alpha .72-.9 คือทึบจริง
      ลูกโลกเป็นฟิล์มบนพื้นแอป (ทึบ 4-12%) แต่กระดาษเป็นวัตถุ
      โหมดมืดจึงต้อง *หรี่กระดาษลง* ไม่ใช่เพิ่มความทึบเหมือนลูกโลก (ข้อ 129.2)
   ⚠️ ต้องอยู่เหนือ drawFlutter ที่ใช้มัน — const ไม่ยกขึ้นเหมือน function (ข้อ 106.6)
   ⓘ fresh/aged เป็น array เพราะ mix() ต้องการตัวเลข ไม่ใช่สตริง */
const PAPER = {
  fresh: [236,234,225],   /* กระดาษที่เพิ่งเขียน */
  aged:  [206,190,150],   /* กระดาษที่เดินทางมานาน */
  line:  '43,43,47',      /* เส้นบรรทัดกับตัวหนังสือ */
  edge:  '80,72,58',      /* ขอบที่ลมตีจนงอ */

  /* กระดาษเต็มจอของหน้าเขียน/หน้าอ่าน — คนละค่ากับกระดาษเล็กบนลูกโลก
     ⚠️ ตัวนี้ทึบ 100% (rgb ไม่มี alpha) คือแผ่นที่คนจ้องนานที่สุด
        และเป็นต้นเหตุของ "แสงจ้าตอนกลางคืน" ที่ทำให้ต้องมีโหมดมืดตั้งแต่แรก */
  sheetFresh: [243,239,230],
  sheetAged:  [216,203,171],
};

function drawFlutter(ctx,cx,cy,W,H,t,wind,age,traces){
  const cols=12, rows=15;
  const {pts,sway}=meshPoints(W,H,t,wind,cols,rows);
  const tilt=(wind-.35)*.5;
  const base=mix(PAPER.fresh,PAPER.aged,age*.85);
  ctx.save();
  ctx.translate(cx+Math.sin(t*.4)*(4+wind*16), cy+Math.sin(t*.33+9.1)*(3+wind*9));
  ctx.rotate(tilt*.4+Math.sin(t*.5+3)*.03);
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
    const p00=pts[r][c],p10=pts[r][c+1],p11=pts[r+1][c+1],p01=pts[r+1][c];
    const zAvg=(p00.z+p10.z+p11.z+p01.z)/4;
    const shade=clamp(zAvg/(sway*.6+.001),-1,1), lift=shade*22;
    ctx.beginPath();ctx.moveTo(p00.x,p00.y);ctx.lineTo(p10.x,p10.y);ctx.lineTo(p11.x,p11.y);ctx.lineTo(p01.x,p01.y);ctx.closePath();
    ctx.fillStyle='rgba('+c255(base[0]+lift)+','+c255(base[1]+lift)+','+c255(base[2]+lift)+','+(.9-Math.max(0,shade)*.18)+')';
    ctx.fill();
  }
  ctx.strokeStyle='rgba('+PAPER.line+','+(.32-age*.12)+')';ctx.lineWidth=1;
  for(let r=3;r<rows-2;r+=2){
    if(r%6===5) continue;
    ctx.beginPath();
    const cEnd=cols-1-(r%3);
    for(let c=1;c<=cEnd;c++){ const p=pts[r][c]; c===1?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y); }
    ctx.stroke();
  }
  if(traces&&traces.rain>0.02) rainBlooms(ctx,traces.rain,(u,v)=>pts[Math.round(v*rows)][Math.round(u*cols)],1);
  if(wind>.5){
    ctx.strokeStyle='rgba('+PAPER.edge+','+((wind-.5)*.5)+')';ctx.lineWidth=1.2;
    ctx.beginPath();
    for(let r=0;r<=rows;r++){ const p=pts[r][cols]; r===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y); }
    ctx.stroke();
  }
  ctx.restore();
}

