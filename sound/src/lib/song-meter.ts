/** Meter units are denominator notes; transport time is always measured in quarters. */
export type SongMeter={numerator:number;denominator:2|4|8|16;groups:number[]};
export type TempoUnit={denominator:2|4|8|16;dotted:boolean};
export type MeteredSong={version:number;meter?:SongMeter;tempoUnit?:TempoUnit};
const legacyMeter:SongMeter={numerator:4,denominator:4,groups:[1,1,1,1]};
export function songMeter(song:MeteredSong):SongMeter{return song.version===3?song.meter!:legacyMeter;}
export function tempoQuarters(song:MeteredSong){const u=song.version===3?song.tempoUnit!:{denominator:4,dotted:false};return 4/u.denominator*(u.dotted?1.5:1);}
export function quartersPerBar(song:MeteredSong){const m=songMeter(song);return m.numerator*4/m.denominator;}
export function unitsPerPattern(song:MeteredSong){return songMeter(song).numerator*2;}
export function scriptSeconds(song:MeteredSong&{bpm:number;scenes:{bars:number}[]},bpm=song.bpm){return song.scenes.reduce((sum,s)=>sum+s.bars,0)*quartersPerBar(song)*60/(bpm*tempoQuarters(song));}
export function meterLabel(song:MeteredSong){const m=songMeter(song);return `${m.numerator}/${m.denominator}`;}
export function tempoLabel(song:MeteredSong,bpm:number){
 if(song.version!==3)return bpm+' BPM';
 const u=song.tempoUnit!;return `${bpm} BPM (1/${u.denominator}${u.dotted?'.':''}) · ${meterLabel(song)} · ${song.meter!.groups.join('+')}`;
}
/** Gentle hierarchy; explicit velocities still control the musical dynamics. */
export function meterAccent(meter:SongMeter,at:number){
 const unit=((at%meter.numerator)+meter.numerator)%meter.numerator;
 if(Math.abs(unit)<1e-8)return 1;
 let start=0;for(const group of meter.groups){start+=group;if(Math.abs(unit-start)<1e-8)return .94;}
 return Math.abs(unit-Math.round(unit))<1e-8?.88:.84;
}
export function validMeter(value:any):value is SongMeter{
 return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>['numerator','denominator','groups'].includes(k))
  &&Number.isInteger(value.numerator)&&value.numerator>=1&&value.numerator<=12&&[2,4,8,16].includes(value.denominator)
  &&Array.isArray(value.groups)&&value.groups.length>=1&&value.groups.length<=12&&value.groups.every((g:unknown)=>Number.isInteger(g)&&Number(g)>0)
  &&value.groups.reduce((s:number,g:number)=>s+g,0)===value.numerator;
}
export function validTempoUnit(value:any):value is TempoUnit{
 return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>['denominator','dotted'].includes(k))
  &&[2,4,8,16].includes(value.denominator)&&typeof value.dotted==='boolean';
}
