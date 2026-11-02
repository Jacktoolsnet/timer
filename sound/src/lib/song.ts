import {isMelodic} from './harmony';
export type SongPart='intro'|'verse'|'chorus'|'bridge'|'outro';
export type Section={kind:SongPart;bars:number};
export type Phrase={points:boolean[];motif:number[];pitch:number;slots?:number};
export function songForm(random=Math.random,dance=false):Section[]{
 const verseBars=random()<.5?8:dance?16:12,chorusBars=random()<.65?8:dance?16:12;
 const form:Section[]=[{kind:'intro',bars:4},{kind:'verse',bars:verseBars},{kind:'chorus',bars:chorusBars},
  {kind:'verse',bars:verseBars},{kind:'chorus',bars:chorusBars}];
 if(random()<.75)form.push({kind:'bridge',bars:dance?8:random()<.5?4:8},{kind:'chorus',bars:chorusBars});
 form.push({kind:'outro',bars:4});return form;
}
export function copyPhrases(tracks:readonly Phrase[]):Phrase[]{
 return tracks.map(tr=>({points:[...tr.points],motif:[...tr.motif],pitch:tr.pitch,...(tr.slots!==undefined?{slots:tr.slots}:{})}));
}
export function sectionGain(kind:SongPart,instrument:string,progress:number):number{
 const p=Math.max(0,Math.min(1,progress));
 const melodic=isMelodic(instrument),bass=instrument==='bass'||instrument==='synthbass'||instrument==='doublebass';
 switch(kind){
  case 'intro':return (bass?.3:melodic?.36:.12)+p*(melodic?.3:.34);
  case 'verse':return melodic?.7:.6;
  case 'chorus':return 1;
  case 'bridge':return melodic?.72:.24;
  case 'outro':return (melodic?.7:.6)*(1-p);
 }
}
export const songCopy={
 de:{title:'Songstruktur',intro:'Intro',verse:'Strophe',chorus:'Refrain',bridge:'Bridge',outro:'Ausklang',bar:'Takt'},
 en:{title:'Song structure',intro:'Intro',verse:'Verse',chorus:'Chorus',bridge:'Bridge',outro:'Outro',bar:'Bar'},
 es:{title:'Estructura musical',intro:'Introducción',verse:'Estrofa',chorus:'Estribillo',bridge:'Puente',outro:'Final',bar:'Compás'},
 fr:{title:'Structure du morceau',intro:'Intro',verse:'Couplet',chorus:'Refrain',bridge:'Pont',outro:'Final',bar:'Mesure'}
};
