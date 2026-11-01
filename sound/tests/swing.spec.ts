import {test,expect} from '@playwright/test';
import {presets} from '../src/lib/presets';
test('swing preserves bar duration and uses paired long-short eighth notes',()=>{
 for(const id of ['jazz','coffeehouse'] as const){
  const {bpm,swing=0}=presets[id],base=60/bpm/4;
  const durations=Array.from({length:16},(_,s)=>base*(s%4<2?1+swing:1-swing));
  expect(durations[0]+durations[1]).toBeGreaterThan(durations[2]+durations[3]);
  expect(durations.reduce((a,b)=>a+b,0)).toBeCloseTo(4*60/bpm);
  expect(presets[id].scale).toContain(3);
 }
});
