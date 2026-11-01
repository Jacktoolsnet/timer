import {test,expect} from '@playwright/test';
import {vocalInstruments,vocalWave,vowelPosition} from '../src/lib/vocal';
import {dialogueInstrument} from '../src/lib/expression';
test('wordless voices produce bounded finite audio with tapered edges',()=>{
 for(const id of vocalInstruments){
  const wave=vocalWave(id,220,22050,.5);
  let peak=0,energy=0;for(const v of wave){if(!Number.isFinite(v))throw Error(id);peak=Math.max(peak,Math.abs(v));energy+=v*v;}
  expect(peak).toBeLessThanOrEqual(.651);expect(energy).toBeGreaterThan(1);
  expect(Math.abs(wave[0])).toBe(0);expect(Math.abs(wave[wave.length-1])).toBe(0);
 }
 expect(dialogueInstrument('voice')).toBe(true);
 expect(dialogueInstrument('choir')).toBe(false);expect(dialogueInstrument('vocalpad')).toBe(false);
});
test('vowels change the spectrum and evolve slowly',()=>{
 const ah=vocalWave('voice',220,22050,0),uh=vocalWave('voice',220,22050,2);
 expect(ah.some((v,i)=>Math.abs(v-uh[i])>.01)).toBe(true);
 for(let bar=0;bar<32;bar+=.25){
  const v=vowelPosition(bar,1);
  expect(v).toBeGreaterThanOrEqual(0);expect(v).toBeLessThanOrEqual(2);
  expect(Math.abs(v-vowelPosition(bar+.25,1))).toBeLessThanOrEqual(.125);
 }
});
