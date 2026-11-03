import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {rateGridEvents,rateWindow,randomTrackRate,trackRateCopy,type TrackRate} from '../src/lib/track-rate';
import {gridEvents,gridSizes} from '../src/lib/track-grid';
import {decodeSettings} from '../src/lib/sound-settings';
import {partsForStyle} from '../src/lib/presets';
test('independent rational rates keep the shared clock and align at every two-bar boundary',()=>{
 for(const beats of [3,4])for(const slots of gridSizes)for(const swing of [0,.18]){
  const native=beats*4;
  for(let step=0;step<native*4;step++){
   const actual=rateGridEvents(slots,native,step,beats,swing,1),expected=gridEvents(slots,native,step%native,beats,swing);
   expect(actual.map(e=>e.index)).toEqual(expected.map(e=>e.index));
   actual.forEach((e,i)=>expect(e.offset).toBeCloseTo(expected[i].offset,7));
  }
  for(const rate of [.5,1,2] as const){
   const events=Array.from({length:native*4},(_,s)=>rateGridEvents(slots,native,s,beats,swing,rate)).flat();
   expect(events.length).toBe(slots*4*rate);
   for(let s=0;s<native*4;s++)for(const event of rateGridEvents(slots,native,s,beats,swing,rate)){
    const window=rateWindow(s,native,beats,swing,rate);
    expect(event.offset).toBeGreaterThanOrEqual(0);expect(event.offset).toBeLessThan((window.end-window.start)/rate*native+1e-7);
   }
   expect(rateWindow(native*2,native,beats,swing,rate).start%1).toBe(0);
  }
 }
});
test('automatic rates keep foundation steady and favour slow sustained melodies',()=>{
 for(const id of ['kick','snare','bass','synthbass','doublebass'])for(const r of [0,.5,.99])expect(randomTrackRate(id,'house',()=>r)).toBe(1);
 expect(randomTrackRate('strings','focus',()=>.4)).toBe(.5);expect(randomTrackRate('hat','house',()=>.2)).toBe(2);
 expect(randomTrackRate('hat','focus',()=>.2)).toBe(1);
});
function fixture(rate:TrackRate=1,score=false){return {version:2,style:'electronic',bpm:220,volume:.3,background:'off',center:'off',orbit:'comet',tracks:partsForStyle('electronic').map((_p,i)=>({enabled:i===0,mute:false,instrument:'kick',rate,rateChoice:rate,score:score?[{start:0,duration:.02,points:[{offset:0,pitch:12,velocity:.8}]}]:null,groups:Array(16).fill(null),points:Array.from({length:16},(_,s)=>s===0),grid:16,slots:16,pitch:12,volume:.5,phase:0,direction:1,directionMode:'forward',randomDynamics:false,morph:null}))};}
async function load(page:Page,data:unknown){await page.locator('#files-open').click();await page.locator('#json-file').setInputFiles({name:'rates.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.locator('#files-close').click();}
async function exported(page:Page){await page.locator('#files-open').click();const d=page.waitForEvent('download');await page.locator('#json-export').click();const data=JSON.parse(await readFile((await(await d).path())!,'utf8'));await page.locator('#files-close').click();return data;}
for(const rate of [.5,1,2] as const)test('actual audio uses '+rate+'× without changing global tempo',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).noteStarts=[];
  for(const proto of [OscillatorNode.prototype,AudioBufferSourceNode.prototype]){
   const original=proto.start;
   (proto as any).start=function(at:number,...args:any[]){(window as any).noteStarts.push(at);return (original as any).call(this,at,...args);};
  }
 });
 await page.goto('/de/');await load(page,fixture(rate));await page.locator('#play').click();await page.waitForTimeout(2700);
 const starts=await page.evaluate(()=>[...new Set((window as any).noteStarts as number[])].sort((a,b)=>a-b));
 expect(starts.length).toBeGreaterThanOrEqual(2);
 const gap=starts[1]-starts[0];expect(gap).toBeCloseTo(60/220*4/rate,1);
 await expect(page.locator('#tempo')).toHaveValue('220');
 await expect(page.locator('[data-track="0"]')).toHaveAttribute('data-rate',String(rate));
});
test('rate choice persists, old JSON defaults safely and invalid values are rejected',async({page})=>{
 await page.goto('/de/');await load(page,fixture(.5));
 const saved=await exported(page);expect(saved.tracks[0].rate).toBe(.5);expect(saved.tracks[0].rateChoice).toBe(.5);
 const bad=structuredClone(saved);bad.tracks[0].rate=1.3;expect(decodeSettings(JSON.stringify(bad))).toBeNull();
 const legacy=structuredClone(saved);legacy.tracks.forEach((t:any)=>{delete t.rate;delete t.rateChoice;});await load(page,legacy);
 await expect(page.locator('[data-track="0"]')).toHaveAttribute('data-rate','1');
 await load(page,saved);await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();await page.reload();
 await expect(page.locator('[data-track="0"]')).toHaveAttribute('data-rate','0.5');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
});
test('manual changes wait for a shared boundary and Random Play respects explicit choices',async({page})=>{
 await page.goto('/de/');await load(page,fixture(1));await page.locator('#play').click();await page.waitForTimeout(300);
 await page.locator('[data-track="0"] .track-rate').selectOption('0.5',{force:true});
 await expect(page.locator('[data-track="0"]')).toHaveAttribute('data-rate','1');
 await expect(page.locator('[data-track="0"] .rate-status')).toHaveText(trackRateCopy.de.pending);
 await expect(page.locator('[data-track="0"]')).toHaveAttribute('data-rate','0.5',{timeout:5000});
 await page.locator('#evolve').click();await expect(page.locator('[data-track="0"]')).toHaveAttribute('data-rate','0.5');
});
for(const lang of ['de','en','es','fr'] as const)test('localized rate controls fit mobile: '+lang,async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/'+lang+'/');
 await page.locator('[data-track="0"] summary').click();
 await expect(page.locator('#trigger-rate-0')).toHaveAccessibleName(new RegExp('^'+trackRateCopy[lang].label));
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
});

