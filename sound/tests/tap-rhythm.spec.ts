import {test,expect} from '@playwright/test';
import {emptyRhythm,recordRhythmHit,rhythmHitsAt,finishRhythm,remeterRhythm,rhythmLane,hasRhythm,replacingRhythmLane,resetRhythmSession} from '../src/lib/tap-rhythm';
import {tapDrumRecipe} from '../src/lib/rhythm-player';
import {voiceRecipe} from '../src/lib/voice-recipes';
import {decodeSettings} from '../src/lib/sound-settings';

test('two-bar recording quantizes independent fingers, loops without doubling and never changes tempo',()=>{
 for(const beats of [2,3,4] as const){
  const rhythm=emptyRhythm(beats),length=beats*8;
  expect(hasRhythm(rhythm)).toBe(false);
  expect(recordRhythmHit(rhythm,4.12,0)).toBe(true);
  expect(recordRhythmHit(rhythm,4.2,2)).toBe(true);
  expect(recordRhythmHit(rhythm,6.7,1)).toBe(true);
  expect(rhythmHitsAt(rhythm,4)).toEqual([]);
  expect(rhythmHitsAt(rhythm,4+length)).toEqual([0,2]);
  expect(rhythmHitsAt(rhythm,7+length*2)).toEqual([1]);
  expect(recordRhythmHit(rhythm,4+length,2)).toBe(true);
  finishRhythm(rhythm);expect(rhythm.state).toBe('loop');
  expect(recordRhythmHit(rhythm,6+length,2)).toBe(true);expect(rhythm.hits[2][2]).toBe(true);
 }
 expect(rhythmLane(-100,440)).toBe(0);expect(rhythmLane(220,440)).toBe(1);expect(rhythmLane(900,440)).toBe(2);
});

test('sequential overdubs keep other lanes and replace only an instrument resumed after a long pause',()=>{
 const rhythm=emptyRhythm(4);
 recordRhythmHit(rhythm,0,2);recordRhythmHit(rhythm,8,2);finishRhythm(rhythm);
 const bass=[...rhythm.hits[2]],anchor=rhythm.start;
 recordRhythmHit(rhythm,33,1);recordRhythmHit(rhythm,41,1);
 expect(rhythm.hits[2]).toEqual(bass);expect(rhythm.start).toBe(anchor);
 expect(rhythm.hits[1][1]).toBe(true);expect(rhythm.hits[1][9]).toBe(true);
 expect(replacingRhythmLane(rhythm,43,2)).toBe(true);
 const snare=[...rhythm.hits[1]];
 recordRhythmHit(rhythm,43,2);expect(rhythm.hits[2].filter(Boolean)).toHaveLength(1);expect(rhythm.hits[2][11]).toBe(true);
 expect(rhythm.hits[1]).toEqual(snare);
 recordRhythmHit(rhythm,51,2);expect(rhythm.hits[2][19]).toBe(true);
 expect(replacingRhythmLane(rhythm,83,2)).toBe(false); // exactly two bars is a valid sparse figure
 recordRhythmHit(rhythm,83,2);expect(rhythm.hits[2].filter(Boolean)).toHaveLength(2);
 resetRhythmSession(rhythm);expect(replacingRhythmLane(rhythm,0,2)).toBe(true);
});

test('meter remapping preserves two separate bars and silence; partial takes can finish',()=>{
 const rhythm=emptyRhythm(4);recordRhythmHit(rhythm,0,2);recordRhythmHit(rhythm,16,1);finishRhythm(rhythm);
 remeterRhythm(rhythm,3,24);
 expect(rhythm.hits[2][0]).toBe(true);expect(rhythm.hits[1][12]).toBe(true);expect(rhythm.hits[0].some(Boolean)).toBe(false);
 expect(rhythmHitsAt(rhythm,24)).toEqual([2]);expect(rhythmHitsAt(rhythm,36)).toEqual([1]);
 const empty=emptyRhythm(4);finishRhythm(empty);expect(empty.state).toBe('armed');expect(empty.start).toBeNull();
});

