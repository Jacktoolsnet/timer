import {test,expect} from '@playwright/test';
import {noteGlow} from '../src/lib/note-glow';
test('quiet notes visibly flash while loud notes remain brighter',()=>{
 expect(noteGlow(0,.01,true,false)).toBeGreaterThan(.55);
 expect(noteGlow(0,1,true,false)).toBeGreaterThan(noteGlow(0,.01,true,false));
 expect(noteGlow(300,.01,true,false)).toBeLessThan(noteGlow(0,.01,true,false));
 for(const age of [-1,700,1000])expect(noteGlow(age,1,true,false)).toBe(0);
 expect(noteGlow(0,1,false,false)).toBe(0);expect(noteGlow(0,1,true,true)).toBe(0);
});
test('effect strength can disable or boost hits without invalid geometry',()=>{
 expect(noteGlow(0,.1,true,false,0)).toBe(0);
 expect(noteGlow(100,.1,true,false,1.5)).toBeGreaterThan(noteGlow(100,.1,true,false,1));
 for(const strength of [0,.5,1,1.5])for(const age of [0,100,500]){
  const glow=noteGlow(age,1,true,false,strength);
  expect(glow).toBeGreaterThanOrEqual(0);expect(glow).toBeLessThanOrEqual(1);
 }
});
