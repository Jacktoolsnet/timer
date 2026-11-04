/** A shared, consonant 12-bar I–IV–V frame, using warm sixth/ninth chord tones. */
const roots=[0,0,0,0,5,5,0,0,7,5,0,7];
const melody=[0,4,7,9,14,9,7,4];
export function jazzSemitones(bar:number,beat:number,instrument:string,pitch:number,motif?:readonly number[]):number{
 const root=roots[((bar%12)+12)%12];
 if(instrument==='bass'||instrument==='synthbass'||instrument==='doublebass'||instrument==='acidbass'||instrument==='bowedbass'){
  return root+(motif&&beat%8!==0?[0,7,9,12,7][motif[Math.floor(beat/2)%motif.length]]:[0,7,9,7][Math.floor(beat/4)%4]);
 }
 if(instrument==='organ'||instrument==='pad'||instrument==='strings'||instrument==='choir'||instrument==='vocalpad'||instrument==='shimmer'||instrument==='cello'||instrument==='violin'||instrument==='viola'||instrument==='bowedbass')return root+(motif?[0,4,7,9,12][motif[Math.floor(beat/2)%motif.length]]:0);
 // Each melodic voice stays in the same chord family, even after random pitch changes.
 return root+(motif?[0,4,7,9,14][(motif[Math.floor(beat/2)%motif.length]+Math.max(0,pitch))%5]:melody[(Math.floor(beat/2)+Math.max(0,pitch))%melody.length]);
}
