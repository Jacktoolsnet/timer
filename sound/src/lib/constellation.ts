import type {ConstellationVariant} from './visualization';
import {LandscapeHistory,landscapeValue,type LandscapeTrack} from './landscape';

const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
// Stable positions: changing view never consumes the music generator's random state.
const centres=[[350,346],[207,159],[414,135],[558,249],[559,443],[418,565],[224,562],[129,412],[119,235]] as const;
export function constellationCentre(index:number,sky=false):readonly number[]{
 if(!sky)return centres[index]??centres[0];
 const angle=index*2.399963229728653-Math.floor(index/9)*1.13-.8,radius=36+Math.sqrt(((index*37)%81)/80)*240;
 return [350+Math.cos(angle)*radius,350+Math.sin(angle)*radius];
}
export function constellationStar(index:number,pitch:number,sky=false){
 const [cx,cy]=constellationCentre(index,sky);
 const p=clamp(pitch,-36,72),angle=p*2.399963229728653+index*.73;
 const radius=(20+(p+36)/108*43)*(sky?.55:1);
 return {x:cx+Math.cos(angle)*radius,y:cy+Math.sin(angle)*radius};
}
export type ConstellationLight={x:number;y:number;level:number;age:number;length:number};
/** Separate heads preserve chords; control points are not extra sustained voices. */
export function constellationLights(history:LandscapeHistory,index:number,time:number,sky=false):ConstellationLight[]{
 return history.notes(index).filter(n=>!n.pulseOnly&&n.at<=time&&time-n.at<n.length+.9).map(n=>{
  const value=landscapeValue(n,time);
  return {...constellationStar(index,value.pitch,sky),level:value.level,age:time-n.at,length:n.length};
 }).filter(n=>n.level>.003);
}

