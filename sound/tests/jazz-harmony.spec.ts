import {test,expect} from '@playwright/test';
import {jazzSemitones} from '../src/lib/jazz-harmony';
test('jazz voices share consonant chord tones throughout the blues form',()=>{
 const roots=[0,0,0,0,5,5,0,0,7,5,0,7];
 for(let bar=0;bar<24;bar++)for(let beat=0;beat<16;beat++)for(let pitch=0;pitch<7;pitch++){
  for(const instrument of ['piano','bass','organ','guitar']){
   const value=jazzSemitones(bar,beat,instrument,pitch)-roots[bar%12];
   expect([0,2,4,7,9]).toContain(value%12);
  }
 }
 expect(jazzSemitones(12,0,'bass',0)).toBe(jazzSemitones(0,0,'bass',0));
});
