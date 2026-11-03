import {videoPadModes,type VideoPadMode} from './video-pad';
import {trackRates,type TrackRate,type TrackRateChoice} from './track-rate';
import {constellationVariants,type ConstellationVariant,streamVariants,type StreamVariant,landscapeVariants,type LandscapeVariant,visualizationModes,type VisualizationMode} from './visualization';
import {validScore,type NoteScore} from './note-score';
import {validNoteGroups,type NoteGroups} from './note-groups';
import type {VideoAnimationSettings} from './video-animations';
import type {VideoInfoSettings} from './video-info';
import {ORBIT_COUNT} from './orbit-layout';
import {makeMotif} from './harmony';
import {resolveGroove} from './groove';
import {partsForStyle} from './presets';
import {gridSizes,type GridChoice,type GridSize} from './track-grid';
import {danceIds,type DanceId} from './dances';
import {grooveChoices,type GrooveChoice} from './groove';
import {instrumentIds,type InstrumentId} from './instruments';
import {styleIds,type StyleId} from './presets';
export const backgroundModes=['clouds','aurora','stars','waves','off','random'] as const;
export const centerModes=['ring','filled','sine','bars','sun','off','random'] as const;
export const orbitModes=['comet','dot','pulse','radar','off','random'] as const;
export type SavedTrack={
 rate?:TrackRate;rateChoice?:TrackRateChoice;
 score?:NoteScore|null;
 groups?:NoteGroups;
 grid?:GridChoice;slots?:GridSize;enabled:boolean;mute:boolean;instrument:InstrumentId;points:boolean[];motif?:number[];volume:number;pitch:number;phase:number;
 direction:number;directionMode:string;randomDynamics:boolean;
 morph:{to:InstrumentId;progress:number}|null;
};
export type SoundSettings={
 visualization?:VisualizationMode;
 landscapeVariant?:LandscapeVariant;
 streamVariant?:StreamVariant;
 constellationVariant?:ConstellationVariant;
 flowerCenter?:typeof centerModes[number];
 recording?:{restart:boolean;random:boolean;fullscreen:boolean;minutes?:number;videoFormat?:'landscape'|'portrait';videoPad?:VideoPadMode;videoInfo?:VideoInfoSettings;animations?:VideoAnimationSettings};
 pad?:{mode:'draw'|'rhythm'|'notes';beats:2|3|4;hits:boolean[][];notes?:(number|null)[][]};
 version:2;style:StyleId;dance?:DanceId|null;groove?:GrooveChoice;bpm:number;volume:number;transpose?:number;noteEffect?:number;tracks:SavedTrack[];
 background:typeof backgroundModes[number];center:typeof centerModes[number];orbit:typeof orbitModes[number];
};
const number=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const member=(values:readonly string[],v:unknown)=>typeof v==='string'&&values.includes(v);
/** Treat optional local storage as untrusted input; invalid records are ignored as a whole. */
export function decodeSettings(raw:string|null):SoundSettings|null{
 try{
  const s=JSON.parse(raw||'null');
  if(!s||![1,2].includes(s.version)||!member(styleIds,s.style)||!number(s.bpm,40,220)||!number(s.volume,0,.7)
   ||!member(backgroundModes,s.background)||!member(centerModes,s.center)||!member(orbitModes,s.orbit)
   ||!Array.isArray(s.tracks)||!(s.version===1?[8,9]:[ORBIT_COUNT]).includes(s.tracks.length))return null;
  if(s.constellationVariant!==undefined&&!member(constellationVariants,s.constellationVariant))return null;
  if(s.streamVariant!==undefined&&!member(streamVariants,s.streamVariant))return null;
  if(s.landscapeVariant!==undefined&&!member(landscapeVariants,s.landscapeVariant))return null;
  if(s.flowerCenter!==undefined&&!member(centerModes,s.flowerCenter))return null;
  if(s.visualization!==undefined&&!member(visualizationModes,s.visualization))return null;
  if(s.recording!==undefined&&(!s.recording||Array.isArray(s.recording)||['restart','random','fullscreen'].some(key=>typeof s.recording[key]!=='boolean')))return null;
  if(s.recording?.minutes!==undefined&&(!number(s.recording.minutes,1,10)||!Number.isInteger(s.recording.minutes)))return null;
  if(s.recording?.videoFormat!==undefined&&!member(['landscape','portrait'],s.recording.videoFormat))return null;
  if(s.recording?.videoPad!==undefined&&!member(videoPadModes,s.recording.videoPad))return null;
  if(s.recording?.videoInfo!==undefined){
   const info=s.recording.videoInfo;
   if(info?.language!==undefined&&!member(['en','de','es','fr'],info.language))return null;
   if(!info||Array.isArray(info)||typeof info.title!=='string'||info.title.length>80
    ||['enabled','showTitle','style','tempo','section','signature'].some(key=>typeof info[key]!=='boolean'))return null;
  }
  if(s.recording?.animations!==undefined&&(!s.recording.animations||Array.isArray(s.recording.animations)||['center','orbit','background'].some(key=>typeof s.recording.animations[key]!=='boolean')))return null;
  if(s.recording?.animations?.visualization!==undefined&&typeof s.recording.animations.visualization!=='boolean')return null;
  if(s.transpose!==undefined&&(!number(s.transpose,-12,12)||!Number.isInteger(s.transpose)))return null;
  if(s.noteEffect!==undefined&&!number(s.noteEffect,0,1.5))return null;
  if(s.dance!==undefined&&s.dance!==null&&!member(danceIds,s.dance))return null;
  if(s.groove!==undefined&&!member(grooveChoices,s.groove))return null;
  if(s.pad!==undefined){
   if(!s.pad||!member(['draw','rhythm','notes'],s.pad.mode)||![2,3,4].includes(s.pad.beats)
    ||!Array.isArray(s.pad.hits)||!(s.version===1?[3,ORBIT_COUNT]:[ORBIT_COUNT]).includes(s.pad.hits.length)
    ||s.pad.hits.some((lane:unknown)=>!Array.isArray(lane)||lane.length!==s.pad.beats*8||lane.some((on:unknown)=>typeof on!=='boolean')))return null;
   if(s.pad.notes!==undefined&&(!Array.isArray(s.pad.notes)||s.pad.notes.length!==s.pad.hits.length
    ||s.pad.notes.some((row:unknown,i:number)=>!Array.isArray(row)||row.length!==s.pad.beats*8
     ||row.some((note:unknown,j:number)=>note!==null&&(!number(note,0,7)||!Number.isInteger(note)||!s.pad.hits[i][j])))))return null;
  }
  let groupCount=0;
  for(const tr of s.tracks){
   if(tr?.rate!==undefined&&!(trackRates as readonly unknown[]).includes(tr.rate))return null;
   if(tr?.rateChoice!==undefined&&tr.rateChoice!=='auto'&&!(trackRates as readonly unknown[]).includes(tr.rateChoice))return null;
   if(tr?.score!==undefined&&tr.score!==null&&!validScore(tr.score))return null;
   if(tr?.groups!==undefined){if(!validNoteGroups(tr.groups,tr.instrument))return null;groupCount+=tr.groups.filter(Boolean).length;}
   if(groupCount>6)return null;
   if(tr?.grid!==undefined&&tr.grid!=='auto'&&!(gridSizes as readonly unknown[]).includes(tr.grid))return null;
   if(tr?.slots!==undefined&&!(gridSizes as readonly unknown[]).includes(tr.slots))return null;
   if(typeof tr?.grid==='number'&&tr.slots!==undefined&&tr.grid!==tr.slots)return null;
   if(!tr||typeof tr.enabled!=='boolean'||typeof tr.mute!=='boolean'||typeof tr.randomDynamics!=='boolean'
    ||!member(instrumentIds,tr.instrument)||!number(tr.volume,0,1)||!number(tr.pitch,0,24)||!Number.isInteger(tr.pitch)
    ||!number(tr.phase,0,15)||!Number.isInteger(tr.phase)||![1,-1].includes(tr.direction)
    ||!member(['forward','reverse','random'],tr.directionMode)||!Array.isArray(tr.points)
    ||tr.points.length!==16||tr.points.some((point:unknown)=>typeof point!=='boolean'))return null;
   if(tr.motif!==undefined&&(!Array.isArray(tr.motif)||tr.motif.length!==8||tr.motif.some((n:unknown)=>!number(n,0,4)||!Number.isInteger(n))))return null;
   if(tr.morph!==null&&(!tr.morph||!member(instrumentIds,tr.morph.to)||!number(tr.morph.progress,0,1)))return null;
  }
  if(s.tracks.length===8){
   const extra=partsForStyle(s.style)[8],slots=resolveGroove(s.style,s.groove??'auto',s.dance??null).steps;
   s.tracks.push({grid:'auto',slots,enabled:true,mute:false,instrument:extra.instrument,
    points:Array.from({length:16},(_,i)=>i<slots&&extra.steps.includes(i)),motif:makeMotif([0,1,2,1,0,2,1,0]),
    volume:extra.volume??.15,pitch:extra.pitch??0,phase:0,direction:1,directionMode:'forward',randomDynamics:false,morph:null});
  }
  if(s.pad?.hits.length===3){
   const rows=Array.from({length:ORBIT_COUNT},()=>Array<boolean>(s.pad.beats*8).fill(false)),used=new Set<number>();
   const noteRows=Array.from({length:ORBIT_COUNT},()=>Array<number|null>(s.pad.beats*8).fill(null));
   ['hat','snare','kick'].forEach((id,lane)=>{
    const found=s.tracks.findIndex((tr:SavedTrack,i:number)=>!used.has(i)&&tr.instrument===id);
    const fallback=[2,1,0][lane],index=found>=0?found:!used.has(fallback)?fallback:s.tracks.findIndex((_:SavedTrack,i:number)=>!used.has(i));used.add(index);
    rows[index]=s.pad.hits[lane];
    if(s.pad.notes)noteRows[index]=s.pad.notes[lane];
   });
   s.pad.hits=rows;if(s.pad.notes)s.pad.notes=noteRows;
  }
  s.version=2;
  return s as SoundSettings;
 }catch{return null;}
}
