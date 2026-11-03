import {noteHeadRadius,noteIsSounding,paintNoteLength,noteLengthSweep} from './note-shape';
import {noteGlow} from './note-glow';
export type GroupMemberView={time:number;angle:number;length:number;velocity:number;note:number|null;played?:boolean};
export function groupMemberPoint(radius:number,angle:number,kind:'run'|'chord',member:number,count:number){
 const r=radius+(kind==='chord'?(member-(count-1)/2)*6.5:0);
 return {x:350+Math.cos(angle)*r,y:350+Math.sin(angle)*r,radius:r};
}
/** Individual group heads stay unconnected for a calmer orbit. */
export function paintNoteGroup(ctx:CanvasRenderingContext2D,radius:number,kind:'run'|'chord',members:readonly GroupMemberView[],direction:number,color:string,time:number,barSeconds:number,volume:number,master:number,playing:boolean,muted:boolean,dark:boolean,reduced:boolean,effect:number){
 if(!members.length)return;
 ctx.save();
 members.forEach((n,index)=>{
  const p=groupMemberPoint(radius,n.angle,kind,index,members.length);
  const audible=playing&&n.played===true&&!muted&&volume>0&&master>0;
  const sounding=audible&&noteIsSounding(time,n.time,n.length);
  paintNoteLength(ctx,p.radius,n.angle,noteLengthSweep(n.length,barSeconds),direction,color,sounding,muted,dark,2.8);
  const pulse=noteGlow((time-n.time)*1000,volume*n.velocity*master,audible,reduced,effect);
  const size=noteHeadRadius(volume*n.velocity)*.72+pulse*2;
  ctx.globalAlpha=muted?.25:1;ctx.shadowColor=color;ctx.shadowBlur=(dark?5:2)+pulse*17;
  ctx.fillStyle=color;ctx.strokeStyle=color;ctx.lineWidth=1;
  ctx.beginPath();ctx.arc(p.x,p.y,size,0,Math.PI*2);ctx.fill();ctx.stroke();
  if(pulse>0){
   const halo=ctx.createRadialGradient(p.x,p.y,1,p.x,p.y,8+pulse*12);
   halo.addColorStop(0,color+'bb');halo.addColorStop(1,color+'00');
   ctx.globalAlpha=pulse;ctx.fillStyle=halo;ctx.beginPath();ctx.arc(p.x,p.y,8+pulse*12,0,Math.PI*2);ctx.fill();
   ctx.globalAlpha=pulse;ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(p.x,p.y,1.5+pulse*2,0,Math.PI*2);ctx.fill();
  }
 });
 ctx.restore();
}