test('actual multi-touch recording loops audible drums, keeps melody intact and supports drawing and random play',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  (window as any).drumStarts=[];
  const frequencies=new WeakMap<AudioParam,number>(),set=AudioParam.prototype.setValueAtTime;
  AudioParam.prototype.setValueAtTime=function(value:number,time:number){frequencies.set(this,value);return set.call(this,value,time);};
  const start=OscillatorNode.prototype.start;
  OscillatorNode.prototype.start=function(when=0){(window as any).drumStarts.push({time:when,hz:frequencies.get(this.frequency)});return start.call(this,when);};
 });
 await page.goto('/de/');await page.locator('#clear').click();
 await page.locator('#tempo').fill('220');await page.locator('#tempo').dispatchEvent('input');
 const before=await page.locator('.instrument .count').allTextContents();
 await page.locator('[data-pad-mode=rhythm]').click();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 const pad=page.locator('#drawing');await pad.scrollIntoViewIfNeeded();const r=(await pad.boundingBox())!,cdp=await page.context().newCDPSession(page);
 const a={x:r.x+r.width*.25,y:r.y+r.height*.15,id:1},b={x:r.x+r.width*.7,y:r.y+r.height*.85,id:2};
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a,b]});
 await expect(pad).toHaveAttribute('data-pointers','2');await expect(pad).toHaveAttribute('data-rhythm-hits','2');
 const pattern=await pad.getAttribute('data-rhythm-pattern');const hits=JSON.parse(pattern!);
 expect(hits[0][0]).toBe(true);expect(hits[2][0]).toBe(true);
 await page.waitForTimeout(350);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[a]});
 await expect(pad).toHaveAttribute('data-pointers','1');await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect(pad).toHaveAttribute('data-rhythm-state','loop',{timeout:4500});
 await expect.poll(()=>page.evaluate(()=>(window as any).drumStarts.filter((e:any)=>e.hz===145).length)).toBeGreaterThanOrEqual(2);
 const kicks=await page.evaluate(()=>(window as any).drumStarts.filter((e:any)=>e.hz===145));
 expect(kicks[1].time-kicks[0].time).toBeCloseTo(60/220*8,0);
 expect(await page.locator('.instrument .count').allTextContents()).toEqual(before);
 await page.locator('.flow-side').screenshot({path:'test-results/rhythm-pad-'+test.info().project.name+'.png'});
 await page.locator('[data-pad-mode=draw]').click();await expect(pad).toHaveAttribute('data-mode','draw');
 await pad.scrollIntoViewIfNeeded();const drawBox=(await pad.boundingBox())!;
 await page.mouse.move(drawBox.x+drawBox.width*.1,drawBox.y+drawBox.height*.55);await page.mouse.down();
 await page.mouse.move(drawBox.x+drawBox.width*.6,drawBox.y+drawBox.height*.55,{steps:8});await page.mouse.up();
 await expect(pad).toHaveAttribute('data-rhythm-pattern',pattern!);
 await page.locator('#evolve').click();await page.waitForTimeout(2500);
 await expect(pad).toHaveAttribute('data-rhythm-pattern',pattern!);
 await page.locator('#play').click();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await page.locator('[data-pad-mode=rhythm]').click();await expect(pad).toHaveAttribute('data-rhythm-state','loop');
 await page.locator('#rhythm-record').click();await expect(pad).toHaveAttribute('data-rhythm-state','armed');await expect(pad).toHaveAttribute('data-rhythm-hits','0');
 await pad.focus();await page.keyboard.press('2');await expect(pad).toHaveAttribute('data-rhythm-hits','1');
 await page.locator('#rhythm-clear').click();await expect(pad).toHaveAttribute('data-rhythm-hits','0');expect(errors).toEqual([]);
});

test('rhythm replaces automatic percussion without rewriting the instrument tracks',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).kicks=[];
  const frequencies=new WeakMap<AudioParam,number>(),set=AudioParam.prototype.setValueAtTime;
  AudioParam.prototype.setValueAtTime=function(value:number,time:number){frequencies.set(this,value);return set.call(this,value,time);};
  const start=OscillatorNode.prototype.start;
  OscillatorNode.prototype.start=function(when=0){if(frequencies.get(this.frequency)===145)(window as any).kicks.push(when);return start.call(this,when);};
 });
 await page.goto('/de/');await page.locator('[data-pad-mode=rhythm]').click();
 const before=await page.locator('[data-track="0"] .count').textContent();
 await page.locator('#drawing').focus();await page.keyboard.press('1');
 await expect(page.locator('#drawing')).toHaveAttribute('data-rhythm-hits','1');
 await page.waitForTimeout(1700);
 // At most the downbeat already queued before the first tap can remain.
 expect(await page.evaluate(()=>(window as any).kicks.length)).toBeLessThanOrEqual(1);
 await expect(page.locator('[data-track="0"] .count')).toHaveText(before!);
 await page.locator('#rhythm-clear').click();await page.waitForTimeout(800);
 expect(await page.evaluate(()=>(window as any).kicks.length)).toBeGreaterThanOrEqual(1);
});

