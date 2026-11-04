import {test,expect} from '@playwright/test';
import {instrumentIds,instrumentNames} from '../src/lib/instruments';
import {instrumentGroups} from '../src/lib/instrument-picker';
import {instrumentFamily} from '../src/lib/articulation';
import {sustainedHarmonic,sustainedProfile} from '../src/lib/sustained-voice';
import {sustainedInstruments} from '../src/lib/phrasing';
import {evolutionPalette} from '../src/lib/presets';
const voices=['violin','viola','bowedbass'] as const;

test('bowed voices have deliberate, distinct bodies, localized labels, groups and classical generation support',()=>{
 expect(instrumentIds).toHaveLength(38);
 for(const id of voices){
  expect(instrumentGroups.strings).toContain(id);expect(instrumentFamily[id]).toBe('bowed');expect(sustainedInstruments).toContain(id);expect(evolutionPalette('classical')).toContain(id);
  for(const names of Object.values(instrumentNames))expect(names[instrumentIds.indexOf(id)]).toBeTruthy();
 }
 const curves=voices.map(id=>Array.from({length:12},(_,i)=>sustainedHarmonic(id,i+1)));
 expect(new Set(curves.map(c=>JSON.stringify(c))).size).toBe(3);
 expect(sustainedProfile('violin').attack).toBeLessThan(sustainedProfile('viola').attack);expect(sustainedProfile('viola').attack).toBeLessThan(sustainedProfile('bowedbass').attack);
});

test('solo bowed instruments render finite, sustained, distinct audio with silent released tails',async({page})=>{
 await page.goto('/de/');
 const metrics=await page.evaluate(async()=>{
  const path='/src/lib/sustained-voice.ts';const {createSustainedVoice}=await import(path);const result=[];
  for(const id of ['violin','viola','bowedbass']){
   const sr=22050,ctx=new OfflineAudioContext(1,sr*3,sr);let ended=0;
   createSustainedVoice(ctx,ctx.destination,id,220,.01,.15,.65,0,()=>ended++);
   const data=(await ctx.startRendering()).getChannelData(0);let energy=0,tail=0,signature=0,peak=0;
   data.forEach((v,i)=>{energy+=v*v;peak=Math.max(peak,Math.abs(v));if(i>sr*2.8)tail+=v*v;if(i%97===0)signature+=v;});
   result.push({id,finite:data.every(Number.isFinite),energy,tail,peak,signature,ended});
  }
  return result;
 });
 for(const m of metrics){expect(m.finite).toBe(true);expect(m.energy).toBeGreaterThan(1);expect(m.peak).toBeLessThan(1);expect(m.tail).toBeLessThan(1e-7);expect(m.ended).toBe(1);}
 expect(new Set(metrics.map(m=>m.signature.toFixed(6))).size).toBe(3);
});

for(const lang of ['de','en','es','fr'])test('bowed instrument tiles are available and named correctly: '+lang,async({page})=>{
 await page.goto('/'+lang+'/');await page.locator('[data-pad-mode=rhythm]').click();await page.keyboard.press('Numpad5');await page.locator('#pad-instrument').click();await page.locator('[data-instrument-group=strings]').click();
 for(const id of voices){const button=page.locator(`[data-pick-instrument=${id}]`);await expect(button).toBeVisible();await expect(button.locator('svg')).toBeVisible();await expect(button.locator('span')).toHaveText(instrumentNames[lang as keyof typeof instrumentNames][instrumentIds.indexOf(id)]);}
 await page.locator('[data-pick-instrument=viola]').click();await expect(page.locator('[data-track="4"] .instrument-select')).toHaveValue('viola');
});

test('Nachtmusik playback uses the new instruments at violin/viola pitch and a true lower-octave arco bass',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).bowFrequencies=[];const values=new WeakMap<AudioParam,number>(),set=AudioParam.prototype.setValueAtTime,start=OscillatorNode.prototype.start;
  AudioParam.prototype.setValueAtTime=function(v,t){values.set(this,v);return set.call(this,v,t);};
  OscillatorNode.prototype.start=function(at=0){const hz=values.get(this.frequency);if(hz)(window as any).bowFrequencies.push(hz);return start.call(this,at);};
 });
 await page.goto('/de/');await page.locator('#music-settings-open').click();await page.locator('[data-library-open=classical]').click();await page.locator('[data-library-song=classical-nachtmusik]').click();
 await expect(page.locator('#orbit')).toHaveAttribute('data-constellation-sets','5');
 // Opening pitches: violin D4, viola G4 and the shared bass at G3 (cello), G2 (arco bass).
 for(const expected of [261.626*2**(2/12),261.626*2**(7/12),261.626*2**(7/12)/4])await expect.poll(async()=>page.evaluate(expected=>(window as any).bowFrequencies.some((hz:number)=>Math.abs(hz-expected)<.02),expected)).toBe(true);
});
