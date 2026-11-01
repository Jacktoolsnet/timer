import {test,expect} from '@playwright/test';
import {arrangementPlan,breathGain,ornamentAt} from '../src/lib/arrangement';
const track=(instrument:string)=>({instrument,enabled:true,mute:false,volume:.65,points:Array.from({length:16},(_,i)=>i%4===0)});
test('rests protect foundations, muted tracks and sparse arrangements',()=>{
 const tracks=['kick','bass','piano','hat'].map(track);
 const plan=arrangementPlan(tracks,0,()=>0);
 expect(plan.rest).toBe(2);expect(plan.ornament).not.toBe(plan.rest);
 expect(arrangementPlan(tracks.slice(0,2),0,()=>0).rest).toBe(-1);
 tracks[2].mute=true;tracks[3].points.fill(false);
 expect(arrangementPlan(tracks,0,()=>0).rest).toBe(-1);
});
test('breaths return softly and affect only one bar of one track',()=>{
 const plan={start:64,rest:2,ornament:3};
 expect([95,96,98,100,108,110,112].map(s=>breathGain(plan,2,s))).toEqual([1,1,.5,0,0,.5,1]);
 expect(breathGain(plan,0,104)).toBe(1);
});
test('ornaments respect silence, direction, phrase boundary and existing notes',()=>{
 const plan={start:64,rest:2,ornament:3},points=Array(16).fill(false);
 points[12]=true;
 expect(ornamentAt(plan,3,126,14,1,points)).toBe(true);
 expect(ornamentAt(plan,3,125,14,1,points)).toBe(false);
 expect(ornamentAt(plan,2,126,14,1,points)).toBe(false);
 expect(ornamentAt(plan,3,126,14,-1,points)).toBe(false);
 points.fill(false);points[0]=true;
 expect(ornamentAt(plan,3,126,14,-1,points)).toBe(true);
 points[14]=true;expect(ornamentAt(plan,3,126,14,-1,points)).toBe(false);
 points.fill(false);expect(ornamentAt(plan,3,126,14,1,points)).toBe(false);
});
