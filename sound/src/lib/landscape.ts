/** Rendering-only history: no random numbers, audio nodes or independent note clock. */
export type LandscapePoint={offset:number;pitch:number;level:number};
export type LandscapeNote={at:number;pitch:number;level:number;length:number;joined?:boolean;pulseOnly?:boolean;curve?:LandscapePoint[];glide?:boolean};
export type LandscapeTrack={index:number;label?:string;color:string;volume:number;mute:boolean;pitched:boolean};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function landscapeValue(note:LandscapeNote,at:number){
 const age=at-note.at;
 if(age<0)return {pitch:note.pitch,level:0};
 let pitch=note.pitch,level=note.level;
 const points=note.curve;
 if(points?.length){
  const position=Math.min(age,note.length);
  let i=0;while(i+1<points.length&&points[i+1].offset<=position)i++;
  const a=points[i],b=points[i+1],mix=b?clamp((position-a.offset)/(b.offset-a.offset),0,1):0;
  pitch=a.pitch+(note.glide&&b?(b.pitch-a.pitch)*mix:0);level=a.level+(b?(b.level-a.level)*mix:0);
 }
 const attack=note.joined?1:clamp(age/.035,0,1),tail=age>note.length?Math.exp(-(age-note.length)/.16):1;
 return {pitch,level:clamp(level*attack*tail,0,1)};
}
export function landscapeWindow(bpm:number,beats:number){return clamp(60/bpm*beats*2,3,14);}
export class LandscapeHistory{
 private lanes:LandscapeNote[][]=Array.from({length:9},()=>[]);
 record(index:number,note:LandscapeNote){
  if(!this.lanes[index]||![note.at,note.pitch,note.level,note.length].every(Number.isFinite))return;
  const lane=this.lanes[index];lane.push({...note,curve:note.curve?.map(p=>({...p}))});
  // Keep enough bounded history for slow, long notes and the longest visible window.
  this.lanes[index]=lane.filter(n=>note.at-n.at<=30).slice(-192);
 }
 release(index:number,at:number){
  for(const note of this.notes(index))if(note.at<=at&&note.at+note.length>at)note.length=Math.max(0,at-note.at);
 }
 clear(){this.lanes.forEach(lane=>lane.length=0);}
 notes(index:number){return this.lanes[index]??[];}
 sample(index:number,at:number){
  const lane=this.notes(index);let current=-1;
  for(let i=lane.length-1;i>=0;i--)if(!lane[i].pulseOnly&&lane[i].at<=at){current=i;break;}
  if(current<0)return {pitch:12,level:0};
  const note=lane[current],value=landscapeValue(note,at);
  if(note.joined&&!note.curve&&current>0){
   let previous:LandscapeNote|undefined;for(let i=current-1;i>=0;i--)if(!lane[i].pulseOnly){previous=lane[i];break;}
   if(previous){const mix=clamp((at-note.at)/.09,0,1);value.pitch=previous.pitch+(value.pitch-previous.pitch)*mix;}
  }
  // Simultaneous chord voices contribute energy together rather than the last tone winning.
  for(let i=current-1;i>=0&&Math.abs(lane[i].at-note.at)<.002;i--){
   const other=landscapeValue(lane[i],at);value.level=Math.min(1,Math.hypot(value.level,other.level));
   value.pitch=(value.pitch+other.pitch)/2;
  }
  return value;
 }
}
/** Rounded ribbon edges rather than hard oscilloscope corners. */
function smoothPath(ctx:CanvasRenderingContext2D,points:{x:number;y:number}[],move=true){
 if(!points.length)return;
 if(move)ctx.moveTo(points[0].x,points[0].y);else ctx.lineTo(points[0].x,points[0].y);
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i];ctx.quadraticCurveTo(a.x,a.y,(a.x+b.x)/2,(a.y+b.y)/2);
 }
 const last=points.at(-1)!;ctx.lineTo(last.x,last.y);
}
export function paintLandscape(ctx:CanvasRenderingContext2D,history:LandscapeHistory,tracks:LandscapeTrack[],time:number,bpm:number,beats:number,dark:boolean,playing:boolean,reduced:boolean,master:number,effect=1){
 ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.lineCap='round';ctx.lineJoin='round';
 const window=landscapeWindow(bpm,beats),left=52,right=648,top=100,bottom=600,spacing=(bottom-top)/Math.max(1,tracks.length);
 const flow=playing&&!reduced?time:0,bloom=clamp(effect,0,1.5);
 for(const [rank,tr] of tracks.entries()){
  const base=top+(rank+.5)*spacing;
  const path:{x:number;y:number;width:number}[]=[];
  const pointAt=(fraction:number)=>{
   const sample=history.sample(tr.index,time-window*(1-fraction));
   const strength=playing&&!tr.mute?sample.level*tr.volume*master:0;
   const pitch=tr.pitched?clamp((sample.pitch-12)/12,-1,1)*Math.min(19,spacing*.32):0;
   // Gentle contours give the rivers depth without pretending to be additional notes.
   const bend=Math.sin(fraction*5.4+rank*.78+flow*.12)*5+Math.sin(fraction*10-rank*.65)*2;
   return {x:left+fraction*(right-left),y:base+bend-pitch,width:1+strength*7,strength};
  };
  for(let i=0;i<=132;i++)path.push(pointAt(i/132));
  const gradient=ctx.createLinearGradient(left,0,right,0);
  gradient.addColorStop(0,tr.color+'00');gradient.addColorStop(.18,tr.color+(dark?'45':'55'));gradient.addColorStop(1,tr.color+(dark?'d0':'e8'));
  ctx.globalAlpha=tr.mute?.2:1;ctx.fillStyle=gradient;ctx.shadowColor=tr.color;ctx.shadowBlur=reduced?0:dark?12:4;
  ctx.beginPath();smoothPath(ctx,path.map(p=>({x:p.x,y:p.y-p.width})));
  smoothPath(ctx,[...path].reverse().map(p=>({x:p.x,y:p.y+p.width})),false);ctx.closePath();ctx.fill();
  ctx.shadowBlur=0;ctx.strokeStyle=gradient;ctx.lineWidth=dark?1.15:1.5;ctx.beginPath();smoothPath(ctx,path);ctx.stroke();
  // Every heard attack has its own short-lived, drifting light, including chord members.
  for(const note of history.notes(tr.index)){
   const age=time-note.at;if(age<0||age>window||!playing||tr.mute)continue;
   const fraction=1-age/window,p=pointAt(fraction),energy=clamp(note.level*tr.volume*master,0,1);
   if(energy<=.005)continue;
   const attack=Math.exp(-age/.38)*bloom,radius=1.8+Math.sqrt(energy)*3.6+attack*2;
   ctx.globalAlpha=(.2+.75*attack)*Math.sqrt(energy);ctx.fillStyle=tr.color;ctx.shadowColor=tr.color;ctx.shadowBlur=reduced?0:(dark?18:8)*(.4+attack);
   // Chord notes keep their individual pitch rather than sharing an averaged head.
   const offset=tr.pitched?clamp((note.pitch-12)/12,-1,1)*Math.min(19,spacing*.32):0;
   const wave=Math.sin(fraction*5.4+rank*.78+flow*.12)*5+Math.sin(fraction*10-rank*.65)*2;
   ctx.beginPath();ctx.arc(p.x,base+wave-offset,radius,0,Math.PI*2);ctx.fill();
  }
  const head=pointAt(1);ctx.globalAlpha=tr.mute?.2:.5+head.strength*.5;ctx.fillStyle=tr.color;
  ctx.shadowColor=tr.color;ctx.shadowBlur=reduced?0:head.strength*24*bloom;ctx.beginPath();ctx.arc(right,head.y,2+head.strength*5,0,Math.PI*2);ctx.fill();
  if(head.strength>.12){ctx.globalAlpha=head.strength;ctx.fillStyle=dark?'#f5ffff':'#fff';ctx.beginPath();ctx.arc(right,head.y,1.5+head.strength*1.8,0,Math.PI*2);ctx.fill();}
  ctx.shadowBlur=0;ctx.globalAlpha=tr.mute?.25:.55;ctx.fillStyle=tr.color;ctx.font='10px system-ui';ctx.textAlign='center';ctx.fillText(tr.label??String(tr.index+1),32,base+4);
 }
 ctx.restore();
}
