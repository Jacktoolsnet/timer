import {test,expect} from '@playwright/test';
import {mixLevels} from '../src/lib/mixing';
const track=(instrument:string)=>({instrument,enabled:true,mute:false,volume:.5,points:Array(16).fill(true)});
const tracks=['kick','bass','piano','guitar','pad','hat'].map(track);
const plan={start:0,lead:2,previousLead:2,rest:-1,variation:3};
test('automatic mix clearly separates lead, backing, pads and rhythmic foundation',()=>{
 const levels=mixLevels(tracks,plan,64,0,[]);
 expect(levels[2]).toBe(1);expect(levels[3]).toBeLessThan(.5);expect(levels[4]).toBeLessThan(.45);
 expect(levels[0]).toBeGreaterThan(.75);expect(levels[1]).toBeGreaterThan(.55);
 expect(levels[5]).toBeLessThan(.7);
});
test('drawn parts take priority and smoothly give the mix back',()=>{
 const base=mixLevels(tracks,plan,64,0,[]);
 const focus=mixLevels(tracks,plan,64,0,[0,0,0,96]);
 const ending=mixLevels(tracks,plan,88,0,[0,0,0,96]);
 expect(focus[3]).toBe(1);expect(focus[2]).toBeLessThan(base[2]);
 expect(ending[3]).toBeLessThan(focus[3]);expect(ending[3]).toBeGreaterThan(base[3]);
 expect(mixLevels(tracks,plan,96,0,[0,0,0,96])[3]).toBeCloseTo(base[3]);
});
test('mix attenuation cannot exceed manual ceilings or activate muted and empty tracks',()=>{
 const modified=tracks.map(t=>({...t,points:[...t.points]}));
 modified[2].mute=true;modified[3].enabled=false;modified[4].points.fill(false);modified[5].volume=0;
 for(let step=0;step<256;step+=8){
  const levels=mixLevels(modified,plan,step,0,[0,0,300]);
  expect(levels.slice(2)).toEqual([0,0,0,0]);
  expect(levels.every(v=>v>=0&&v<=1)).toBe(true);
 }
});

test('bowed strings can also take the lead rather than staying a background layer',()=>{
 const parts=['strings','piano','bass'].map(track);
 const levels=mixLevels(parts,{...plan,lead:0,previousLead:0},64,0,[]);
 expect(levels[0]).toBe(1);expect(levels[1]).toBeLessThan(.5);
});
