import {groupMemberPoint} from './note-group-view';
export const radarLifetime=2.4;
export type RadarNote={at:number;beat:number;angle:number;level:number;direction:number;kind?:'run'|'chord';member?:number;count?:number};
/** Echoes are driven exclusively by the shared audible-onset clock. */
export class RadarHistory{
 private lanes:RadarNote[][]=Array.from({length:9},()=>[]);
 record(index:number,note:RadarNote){
  if(!this.lanes[index]||![note.at,note.angle,note.level].every(Number.isFinite)||note.level<=0)return;
  this.lanes[index]=[...this.lanes[index].filter(n=>note.at-n.at<radarLifetime),{...note}].slice(-96);
 }
 notes(index:number):readonly RadarNote[]{return this.lanes[index]??[];}
 clear(index?:number){if(index===undefined)this.lanes.forEach(lane=>lane.length=0);else if(this.lanes[index])this.lanes[index].length=0;}
}
export function radarStrength(age:number,level:number,effect=1){
 if(age<0||age>=radarLifetime||level<=0||effect<=0)return 0;
 return Math.min(1,age/.025)*Math.pow(1-age/radarLifetime,2)*Math.min(1.3,(.35+.65*Math.sqrt(Math.min(1,level)))*Math.min(1.5,effect));
}
export function radarPoint(radius:number,note:RadarNote){
 return groupMemberPoint(radius,note.angle,note.kind??'run',note.member??0,note.count??1);
}
/** No idle rings, grid dots or continuously visible pointer: every mark fades to zero. */
export function paintOrbitRadar(ctx:CanvasRenderingContext2D,notes:readonly RadarNote[],radius:number,color:string,time:number,gain:number,muted:boolean,dark:boolean,reduced:boolean,effect=1){
 if(muted||gain<=0||effect<=0)return;
 ctx.save();ctx.lineCap='round';ctx.shadowColor=color;
 for(const note of notes){
  const level=Math.max(0,Math.min(1.5,note.level*gain)),strength=radarStrength(time-note.at,level,effect);
  if(strength<=0)continue;
  const point=radarPoint(radius,note),direction=note.direction<0?-1:1;
  if(!reduced){
   // A phosphor-like trace remains behind the struck point, not a new sequencer.
   const segments=12;
   for(let k=segments;k>0;k--){
    ctx.globalAlpha=strength*Math.pow(1-k/(segments+1),1.5)*.75;ctx.strokeStyle=color;ctx.lineWidth=2+strength*4;ctx.shadowBlur=0;
    ctx.beginPath();ctx.arc(350,350,point.radius,note.angle-direction*k*.72/segments,note.angle-direction*(k-1)*.72/segments,direction<0);ctx.stroke();
   }
   const halo=ctx.createRadialGradient(point.x,point.y,0,point.x,point.y,18+strength*24);
   halo.addColorStop(0,color);halo.addColorStop(.35,color+'99');halo.addColorStop(1,color+'00');
   ctx.shadowBlur=0;ctx.globalAlpha=Math.min(1,strength*.7);ctx.fillStyle=halo;ctx.beginPath();ctx.arc(point.x,point.y,18+strength*24,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=Math.min(1,strength);ctx.fillStyle=color;ctx.shadowBlur=0;
  const head=3+Math.sqrt(level)*3;
  ctx.beginPath();ctx.arc(point.x,point.y,head,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;ctx.globalAlpha=Math.min(1,strength*1.25);ctx.fillStyle=dark?'#f5ffff':'#fff';
  ctx.beginPath();ctx.arc(point.x,point.y,Math.max(1,head*.4),0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}
