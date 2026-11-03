import type {StyleId} from './presets';
import {grooveRole} from './groove';
import {gridFractionAtTime,swingPosition} from './track-grid';

/** Bounded musical feel, in seconds, on top of the existing swung grid.
 * Slowly moving deterministic phrases avoid per-note jitter and random reordering.
 * The first downbeat, foundations, dance pulses and user recordings stay exact.
 */
export function noteTimingOffset(style:StyleId,instrument:string,track:number,clockStep:number,bpm:number,slots:number,beats:number,locked=false,seed=0){
 const role=grooveRole(instrument);
 if(locked||clockStep<=0||role==='kick'||role==='bass')return 0;
 const tight=['electronic','house','sport','drumandbass'].includes(style);
 if(tight&&role==='backbeat')return 0;
 const laidBack=['jazz','coffeehouse','lofi','hiphop'].includes(style);
 const amount=laidBack?.024:tight?.004:style==='reggae'?.016:.012;
 const quarter=60/bpm;
 const limit=Math.min(amount,quarter*.22,quarter*beats/slots*.12);
 const phase=clockStep/(beats*4)*Math.PI*.65+track*1.77+seed;
 const wave=.75*Math.sin(phase)+.25*Math.sin(phase*.47+track);
 return limit*(laidBack?.28+.72*wave:wave);
}

/** Position the head exactly where its moving orbit arrives at the shifted onset.
 * Inverse swing matters: a millisecond is not the same angle in both swing halves.
 */
export function noteTimingAngle(beat:number,slots:number,phase:number,direction:number,offset:number,barSeconds:number,beats:number,swing:number){
 const clock=((beat-phase)*direction+slots*2)%slots;
 const shifted=gridFractionAtTime(swingPosition(clock,slots,beats,swing)/slots+offset/barSeconds,slots,beats,swing);
 return beat/slots*Math.PI*2-Math.PI/2+direction*(shifted-clock/slots)*Math.PI*2;
}

export type NoteJoin={beat:number;time:number};
/** A retained connection is valid only for the exact two audible events involved. */
export function validNoteJoin(from:{time:number}|undefined,join:NoteJoin|undefined,toTime:number,barSeconds:number){
 return !!from&&!!join&&Math.abs(from.time-join.time)<1e-6&&toTime>join.time&&toTime-join.time<barSeconds;
}
