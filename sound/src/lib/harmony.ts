import type {StyleId} from './presets';
export const percussion=['kick','snare','hat','clap','tom','rim','shaker','conga'] as const;
export function isMelodic(instrument:string){return !(percussion as readonly string[]).includes(instrument);}
export function makeMotif(melody:readonly number[]):number[]{
 return Array.from({length:8},(_,i)=>Math.max(0,Math.min(4,melody[i%melody.length]||0)));
}
/** Mutate just one phrase note by one degree, retaining a recognisable motif. */
export function varyMotif(motif:number[],random=Math.random):void{
 const index=Math.floor(random()*motif.length),direction=random()<.5?-1:1;
 motif[index]=Math.max(0,Math.min(4,motif[index]+direction));
}
export function chordFor(style:StyleId,bar:number):{root:number;third:number}{
 const slow=style==='slowwaltz'||style==='ambient'||style==='focus'||style==='coffeehouse';
 const index=Math.floor(bar/(slow?4:2))%4;
 const major=['pop','classical','slowwaltz','ambient','focus','coffeehouse','lofi','funk','reggae','latin'].includes(style);
 const roots=major?[0,5,9,7]:[0,8,5,7];
 const thirds=major?[4,4,3,4]:[3,4,3,3];
 return {root:roots[index],third:thirds[index]};
}
/** Shared chords and short repeated phrases keep independent orbits consonant. */
export function melodicSemitones(style:StyleId,bar:number,beat:number,instrument:string,pitch:number,motif:readonly number[]):number{
 const {root,third}=chordFor(style,bar);
 if(instrument==='bass'||instrument==='synthbass'||instrument==='doublebass'||instrument==='acidbass'||instrument==='bowedbass'){
  return root+(beat%8===0?0:[0,7,12,7,12][motif[Math.floor(beat/2)%motif.length]]);
 }
 if(instrument==='pad'||instrument==='strings'||instrument==='organ'||instrument==='choir'||instrument==='vocalpad'||instrument==='shimmer'||instrument==='cello'||instrument==='violin'||instrument==='viola'||instrument==='bowedbass')return root+[0,third,7,12,third][motif[Math.floor(beat/2)%motif.length]];
 const degree=(motif[Math.floor(beat/2)%motif.length]+Math.max(0,pitch))%5;
 return root+[0,third,7,12,12+third][degree];
}

/** Height within an instrument band maps smoothly from high to low chord degrees. */
export function gestureDegree(y:number,height:number,bands:number,band:number):number{
 const local=Math.max(0,Math.min(1,y/height*bands-band));
 return Math.round((1-local)*4);
}
