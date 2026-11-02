import {test,expect} from '@playwright/test';
import {performanceProfile,performanceGate} from '../src/lib/performance';
import {styleIds,evolutionPalette,partsForStyle} from '../src/lib/presets';
import {sustainedInstruments} from '../src/lib/phrasing';
import {gridPhraseHold} from '../src/lib/track-grid';
import {instrumentIds} from '../src/lib/instruments';

test('playing style distinguishes sax lines, bow strokes and organ stabs without chopping singers or pads',()=>{
 for(const id of ['saxophone','strings','organ'] as const){
  for(const style of ['electronic','house','funk','reggae','sport','hiphop','drumandbass'] as const){const p=performanceGate(style,id,.535,.5);expect(p.legato).toBe(false);expect(p.hold).toBeLessThan(.4);expect(p.voice.release).toBeLessThan(.04);expect(p.voice.glide).toBeLessThan(.01);}
  for(const style of ['jazz','coffeehouse','classical','ambient','focus','slowwaltz'] as const){const p=performanceGate(style,id,.535,.5);expect(p.legato).toBe(true);expect(p.hold).toBe(.535);}
 }
 for(const id of ['voice','choir','vocalpad','pad'] as const)for(const style of styleIds)expect(performanceProfile(style,id).legato).toBe(true);
 expect(performanceProfile('jazz','saxophone','quickstep').legato).toBe(false);expect(performanceProfile('jazz','saxophone','slowfox').legato).toBe(true);
 expect(performanceProfile('classical','strings','tango').legato).toBe(false);expect(performanceProfile('classical','strings','viennese').legato).toBe(true);
 expect(performanceProfile('latin','saxophone','rumba').legato).toBe(true);
});
test('detached gates leave real gaps across meters, grids, swing, tempos and reverse phases',()=>{
 for(const bpm of [40,120,220])for(const beats of [2,3,4])for(const slots of [4,8,12,16])for(const swing of [0,.2])for(const direction of [1,-1]){
  const bridge=gridPhraseHold(Array(16).fill(true),slots-1,slots-1,direction,slots,beats,bpm,swing);
  for(const id of ['saxophone','strings','organ'] as const){const p=performanceGate('electronic',id,bridge,60/bpm);expect(p.hold+p.voice.release!).toBeLessThan(bridge-.035);expect(p.voice.attack).toBeLessThan(p.hold);}
 }
 for(const style of styleIds)for(const id of sustainedInstruments){const p=performanceGate(style,id,.2,.5);expect(Number.isFinite(p.hold)).toBe(true);expect(p.hold).toBeGreaterThan(0);}
});
test('style palettes retain their presets and choose compatible complementary colours',()=>{
 for(const style of styleIds){const palette=evolutionPalette(style);expect(new Set(palette).size).toBe(palette.length);for(const part of partsForStyle(style))expect(palette).toContain(part.instrument);for(const id of palette)expect(instrumentIds).toContain(id);}
 for(const style of ['jazz','coffeehouse','funk','latin','pop'] as const)expect(evolutionPalette(style)).toContain('saxophone');
 for(const style of ['electronic','house','sport','drumandbass'] as const)expect(evolutionPalette(style)).not.toContain('saxophone');
});
test('rendered Electronic saxophone has audible gaps while Jazz stays connected',async({page})=>{
 await page.goto('/de/');const results=await page.evaluate(async()=>{
  const voiceUrl='/src/lib/sustained-voice.ts',performanceUrl='/src/lib/performance.ts';const {createSustainedVoice}=await import(voiceUrl),{performanceGate}=await import(performanceUrl);
  const results=[];
  for(const style of ['electronic','jazz']){
   const sr=22050,ctx=new OfflineAudioContext(1,sr*2,sr),p=performanceGate(style,'saxophone',.285,.5);let ended=0;
   const v=createSustainedVoice(ctx,ctx.destination,'saxophone',220,.01,.2,p.hold,0,()=>ended++,p.voice);
   if(p.legato){v.note(.26,246.94,.2,p.hold,0);v.note(.51,261.63,.2,p.hold,0);}else for(const at of [.26,.51])createSustainedVoice(ctx,ctx.destination,'saxophone',261.63,at,.2,p.hold,0,()=>ended++,p.voice);
   const data=(await ctx.startRendering()).getChannelData(0),rms=(a:number,b:number)=>{let sum=0;for(let i=Math.floor(a*sr);i<Math.floor(b*sr);i++)sum+=data[i]**2;return Math.sqrt(sum/((b-a)*sr));};
   results.push({style,finite:data.every(Number.isFinite),note:rms(.04,.1),gap:rms(.22,.25),tail:rms(1.8,1.95),ended});
  }return results;
 });
 for(const r of results){expect(r.finite).toBe(true);expect(r.note).toBeGreaterThan(.001);expect(r.tail).toBeLessThan(.000001);}
 expect(results[0].gap).toBeLessThan(.000001);expect(results[1].gap).toBeGreaterThan(.001);expect(results[0].ended).toBe(3);expect(results[1].ended).toBe(1);
});
test('production playback actually re-attacks Electronic sax notes but connects Jazz notes',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{
  (window as any).__attacks=0;const start=OscillatorNode.prototype.start;OscillatorNode.prototype.start=function(...args:Parameters<typeof start>){(window as any).__attacks++;return start.apply(this,args);};
 });await page.goto('/de/');
 const counts=[];
 for(const style of ['electronic','jazz']){
  await page.locator(`[data-style-preset=${style}]`).click();await page.locator('#clear').click();
  await page.evaluate(()=>{document.querySelectorAll<HTMLInputElement>('.track-enabled').forEach((el,i)=>{el.checked=i===0;el.dispatchEvent(new Event('change'));});});
  await page.locator('[data-track="0"] .instrument-select').selectOption('saxophone',{force:true});
  await page.locator('[data-track="0"] summary').click();for(const s of [0,2,4,6])await page.locator(`[data-track="0"] [data-step="${s}"]`).click();
  await page.locator('#tempo').fill('120');await page.locator('#tempo').dispatchEvent('input');await page.evaluate(()=>{(window as any).__attacks=0;});await page.locator('#play').click();await page.waitForTimeout(1100);await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');await page.locator('#play').click();counts.push(await page.evaluate(()=>(window as any).__attacks));
  // Collapse the row again so both cases open it the same way.
  await page.locator('[data-track="0"] summary').click();
 }
 expect(counts).toEqual([8,2]);expect(errors).toEqual([]);
});
