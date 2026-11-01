import {test,expect} from '@playwright/test';
import {approach,journeyLength,morphWeights} from '../src/lib/journey';
test('journeys use four to six stages with bounded steps and constant total gain',()=>{
 expect(journeyLength(()=>0)).toBe(4);expect(journeyLength(()=>.999)).toBe(6);
 expect(approach(180,94,2)).toBe(178);expect(approach(0,4,1)).toBe(1);
 expect(approach(100,101,2)).toBe(101);
 let previous=0;
 for(const p of [0,.25,.5,.75,1]){
  const [old,next]=morphWeights(p);
  expect(old+next).toBeCloseTo(1);expect(next).toBeGreaterThanOrEqual(previous);previous=next;
 }
 expect(morphWeights(0)).toEqual([1,0]);expect(morphWeights(1)).toEqual([0,1]);
});
