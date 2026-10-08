import {oceanSurf} from './ocean.ts';
export type NatureEvent={time:number;strength:number;duration?:number;crest?:number};
export type NatureLayer='fire'|'stream';
/** Locally generated textures, not field recordings. */
export function natureSound(type:NatureLayer,sampleRate:number,seconds=30,random=Math.random,activity=5,onEvent?:(event:NatureEvent)=>void):Float32Array {
 if(type==='stream')return oceanSurf(sampleRate,seconds,random,activity,onEvent);
 const data=new Float32Array(Math.round(sampleRate*seconds));
 const amount=Math.max(1,Math.min(10,activity))/10;
 let bed=0;
 const smoothing=1-Math.exp(-2*Math.PI*450/sampleRate);
 for(let i=0;i<data.length;i++){
  bed+=smoothing*((random()*2-1)-bed);
  const breathing=.7+.18*Math.sin(i/sampleRate*.8)+.12*Math.sin(i/sampleRate*1.7);
  data[i]=bed*.07*breathing*1;
 }
 let time=.15+random()*.25;
 while(time<seconds){
  const start=Math.floor(time*sampleRate);
  const strength=.16+random()*.20;
  const duration=.035+random()*.10;
  onEvent?.({time:start/sampleRate,strength});
  let texture=0;
  const alpha=1-Math.exp(-2*Math.PI*(1400+random()*2200)/sampleRate);
  random(); // Preserve the existing campfire random sequence.
  for(let j=0;j<Math.floor(duration*sampleRate);j++){
   const t=j/sampleRate;
   const envelope=(1-Math.exp(-t/.0015))*Math.exp(-t/(duration*.23));
   texture+=alpha*((random()*2-1)-texture);
   const crackle=.65+.35*Math.sin(t*1200)**2;
   data[(start+j)%data.length]+=texture*1.2*envelope*strength*crackle;
  }
  time+=(.20+random()*.9)*(1.3-amount);
 }
 // Smooth the low ambient bed at the loop join without cutting events off.
 const edge=Math.min(Math.round(sampleRate*.02),Math.floor(data.length/2));
 for(let i=0;i<edge;i++){data[i]*=i/edge;data[data.length-1-i]*=i/edge;}
 return data;
}
