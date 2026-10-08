import {pitches} from './relax.ts';
export type Instrument='chimes'|'bowls'|'kalimba'|'handpan';
const kalimbaNotes=[261.63,293.66,329.63,392,440,523.25,587.33,659.25];
const handpanNotes=[146.83,174.61,196,220,261.63,293.66,349.23,392];
/** Modal approximations, not recordings of acoustic instruments. */
export function instrumentTone(instrument:Instrument,index:number,random=Math.random){
 const frequency=(instrument==='kalimba'?kalimbaNotes:instrument==='handpan'?handpanNotes:pitches)[index]!;
 switch(instrument){
  case 'kalimba':return {frequency,duration:2.8,partials:[1,2.92,5.3],attack:.003,peak:.19,decay:.9};
  case 'handpan':return {frequency,duration:5.5,partials:[1,2,3,4.95],attack:.012,peak:.21,decay:.6};
  case 'chimes':return {frequency:frequency*2,duration:8+random()*3,partials:[1,2.756,5.404,8.933],attack:.008,peak:.11,decay:.65};
  case 'bowls':return {frequency,duration:10,partials:[1,2.01,2.76,4.1],attack:.04,peak:.16,decay:0};
 }
}
