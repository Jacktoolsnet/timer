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
function ribbon(ctx:CanvasRenderingContext2D,points:Point[],outline=true){
 ctx.beginPath();curve(ctx,points.map(p=>({x:p.x,y:p.y-p.width})));
 curve(ctx,[...points].reverse().map(p=>({x:p.x,y:p.y+p.width})),false);ctx.closePath();ctx.fill();
 if(outline){ctx.beginPath();curve(ctx,points);ctx.stroke();}
}
/** Energy-weighted common water colour; independent of instrument draw order. */
export function deltaMixedColor(sources:{color:string;weight:number}[]){
 let total=0,r=0,g=0,b=0;
 for(const {color,weight} of sources){
  if(!/^#[0-9a-f]{6}$/i.test(color)||!Number.isFinite(weight)||weight<=0)continue;
  total+=weight;r+=parseInt(color.slice(1,3),16)*weight;g+=parseInt(color.slice(3,5),16)*weight;b+=parseInt(color.slice(5,7),16)*weight;
 }
 return total?'#'+[r,g,b].map(v=>Math.round(v/total).toString(16).padStart(2,'0')).join(''):'#4b798b';
}
export function deltaFanWidth(count:number,fraction:number,energy:number){
 const opening=smooth((fraction-deltaSplit)/(1-deltaSplit)),river=.75+clamp(energy,0,1.5)*6;
 return river+opening*(Math.max(32,Math.min(126,460/Math.max(1,count)*.85))+clamp(energy,0,1.5)*16-river);
}
/** Create and use the gradient within the same transform, retaining a soft elliptical edge. */
function colourWash(ctx:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string,opacity:number){
 if(opacity<=0)return;
 ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);ctx.shadowBlur=0;
 const paint=ctx.createRadialGradient(0,0,0,0,0,1);
 paint.addColorStop(0,color);paint.addColorStop(.38,color+'e0');paint.addColorStop(.72,color+'80');paint.addColorStop(1,color+'00');
 ctx.fillStyle=paint;ctx.globalAlpha=clamp(opacity,0,1);ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();ctx.restore();
}
export function paintRiverDelta(ctx:CanvasRenderingContext2D,history:LandscapeHistory,tracks:LandscapeTrack[],time:number,bpm:number,beats:number,dark:boolean,playing:boolean,reduced:boolean,master:number,effect=1){
 ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.lineCap='round';ctx.lineJoin='round';
 const travel=landscapeWindow(bpm,beats),flow=playing&&!reduced?time:0;
 const phase=flow*bpm/60*.65;
 const gains=tracks.map(tr=>playing&&!tr.mute?clamp(tr.volume*2,0,1.5)*clamp(master,0,1)*clamp(effect,0,1.5):0);
 const arrivals=tracks.map((tr,i)=>deltaSeaLevel(history,tr.index,time,reduced?0:travel)*gains[i]);
 // A continuous common colour field, with incoming hues diffusing through it.
 const sources=tracks.flatMap((tr,i)=>tr.mute||tr.volume<=0?[]:[{color:tr.color,weight:.12+arrivals[i]}]);
 const mixed=deltaMixedColor(sources),powerSum=arrivals.reduce((sum,p)=>sum+p,0)/Math.max(1,tracks.length);
 colourWash(ctx,159,350,147,267,mixed,(dark?.38:.3)+clamp(powerSum,0,1)*.22);
 for(const [rank,tr] of tracks.entries()){
  const power=clamp(arrivals[rank],0,1.5),mouth=deltaPoint(rank,tracks.length,1);
  if(tr.mute||tr.volume<=0)continue;
  const drift=reduced?0:Math.sin(phase*.6+rank*.8)*power;
  // Large overlapping plumes mix the river colours instead of drawing separate wave lines.
  colourWash(ctx,157+drift*8,350+(mouth.y-350)*.64+drift*7,139,126+power*24,tr.color,(dark?.13:.16)+power*.13);
  colourWash(ctx,220+drift*4,mouth.y,104,70+power*20,tr.color,(dark?.14:.18)+power*.14);
  if(!reduced&&gains[rank]>0)for(const note of history.notes(tr.index).slice(-64)){
   if(note.pulseOnly)continue;
   const age=time-note.at-travel;if(age<0||age>2.2)continue;
   const strength=note.level*gains[rank]*Math.min(1,age/.12)*Math.exp(-age*1.65);
   if(strength<.005)continue;
   const p=deltaPoint(rank,tracks.length,1,tr.pitched?note.pitch:12,deltaBranch(tr.index,note.pitch,note.at),flow);
   // Short impacts spread as soft filled colour blooms, not hard outlined rings.
   ctx.save();ctx.beginPath();ctx.ellipse(p.x-age*18,p.y,12+age*30,10+age*22,0,0,Math.PI*2);ctx.clip();
   colourWash(ctx,p.x-age*18,p.y,12+age*30,10+age*22,tr.color,strength*.35);ctx.restore();
  }
 }
 ctx.shadowBlur=0;
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
  // Each river opens into a filled fan. Neighbouring fans overlap before joining the sea.
  const fan=samples.slice(36).map(v=>({...deltaPoint(rank,tracks.length,v.f,v.pitch,0,flow),width:deltaFanWidth(tracks.length,v.f,v.level)}));
  const fanPaint=ctx.createLinearGradient(230,0,482,0);
  fanPaint.addColorStop(0,tr.color+'00');fanPaint.addColorStop(.12,tr.color+'dd');fanPaint.addColorStop(.5,tr.color+'b0');fanPaint.addColorStop(1,tr.color+'30');
  ctx.fillStyle=fanPaint;ctx.shadowBlur=0;ctx.globalAlpha=tr.mute?.025:dark?.52:.62;ribbon(ctx,fan,false);
  // Keep only faint channels inside the colour surface to suggest the direction of flow.
  ctx.fillStyle=gradient;ctx.strokeStyle=gradient;ctx.globalAlpha=tr.mute?.05:dark?.14:.18;
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
    ctx.strokeStyle=tr.color;ctx.globalAlpha=clamp(note.level*gain*.3,0,.45);ctx.lineWidth=2+note.level*gain*3;
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
