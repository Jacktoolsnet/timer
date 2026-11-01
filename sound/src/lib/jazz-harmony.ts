/** A shared, consonant 12-bar I–IV–V frame, using warm sixth/ninth chord tones. */
const roots=[0,0,0,0,5,5,0,0,7,5,0,7];
const melody=[0,4,7,9,14,9,7,4];
export function jazzSemitones(bar:number,beat:number,instrument:string,pitch:number):number{
 const root=roots[((bar%12)+12)%12];
 if(instrument==='bass'||instrument==='synthbass'){
  return root+[0,7,9,7][Math.floor(beat/4)%4];
 }
 if(instrument==='organ'||instrument==='pad'||instrument==='strings')return root;
 // Each melodic voice stays in the same chord family, even after random pitch changes.
 return root+melody[(Math.floor(beat/2)+Math.max(0,pitch))%melody.length];
}
