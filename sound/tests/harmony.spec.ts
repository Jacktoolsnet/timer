import {test,expect} from '@playwright/test';
import {styleIds,presets} from '../src/lib/presets';
import {makeMotif,varyMotif,chordFor,melodicSemitones} from '../src/lib/harmony';
test('all styles share chord tones across independent melodic orbits',()=>{
 for(const style of styleIds){
  const motif=makeMotif(presets[style].melody);
  for(let bar=0;bar<16;bar++){
   const {root,third}=chordFor(style,bar);
   for(let beat=0;beat<16;beat++)for(const instrument of ['bass','pad','piano','guitar','pluck']){
    const value=melodicSemitones(style,bar,beat,instrument,2,motif);
    expect([0,third,7]).toContain((value-root)%12);
   }
  }
 }
});
test('motif variation changes at most one note by one degree',()=>{
 const motif=[2,1,2,1,0,2,1,0],before=[...motif];
 varyMotif(motif,()=>0);
 expect(motif.filter((value,i)=>value!==before[i])).toHaveLength(1);
 expect(Math.abs(motif[0]-before[0])).toBe(1);
});
