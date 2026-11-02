export const gridSizes=[4,8,12,16] as const;
export type GridSize=typeof gridSizes[number];
export type GridChoice='auto'|GridSize;
export function remapPoints(points:readonly boolean[],from:number,to:number):boolean[]{
 const result=Array<boolean>(16).fill(false);
 for(let s=0;s<from;s++)if(points[s])result[Math.round(s/from*to)%to]=true;
 return result;
}
/** Wall-clock sixteenth position within the bar. Triplet/cross grids stay straight. */
export function swingPosition(position:number,slots:number,beats:number,swing:number){
 if(!swing||slots%(beats*2)!==0)return position;
 const quarter=position/(slots/beats),whole=Math.floor(quarter),part=quarter-whole;
 return (whole+(part<.5?part*(1+swing):.5*(1+swing)+(part-.5)*(1-swing)))*(slots/beats);
}
export function gridFractionAtTime(fraction:number,slots:number,beats:number,swing:number){
 if(!swing||slots%(beats*2)!==0)return fraction;
 const quarter=fraction*beats,whole=Math.floor(quarter),part=quarter-whole,half=.5*(1+swing);
 return (whole+(part<half?part/(1+swing):.5+(part-half)/(1-swing)))/beats;
}
/** All notes due in one native clock interval, including true off-grid triplets. */
export function gridEvents(slots:number,native:number,clock:number,beats:number,swing:number){
 const start=swingPosition(clock,native,beats,swing),end=swingPosition(clock+1,native,beats,swing);
 const result:{index:number;offset:number}[]=[];
 for(let k=0;k<slots;k++){
  const at=swingPosition(k,slots,beats,swing)/slots*native;
  if(at>=start-1e-8&&at<end-1e-8)result.push({index:k,offset:Math.max(0,at-start)});
 }
 return result;
}
export function gridPhraseHold(points:readonly boolean[],index:number,clock:number,direction:number,slots:number,beats:number,bpm:number,swing:number){
 const bar=60/bpm*beats,at=(k:number)=>Math.floor(k/slots)+swingPosition(k%slots,slots,beats,swing)/slots;
 for(let d=1;d<=Math.ceil(slots/2);d++)if(points[(index+direction*d+slots*2)%slots])return (at(clock+d)-at(clock))*bar+.035;
 return Math.min(.85,bar/slots*3);
}
export function canEvolveGrid(instrument:string,protectedTrack:boolean){
 return !protectedTrack&&!['kick','snare','clap','tom','rim','hat','shaker','bass','synthbass','doublebass'].includes(instrument);
}
export const gridCopy={
 de:{label:'Notenraster',auto:'Automatisch',pending:'Wechsel zum nächsten Takt',locked:'Tanzrhythmus: Raster bleibt geschützt.'},
 en:{label:'Note grid',auto:'Automatic',pending:'Changes at the next bar',locked:'Dance rhythm: grid stays protected.'},
 es:{label:'Rejilla de notas',auto:'Automática',pending:'Cambia en el próximo compás',locked:'Ritmo de baile: rejilla protegida.'},
 fr:{label:'Grille de notes',auto:'Automatique',pending:'Change à la prochaine mesure',locked:'Rythme de danse : grille protégée.'}
};
