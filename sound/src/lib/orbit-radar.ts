import {groupMemberPoint} from './note-group-view';
import {gridFractionAtTime} from './track-grid';
export const radarLifetime=2.4;
export type RadarNote={at:number;beat:number;angle:number;level:number;direction:number;kind?:'run'|'chord';member?:number;count?:number;motion?:{turnSeconds:number;clock:number;slots:number;beats:number;swing:number}};
/** Echoes are driven exclusively by the shared audible-onset clock. */
export class RadarHistory{
 private lanes:RadarNote[][]=Array.from({length:9},()=>[]);
 record(index:number,note:RadarNote){
  if(!this.lanes[index]||![note.at,note.angle,note.level].every(Number.isFinite)||note.level<=0)return;
  this.lanes[index]=[...this.lanes[index].filter(n=>note.at-n.at<radarLifetime),{...note,motion:note.motion?{...note.motion}:undefined}].slice(-96);
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
/** Continue from the audible onset, preserving the lane's tempo, swing and direction.
 * The trail grows out of the struck note; it never appears ahead of the sweep.
 */
export function radarSweep(note:RadarNote,time:number){
 const age=Math.max(0,time-note.at),m=note.motion;
 const travel=m&&m.turnSeconds>0
  ?Math.max(0,gridFractionAtTime(m.clock+age/m.turnSeconds,m.slots,m.beats,m.swing)-gridFractionAtTime(m.clock,m.slots,m.beats,m.swing))*Math.PI*2
  :age/2*Math.PI*2;
 return {angle:note.angle+(note.direction<0?-1:1)*travel,length:Math.min(.72,travel)};
}
/** Short, audible-onset-only flash; quiet grid crossings must not trigger it. */
export function radarHeadPulse(notes:readonly RadarNote[],time:number,gain:number,effect=1){
 if(gain<=0||effect<=0)return 0;
 let pulse=0;
 for(const note of notes){
  const age=time-note.at;
  if(age>=0&&age<.22)pulse=Math.max(pulse,Math.pow(1-age/.22,2)*Math.min(1,note.level*gain*effect));
 }
 return pulse;
}
/** One persistent transport head per lane, independent of the fading note echoes. */
export function paintRadarHead(ctx:CanvasRenderingContext2D,radius:number,color:string,angle:number,pulse:number,dark:boolean,muted=false){
 const flash=muted?0:Math.max(0,Math.min(1,pulse)),x=350+Math.cos(angle)*radius,y=350+Math.sin(angle)*radius,
   haloRadius=8+flash*14;
 ctx.save();ctx.shadowBlur=0;
 const halo=ctx.createRadialGradient(x,y,0,x,y,haloRadius);
 halo.addColorStop(0,color);halo.addColorStop(.3,color+'88');halo.addColorStop(1,color+'00');
 ctx.globalAlpha=(muted?.12:dark?.3:.4)+flash*.55;ctx.fillStyle=halo;
 ctx.beginPath();ctx.arc(x,y,haloRadius,0,Math.PI*2);ctx.fill();
 ctx.globalAlpha=muted?.3:Math.min(1,.8+flash*.2);ctx.fillStyle=color;
 ctx.beginPath();ctx.arc(x,y,3.2+flash*1.5,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=dark?'#f5ffff':'#fff';ctx.beginPath();ctx.arc(x,y,1.4+flash*.8,0,Math.PI*2);ctx.fill();
 ctx.restore();
}
/** Note echoes and their fog trails fade completely; the transport head is painted separately. */
export function paintOrbitRadar(ctx:CanvasRenderingContext2D,notes:readonly RadarNote[],radius:number,color:string,time:number,gain:number,muted:boolean,dark:boolean,reduced:boolean,effect=1,spacing=27){
 if(muted||gain<=0||effect<=0)return;
 ctx.save();ctx.lineCap='round';ctx.shadowColor=color;
 for(const note of notes){
  const level=Math.max(0,Math.min(1.5,note.level*gain)),strength=radarStrength(time-note.at,level,effect);
  if(strength<=0)continue;
  const point=radarPoint(radius,note),direction=note.direction<0?-1:1;
  if(!reduced){
   // The moving head leaves its trail behind; the original note remains a fixed echo.
   const sweep=radarSweep(note,time),headPoint=radarPoint(point.radius,{...note,angle:sweep.angle,kind:'run',member:0,count:1});
   // Overlapping feathered puffs form a fog ribbon without expensive canvas blur.
   // Its soft edge reaches neighbouring lanes; sparse layouts stay bounded.
   const fogRadius=Math.min(72,Math.max(24,spacing*1.5)),segments=12;
   for(let k=segments;k>0;k--){
    const angle=sweep.angle-direction*(k-.5)*sweep.length/segments,
      x=350+Math.cos(angle)*point.radius,y=350+Math.sin(angle)*point.radius,
      fog=ctx.createRadialGradient(x,y,0,x,y,fogRadius);
    fog.addColorStop(0,color);fog.addColorStop(.25,color+'bb');fog.addColorStop(.65,color+'44');fog.addColorStop(1,color+'00');
    // Grow the mist smoothly from zero length, rather than stacking twelve puffs at the onset.
    ctx.globalAlpha=strength*Math.pow(1-k/(segments+1),1.25)*(dark?.22:.28)*Math.min(1,sweep.length/.18);
    ctx.fillStyle=fog;ctx.shadowBlur=0;
    ctx.beginPath();ctx.arc(x,y,fogRadius,0,Math.PI*2);ctx.fill();
   }
   const halo=ctx.createRadialGradient(headPoint.x,headPoint.y,0,headPoint.x,headPoint.y,18+strength*24);
   halo.addColorStop(0,color);halo.addColorStop(.35,color+'99');halo.addColorStop(1,color+'00');
   ctx.shadowBlur=0;ctx.globalAlpha=Math.min(1,strength*.7);ctx.fillStyle=halo;ctx.beginPath();ctx.arc(headPoint.x,headPoint.y,18+strength*24,0,Math.PI*2);ctx.fill();
   ctx.globalAlpha=Math.min(1,strength);ctx.fillStyle=dark?'#f5ffff':'#fff';
   ctx.beginPath();ctx.arc(headPoint.x,headPoint.y,2+strength*2,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=Math.min(1,strength);ctx.fillStyle=color;ctx.shadowBlur=0;
  const head=3+Math.sqrt(level)*3;
  ctx.beginPath();ctx.arc(point.x,point.y,head,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;ctx.globalAlpha=Math.min(1,strength*1.25);ctx.fillStyle=dark?'#f5ffff':'#fff';
  ctx.beginPath();ctx.arc(point.x,point.y,Math.max(1,head*.4),0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}
