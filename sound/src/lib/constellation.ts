import {LandscapeHistory,landscapeValue,type LandscapeTrack} from './landscape';

const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
// Stable positions: changing view never consumes the music generator's random state.
const centres=[[350,346],[207,159],[414,135],[558,249],[559,443],[418,565],[224,562],[129,412],[119,235]] as const;
export function constellationStar(index:number,pitch:number){
 const [cx,cy]=centres[index]??centres[0];
 const p=clamp(pitch,-36,72),angle=p*2.399963229728653+index*.73;
 const radius=20+(p+36)/108*43;
 return {x:cx+Math.cos(angle)*radius,y:cy+Math.sin(angle)*radius};
}
export type ConstellationLight={x:number;y:number;level:number;age:number;length:number};
/** Separate heads preserve chords; control points are not extra sustained voices. */
export function constellationLights(history:LandscapeHistory,index:number,time:number):ConstellationLight[]{
 return history.notes(index).filter(n=>!n.pulseOnly&&n.at<=time&&time-n.at<n.length+.9).map(n=>{
  const value=landscapeValue(n,time);
  return {...constellationStar(index,value.pitch),level:value.level,age:time-n.at,length:n.length};
 }).filter(n=>n.level>.003);
}

export function paintConstellation(ctx:CanvasRenderingContext2D,history:LandscapeHistory,tracks:LandscapeTrack[],time:number,dark:boolean,playing:boolean,reduced:boolean,master:number,effect=1){
 ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.lineCap='round';ctx.lineJoin='round';
 // Quiet, fixed stardust instead of an independently moving background animation.
 ctx.fillStyle=dark?'#e6edff':'#253550';
 for(let i=0;i<72;i++){
  const x=48+((i*137.507)%604),y=52+((i*i*31.17+i*53)%596);
  ctx.globalAlpha=dark?.12:.16;ctx.beginPath();ctx.arc(x,y,i%5===0?1.2:.65,0,Math.PI*2);ctx.fill();
 }
 for(const tr of tracks){
  const [cx,cy]=centres[tr.index]??centres[0];
  const anchors=[0,4,7,12,16,19,24].map(p=>constellationStar(tr.index,p));
  ctx.strokeStyle=tr.color;ctx.fillStyle=tr.color;ctx.lineWidth=dark?.8:1;
  // Fine constellation lines make every instrument recognisable even between notes.
  ctx.globalAlpha=tr.mute?.07:dark?.14:.25;
  ctx.beginPath();anchors.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
  ctx.globalAlpha=tr.mute?.13:dark?.35:.5;
  for(const p of anchors){ctx.beginPath();ctx.arc(p.x,p.y,1.7,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=tr.mute?.2:.55;ctx.font='500 11px system-ui, sans-serif';ctx.textAlign='center';
  ctx.fillText(tr.label??String(tr.index+1),cx,cy+81);
  if(!playing||tr.mute||tr.volume<=0||master<=0)continue;
  const gain=clamp(tr.volume*2,0,1.5)*clamp(master,0,1)*clamp(effect,0,1.5);
  if(gain<=0)continue;
  // Draw only the already-heard part of a phrase, never its future control points.
  if(!reduced){
   const notes=history.notes(tr.index).filter(n=>!n.pulseOnly&&n.at<=time&&time-n.at<n.length+1.8);
   let previous:{x:number;y:number;at:number}|undefined;
   for(const n of notes){
    const first=constellationStar(tr.index,n.pitch),age=time-n.at;
    if(previous&&n.at-previous.at>.015&&n.at-previous.at<1.5){
     ctx.globalAlpha=clamp((1-age/1.8)*n.level*gain*.3,0,.4);ctx.lineWidth=1.2;
     ctx.beginPath();ctx.moveTo(previous.x,previous.y);ctx.lineTo(first.x,first.y);ctx.stroke();
    }
    previous={...first,at:n.at};
    if(n.curve?.length){
     const end=Math.min(age,n.length),start=Math.max(0,end-.65);
     ctx.beginPath();
     for(let k=0;k<=12;k++){
      const at=n.at+start+(end-start)*k/12,value=landscapeValue(n,at),p=constellationStar(tr.index,value.pitch);
      if(k===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
     }
     ctx.globalAlpha=clamp(landscapeValue(n,time).level*gain*.45,0,.65);ctx.lineWidth=1.5;ctx.stroke();
    }
   }
  }
  for(const light of constellationLights(history,tr.index,time)){
   const strength=clamp(light.level*gain,0,1.5),radius=2+strength*3.5;
   if(!reduced){
    const halo=ctx.createRadialGradient(light.x,light.y,0,light.x,light.y,14+strength*23);
    halo.addColorStop(0,tr.color);halo.addColorStop(1,'transparent');
    ctx.globalAlpha=Math.min(.65,strength*.55);ctx.fillStyle=halo;
    ctx.beginPath();ctx.arc(light.x,light.y,14+strength*23,0,Math.PI*2);ctx.fill();
   }
   ctx.fillStyle=tr.color;ctx.globalAlpha=Math.min(1,.25+strength*.7);
   ctx.beginPath();ctx.arc(light.x,light.y,radius,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=dark?'#ffffff':'#172138';ctx.globalAlpha=Math.min(.95,strength);
   ctx.beginPath();ctx.arc(light.x,light.y,Math.max(1,radius*.36),0,Math.PI*2);ctx.fill();
   if(!reduced){
    const flare=Math.max(0,1-light.age/.32)*strength;
    ctx.strokeStyle=tr.color;ctx.globalAlpha=flare*.7;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(light.x-5-flare*7,light.y);ctx.lineTo(light.x+5+flare*7,light.y);
    ctx.moveTo(light.x,light.y-5-flare*7);ctx.lineTo(light.x,light.y+5+flare*7);ctx.stroke();
   }
   ctx.fillStyle=tr.color;
  }
 }
 ctx.restore();
}
