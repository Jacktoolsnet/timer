import {swingPosition} from './track-grid';
export const trackRates=[.5,1,2] as const;
export type TrackRate=typeof trackRates[number];
export type TrackRateChoice='auto'|TrackRate;
export function rateWindow(step:number,native:number,beats:number,swing:number,rate:TrackRate){
 return {start:swingPosition(step,native,beats,swing)/native*rate,end:swingPosition(step+1,native,beats,swing)/native*rate};
}
/** Local swung grid crossings within one shared transport tick; offsets are native time units. */
export function rateGridEvents(slots:number,native:number,step:number,beats:number,swing:number,rate:TrackRate){
 const {start,end}=rateWindow(step,native,beats,swing,rate),result:{index:number;offset:number}[]=[];
 for(let cycle=Math.floor(start+1e-9);cycle<=Math.floor(end+1e-9);cycle++)for(let k=0;k<slots;k++){
  const at=cycle+swingPosition(k,slots,beats,swing)/slots;
  if(at>=start-1e-8&&at<end-1e-8)result.push({index:k,offset:Math.max(0,(at-start)/rate*native)});
 }
 return result;
}
/** Foundation stays steady; slow melodic layers contrast with occasional fast percussion/arpeggios. */
export function randomTrackRate(instrument:string,style:string,random=Math.random):TrackRate{
 if(['kick','snare','clap','bass','synthbass','doublebass','acidbass'].includes(instrument))return 1;
 const calm=['ambient','focus','classical','coffeehouse','slowwaltz'].includes(style);
 const sustained=['strings','cello','violin','pad','voice','saxophone','flute','horn','clarinet','trombone'].includes(instrument);
 const percussion=['hat','shaker','rim','tom'].includes(instrument),r=random();
 if(sustained)return r<(calm?.7:.5)?.5:1;
 if(percussion)return r<(calm?.1:.4)?2:1;
 return r<(calm?.45:.2)?.5:r>(calm?.95:.8)?2:1;
}
export const trackRateCopy={
 de:{label:'Spurtempo',auto:'Automatisch',pending:'Wechsel am nächsten gemeinsamen Zweitakt-Anfang',locked:'Eingeklopfte Spuren behalten ihr aufgenommenes Tempo.'},
 en:{label:'Track speed',auto:'Automatic',pending:'Changes at the next shared two-bar boundary',locked:'Tapped tracks keep their recorded timing.'},
 es:{label:'Velocidad de pista',auto:'Automática',pending:'Cambia al inicio del próximo ciclo de dos compases',locked:'Las pistas grabadas mantienen su ritmo.'},
 fr:{label:'Vitesse de piste',auto:'Automatique',pending:'Change au prochain début commun de deux mesures',locked:'Les pistes tapées gardent leur rythme enregistré.'}
} as const;
