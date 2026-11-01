import {dialogueInstrument} from './expression';
export type ArrangementTrack={instrument:string;enabled:boolean;mute:boolean;volume:number;points:readonly boolean[]};
export type ArrangementPlan={start:number;rest:number;ornament:number};
export function arrangementPlan(tracks:readonly ArrangementTrack[],start:number,random=Math.random):ArrangementPlan{
 const active=tracks.map((track,index)=>({track,index})).filter(({track})=>track.enabled&&!track.mute&&track.volume>0&&track.points.some(Boolean));
 const pick=(items:typeof active)=>items.length?items[Math.min(items.length-1,Math.floor(random()*items.length))].index:-1;
 // Never remove the pulse/bass foundation or the only accompaniment.
 const rest=active.length>=3&&random()<.65?pick(active.filter(({track})=>dialogueInstrument(track.instrument)||['hat','shaker'].includes(track.instrument))):-1;
 const ornament=random()<.65?pick(active.filter(({track,index})=>index!==rest&&(dialogueInstrument(track.instrument)||['snare','rim','tom','shaker'].includes(track.instrument)))):-1;
 return {start,rest,ornament};
}
/** One short breath, softly entering and leaving silence within a single bar. */
export function breathGain(plan:ArrangementPlan,track:number,step:number){
 if(track!==plan.rest)return 1;
 const elapsed=step-plan.start-32;
 if(elapsed<0||elapsed>=16)return 1;
 return elapsed<4?1-elapsed/4:elapsed>12?(elapsed-12)/4:0;
}
/** Only a phrase-ending neighbour of an existing note; never revive a cleared pattern. */
export function ornamentAt(plan:ArrangementPlan,track:number,step:number,beat:number,direction:number,points:readonly boolean[],steps=16){
 if(track!==plan.ornament||Math.floor(step-plan.start)!==62||points[beat])return false;
 return points[(beat-direction+steps)%steps]||points[(beat-2*direction+steps*2)%steps];
}
