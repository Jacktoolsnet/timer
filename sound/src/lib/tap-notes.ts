import {chordFor} from './harmony';
import {jazzSemitones} from './jazz-harmony';
import type {StyleId} from './presets';
/** Seven diatonic degrees plus the upper tonic; degrees are stored, not arbitrary MIDI pitches. */
export function tapNoteSemitones(style:StyleId,bar:number,degree:number){
 const chord=chordFor(style,bar),jazz=style==='jazz';
 const scale=jazz||chord.third===4?[0,2,4,5,7,9,11,12]:[0,2,3,5,7,8,10,12];
 return (jazz?jazzSemitones(bar,0,'bass',0):chord.root)+scale[Math.max(0,Math.min(7,Math.round(degree)))];
}
export function tapNoteAt(y:number,top:number,height:number){
 return 7-Math.max(0,Math.min(7,Math.floor((y-top)/height*8)));
}
export function tapNoteY(degree:number,top:number,height:number){return top+(7-degree+.5)/8*height;}
/** The top number row plays pitches; physical numpad codes always remain pad selectors. */
export function tapNoteKey(code:string,key:string){
 if(code.startsWith('Numpad'))return null;
 const digit=/^Digit[1-8]$/.test(code)?Number(code.slice(-1)):/^[1-8]$/.test(key)?Number(key):0;
 return digit?digit-1:null;
}

/** Project the synthesized melodic pitch onto the same eight bands used for tapping.
 * Notes outside the displayed octave stay at the nearest edge, never wrap down. */
export function tapNoteDegree(style:StyleId,bar:number,semitones:number){
 let nearest=0,distance=Infinity;
 for(let degree=0;degree<8;degree++){
  const delta=Math.abs(tapNoteSemitones(style,bar,degree)-semitones);
  if(delta<distance){nearest=degree;distance=delta;}
 }
 return nearest;
}
