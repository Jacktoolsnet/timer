export const sustainedInstruments=['voice','choir','vocalpad','strings','saxophone','organ','pad','flute','clarinet','trumpet','horn','cello','analoglead','shimmer'] as const;
export type SustainedInstrument=typeof sustainedInstruments[number];
/** Phrase rests affect automatic performance only, never freshly drawn notes. */
export function phraseActive(id:string,step:number,track:number,chorus:boolean,random:boolean,drawn:boolean){
 if(!random||drawn)return true;
 const bar=Math.floor(step/16);
 if(id==='voice')return (bar+track)%4<(chorus?3:2);
 if(['saxophone','flute','clarinet','trumpet','horn'].includes(id))return (bar+track)%6<4;
 if(id==='strings'||id==='cello')return (bar+track)%8!==7;
 return true;
}
/** Bridge neighbouring points, but keep real gaps and cleared patterns silent. */
export function phraseHold(points:readonly boolean[],beat:number,direction:number,secondsPerStep:number,swing=0,clockStep=0,steps=16){
 let duration=0;
 for(let distance=1;distance<=8;distance++){
  duration+=secondsPerStep*((clockStep+distance-1)%4<2?1+swing:1-swing);
  if(points[(beat+direction*distance+steps*2)%steps])return duration+.035;
 }
 return Math.min(.85,secondsPerStep*3);
}
