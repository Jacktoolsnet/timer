export const pitches = [220,246.94,277.18,329.63,369.99,440,493.88,554.37] as const;
export const noiseTypes = ['pink','brown','white'] as const;
export type NoiseType = typeof noiseTypes[number];
export type Layer = 'rain' | 'wind' | 'noise';
export interface Settings {
 minutes:number; density:number; chimes:boolean; bowls:boolean; instrumentVolume:number; pitch:number;
 windAnimation:boolean; instrumentAnimation:boolean; rainAnimation:boolean; rain:boolean; wind:boolean; noise:boolean; windActivity:number; rainDensity:number; rainVolume:number; windVolume:number; noiseVolume:number;
 noiseType:NoiseType; motion:boolean; awake:boolean; background:boolean; safetySeen:boolean;
}
export const defaults:Settings = {
 minutes:15,density:5,chimes:true,bowls:false,instrumentVolume:45,pitch:0,
 windAnimation:false,instrumentAnimation:true,rainAnimation:false,rain:false,wind:false,noise:false,windActivity:5,rainDensity:5,rainVolume:25,windVolume:20,noiseVolume:20,
 noiseType:'pink',motion:true,awake:false,background:true,safetySeen:false,
};
export function normalize(value:unknown):Settings {
 const v=value && typeof value==='object'?value as Partial<Settings>:{};
 const result={...defaults};
 for(const key of ['windAnimation','instrumentAnimation','rainAnimation','chimes','bowls','rain','wind','noise','motion','awake','background','safetySeen'] as const) {
  if(typeof v[key]==='boolean') result[key]=v[key]!;
 }
 for(const [key,min,max] of [['windActivity',1,10],['rainDensity',1,10],['pitch',-12,12],['minutes',0,180],['density',1,10],['instrumentVolume',0,100],['rainVolume',0,100],['windVolume',0,100],['noiseVolume',0,100]] as const) {
  const n=v[key];if(typeof n==='number' && Number.isFinite(n)) result[key]=Math.max(min,Math.min(max,Math.round(n)));
 }
 if(noiseTypes.includes(v.noiseType as NoiseType)) result.noiseType=v.noiseType!;
 // Migrate old combined or silent instrument settings to one selection.
 result.bowls=result.bowls&&!result.chimes;result.chimes=!result.bowls;
 return result;
}
export function randomNote(random=Math.random) {
 const index=Math.min(pitches.length-1,Math.max(0,Math.floor(random()*pitches.length)));
 return {index,frequency:pitches[index]!};
}
export function randomGap(density:number,random=Math.random) {
 return (11-Math.max(1,Math.min(10,density)))*(.65+random()*.7);
}
export function timeLabel(seconds:number) {
 const s=Math.max(0,Math.ceil(seconds));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
}

/** A gust strikes several different tubes, then leaves time for their decay. */
export function randomGust(random=Math.random) {
 const count=3+Math.floor(random()*4);
 const strikes:{index:number;offset:number;strength:number}[]=[];
 let offset=0,previous=-1;
 for(let i=0;i<count;i++){
  let index=randomNote(random).index;
  if(index===previous)index=(index+1)%pitches.length;
  strikes.push({index,offset,strength:(.65+random()*.35)*(1-i/count*.35)});
  previous=index;offset+=.12+random()*.48;
 }
 return strikes;
}