export type NebulaCloud={x:number;y:number;radius:number;alpha:number};
/** A short, deterministic memory of actual notes; chords retain their own colours/positions. */
export function nebulaClouds(history:LandscapeHistory,index:number,time:number,gain:number,reduced=false,sky=false):NebulaCloud[]{
 if(gain<=0)return [];
 const clouds:NebulaCloud[]=[];
 for(const note of history.notes(index).slice(sky?-12:-64)){
  const age=time-note.at;
  if(note.pulseOnly||age<0||age>note.length+4.2)continue;
  const first=Math.max(0,Math.ceil((age-4.2)/.28)),last=Math.min(Math.floor(note.length/.28),Math.floor(age/.28));
  const envelope={...note,joined:true};
  for(let k=first;k<=last;k++){
   const elapsed=age-k*.28,value=landscapeValue(envelope,note.at+k*.28);
   const strength=clamp(value.level*gain,0,1.5),fade=Math.pow(clamp(1-elapsed/4.2,0,1),1.7);
   if(strength*fade<.003)continue;
   const star=constellationStar(index,value.pitch,sky),seed=note.at*3.7+index*1.9+k*.7;
   for(let lobe=0;lobe<3;lobe++){
    const angle=seed+lobe*Math.PI*2/3,spread=reduced?9:9+elapsed*9;
    clouds.push({x:star.x+Math.cos(angle)*spread,y:star.y+Math.sin(angle)*spread*.65-(reduced?0:elapsed*3),
     radius:22+strength*24+Math.min(note.length,2)*9+(reduced?0:elapsed*10),
     alpha:strength*fade*(lobe===0?.16:.09)});
   }
  }
 }
 return clouds;
}
function paintNebula(ctx:CanvasRenderingContext2D,history:LandscapeHistory,tracks:LandscapeTrack[],time:number,dark:boolean,reduced:boolean,master:number,effect:number,sky=false){
 for(const tr of tracks){
  if(tr.mute||tr.volume<=0)continue;
  const gain=clamp(tr.volume*2,0,1.5)*clamp(master,0,1)*clamp(effect,0,1.5);
  for(const cloud of nebulaClouds(history,tr.index,time,gain,reduced,sky).slice(0,sky?Math.max(3,Math.floor(240/Math.max(1,tracks.length))):Infinity)){
   const paint=ctx.createRadialGradient(cloud.x,cloud.y,0,cloud.x,cloud.y,cloud.radius);
   paint.addColorStop(0,tr.color);paint.addColorStop(.4,tr.color+'b0');paint.addColorStop(1,tr.color+'00');
   ctx.fillStyle=paint;ctx.globalAlpha=cloud.alpha*(dark?1:.85);
   ctx.beginPath();ctx.arc(cloud.x,cloud.y,cloud.radius,0,Math.PI*2);ctx.fill();
  }
  // Brief sparks accompany short notes; sustained notes instead build soft veils.
  if(reduced||gain<=0)continue;
  for(const note of history.notes(tr.index).slice(sky?-12:-64)){
   const age=time-note.at;if(note.pulseOnly||age<0||age>1.2||note.length>.65)continue;
   const p=constellationStar(tr.index,note.pitch,sky),strength=clamp(note.level*gain,0,1.5);
   ctx.fillStyle=tr.color;ctx.globalAlpha=clamp(strength*(1-age/1.2)*.8,0,1);
   for(let i=0;i<6;i++){
    const angle=i*Math.PI/3+note.at*2.3+tr.index,radius=4+age*(14+i*3);
    ctx.beginPath();ctx.arc(p.x+Math.cos(angle)*radius,p.y+Math.sin(angle)*radius, .7+strength*.65,0,Math.PI*2);ctx.fill();
   }
  }
 }
}
export function paintConstellation(ctx:CanvasRenderingContext2D,history:LandscapeHistory,tracks:LandscapeTrack[],time:number,dark:boolean,playing:boolean,reduced:boolean,master:number,effect=1,variant:ConstellationVariant='stars',sky=false){
 ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.lineCap='round';ctx.lineJoin='round';
 if(sky){
  const night=ctx.createRadialGradient(330,290,15,350,350,470);
  night.addColorStop(0,dark?'#13213b':'#edf3fc');night.addColorStop(1,dark?'#030714':'#dfe8f5');
  ctx.fillStyle=night;ctx.fillRect(0,0,700,700);
 }
 if(variant==='nebula'&&playing)paintNebula(ctx,history,tracks,time,dark,reduced,master,effect,sky);
 // Quiet, fixed stardust instead of an independently moving background animation.
 ctx.fillStyle=dark?'#e6edff':'#253550';
 for(let i=0;i<(sky?320:72);i++){
  const x=48+((i*137.507)%604),y=52+((i*i*31.17+i*53)%596);
  ctx.globalAlpha=sky?(dark?.13:.12)+((i*29)%101)/100*(dark?.36:.19):dark?.12:.16;
  const size=sky?.45+((i*17)%13)/13*.95:i%5===0?1.2:.65;
  ctx.beginPath();ctx.arc(x,y,size,0,Math.PI*2);ctx.fill();
  if(sky&&i%53===0){ctx.globalAlpha*=.45;ctx.lineWidth=.6;ctx.strokeStyle=dark?'#dceaff':'#526b8e';ctx.beginPath();ctx.moveTo(x-2.8,y);ctx.lineTo(x+2.8,y);ctx.moveTo(x,y-2.8);ctx.lineTo(x,y+2.8);ctx.stroke();}
 }
 for(const tr of tracks){
  const [cx,cy]=constellationCentre(tr.index,sky);
  const anchors=[0,4,7,12,16,19,24].map(p=>constellationStar(tr.index,p,sky));
  ctx.strokeStyle=tr.color;ctx.fillStyle=tr.color;ctx.lineWidth=dark?.8:1;
  // Fine constellation lines make every instrument recognisable even between notes.
  ctx.globalAlpha=tr.mute?.07:variant==='nebula'?.055:dark?.14:.25;
  ctx.beginPath();anchors.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
  ctx.globalAlpha=tr.mute?.13:dark?.35:.5;
  for(const p of anchors){ctx.beginPath();ctx.arc(p.x,p.y,1.7,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=tr.mute?.2:.55;ctx.font='500 11px system-ui, sans-serif';ctx.textAlign='center';
  if(!sky)ctx.fillText(tr.label??String(tr.index+1),cx,cy+81);
  if(!playing||tr.mute||tr.volume<=0||master<=0)continue;
  const gain=clamp(tr.volume*2,0,1.5)*clamp(master,0,1)*clamp(effect,0,1.5);
  if(gain<=0)continue;
  // Draw only the already-heard part of a phrase, never its future control points.
  if(!reduced&&variant==='stars'){
   const notes=history.notes(tr.index).slice(sky?-16:0).filter(n=>!n.pulseOnly&&n.at<=time&&time-n.at<n.length+1.8);
   let previous:{x:number;y:number;at:number}|undefined;
   for(const n of notes){
    const first=constellationStar(tr.index,n.pitch,sky),age=time-n.at;
    if(previous&&n.at-previous.at>.015&&n.at-previous.at<1.5){
     ctx.globalAlpha=clamp((1-age/1.8)*n.level*gain*.3,0,.4);ctx.lineWidth=1.2;
     ctx.beginPath();ctx.moveTo(previous.x,previous.y);ctx.lineTo(first.x,first.y);ctx.stroke();
    }
    previous={...first,at:n.at};
    if(n.curve?.length){
     const end=Math.min(age,n.length),start=Math.max(0,end-.65);
     ctx.beginPath();
     for(let k=0;k<=12;k++){
      const at=n.at+start+(end-start)*k/12,value=landscapeValue(n,at),p=constellationStar(tr.index,value.pitch,sky);
      if(k===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
     }
     ctx.globalAlpha=clamp(landscapeValue(n,time).level*gain*.45,0,.65);ctx.lineWidth=1.5;ctx.stroke();
    }
   }
  }
  for(const light of constellationLights(history,tr.index,time,sky).slice(-Math.max(2,sky?Math.floor(180/Math.max(1,tracks.length)):192))){
   const strength=clamp(light.level*gain,0,1.5),radius=2+strength*3.5;
   if(!reduced){
    const halo=ctx.createRadialGradient(light.x,light.y,0,light.x,light.y,(14+strength*23)*(sky?.72:1));
    halo.addColorStop(0,tr.color);halo.addColorStop(1,'transparent');
    ctx.globalAlpha=Math.min(.65,strength*.55);ctx.fillStyle=halo;
    ctx.beginPath();ctx.arc(light.x,light.y,(14+strength*23)*(sky?.72:1),0,Math.PI*2);ctx.fill();
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
