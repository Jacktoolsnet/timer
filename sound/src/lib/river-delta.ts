import {LandscapeHistory,landscapeValue,landscapeWindow,type LandscapeTrack} from './landscape';

const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const smooth=(n:number)=>{const v=clamp(n,0,1);return v*v*(3-2*v);};
export const deltaSplit=.4;
/** Fractions follow already-heard music downstream, from right to left. */
export function deltaPoint(rank:number,count:number,fraction:number,pitch=12,branch=0,flow=0){
 const f=clamp(fraction,0,1),spacing=460/Math.max(1,count),base=120+(rank+.5)*spacing;
 const spread=smooth((f-deltaSplit)/(1-deltaSplit));
 const bend=Math.sin(f*5.5+rank*.74+flow*.12)*4+Math.sin(f*9-rank*.6)*2;
 const height=clamp((pitch-12)/12,-1,1)*Math.min(16,spacing*.27);
 return {x:650-f*420,y:350+(base-350)*(1-spread*.18)+bend-height+branch*spread*(20+12*f)};
}
export function deltaBranch(index:number,pitch:number,at:number){
 return Math.min(2,Math.floor((Math.sin(at*37+pitch*.71+index*4)+1)*1.5))-1;
}
/** Water arriving at the mouth carries the envelope actually played upstream. */
export function deltaSeaLevel(history:LandscapeHistory,index:number,time:number,travel:number){
 return history.sample(index,time-travel).level;
}
type Point={x:number;y:number;width:number};
function curve(ctx:CanvasRenderingContext2D,points:{x:number;y:number}[],move=true){
 if(!points.length)return;
 if(move)ctx.moveTo(points[0].x,points[0].y);else ctx.lineTo(points[0].x,points[0].y);
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i];ctx.quadraticCurveTo(a.x,a.y,(a.x+b.x)/2,(a.y+b.y)/2);
 }
 const last=points.at(-1)!;ctx.lineTo(last.x,last.y);
}
function ribbon(ctx:CanvasRenderingContext2D,points:Point[]){
 ctx.beginPath();curve(ctx,points.map(p=>({x:p.x,y:p.y-p.width})));
 curve(ctx,[...points].reverse().map(p=>({x:p.x,y:p.y+p.width})),false);ctx.closePath();ctx.fill();
 ctx.beginPath();curve(ctx,points);ctx.stroke();
}
export function paintRiverDelta(ctx:CanvasRenderingContext2D,history:LandscapeHistory,tracks:LandscapeTrack[],time:number,bpm:number,beats:number,dark:boolean,playing:boolean,reduced:boolean,master:number,effect=1){
 ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.lineCap='round';ctx.lineJoin='round';
 const travel=landscapeWindow(bpm,beats),flow=playing&&!reduced?time:0;
 const phase=flow*bpm/60*.65;
 const gains=tracks.map(tr=>playing&&!tr.mute?clamp(tr.volume*2,0,1.5)*clamp(master,0,1)*clamp(effect,0,1.5):0);
 const arrivals=tracks.map((tr,i)=>deltaSeaLevel(history,tr.index,time,reduced?0:travel)*gains[i]);
 // The sea has no hard shoreline: a soft, elliptical wash fades into the tool's background.
 ctx.save();ctx.translate(159,350);ctx.scale(143,263);
 const sea=ctx.createRadialGradient(0,0,0,0,0,1);
 sea.addColorStop(0,dark?'#387b9a44':'#188eac25');sea.addColorStop(.6,dark?'#245d7922':'#188eac14');sea.addColorStop(1,'transparent');
 ctx.fillStyle=sea;ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.save();ctx.beginPath();ctx.ellipse(159,350,143,263,0,0,Math.PI*2);ctx.clip();
 for(const [rank,tr] of tracks.entries()){
  const power=clamp(arrivals[rank],0,1.5),mouth=deltaPoint(rank,tracks.length,1);
  ctx.save();ctx.translate(159,350);ctx.scale(143,263);
  const seaInk=ctx.createRadialGradient(0,0,0,0,0,1);
  seaInk.addColorStop(0,tr.color);seaInk.addColorStop(.5,tr.color);seaInk.addColorStop(.78,tr.color+'80');seaInk.addColorStop(1,tr.color+'00');
  ctx.restore();
  ctx.strokeStyle=seaInk;ctx.shadowColor=tr.color;ctx.shadowBlur=reduced?0:power*(dark?14:5);
  // Broad currents mingle; a sustained envelope supports wider, gentler waves.
  for(let wave=0;wave<3;wave++){
   const points=[];
   for(let k=0;k<=36;k++){
    const f=k/36,x=258-f*226;
    const y=350+(mouth.y-350)*(1-f*.24)+(wave-1)*12+Math.sin(f*Math.PI)*Math.sin(f*8-phase+rank*.8+wave)* (8+f*21+power*10);
    points.push({x,y});
   }
   ctx.globalAlpha=tr.mute?.015:(dark?.025:.035)+power*.06;ctx.lineWidth=10+power*15;
   ctx.beginPath();curve(ctx,points);ctx.stroke();
   ctx.globalAlpha=tr.mute?.035:(dark?.09:.15)+power*.35;ctx.lineWidth=.65+power*1.4;
   ctx.beginPath();curve(ctx,points);ctx.stroke();
  }
  if(!reduced&&gains[rank]>0)for(const note of history.notes(tr.index).slice(-64)){
   if(note.pulseOnly)continue;
   const age=time-note.at-travel;if(age<0||age>2.2)continue;
   const strength=note.level*gains[rank]*Math.min(1,age/.12)*Math.exp(-age*1.65);
   if(strength<.005)continue;
   const p=deltaPoint(rank,tracks.length,1,tr.pitched?note.pitch:12,deltaBranch(tr.index,note.pitch,note.at),flow);
   ctx.globalAlpha=clamp(strength*.7,0,.8);ctx.lineWidth=1+strength;
   ctx.beginPath();ctx.ellipse(p.x-age*18,p.y,5+age*26,3+age*15,0,0,Math.PI*2);ctx.stroke();
  }
 }
 ctx.restore();ctx.shadowBlur=0;
 for(const [rank,tr] of tracks.entries()){
  const gain=gains[rank],samples=Array.from({length:91},(_,k)=>{
   const f=k/90,value=history.sample(tr.index,reduced?time:time-travel*f);
   return {f,pitch:tr.pitched?value.pitch:12,level:value.level*gain};
  });
  const gradient=ctx.createLinearGradient(230,0,650,0);
  gradient.addColorStop(0,tr.color+(dark?'40':'65'));gradient.addColorStop(.4,tr.color+(dark?'90':'ad'));gradient.addColorStop(1,tr.color+(dark?'d0':'e0'));
  ctx.fillStyle=gradient;ctx.strokeStyle=gradient;ctx.shadowColor=tr.color;ctx.shadowBlur=reduced?0:dark?8:3;
  ctx.globalAlpha=tr.mute?.18:1;ctx.lineWidth=dark?.85:1.1;
  const points=(branch:number,start:number,end:number)=>samples.slice(start,end).map(v=>({...deltaPoint(rank,tracks.length,v.f,v.pitch,branch,flow),width:(.75+v.level*6)*(branch===0?1:.65)}));
  ribbon(ctx,points(0,0,37));
  for(const branch of [-1,0,1])ribbon(ctx,points(branch,36,91));
  ctx.shadowBlur=0;
  if(!reduced&&gain>0)for(const note of history.notes(tr.index).slice(-64)){
   const age=time-note.at;if(note.pulseOnly||age<0||age>travel+note.length)continue;
   const branch=deltaBranch(tr.index,note.pitch,note.at),head=clamp(age/travel,0,1);
   // Only the already-performed portion of held/connected notes travels downstream.
   if(note.length>.35){
    const from=clamp((age-note.length)/travel,0,1),points=[];
    for(let k=0;k<=24;k++){
     const f=from+(head-from)*k/24,value=landscapeValue(note,time-travel*f);
     points.push(deltaPoint(rank,tracks.length,f,tr.pitched?value.pitch:12,branch,flow));
    }
    ctx.strokeStyle=tr.color;ctx.globalAlpha=clamp(note.level*gain*.45,0,.6);ctx.lineWidth=2+note.level*gain*3;
    ctx.beginPath();curve(ctx,points);ctx.stroke();
   }
   if(age>travel)continue;
   const energy=clamp(note.level*gain*Math.min(1,age/.035)*Math.pow(1-head,.65),0,1.5);
   if(energy<.005)continue;
   const p=deltaPoint(rank,tracks.length,head,tr.pitched?note.pitch:12,branch,flow);
   ctx.fillStyle=tr.color;ctx.globalAlpha=Math.min(1,energy);ctx.shadowColor=tr.color;ctx.shadowBlur=(dark?20:8)*energy;
   ctx.beginPath();ctx.arc(p.x,p.y,2+energy*3,0,Math.PI*2);ctx.fill();
  }
  ctx.shadowBlur=0;ctx.globalAlpha=tr.mute?.25:.6;ctx.fillStyle=tr.color;ctx.font='10px system-ui';ctx.textAlign='center';
  ctx.fillText(tr.label??String(tr.index+1),672,deltaPoint(rank,tracks.length,0).y+4);
 }
 ctx.restore();
}
