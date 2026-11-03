import {LandscapeHistory,landscapeValue} from './landscape';
import type {LandscapeTrack} from './landscape';

const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
/** Fixed petals match track colours and pad numbers, even with disabled neighbours. */
export function flowerPoint(index:number,radius:number,offset=0){
 const angle=index*Math.PI*2/9-Math.PI/2;
 return {x:350+Math.cos(angle)*radius-Math.sin(angle)*offset,y:350+Math.sin(angle)*radius+Math.cos(angle)*offset};
}
export function flowerPitch(index:number,pitch:number){
 return flowerPoint(index,84+(clamp(pitch,-36,72)+36)/108*164,Math.sin(pitch*.32)*9);
}
/** Only heard notes: chords retain separate beads, curves retain their true level. */
export function flowerNotes(history:LandscapeHistory,index:number,time:number){
 return history.notes(index).filter(n=>!n.pulseOnly&&n.at<=time&&time-n.at<n.length+.9).map(n=>{
  const value=landscapeValue(n,time);
  return {...flowerPitch(index,value.pitch),level:value.level,pitch:value.pitch,age:time-n.at};
 }).filter(n=>n.level>.003);
}
function petal(ctx:CanvasRenderingContext2D,index:number,reach:number,width:number){
 const root=flowerPoint(index,32),tip=flowerPoint(index,reach);
 const a=flowerPoint(index,76,-width),b=flowerPoint(index,reach*.83,-width);
 const c=flowerPoint(index,reach*.83,width),d=flowerPoint(index,76,width);
 ctx.beginPath();ctx.moveTo(root.x,root.y);
 ctx.bezierCurveTo(a.x,a.y,b.x,b.y,tip.x,tip.y);
 ctx.bezierCurveTo(c.x,c.y,d.x,d.y,root.x,root.y);ctx.closePath();
}

/** Rendering only: no audio nodes, randomness or independent animation clock. */
export function paintSoundFlower(ctx:CanvasRenderingContext2D,history:LandscapeHistory,tracks:LandscapeTrack[],time:number,dark:boolean,playing:boolean,reduced:boolean,master:number,effect=1,showCenter=true){
 ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.lineCap='round';ctx.lineJoin='round';
 let total=0;
 for(const tr of tracks){
  const audible=playing&&!tr.mute&&tr.volume>0&&master>0&&effect>0;
  const notes=audible?flowerNotes(history,tr.index,time):[];
  const gain=clamp(tr.volume*2,0,1.5)*clamp(master,0,1)*clamp(effect,0,1.5);
  const energy=clamp(Math.hypot(...notes.map(n=>n.level))*gain,0,1.2);total+=energy;
  const farthest=notes.reduce((r,n)=>Math.max(r,166+(Math.hypot(n.x-350,n.y-350)+26-166)*Math.min(1,n.level*gain*3)),0);
  // Reduced motion keeps the silhouette fixed; only colour and note cues change.
  const reach=reduced?260:Math.max(166+energy*92,farthest),width=reduced?55:38+energy*21;
  const root=flowerPoint(tr.index,34),tip=flowerPoint(tr.index,reach);
  const wash=ctx.createLinearGradient(root.x,root.y,tip.x,tip.y);
  wash.addColorStop(0,'transparent');wash.addColorStop(.55,tr.color);wash.addColorStop(1,tr.color);
  ctx.fillStyle=wash;ctx.strokeStyle=tr.color;
  ctx.globalAlpha=tr.mute?.035:(dark?.07:.1)+energy*(dark?.16:.2);
  petal(ctx,tr.index,reach,width);ctx.fill();
  ctx.globalAlpha=tr.mute?.1:(dark?.24:.36)+energy*.35;ctx.lineWidth=.8+energy*.9;ctx.stroke();
  // Delicate inner veins follow the same unfolding, not a free-running sine wave.
  for(const side of [-1,1]){
   const a=flowerPoint(tr.index,reach*.46,side*width*.3),b=flowerPoint(tr.index,reach*.8,side*width*.24);
   ctx.globalAlpha=(dark?.09:.15)+energy*.15;ctx.lineWidth=.7;
   ctx.beginPath();ctx.moveTo(root.x,root.y);ctx.quadraticCurveTo(a.x,a.y,b.x,b.y);ctx.stroke();
  }
  const label=flowerPoint(tr.index,318);
  ctx.fillStyle=tr.color;ctx.globalAlpha=tr.mute?.2:.65;ctx.font='500 12px system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(tr.label??String(tr.index+1),label.x,label.y);
  if(energy<=0)continue;
  if(!reduced){
   for(const n of history.notes(tr.index)){
    if(n.pulseOnly||!n.curve?.length||n.at>time||time-n.at>n.length+.6)continue;
    const end=Math.min(time-n.at,n.length),start=Math.max(0,end-.5);
    ctx.beginPath();
    for(let k=0;k<=12;k++){
     const v=landscapeValue(n,n.at+start+(end-start)*k/12),p=flowerPitch(tr.index,v.pitch);
     if(k===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
    }
    ctx.strokeStyle=tr.color;ctx.globalAlpha=clamp(landscapeValue(n,time).level*gain*.5,0,.7);ctx.lineWidth=2;ctx.stroke();
   }
  }
  for(const n of notes){
   const level=clamp(n.level*gain,0,1.5),radius=2.5+level*3;
   if(!reduced){
    const halo=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,12+level*19);
    halo.addColorStop(0,tr.color);halo.addColorStop(1,'transparent');ctx.fillStyle=halo;ctx.globalAlpha=level*.5;
    ctx.beginPath();ctx.arc(n.x,n.y,12+level*19,0,Math.PI*2);ctx.fill();
   }
   ctx.fillStyle=tr.color;ctx.globalAlpha=Math.min(1,level*1.3);
   ctx.beginPath();ctx.arc(n.x,n.y,radius,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=dark?'#ffffff':'#172138';ctx.globalAlpha=Math.min(.95,level);
   ctx.beginPath();ctx.arc(n.x,n.y,Math.max(1,radius*.35),0,Math.PI*2);ctx.fill();
  }
 }
 // A small multicoloured heart gathers only the energy actually heard in the petals.
 if(showCenter)for(const tr of tracks){
  const angle=tr.index*Math.PI*2/9-Math.PI/2,level=clamp(total/Math.max(1,tracks.length),0,1);
  ctx.strokeStyle=tr.color;ctx.globalAlpha=tr.mute?.08:.2+level*.6;ctx.lineWidth=2+level*2;
  ctx.beginPath();ctx.arc(350,350,reduced?24:22+level*5,angle+.08,angle+Math.PI*2/9-.08);ctx.stroke();
 }
 ctx.restore();
}
