import {isMelodic} from './harmony';

/** Keep bass and sustained harmony independent of the melodic conversation. */
export function dialogueInstrument(instrument:string){
 return isMelodic(instrument)&&!['bass','synthbass','doublebass','pad','strings','organ'].includes(instrument);
}

/** Respond to the live motif, preserving its contour with one gentle resolution. */
export function answerMotif(motif:readonly number[],question:readonly number[]=motif):number[]{
 const answer=[...motif];
 if(answer.length){
  const last=answer.length-1,target=question[question.length-1]??answer[last];
  answer[last]=Math.max(0,Math.min(4,answer[last]+Math.sign(target-answer[last])));
 }
 return answer;
}

/** Two-bar questions and answers, with a soft handover rather than hard muting. */
export function dialogueGain(bar:number,role:number):number{
 const position=((bar%4)+4)%4;
 const blend=(1-Math.cos(position/4*Math.PI*2))/2;
 return .48+.52*(role===0?1-blend:blend);
}

/** Slow, bounded timbral breathing. No randomness per note and no level boost. */
export function timbreMotion(bar:number,seed:number,track:number){
 const phase=seed+track*1.73;
 const wave=Math.sin(bar*Math.PI/16+phase);
 return {cutoff:Math.pow(2,wave*.22),attack:1+wave*.12};
}
