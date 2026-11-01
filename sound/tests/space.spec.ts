import {test,expect} from '@playwright/test';
import {spaceProfile,stereoPosition,sectionExpression} from '../src/lib/space';
import {styleIds} from '../src/lib/presets';
test('space remains subtle and foundations stay centred',()=>{
 for(const style of styleIds){
  const p=spaceProfile(style);
  expect(p.hall).toBeLessThanOrEqual(.15);expect(p.echo).toBeLessThan(.1);
 }
 for(const instrument of ['kick','bass','synthbass'])expect(stereoPosition(instrument,3,100,1)).toBe(0);
 for(let bar=0;bar<64;bar++){
  const p=stereoPosition('piano',2,bar,1);
  expect(Math.abs(p)).toBeLessThanOrEqual(.22);
  expect(Math.abs(p-stereoPosition('piano',2,bar+.01,1))).toBeLessThan(.001);
 }
});
test('build and chorus meet continuously without a volume boost',()=>{
 const before=sectionExpression('verse','chorus',8,8),after=sectionExpression('chorus','verse',0,8);
 expect(before).toEqual(after);
 expect(sectionExpression('verse','chorus',6,8)).toEqual({cutoff:1,gain:1});
 expect(sectionExpression('chorus','verse',2,8)).toEqual({cutoff:1,gain:1});
 for(let bar=6;bar<=8;bar+=.125){
  const p=sectionExpression('verse','chorus',bar,8);
  expect(p.gain).toBeGreaterThanOrEqual(.94);expect(p.gain).toBeLessThanOrEqual(1);
 }
 expect(sectionExpression('verse','bridge',7,8)).toEqual({cutoff:1,gain:1});
});
