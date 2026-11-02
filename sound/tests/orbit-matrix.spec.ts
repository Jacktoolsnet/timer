import {test,expect} from '@playwright/test';
import {ORBIT_COUNT,padNumbers,padAt,padCenter,padForKey,type OrbitPad} from '../src/lib/orbit-layout';
import {emptyRhythm,recordRhythmHit,rhythmBarPoints} from '../src/lib/tap-rhythm';
import {partsForStyle,styleIds} from '../src/lib/presets';
import {decodeSettings} from '../src/lib/sound-settings';
import {instrumentIds} from '../src/lib/instruments';

test('nine pads match physical numpad geometry, including Num Lock off',()=>{
 expect(ORBIT_COUNT).toBe(9);
 for(let i=0;i<9;i++){
  const center=padCenter(i as OrbitPad,700,440),digit=padNumbers[i];
  expect(padAt(center.x,center.y,700,440)).toBe(i);
  expect(padForKey('Numpad'+digit,'End')).toBe(i);
  expect(padForKey('Digit'+digit,String(digit))).toBe(i);
 }
 expect(padForKey('Numpad0','Insert')).toBeNull();expect(padForKey('KeyJ','j')).toBeNull();
 for(const style of styleIds)expect(partsForStyle(style)).toHaveLength(9);
 const rhythm=emptyRhythm(4);recordRhythmHit(rhythm,3,8);recordRhythmHit(rhythm,18,8);
 expect(rhythmBarPoints(rhythm,8,0,16)[3]).toBe(true);
 expect(rhythmBarPoints(rhythm,8,16,16)[2]).toBe(true);
 expect(rhythmBarPoints(rhythm,8,32,16)[3]).toBe(true);
});

test('legacy eight-track pieces gain a ninth voice without overwriting custom tracks or losing rhythm lanes',()=>{
 const track={enabled:true,mute:false,instrument:'piano',points:Array(16).fill(false),volume:.4,pitch:0,phase:0,direction:1,directionMode:'forward',randomDynamics:false,morph:null};
 const tracks=Array.from({length:8},()=>({...track,points:[...track.points]}));
 tracks[3].instrument='hat';tracks[0].instrument='snare';tracks[5].instrument='kick';
 const hits=Array.from({length:3},()=>Array(32).fill(false));hits[0][2]=true;hits[1][4]=true;hits[2][8]=true;
 const old={version:1,style:'electronic',bpm:100,volume:.3,background:'clouds',center:'ring',orbit:'comet',tracks,pad:{mode:'rhythm',beats:4,hits}};
 const saved=decodeSettings(JSON.stringify(old))!;
 expect(saved.version).toBe(2);expect(saved.tracks).toHaveLength(9);expect(saved.tracks.slice(0,8)).toEqual(tracks);
 expect(saved.tracks[8].enabled).toBe(true);expect(saved.tracks[8].points.some(Boolean)).toBe(true);
 expect(saved.pad!.hits).toHaveLength(9);expect(saved.pad!.hits[3][2]).toBe(true);expect(saved.pad!.hits[0][4]).toBe(true);expect(saved.pad!.hits[5][8]).toBe(true);
 expect(decodeSettings(JSON.stringify({...saved,pad:{...saved.pad,hits:[[]]}}))).toBeNull();
 // Even unmatched old drum lanes never collide and erase one another.
 const unmatched=decodeSettings(JSON.stringify({...old,tracks:Array(8).fill(track)}))!;
 expect(unmatched.pad!.hits.flat().filter(Boolean)).toHaveLength(3);
});

test('all nine orbit instruments play from the numpad, with independent simultaneous keys and repeat suppression',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');await page.locator('#clear').click();await expect(page.locator('.instrument')).toHaveCount(9);
 await page.locator('[data-pad-mode=rhythm]').click();
 const pad=page.locator('#drawing');
 await expect(page.locator('#rhythm-zones>[data-lane]')).toHaveCount(9);
 // Keep focus on the mode button: number keys do not require canvas focus.
 await page.keyboard.down('Numpad7');await page.keyboard.down('Numpad9');
 await expect(pad).toHaveAttribute('data-pointers','2');await expect(pad).toHaveAttribute('data-rhythm-hits','2');
 await page.keyboard.down('Numpad7');await expect(pad).toHaveAttribute('data-rhythm-hits','2');
 await page.keyboard.up('Numpad9');await expect(pad).toHaveAttribute('data-pointers','1');await page.keyboard.up('Numpad7');
 for(const number of [8,4,5,6,1,2,3])await page.keyboard.press('Numpad'+number);
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await expect(pad).toHaveAttribute('data-rhythm-hits','9');await expect(pad).toHaveAttribute('data-pointers','0');
 const hits=JSON.parse((await pad.getAttribute('data-rhythm-pattern'))!);
 for(const row of hits)expect(row.filter(Boolean)).toHaveLength(1);
 for(let i=0;i<9;i++){
  const name=await page.locator('[data-track="'+i+'"] .instrument-name').textContent();
  await expect(page.locator('#rhythm-zones>[data-lane="'+i+'"] .pad-instrument')).toHaveText(name!);
  await expect(page.locator('#gesture-keyboard')).toContainText(padNumbers[i]+': '+name);
 }
 await page.locator('#rhythm-done').click();await expect(pad).toHaveAttribute('data-music-level','1');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await page.locator('.flow-side').screenshot({path:'test-results/orbit-matrix-'+test.info().project.name+'.png'});
 expect(errors).toEqual([]);
});

