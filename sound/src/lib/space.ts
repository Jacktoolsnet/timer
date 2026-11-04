import type {StyleId} from './presets';
import type {SongPart} from './song';
export function spaceProfile(style:StyleId){
 const spacious=['ambient','classical','slowwaltz'].includes(style),intimate=['focus','coffeehouse','jazz','hiphop','lofi','funk','latin'].includes(style);
 return {hall:spacious?.15:intimate?.075:.09,echo:style==='reggae'?.095:spacious?.075:intimate?.035:.055,decay:spacious?1.8:intimate?.8:1.1};
}
export function stereoPosition(instrument:string,track:number,bar:number,seed:number){
 if(['kick','bass','synthbass','doublebass','acidbass','bowedbass'].includes(instrument))return 0;
 return .22*Math.sin(seed+track*1.7+bar*Math.PI/24);
}
const smooth=(x:number)=>{const p=Math.max(0,Math.min(1,x));return p*p*(3-2*p);};
/** Last two bars gently open into the chorus, then settle over its first two. */
export function sectionExpression(kind:SongPart,next:SongPart|undefined,elapsed:number,bars:number){
 if(next==='chorus'&&elapsed>=bars-2){
  const p=smooth((elapsed-bars+2)/2);
  return {cutoff:1+.15*p,gain:1-.06*Math.sin(p*Math.PI)};
 }
 if(kind==='chorus')return {cutoff:1+.15*(1-smooth(elapsed/2)),gain:1};
 return {cutoff:1,gain:1};
}
