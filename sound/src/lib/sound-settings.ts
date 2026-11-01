import {instrumentIds,type InstrumentId} from './instruments';
import {styleIds,type StyleId} from './presets';
export const backgroundModes=['clouds','aurora','stars','waves','off','random'] as const;
export const centerModes=['ring','filled','sine','bars','sun','off','random'] as const;
export const orbitModes=['comet','dot','pulse','off','random'] as const;
export type SavedTrack={
 enabled:boolean;mute:boolean;instrument:InstrumentId;points:boolean[];motif?:number[];volume:number;pitch:number;phase:number;
 direction:number;directionMode:string;randomDynamics:boolean;
 morph:{to:InstrumentId;progress:number}|null;
};
export type SoundSettings={
 version:1;style:StyleId;bpm:number;volume:number;tracks:SavedTrack[];
 background:typeof backgroundModes[number];center:typeof centerModes[number];orbit:typeof orbitModes[number];
};
const number=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const member=(values:readonly string[],v:unknown)=>typeof v==='string'&&values.includes(v);
/** Treat optional local storage as untrusted input; invalid records are ignored as a whole. */
export function decodeSettings(raw:string|null):SoundSettings|null{
 try{
  const s=JSON.parse(raw||'null');
  if(!s||s.version!==1||!member(styleIds,s.style)||!number(s.bpm,40,180)||!number(s.volume,0,.7)
   ||!member(backgroundModes,s.background)||!member(centerModes,s.center)||!member(orbitModes,s.orbit)
   ||!Array.isArray(s.tracks)||s.tracks.length!==8)return null;
  for(const tr of s.tracks){
   if(!tr||typeof tr.enabled!=='boolean'||typeof tr.mute!=='boolean'||typeof tr.randomDynamics!=='boolean'
    ||!member(instrumentIds,tr.instrument)||!number(tr.volume,0,1)||!number(tr.pitch,0,24)||!Number.isInteger(tr.pitch)
    ||!number(tr.phase,0,15)||!Number.isInteger(tr.phase)||![1,-1].includes(tr.direction)
    ||!member(['forward','reverse','random'],tr.directionMode)||!Array.isArray(tr.points)
    ||tr.points.length!==16||tr.points.some((point:unknown)=>typeof point!=='boolean'))return null;
   if(tr.motif!==undefined&&(!Array.isArray(tr.motif)||tr.motif.length!==8||tr.motif.some((n:unknown)=>!number(n,0,4)||!Number.isInteger(n))))return null;
   if(tr.morph!==null&&(!tr.morph||!member(instrumentIds,tr.morph.to)||!number(tr.morph.progress,0,1)))return null;
  }
  return s as SoundSettings;
 }catch{return null;}
}
