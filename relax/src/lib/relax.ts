export const pitches = [220,246.94,277.18,329.63,369.99,440,493.88,554.37] as const;
export const noiseTypes = ['pink','brown','white'] as const;
export type NoiseType = typeof noiseTypes[number];
export type Layer = 'rain' | 'wind' | 'noise' | 'fire' | 'stream';
export const waveDirections=['bottom','top','left','right'] as const;
export interface Settings {
 waveDirection:typeof waveDirections[number];
 sleepMode:boolean; instrumentsEnabled:boolean; minutes:number; density:number; chimes:boolean; bowls:boolean; kalimba:boolean; handpan:boolean; bells:boolean; gong:boolean; harp:boolean; instrumentVolume:number; pitch:number;
 windAnimation:boolean; instrumentAnimation:boolean; rainAnimation:boolean; rain:boolean; wind:boolean; noise:boolean; windActivity:number; rainDensity:number; rainVolume:number; windVolume:number; noiseVolume:number;
 fire:boolean; stream:boolean; fireAnimation:boolean; streamAnimation:boolean; fireVolume:number; streamVolume:number; fireDensity:number; streamFlow:number;
 noiseType:NoiseType; motion:boolean; awake:boolean; background:boolean; safetySeen:boolean;
}
export const defaults:Settings = {
 waveDirection:'bottom',sleepMode:false,instrumentsEnabled:true,minutes:15,density:5,chimes:true,bowls:false,kalimba:false,handpan:false,bells:false,gong:false,harp:false,instrumentVolume:45,pitch:0,
 windAnimation:false,instrumentAnimation:true,rainAnimation:false,rain:false,wind:false,noise:false,windActivity:5,rainDensity:5,rainVolume:25,windVolume:20,noiseVolume:20,
 fire:false,stream:false,fireAnimation:false,streamAnimation:false,fireVolume:25,streamVolume:25,fireDensity:5,streamFlow:5,
 noiseType:'pink',motion:true,awake:false,background:true,safetySeen:false,
};
export function normalize(value:unknown):Settings {
 const v=value && typeof value==='object'?value as Partial<Settings>:{};
 const result={...defaults};
 for(const key of ['fire','stream','fireAnimation','streamAnimation','sleepMode','instrumentsEnabled','windAnimation','instrumentAnimation','rainAnimation','chimes','bowls','kalimba','handpan','bells','gong','harp','rain','wind','noise','motion','awake','background','safetySeen'] as const) {
  if(typeof v[key]==='boolean') result[key]=v[key]!;
 }
 for(const [key,min,max] of [['fireVolume',0,100],['streamVolume',0,100],['fireDensity',1,10],['streamFlow',1,10],['windActivity',1,10],['rainDensity',1,10],['pitch',-12,12],['minutes',0,180],['density',1,10],['instrumentVolume',0,100],['rainVolume',0,100],['windVolume',0,100],['noiseVolume',0,100]] as const) {
  const n=v[key];if(typeof n==='number' && Number.isFinite(n)) result[key]=Math.max(min,Math.min(max,Math.round(n)));
 }
 if(noiseTypes.includes(v.noiseType as NoiseType)) result.noiseType=v.noiseType!;
 if(waveDirections.includes(v.waveDirection!))result.waveDirection=v.waveDirection!;
 // Migrate old combined or silent instrument settings to one selection.
 const instrument=result.bells?'bells':result.gong?'gong':result.harp?'harp':result.kalimba?'kalimba':result.handpan?'handpan':result.bowls&&!result.chimes?'bowls':'chimes';
 for(const key of ['chimes','bowls','kalimba','handpan','bells','gong','harp'] as const)result[key]=key===instrument;
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

export function selectedInstrument(settings:Settings){
 return settings.bells?'bells':settings.gong?'gong':settings.harp?'harp':settings.kalimba?'kalimba':settings.handpan?'handpan':settings.bowls?'bowls':'chimes';
}

export function fadeWindow(duration:number,sleepMode:boolean){
 return sleepMode?Math.min(300,Math.max(0,duration)/2):Math.min(4,Math.max(0,duration));
}
