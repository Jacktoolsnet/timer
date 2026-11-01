import {test,expect} from '@playwright/test';
import {continueBow} from '../src/lib/bowed';
import {acousticWave} from '../src/lib/acoustic';
test('neighbouring string notes share a bow, separated notes get a fresh attack',()=>{
 expect(continueBow(0,0,.25,100)).toBe(true);
 expect(continueBow(.25,0,.5,100)).toBe(true);
 expect(continueBow(0,0,.25,100,2)).toBe(false);
 expect(continueBow(0,0,0,100)).toBe(false);
 expect(continueBow(0,0,1.2,100)).toBe(false);
 expect(continueBow(.8,0,1,100)).toBe(false);
});
test('strings have a restrained onset and smooth long release',()=>{
 const sr=22050,wave=acousticWave('strings',220,sr,.5);
 const rms=(a:number,b:number)=>{const values=wave.subarray(Math.floor(a*sr),Math.floor(b*sr));return Math.sqrt(values.reduce((sum,v)=>sum+v*v,0)/values.length);};
 expect(rms(0,.05)).toBeLessThan(rms(.4,.5)*.3);
 expect(rms(2,2.1)).toBeLessThan(rms(1,1.1)*.3);
 expect(Math.abs(wave[wave.length-1])).toBe(0);
});