for(const lang of ['de','en','es','fr'])test('rhythm controls and reduced-motion feedback are accessible '+lang,async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/'+lang+'/');
 await page.locator('[data-pad-mode=rhythm]').click();
 await expect(page.locator('#rhythm-status')).not.toBeEmpty();await expect(page.locator('#gesture-keyboard')).toContainText('1');
 for(const selector of ['[data-pad-mode=draw]','[data-pad-mode=rhythm]','#rhythm-done','#rhythm-record','#rhythm-clear']){
  const button=page.locator(selector),label=await button.getAttribute('aria-label');
  expect(label).toBeTruthy();await expect(button).toHaveAttribute('title',label!);
  await expect(button).toHaveText('');await expect(button.locator('svg')).toHaveCount(1);
 }
 await expect(page.locator('#rhythm-zones span')).toHaveCount(3);
 await expect(page.locator('#gesture-help')).toBeHidden();
 await expect(page.locator('#drawing')).toHaveAttribute('aria-describedby','gesture-keyboard');
 await page.locator('#drawing').focus();await page.keyboard.press('3');
 await expect(page.locator('#drawing')).toHaveAttribute('data-rhythm-hits','1');
 await page.locator('#play').click();await expect(page.locator('#rhythm-status')).not.toBeEmpty();
 await page.locator('[data-pad-mode=draw]').click();await expect(page.locator('#gesture-help')).toBeVisible();
 await page.goto('/'+lang+'/usage/');
 const title={de:'Eigenen Rhythmus einklopfen',en:'Tap your own rhythm',es:'Toca tu propio ritmo',fr:'Jouer votre propre rythme'}[lang]!;
 await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
});

test('saved rhythm is validated, opt-in and never autoplays',async({page})=>{
 await page.goto('/de/');
 await page.locator('[data-pad-mode=rhythm]').click();await page.locator('#drawing').focus();await page.keyboard.press('3');
 await page.locator('#play').click();
 expect(await page.evaluate(()=>localStorage.getItem('jacktools.sound.settings.v1'))).toBeNull();
 const pattern=await page.locator('#drawing').getAttribute('data-rhythm-pattern');
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('jacktools.sound.settings.v1'))).not.toBeNull();
 const raw=await page.evaluate(()=>localStorage.getItem('jacktools.sound.settings.v1'));
 const saved=decodeSettings(raw)!;expect(saved.pad?.hits[2][0]).toBe(true);
 expect(decodeSettings(JSON.stringify({...saved,pad:{...saved.pad,hits:[[]]}}))).toBeNull();
 await page.reload();
 await expect(page.locator('#drawing')).toHaveAttribute('data-mode','rhythm');await expect(page.locator('#drawing')).toHaveAttribute('data-rhythm-pattern',pattern!);
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('#drawing')).toHaveAttribute('data-rhythm-state','loop');
 await expect(page.locator('#drawing')).toHaveAttribute('data-music-level','1');
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').uncheck();await page.locator('#preferences-close').click();
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('jacktools.sound.settings.v1'))).toBeNull();
 await page.reload();await expect(page.locator('#drawing')).toHaveAttribute('data-mode','draw');
});


