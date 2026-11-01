import {isMelodic} from './harmony';
import {dialogueInstrument} from './expression';
import type {SongPart} from './song';
export type DevelopmentTrack={instrument:string;enabled:boolean;mute:boolean;volume:number;points:readonly boolean[]};
export type DevelopmentPlan={start:number;lead:number;previousLead:number;rest:number;variation:number};
const smooth=(x:number)=>{const p=Math.max(0,Math.min(1,x));return p*p*(3-2*p);};
export function developmentPlan(tracks:readonly DevelopmentTrack[],start:number,previous:DevelopmentPlan|null,random=Math.random):DevelopmentPlan{
 const available=tracks.map((tr,i)=>({tr,i})).filter(({tr})=>tr.enabled&&!tr.mute&&tr.volume>0&&tr.points.some(Boolean)&&dialogueInstrument(tr.instrument));
 const choose=(items:typeof available)=>items.length?items[Math.min(items.length-1,Math.floor(random()*items.length))].i:-1;
 const lead=choose(available.filter(({i})=>i!==previous?.lead));
 const selectedLead=lead<0?(available[0]?.i??-1):lead;
 const backing=available.filter(({i})=>i!==selectedLead);
 const rest=available.length>=3?choose(backing):-1;
 return {start,lead:selectedLead,previousLead:previous?.lead??selectedLead,rest,variation:choose(tracks.map((tr,i)=>({tr,i})).filter(({tr,i})=>i!==rest&&i!==selectedLead&&tr.enabled&&!tr.mute&&tr.volume>0&&tr.points.some(Boolean)&&isMelodic(tr.instrument)))};
}
export function developmentGain(plan:DevelopmentPlan,track:number,step:number,chorus:boolean|number){
 const elapsed=(step-plan.start)/16,transition=smooth(elapsed/2);
 const old=track===plan.previousLead?1:.72,next=track===plan.lead?1:.72;
 let gain=old+(next-old)*transition;
 if(track===plan.rest){
  // Four-bar absence, with half-bar fades; accompaniment, not the foundation.
  const fade=smooth((elapsed-2)/.5)*(1-smooth((elapsed-5.5)/.5));
  gain*=1-fade*(1-Number(chorus));
 }
 return gain;
}
/** Revoice one phrase note, leaving the user's motif and stored hook untouched. */
export function accompanimentMotif(motif:readonly number[],plan:DevelopmentPlan,track:number,step:number,kind:SongPart):readonly number[]{
 if(track!==plan.variation||kind==='chorus')return motif;
 const phrase=Math.floor((step-plan.start)/32);
 if(phrase%2===0)return motif;
 const result=[...motif],index=(phrase+track)%result.length;
 result[index]=Math.max(0,Math.min(4,result[index]+(phrase%4===1?1:-1)));
 return result;
}
/** Gradual 36-bar rise, peak, fall and recovery. One chord step per four bars. */
export function registerArc(bar:number){return [0,1,2,3,2,1,0,-1,0][Math.floor(Math.max(0,bar)/4)%9];}
/** Move through the current chord, not arbitrary chromatic transposition. */
export function registerNote(note:number,steps:number,root:number,tones:readonly number[]){
 let result=note;
 for(let i=0;i<Math.abs(steps);i++){
  const direction=Math.sign(steps);
  for(let distance=1;distance<=12;distance++){
   const candidate=result+direction*distance,pc=((candidate-root)%12+12)%12;
   if(tones.includes(pc)){result=candidate;break;}
  }
 }
 return result;
}
