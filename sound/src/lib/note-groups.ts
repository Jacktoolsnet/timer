import type {StyleId} from './presets';
import {grooveRole} from './groove';
import {jazzSemitones} from './jazz-harmony';
import {chordFor} from './harmony';
import {swingPosition} from './track-grid';

/** Offsets/gates are fractions of the available span, tones are chord-relative steps. */
export type GroupNote={offset:number;tone:number;velocity:number;gate:number};
export type NoteGroup={kind:'run'|'chord';notes:GroupNote[]};
export type NoteGroups=(NoteGroup|null)[];
export const chordInstruments=['piano','epiano','guitar','harp','vibraphone','organ','pad','shimmer','strings','choir','pluck'] as const;
export const emptyNoteGroups=():NoteGroups=>Array(16).fill(null);
export function cloneNoteGroups(groups:NoteGroups):NoteGroups{return groups.map(g=>g?{kind:g.kind,notes:g.notes.map(n=>({...n}))}:null);}
export function chordCapable(id:string){return (chordInstruments as readonly string[]).includes(id);}
export function autoGroupCapable(id:string){return !['kick','bass','synthbass','doublebass','acidbass','voice','choir','vocalpad'].includes(id);}
export function validNoteGroups(value:unknown,instrument:string):value is NoteGroups{
 if(!Array.isArray(value)||value.length!==16)return false;
 let count=0;
 return value.every(g=>{
  if(g===null)return true;
  if(++count>2||!g||!['run','chord'].includes(g.kind)||g.kind==='chord'&&!chordCapable(instrument)||!Array.isArray(g.notes)||g.notes.length<2||g.notes.length>4)return false;
  let previous=-1;
  const tones=new Set<number>();
  return g.notes.every((n:GroupNote,i:number)=>{
   if(!n||!Number.isFinite(n.offset)||n.offset<0||n.offset>.8||i===0&&n.offset!==0
    ||!Number.isInteger(n.tone)||Math.abs(n.tone)>3||i===0&&n.tone!==0||!Number.isFinite(n.velocity)||n.velocity<.15||n.velocity>1
    ||!Number.isFinite(n.gate)||n.gate<.05||n.gate>1.5)return false;
   if(g.kind==='chord'&&(n.offset!==0||tones.has(n.tone)))return false;
   if(g.kind==='run'&&n.offset<=previous)return false;
   previous=n.offset;tones.add(n.tone);return true;
  });
 });
}
export function groupHarmony(style:StyleId,bar:number){return style==='jazz'?{root:jazzSemitones(bar,0,'bass',0),third:4}:chordFor(style,bar);}
/** Root/third/fifth voicings close to the existing melody, never stacked arbitrary semitones. */
export function groupPitch(base:number,root:number,third:number,tone:number){
 const triad=[0,third,7];let nearest=0,distance=Infinity;
 for(let index=-12;index<=15;index++){
  const pitch=root+Math.floor(index/3)*12+triad[((index%3)+3)%3];
  if(Math.abs(pitch-base)<distance){nearest=index;distance=Math.abs(pitch-base);}
 }
 const index=nearest+tone;
 return root+Math.floor(index/3)*12+triad[((index%3)+3)%3];
}
export function makeNoteGroup(kind:'run'|'chord',count:number,random=Math.random):NoteGroup{
 const n=Math.max(2,Math.min(4,Math.floor(count))),direction=random()<.3?-1:1;
 return {kind,notes:Array.from({length:n},(_,i)=>({
  offset:kind==='chord'?0:i/n,
  tone:kind==='chord'?i:i===0?0:[0,1,2,1][i]*direction,
  velocity:i===0?.9:.55+random()*.3,
  gate:kind==='chord'?.85:(i===n-1?.92:.72)/n
 }))};
}
/** Never cross the next active point or a bar boundary, even with swing/reverse/phase. */
export function noteGroupWindow(points:readonly boolean[],beat:number,slots:number,direction:number,phase:number,beats:number,bpm:number,swing:number){
 const clock=((beat-phase)*direction+slots*2)%slots;
 let gap=1;while(gap<slots-clock&&!points[(beat+direction*gap+slots*2)%slots])gap++;
 const fraction=(swingPosition(clock+gap,slots,beats,swing)-swingPosition(clock,slots,beats,swing))/slots;
 return Math.max(.015,Math.min(60/bpm,fraction*60/bpm*beats));
}
export function groupDensity(style:StyleId){return ['ambient','focus','slowwaltz'].includes(style)?1:['sport','drumandbass'].includes(style)?3:2;}
export function groupKindFor(style:StyleId,id:string,random=Math.random):'run'|'chord'{
 return chordCapable(id)&&(grooveRole(id)==='sustain'||random()<(['classical','jazz','coffeehouse','lofi','pop'].includes(style)?.75:.45))?'chord':'run';
}

/** Triplets stay triplets; binary subdivisions inherit the existing swing. */
export function groupOffset(offset:number,count:number,swing:number){return count===3?offset:swingPosition(offset*4,4,1,swing)/4;}
