import {padBounds,padNumbers,type OrbitPad} from './orbit-layout';
import type {NoteScore} from './note-score';
export const videoPadModes=['none','tap','notes'] as const;
export type VideoPadMode=typeof videoPadModes[number];
export const videoPadCopy={
 de:{label:'Zusätzliche Fläche im Video',none:'Nur Visualisierung',tap:'Tap-Pad',notes:'Noten-Pad',hint:'Mit Pad stehen alle aktivierten Infos oberhalb der Visualisierung. Die Fläche folgt den gespielten Noten, auch wenn Du gerade Einstellungen öffnest.'},
 en:{label:'Additional surface in video',none:'Visualization only',tap:'Tap pad',notes:'Note pad',hint:'With a pad, all enabled information appears above the visualization. The surface follows played notes even while settings are open.'},
 es:{label:'Superficie adicional en el vídeo',none:'Solo visualización',tap:'Pad rítmico',notes:'Pad de notas',hint:'Con un pad, toda la información activada aparece encima de la visualización. La superficie sigue las notas incluso con los ajustes abiertos.'},
 fr:{label:'Surface supplémentaire dans la vidéo',none:'Visualisation seule',tap:'Pad rythmique',notes:'Pad de notes',hint:'Avec un pad, toutes les infos activées apparaissent au-dessus de la visualisation. La surface suit les notes même lorsque les réglages sont ouverts.'}
} as const;
export type VideoPadHit={age:number;pitch:number;degree:number|null;level:number;position:number};
export type VideoPadTrack={index:number;name:string;color:string;muted:boolean;pitched:boolean;score:NoteScore;position:number;hits:VideoPadHit[]};
type Box={x:number;y:number;width:number;height:number};
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
/** Read-only canvas rendering of the same score/onset data as the interactive pads. */
export function paintVideoPad(ctx:CanvasRenderingContext2D,mode:Exclude<VideoPadMode,'none'>,tracks:VideoPadTrack[],selected:number|null,dark:boolean,reduced:boolean){
 ctx.save();ctx.clearRect(0,0,700,700);ctx.lineCap='round';ctx.lineJoin='round';
 const box=(b:Box,tr:VideoPadTrack)=>{
  ctx.fillStyle=dark?'#0c1520':'#f8faf4';ctx.globalAlpha=.92;ctx.beginPath();ctx.roundRect(b.x,b.y,b.width,b.height,10);ctx.fill();
  ctx.globalAlpha=tr.muted?.2:.5;ctx.strokeStyle=tr.color;ctx.lineWidth=1.4;ctx.stroke();ctx.globalAlpha=tr.muted?.35:1;
  ctx.fillStyle=tr.color;ctx.font='600 14px system-ui';ctx.textAlign='left';ctx.fillText(padNumbers[tr.index]+' · '+tr.name,b.x+12,b.y+23,b.width-24);
 };
 const glow=(x:number,y:number,tr:VideoPadTrack,hit:VideoPadHit,max:number)=>{
  if(tr.muted||hit.level<=0||hit.age<0||hit.age>1.2)return;
  const strength=clamp(Math.sqrt(hit.level)*1.25,0,1.5)*Math.exp(-hit.age*2.5),radius=reduced?10:9+hit.age*max;
  ctx.shadowColor=tr.color;ctx.shadowBlur=reduced?0:12*strength;ctx.strokeStyle=tr.color;ctx.lineWidth=2.5+strength*1.5;ctx.globalAlpha=Math.min(1,strength*.85);
  ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.stroke();ctx.fillStyle=dark?'#f5ffff':tr.color;ctx.globalAlpha=Math.min(1,strength*1.1);
  ctx.beginPath();ctx.arc(x,y,3+strength*4,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
 };
 const score=(tr:VideoPadTrack,b:Box,detailed:boolean)=>{
  box(b,tr);ctx.save();ctx.beginPath();ctx.rect(b.x+4,b.y+29,b.width-8,b.height-34);ctx.clip();
  const pitches=tr.score.flatMap(n=>n.points.map(p=>p.pitch)),low=Math.min(0,...pitches),high=Math.max(24,...pitches);
  const x=(f:number)=>b.x+12+clamp(f,0,1)*(b.width-24),y=(p:number)=>b.y+b.height-12-(p-low)/(high-low)*(b.height-50);
  ctx.strokeStyle=tr.color;ctx.lineWidth=.7;
  if(detailed){
   ctx.globalAlpha=.18;ctx.beginPath();
   for(let n=0;n<=24;n++){const yy=y(low+(high-low)*n/24);ctx.moveTo(x(0),yy);ctx.lineTo(x(1),yy);}
   for(let n=0;n<=16;n++){const xx=x(n/16);ctx.moveTo(xx,y(low));ctx.lineTo(xx,y(high));}ctx.stroke();
  }
  for(const note of tr.score){
   ctx.globalAlpha=tr.muted?.15:.55;ctx.strokeStyle=tr.color;ctx.lineWidth=detailed?3:1.5;ctx.beginPath();
   note.points.forEach((p,i)=>i?ctx.lineTo(x(note.start+p.offset),y(p.pitch)):ctx.moveTo(x(note.start+p.offset),y(p.pitch)));
   const last=note.points.at(-1)!;ctx.lineTo(x(note.start+note.duration),y(last.pitch));ctx.stroke();
   for(const p of note.points){ctx.fillStyle=tr.color;ctx.globalAlpha=tr.muted?.15:.35+p.velocity*.6;ctx.beginPath();ctx.arc(x(note.start+p.offset),y(p.pitch),(detailed?3:1.6)+p.velocity*(detailed?4:2),0,Math.PI*2);ctx.fill();}
  }
  ctx.globalAlpha=.55;ctx.strokeStyle=tr.color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x(tr.position),y(low));ctx.lineTo(x(tr.position),y(high));ctx.stroke();
  for(const hit of tr.hits)glow(x(hit.position),y(hit.pitch),tr,hit,detailed?22:9);
  ctx.restore();
 };
 if(mode==='notes'&&selected!==null&&tracks[selected]){
  score(tracks[selected],{x:6,y:6,width:688,height:502},true);
  tracks.filter(tr=>tr.index!==selected).forEach((tr,i)=>score(tr,{x:6+i%4*174,y:520+Math.floor(i/4)*88,width:166,height:80},false));
 }else for(const tr of tracks){
  const bounds=padBounds(tr.index as OrbitPad,700,700,mode==='tap'?selected as OrbitPad|null:null);
  const b={x:bounds.x+4,y:bounds.y+4,width:bounds.width-8,height:bounds.height-8};
  if(mode==='notes'){score(tr,b,false);continue;}
  box(b,tr);ctx.save();ctx.beginPath();ctx.rect(b.x+2,b.y+30,b.width-4,b.height-32);ctx.clip();
  ctx.strokeStyle=tr.color;ctx.globalAlpha=tr.muted?.05:.12;ctx.lineWidth=1;
  if(tr.pitched)for(let n=1;n<8;n++){const y=b.y+32+(b.height-38)*n/8;ctx.beginPath();ctx.moveTo(b.x+8,y);ctx.lineTo(b.x+b.width-8,y);ctx.stroke();}
  for(const hit of tr.hits)glow(b.x+b.width/2,hit.degree===null?b.y+b.height/2:b.y+34+(7-clamp(hit.degree,0,7))/7*Math.max(1,b.height-46),tr,hit,b.width*.25);
  ctx.restore();
 }
 ctx.restore();
}