test('matrix follows manual instrument choices and disables silent pads; random play protects captured timbres and grids',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');await page.locator('#clear').click();
 const row=page.locator('[data-track="8"]');await row.locator('summary').click();
 await row.locator('.instrument-select').selectOption('piano',{force:true});
 await page.locator('#tempo').fill('220');await page.locator('#tempo').dispatchEvent('input');
 await page.locator('[data-pad-mode=rhythm]').click();
 const pad=page.locator('#drawing');await expect(page.locator('[data-lane="8"] .pad-instrument')).toHaveText('Klavier');
 await page.keyboard.press('Numpad3');await expect(pad).toHaveAttribute('data-rhythm-hits','1');
 const grid=await row.getAttribute('data-slots'),pattern=await pad.getAttribute('data-rhythm-pattern');
 await page.locator('#evolve').click();await page.waitForTimeout(3000);
 await expect(row.locator('.instrument-select')).toHaveValue('piano');await expect(row).toHaveAttribute('data-slots',grid!);
 await expect(pad).toHaveAttribute('data-rhythm-pattern',pattern!);
 await row.locator('.mute').check();await expect(page.locator('[data-lane="8"]')).toHaveAttribute('data-disabled','true');
 await pad.focus();await page.keyboard.press('Numpad3');await expect(pad).toHaveAttribute('data-rhythm-pattern',pattern!);
 expect(errors).toEqual([]);
});

test('numpad works with Num Lock off but never intercepts settings fields or modifier shortcuts',async({page})=>{
 await page.goto('/de/');await page.locator('[data-pad-mode=rhythm]').click();
 await page.locator('#tempo').focus();await page.keyboard.press('Numpad1');
 const pad=page.locator('#drawing');await expect(pad).toHaveAttribute('data-rhythm-hits','0');await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await pad.focus();await page.keyboard.press('Control+7');await expect(pad).toHaveAttribute('data-rhythm-hits','0');
 await pad.evaluate(el=>{
  el.dispatchEvent(new KeyboardEvent('keydown',{code:'Numpad1',key:'End',bubbles:true,cancelable:true}));
  el.dispatchEvent(new KeyboardEvent('keyup',{code:'Numpad1',key:'End',bubbles:true,cancelable:true}));
 });
 await expect(pad).toHaveAttribute('data-rhythm-hits','1');
 expect(JSON.parse((await pad.getAttribute('data-rhythm-pattern'))!)[6].some(Boolean)).toBe(true);
});

test('melodic and sustained pads produce sound even when their original orbit pattern was cleared',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).sounds=0;
  const start=AudioBufferSourceNode.prototype.start,osc=OscillatorNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(...args:any[]){(window as any).sounds++;return (start as any).apply(this,args);};
  OscillatorNode.prototype.start=function(...args:any[]){(window as any).sounds++;return (osc as any).apply(this,args);};
 });
 await page.goto('/de/');await page.locator('#clear').click();
 const row=page.locator('[data-track="8"]');await row.locator('summary').click();
 await page.locator('[data-pad-mode=rhythm]').click();
 for(const instrument of ['piano','strings','saxophone','voice','organ','tom','rim','shaker','clap']){
  expect(instrumentIds).toContain(instrument);
  await row.locator('.instrument-select').selectOption(instrument,{force:true});
  const before=await page.evaluate(()=>(window as any).sounds);
  await page.locator('#drawing').focus();await page.keyboard.press('Numpad3');
  await expect.poll(()=>page.evaluate(()=>(window as any).sounds)).toBeGreaterThan(before);
 }
 await expect(row.locator('.count')).toHaveText('0 / 16');
});


test('brief main-thread stalls during matrix input never stop playback or replay stale ticks in a burst',async({page})=>{
 await page.goto('/de/');await page.locator('[data-pad-mode=rhythm]').click();await page.keyboard.press('Numpad7');
 await page.evaluate(()=>{const until=performance.now()+260;while(performance.now()<until){/* Simulate cold synthesis / UI work. */}});
 await page.waitForTimeout(200);await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await page.keyboard.press('Numpad8');await expect(page.locator('#drawing')).toHaveAttribute('data-rhythm-hits','2');
 await page.locator('#rhythm-done').click();await expect(page.locator('#drawing')).toHaveAttribute('data-music-level','1');
});