test('edited two-bar scores scale their audio timing too',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).noteStarts=[];const original=OscillatorNode.prototype.start;
  OscillatorNode.prototype.start=function(at:number){(window as any).noteStarts.push(at);return original.call(this,at);};
 });
 await page.goto('/de/');await load(page,fixture(2,true));await page.locator('#play').click();await page.waitForTimeout(2600);
 const starts=await page.evaluate(()=>[...new Set((window as any).noteStarts as number[])].sort((a,b)=>a-b));
 expect(starts.length).toBeGreaterThanOrEqual(2);expect(starts[1]-starts[0]).toBeCloseTo(60/220*4,1);
});
test('Random Play starts with slow melodic layers but keeps explicit rates and foundations',async({page})=>{
 await page.goto('/de/');await page.locator('#evolve').click();
 await expect.poll(async()=>page.locator('.instrument[data-rate="0.5"]').count()).toBeGreaterThan(0);
 await expect(page.locator('[data-track="0"]')).toHaveAttribute('data-rate','1');
});

test('instrument picker exposes styled rate tiles and Cancel restores the prior rate',async({page})=>{
 await page.goto('/de/');await page.locator('[data-pad-mode=rhythm]').click();await page.keyboard.press('Numpad5');
 await page.locator('#pad-instrument').click();await expect(page.locator('#trigger-picker-rate')).toBeVisible();
 await page.locator('#trigger-picker-rate').click();await page.locator('#options-picker-rate [role=option]').filter({hasText:'½×'}).click();
 await expect(page.locator('[data-track="4"]')).toHaveAttribute('data-rate','0.5');
 await page.locator('#instrument-picker-close').click();await page.keyboard.press('Escape');
 await expect(page.locator('[data-track="4"]')).toHaveAttribute('data-rate','1');
});
