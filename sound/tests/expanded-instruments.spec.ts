import {test,expect} from '@playwright/test';
import {instrumentIds,instrumentNames,type InstrumentId} from '../src/lib/instruments';
import {instrumentGroups} from '../src/lib/instrument-picker';
import {styleIds,evolutionPalette} from '../src/lib/presets';
import {instrumentFamily} from '../src/lib/articulation';
import {performanceProfile} from '../src/lib/performance';
import {sustainedHarmonic} from '../src/lib/sustained-voice';
import {voiceRecipe} from '../src/lib/voice-recipes';
import {isMelodic,melodicSemitones} from '../src/lib/harmony';
import {stereoPosition} from '../src/lib/space';
const added=['flute','clarinet','trumpet','horn','analoglead','acidbass','shimmer','cello','vibraphone','conga'] as const;
test('all ten additions have translations, a single group, deliberate articulation and compatible random palettes',()=>{
 expect(instrumentIds).toHaveLength(38);
 for(const id of added){
  expect(Object.values(instrumentGroups).flat().filter(v=>v===id)).toHaveLength(1);
  expect(instrumentFamily[id]).toBeTruthy();
  expect(styleIds.some(style=>evolutionPalette(style).includes(id))).toBe(true);
  for(const names of Object.values(instrumentNames))expect(names[instrumentIds.indexOf(id)]).toBeTruthy();
 }
 for(const id of ['flute','clarinet','trumpet','horn','cello','analoglead'] as const){
  expect(performanceProfile('jazz',id).legato).toBe(true);
  expect(performanceProfile('electronic',id).legato).toBe(false);
 }
 const bodies=['flute','clarinet','trumpet','horn','cello','analoglead','shimmer'] as const;
 expect(new Set(bodies.map(id=>JSON.stringify(Array.from({length:12},(_,n)=>sustainedHarmonic(id,n+1))))).size).toBe(bodies.length);
 expect(sustainedHarmonic('clarinet',2)).toBeLessThan(sustainedHarmonic('clarinet',3));
 expect(isMelodic('conga')).toBe(false);expect(voiceRecipe('conga',false,1).tones[0].hz).toBe(220);
 for(let beat=0;beat<16;beat++)expect(melodicSemitones('electronic',0,beat,'acidbass',0,[0,1,2,3])).toBe(melodicSemitones('electronic',0,beat,'bass',0,[0,1,2,3]));
 expect(stereoPosition('acidbass',4,2,1)).toBe(0);
 expect(evolutionPalette('focus')).not.toContain('acidbass');
 expect(evolutionPalette('electronic')).not.toContain('trumpet');
});

test('new sustained voices and vibraphone render finite, distinct audio with silent released tails',async({page})=>{
 await page.goto('/de/');
 const results=await page.evaluate(async()=>{
  const sustainedPath='/src/lib/sustained-voice.ts',acousticPath='/src/lib/acoustic.ts';
  const {createSustainedVoice}=await import(sustainedPath),{acousticWave}=await import(acousticPath);
  const results=[];
  for(const id of ['flute','clarinet','trumpet','horn','cello','analoglead','shimmer']){
   const sr=22050,ctx=new OfflineAudioContext(1,sr*3,sr);
   createSustainedVoice(ctx,ctx.destination,id,220,.02,.2,.65,0,()=>{});
   const samples=(await ctx.startRendering()).getChannelData(0);
   let energy=0,peak=0,finite=true,tail=0,signature=0;
   samples.forEach((v,i)=>{finite&&=Number.isFinite(v);energy+=v*v;peak=Math.max(peak,Math.abs(v));if(i>sr*2.8)tail+=v*v;if(i%127===0)signature+=v;});
   results.push({id,finite,energy,peak,tail,signature});
  }
  const wave=acousticWave('vibraphone',220,22050,.5);
  results.push({id:'vibraphone',finite:[...wave].every(Number.isFinite),energy:wave.reduce((a:number,v:number)=>a+v*v,0),peak:Math.max(...wave),tail:Math.abs(wave[wave.length-1]),signature:wave[400]});
  return results;
 });
 for(const r of results){expect(r.finite,r.id).toBe(true);expect(r.energy,r.id).toBeGreaterThan(.1);expect(r.peak,r.id).toBeLessThan(.8);expect(r.tail,r.id).toBeLessThan(.00001);}
 expect(new Set(results.map(r=>r.signature.toFixed(4))).size).toBe(results.length);
});

test('each addition can be selected, tapped and accepted; percussion stays unpitched',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');await page.locator('[data-pad-mode=rhythm]').click();
 for(const id of added){
  await page.keyboard.press('Numpad5');await page.locator('#pad-instrument').click();
  const group=Object.entries(instrumentGroups).find(([,ids])=>(ids as InstrumentId[]).includes(id))![0];
  await page.locator('[data-instrument-group='+group+']').click();
  await page.locator('[data-pick-instrument='+id+']').click();
  await expect(page.locator('[data-track="4"] .instrument-select')).toHaveValue(id);
  await page.locator('#rhythm-record').click();await page.keyboard.press('1');
  await expect(page.locator('#drawing')).toHaveAttribute('data-rhythm-hits','1');
  await expect(page.locator('#rhythm-zones>[data-lane="4"]')).toHaveAttribute('data-melodic',String(id!=='conga'));
  await page.keyboard.press('Enter');
  await expect(page.locator('#drawing')).toHaveAttribute('data-selected-pad','');
 }
 expect(errors).toEqual([]);
});
