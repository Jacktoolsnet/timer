import {formats,type Project} from './model.ts';
export const CONTACT_PAGE_SIZE=6;
export type ContactFrame={sceneIndex:number;sceneId:string;sceneName:string;localTime:number;time:number};
export function parseStillTimes(value:string):number[]{
 const parts=value.trim().split(/[;\s]+/);
 if(!value.trim()||parts.some(v=>!/^\d+(?:[.,]\d+)?$/.test(v)))throw new Error('Use seconds separated by semicolons, e.g. 1; 2.5; 4');
 return parts.map(v=>Number(v.replace(',','.')));
}
export function defaultStillTimes(duration:number):number[]{return [1,3,5].map(n=>Math.min(duration-Number.EPSILON,Math.floor(duration*n/6*1000)/1000));}
export function contactPlan(project:Project,selection:{sceneIndex:number;times:number[]}[]):ContactFrame[]{
 const selected=new Map<number,number[]>();
 for(const entry of selection){if(!Number.isInteger(entry.sceneIndex)||!project.scenes[entry.sceneIndex]||selected.has(entry.sceneIndex))throw new Error('Invalid or duplicate scene selection');selected.set(entry.sceneIndex,entry.times);}
 const result:ContactFrame[]=[];let offset=0;
 project.scenes.forEach((scene,sceneIndex)=>{
  const times=selected.get(sceneIndex);
  if(times){
   if(!times.length||times.length>12||times.some(t=>!Number.isFinite(t)||t<0||t>=scene.duration))throw new Error(`Scene ${sceneIndex+1}: choose 1–12 times, 0 ≤ seconds < ${scene.duration}`);
   for(const localTime of [...new Set(times)].sort((a,b)=>a-b))result.push({sceneIndex,sceneId:scene.id,sceneName:scene.name,localTime,time:offset+localTime});
  }
  offset+=scene.duration;
 });
 if(!result.length||result.length>600)throw new Error('Contact sheet: choose 1–600 frames');
 return result;
}
export function contactLayout(project:Project,count:number){
 if(!Number.isInteger(count)||count<1||count>CONTACT_PAGE_SIZE)throw new Error('Invalid contact sheet page size');
 const [w,h]=formats[project.format],frameWidth=480,frameHeight=Math.round(frameWidth*h/w),gap=16,header=64,caption=76,columns=Math.min(3,count),rows=Math.ceil(count/columns);
 return {frameWidth,frameHeight,gap,header,caption,columns,width:gap+columns*(frameWidth+gap),height:header+rows*(frameHeight+caption+gap)};
}