test('sequential input ducks orbit music and Finish restores the same bus without changing master volume',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).orbitFade=[];
  let bus:AudioParam|undefined;
  const target=AudioParam.prototype.setTargetAtTime;
  AudioParam.prototype.setTargetAtTime=function(value:number,time:number,constant:number){
   if(value===.1)bus=this;
   if(this===bus)(window as any).orbitFade.push({value,constant});
   return target.call(this,value,time,constant);
  };
 });
 await page.goto('/de/');await page.locator('#clear').click();
 await page.locator('#tempo').fill('220');await page.locator('#tempo').dispatchEvent('input');
 await page.locator('[data-pad-mode=rhythm]').click();
 const pad=page.locator('#drawing'),volume=await page.locator('#volume').inputValue();
 await pad.focus();await page.keyboard.press('3');await page.waitForTimeout(180);await page.keyboard.press('3');
 const bass=JSON.parse((await pad.getAttribute('data-rhythm-pattern'))!)[2];
 await expect(pad).toHaveAttribute('data-music-level','0.1');
 await page.waitForTimeout(2500);
 await pad.focus();await page.keyboard.press('2');await page.waitForTimeout(200);await page.keyboard.press('2');
 let pattern=JSON.parse((await pad.getAttribute('data-rhythm-pattern'))!);
 expect(pattern[2]).toEqual(bass);expect(pattern[1].filter(Boolean).length).toBeGreaterThanOrEqual(1);
 const snare=pattern[1];
 // Bass has now been untouched for more than two bars: its next take replaces bass alone.
 await page.keyboard.press('3');
 pattern=JSON.parse((await pad.getAttribute('data-rhythm-pattern'))!);
 expect(pattern[2].filter(Boolean)).toHaveLength(1);expect(pattern[1]).toEqual(snare);
 await page.locator('#rhythm-done').click();
 await expect(pad).toHaveAttribute('data-rhythm-editing','false');await expect(pad).toHaveAttribute('data-music-level','1');
 await expect(page.locator('#volume')).toHaveValue(volume);await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 const fades=await page.evaluate(()=>(window as any).orbitFade);
 expect(fades.some((e:any)=>e.value===.1)).toBe(true);expect(fades.at(-1)).toEqual({value:1,constant:.18});
 await page.waitForTimeout(500);await expect(pad).toHaveAttribute('data-rhythm-pattern',JSON.stringify(pattern));
 // Starting a new edit ducks again; returning to Draw restores without erasing the loop.
 await pad.focus();await page.keyboard.press('1');await expect(pad).toHaveAttribute('data-music-level','0.1');
 await page.locator('[data-pad-mode=draw]').click();await expect(pad).toHaveAttribute('data-music-level','1');
});


test('pad kick and hi-hat have more presence while the snare and orbit recipes remain unchanged',()=>{
 const kick=tapDrumRecipe(2),hat=tapDrumRecipe(0),snare=tapDrumRecipe(1);
 expect(kick.tones[0].level).toBeCloseTo(voiceRecipe('kick',false,1).tones[0].level*1.35);
 expect(kick.tones.some(t=>t.hz===176&&t.type==='triangle')).toBe(true);
 expect(hat.noise[0].level).toBeCloseTo(voiceRecipe('hat',false,1).noise[0].level*1.8);
 expect(hat.noise[0].frequency).toBe(5000);
 expect(snare).toEqual(voiceRecipe('snare',false,1));
 expect(voiceRecipe('kick',false,1).tones).toHaveLength(3);
 expect(voiceRecipe('hat',false,1).noise[0].frequency).toBe(6500);
});

test('all three rhythm instruments retain the same rendered level on every loop pass',async({page})=>{
 await page.goto('/de/');
 const levels=await page.evaluate(async()=>{
  const url='/src/lib/rhythm-player.ts',{createRhythmPlayer}=await import(url),results=[];
  for(const lane of [0,1,2]){
   const sr=48000,ctx=new OfflineAudioContext(1,sr*2,sr),player=createRhythmPlayer(ctx,ctx.destination);
   for(const time of [.05,.65,1.25])player.hit(lane,time);
   const data=(await ctx.startRendering()).getChannelData(0);
   const rms=(time:number)=>{
    let power=0;const start=Math.round(time*sr),length=Math.round(.4*sr);
    for(let n=start;n<start+length;n++)power+=data[n]**2;
    return Math.sqrt(power/length);
   };
   results.push([.05,.65,1.25].map(rms));
  }
  return results;
 });
 for(const passes of levels){
  expect(passes[0]).toBeGreaterThan(.001); // Non-silent; absolute RMS depends on each drum’s decay.
  for(const level of passes.slice(1))expect(Math.abs(20*Math.log10(level/passes[0]))).toBeLessThan(1);
 }
});
