import type {StyleId} from './presets';
export const gridSizes=[4,8,12,16] as const;
export type GridSize=typeof gridSizes[number];
export type GridChoice='auto'|GridSize;
export function remapPoints(points:readonly boolean[],from:number,to:number):boolean[]{
 const result=Array<boolean>(16).fill(false);
 for(let s=0;s<from;s++)if(points[s])result[Math.round(s/from*to)%to]=true;
 return result;
}
/** Swung position in the same grid units. Triplet/cross grids stay straight. */
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
/** Prefer underrepresented grids, never copying one shared random choice to every track. */
export function variedGrid(current:GridSize,others:readonly number[],random=Math.random,allowCurrent=false):GridSize{
 const choices=gridSizes.filter(size=>allowCurrent||size!==current);
 const count=(size:number)=>others.filter(other=>other===size).length;
 const least=Math.min(...choices.map(count));
 let balanced=choices.filter(size=>count(size)===least);
 // Retain the current grid only when it is uniquely useful for overall diversity.
 if(balanced.length>1)balanced=balanced.filter(size=>size!==current);
 return balanced[Math.floor(random()*balanced.length)];
}
/** Independent rhythm development: two orbits every 1–3 bars, gentler in calm styles. */
export function gridEvolutionPlan(style:StyleId,bar:number,candidates:readonly {index:number;last:number}[],random=Math.random){
 const calm=['ambient','focus','coffeehouse','classical','slowwaltz'].includes(style);
 const fast=['electronic','house','sport','drumandbass','funk'].includes(style);
 const pool=[...candidates],indices:number[]=[];
 for(let n=0;n<Math.min(calm?1:2,candidates.length);n++){
  const oldest=Math.min(...pool.map(c=>c.last)),ties=pool.filter(c=>c.last===oldest);
  const chosen=ties[Math.floor(random()*ties.length)];indices.push(chosen.index);pool.splice(pool.indexOf(chosen),1);
 }
 return {indices,nextBar:bar+(calm?3:fast?1:2)+Math.floor(random()*2)};
}
/** When a grid expands, actually use a few of the new subdivisions, not just more empty dots. */
export function enrichGrid(points:readonly boolean[],from:number,to:number,allowed:readonly number[],random=Math.random){
 const result=[...points],active=result.slice(0,to).filter(Boolean).length;
 if(to<=from||!active)return result;
 let pool=[...new Set(allowed)].filter(s=>Number.isInteger(s)&&s>=0&&s<to&&!result[s]);
 const amount=Math.max(0,Math.min(2,Math.floor(to*.65)-active,pool.length));
 for(let n=0;n<amount;n++){
  const near=pool.filter(s=>result[(s+1)%to]||result[(s+to-1)%to]);
  const choices=near.length?near:pool,s=choices[Math.floor(random()*choices.length)];result[s]=true;pool=pool.filter(candidate=>candidate!==s);
 }
 return result;
}
export const gridCopy={
 de:{label:'Notenraster',auto:'Automatisch',pending:'Wechsel zum nächsten Takt',locked:'Tanzrhythmus: Raster bleibt geschützt.'},
 en:{label:'Note grid',auto:'Automatic',pending:'Changes at the next bar',locked:'Dance rhythm: grid stays protected.'},
 es:{label:'Rejilla de notas',auto:'Automática',pending:'Cambia en el próximo compás',locked:'Ritmo de baile: rejilla protegida.'},
 fr:{label:'Grille de notes',auto:'Automatique',pending:'Change à la prochaine mesure',locked:'Rythme de danse : grille protégée.'}
};
