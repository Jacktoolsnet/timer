import {test,expect} from '@playwright/test';
import {songForm,sectionGain,copyPhrases} from '../src/lib/song';
test('song forms have returning choruses, verses and optional contrast',()=>{
 for(const value of [0,.5,.99]){
  const form=songForm(()=>value);
  expect(form[0].kind).toBe('intro');expect(form.at(-1)!.kind).toBe('outro');
  expect(form.filter(p=>p.kind==='chorus').length).toBeGreaterThanOrEqual(2);
  expect(form.filter(p=>p.kind==='verse')).toHaveLength(2);
  expect(form.every(p=>p.bars>=4&&p.bars%4===0)).toBeTruthy();
  expect(form.some(p=>p.kind==='bridge')).toBe(value<.75);
  for(const instrument of ['piano','kick','bass']){
   expect(sectionGain('chorus',instrument,.5)).toBeGreaterThan(sectionGain('verse',instrument,.5));
   expect(sectionGain('outro',instrument,1)).toBe(0);
  }
 }
});
test('remembered refrain phrases are not mutated by later loop edits',()=>{
 const source=[{points:[true,false],motif:[0,1,2],pitch:1}];
 const refrain=copyPhrases(source);
 source[0].points[0]=false;source[0].motif[1]=4;
 expect(refrain[0].points[0]).toBe(true);expect(refrain[0].motif[1]).toBe(1);
 const reprise=copyPhrases(refrain);reprise[0].motif[0]=3;
 expect(refrain[0].motif[0]).toBe(0);
});
