import type {SoundSettings,SavedTrack} from './sound-settings';
import {scriptPosition,scriptScore} from './song-script';
import {cloneScore,type NoteScore} from './note-score';
import {resolveGroove,grooveAccent} from './groove';
import {swingPosition} from './track-grid';
import {makeMotif,melodicSemitones} from './harmony';
import {jazzSemitones} from './jazz-harmony';
import {tapNoteSemitones} from './tap-notes';
import {groupHarmony,groupPitch,noteGroupWindow,groupOffset} from './note-groups';
import {ornamentPitch,dialogueInstrument,phraseContour} from './musicality';
import {registerNote} from './development';
import type {OrbitClock} from './orbit-project';
export type OrbitLane={track:SavedTrack;score:NoteScore};
/** A deterministic two-bar view of a complete independent set, never a DOM snapshot. */
export function orbitPair(settings:SoundSettings,bar:number,clock:OrbitClock):OrbitLane[]{
 const script=settings.songScript;
 if(script){
  const position=scriptPosition(script,bar);if(!position)return [];
  const scene=script.scenes[position.index];
  return settings.tracks.map((saved,i)=>{
   const source=script.tracks[i],part=scene.parts.find(p=>p.track===source?.id);
   return {track:{...saved,enabled:!!source,mute:saved.mute,instrument:source?.instrument??saved.instrument,volume:(source?.volume??0)*(part?.volume??1),rate:1},
    score:scriptScore(part,scene.variation??0,script.seed+position.index*101+position.turn*1009+i*17,script.version===3?script.meter:undefined)};
  });
 }
 const style=settings.dance?['tango','pasodoble'].includes(settings.dance)?'electronic':settings.style==='jazz'||settings.dance==='jive'?'pop':settings.style:settings.style;
 const groove={...resolveGroove(settings.style,settings.groove??'auto',settings.dance??null),beats:clock.quarters,steps:clock.steps};
 const seconds=60/(settings.bpm*4/clock.tempoUnit.denominator*(clock.tempoUnit.dotted?1.5:1))*clock.quarters*2;
 return settings.tracks.map((track,index)=>{
  if(track.score)return {track,score:cloneScore(track.score)};
  const score:NoteScore=[];
  const hits=settings.pad?.hits[index],notes=settings.pad?.notes?.[index];
  if(hits?.some(Boolean)){
   hits.forEach((on,k)=>{if(on){const start=k/hits.length;score.push({start,duration:Math.min(.04,1-start),points:[{offset:0,pitch:tapNoteSemitones(style,bar+Math.floor(start*2),notes?.[k]??3),velocity:.8}]});}});
   return {track,score};
  }
  const slots=track.slots??16,motif=track.motif??makeMotif([0,1,2,1,0,2,1,0]);
  for(let b=0;b<2;b++)for(let tick=0;tick<slots;tick++){
   const beat=((track.direction*tick+track.phase)%slots+slots)%slots;if(!track.points[beat])continue;
   const musicBeat=beat/slots*clock.steps,chord=groupHarmony(style,bar+b);
   const base=style==='jazz'?jazzSemitones(bar+b,musicBeat,track.instrument,track.pitch,motif):melodicSemitones(style,bar+b,musicBeat,track.instrument,track.pitch,motif);
   const pitch=registerNote(base,dialogueInstrument(track.instrument)?phraseContour(style,bar+b).register:0,chord.root,style==='jazz'?[0,2,4,7,9]:[0,chord.third,7]);
   const group=track.groups?.[beat],start=(b+swingPosition(tick,slots,clock.quarters,groove.swing)/slots)/2;
   const window=noteGroupWindow(track.points,beat,slots,track.direction,track.phase,clock.quarters,settings.bpm,groove.swing)/seconds;
   const members=group?.notes??[{offset:0,tone:0,velocity:1,gate:.9}];
   for(const member of members){
    const at=start+(group?groupOffset(member.offset,members.length,groove.swing)*window:0);if(at>=1)continue;
    let note=group?groupPitch(pitch,chord.root,chord.third,member.tone):pitch;
    if(group?.ornament)note=ornamentPitch(pitch,chord.root,chord.third,group.ornament==='trill'?member.tone:(members.at(-1)?.tone??1)-member.tone);
    score.push({start:at,duration:Math.max(.002,Math.min(1-at,window*member.gate)),points:[{offset:0,pitch:Math.round(Math.max(-24,Math.min(60,note))),velocity:Math.max(.05,Math.min(1,member.velocity*grooveAccent(groove,track.instrument,musicBeat,index)))}]});
   }
  }
  return {track,score:score.slice(0,128)};
 });
}
