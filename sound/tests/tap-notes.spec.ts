import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {tapNoteAt,tapNoteY,tapNoteKey,tapNoteSemitones} from '../src/lib/tap-notes';
import {emptyRhythm,recordRhythmHit,cloneRhythm,remeterRhythm} from '../src/lib/tap-rhythm';
import {decodeSettings} from '../src/lib/sound-settings';
import {partsForStyle,styleIds} from '../src/lib/presets';

test('eight diatonic positions span one octave; touch and top-row keys agree without hijacking the numpad',()=>{
 for(let n=0;n<8;n++){
  expect(tapNoteAt(tapNoteY(n,140,420),140,420)).toBe(n);
  expect(tapNoteKey('Digit'+(n+1),String(n+1))).toBe(n);
  expect(tapNoteKey('Numpad'+(n+1),String(n+1))).toBeNull();
 }
 expect(tapNoteAt(-100,140,420)).toBe(7);expect(tapNoteAt(900,140,420)).toBe(0);
 expect(tapNoteKey('Digit9','9')).toBeNull();
 for(const style of styleIds)for(let bar=0;bar<16;bar++){
  const notes=Array.from({length:8},(_,n)=>tapNoteSemitones(style,bar,n));
  expect(notes[7]-notes[0]).toBe(12);
  for(let n=1;n<8;n++)expect([1,2]).toContain(notes[n]-notes[n-1]);
 }
});

test('pitch is cloned, replaced, quantized and remetered with its exact hit, never with an adjacent step',()=>{
 const r=emptyRhythm(4);recordRhythmHit(r,0,4,0);recordRhythmHit(r,3.2,4,7);
 const copy=cloneRhythm(r);recordRhythmHit(r,3,4,2);
 expect(copy.notes[4][3]).toBe(7);expect(r.notes[4][3]).toBe(2);
 expect(recordRhythmHit(r,4,4,8)).toBe(false);expect(r.hits[4][4]).toBe(false);
 remeterRhythm(copy,3,0);expect(copy.notes[4][2]).toBe(7);expect(copy.hits[4][2]).toBe(true);
 recordRhythmHit(r,40,4,1);
 expect(r.notes[4].filter(n=>n!==null)).toEqual([1]);expect(r.hits[4].filter(Boolean)).toHaveLength(1);
});

function fixture(){
 const rhythm=emptyRhythm(4);recordRhythmHit(rhythm,0,4,0);recordRhythmHit(rhythm,4,4,7);
 return {version:2,style:'electronic',bpm:100,volume:.3,background:'clouds',center:'ring',orbit:'comet',
  tracks:partsForStyle('electronic').map(p=>({enabled:true,mute:false,instrument:p.instrument,points:Array(16).fill(false),volume:.5,pitch:0,phase:0,direction:1,directionMode:'forward',randomDynamics:false,morph:null})),
  pad:{mode:'rhythm',beats:4,hits:rhythm.hits,notes:rhythm.notes}};
}
test('settings validate optional note rows and retain legacy rhythm-only projects',()=>{
 const data=fixture();expect(decodeSettings(JSON.stringify(data))!.pad!.notes).toEqual(data.pad.notes);
 const legacy=JSON.parse(JSON.stringify(data));delete legacy.pad.notes;
 expect(decodeSettings(JSON.stringify(legacy))).not.toBeNull();
 for(const value of [-1,8,.5,'C',{},true]){
  const bad=fixture() as any;bad.pad.notes[4][0]=value;
  expect(decodeSettings(JSON.stringify(bad))).toBeNull();
 }
 const noHit=fixture();noHit.pad.notes[4][1]=2;expect(decodeSettings(JSON.stringify(noHit))).toBeNull();
 const short=fixture();short.pad.notes.pop();expect(decodeSettings(JSON.stringify(short))).toBeNull();
});

test('number-row pitches produce audible octave endpoints, record independently and do not select another instrument',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const frequencies=new WeakMap<AudioParam,number>(),set=AudioParam.prototype.setValueAtTime,start=OscillatorNode.prototype.start;
  (window as any).noteHz=[];
  AudioParam.prototype.setValueAtTime=function(value,time){frequencies.set(this,value);return set.call(this,value,time);};
  OscillatorNode.prototype.start=function(...args){(window as any).noteHz.push(frequencies.get(this.frequency));return start.apply(this,args);};
 });
 await page.goto('/de/');await page.locator('#clear').click();
 // Pluck uses oscillator partials; acoustic marimba is a rendered AudioBuffer.
 await page.locator('[data-track="4"] .instrument-select').evaluate((select:HTMLSelectElement)=>{select.value='pluck';select.dispatchEvent(new Event('change',{bubbles:true}));});
 await page.locator('[data-pad-mode=rhythm]').click();await page.keyboard.press('Numpad5');
 const pad=page.locator('#drawing'),zone=page.locator('#rhythm-zones>[data-lane="4"]');
 await expect(zone.locator('.note-bands>span')).toHaveCount(8);await expect(zone.locator('.note-bands')).toBeVisible();
 await page.keyboard.down('1');await expect(pad).toHaveAttribute('data-rhythm-hits','1');
 await page.waitForTimeout(300);await page.keyboard.down('8');
 await expect(pad).toHaveAttribute('data-pointers','2');
 await page.keyboard.down('8');await expect(pad).toHaveAttribute('data-rhythm-hits','2');
 await page.keyboard.up('1');await page.keyboard.up('8');
 const notes=JSON.parse((await pad.getAttribute('data-rhythm-notes'))!)[4].filter((n:number|null)=>n!==null);
 expect(notes).toEqual([0,7]);await expect(pad).toHaveAttribute('data-selected-pad','4');
 const hz=await page.evaluate(()=>(window as any).noteHz as number[]);
 expect(hz.some(n=>Math.abs(n-261.626)<.01)).toBe(true);
 expect(hz.some(n=>Math.abs(n-523.252)<.01)).toBe(true);
 await page.locator('#tempo').focus();await page.keyboard.press('3');
 await expect(pad).toHaveAttribute('data-rhythm-hits','2');
 await page.locator('#files-open').click();await page.keyboard.press('2');
 await expect(pad).toHaveAttribute('data-rhythm-hits','2');await page.locator('#files-close').click();
 await page.locator('#rhythm-done').click();
 // Replay from the first chord: later bars intentionally transpose degrees with harmony.
 await page.locator('#play').click();
 await page.evaluate(()=>(window as any).noteHz=[]);
 await page.locator('#play').click();
 await expect.poll(async()=>page.evaluate(()=>{const hz=(window as any).noteHz as number[];return [261.626,523.252].every(f=>hz.some(n=>Math.abs(n-f)<.01));}),{timeout:10000}).toBe(true);
 expect(errors).toEqual([]);
});

test('touch height stores low/high notes; Cancel restores notes, and JSON reload preserves the accepted melody',async({page})=>{
 await page.goto('/de/');await page.locator('#clear').click();await page.locator('[data-pad-mode=rhythm]').click();
 await page.keyboard.press('Numpad5');await page.waitForTimeout(350);
 const pad=page.locator('#drawing');await pad.scrollIntoViewIfNeeded();
 const b=(await page.locator('#rhythm-zones>[data-lane="4"]').boundingBox())!,c=(await pad.boundingBox())!;
 await pad.click({position:{x:b.x+b.width/2-c.x,y:b.y+b.height*.97-c.y}});
 await page.waitForTimeout(240);
 await pad.click({position:{x:b.x+b.width/2-c.x,y:b.y+b.height*.03-c.y}});
 const notes=await pad.getAttribute('data-rhythm-notes');
 expect(JSON.parse(notes!)[4].filter((n:number|null)=>n!==null)).toEqual([0,7]);
 await page.locator('#rhythm-done').click();
 await page.keyboard.press('Numpad5');await page.keyboard.press('4');
 await page.locator('#rhythm-cancel').click();await expect(pad).toHaveAttribute('data-rhythm-notes',notes!);
 await page.locator('#files-open').click();
 const pending=page.waitForEvent('download');await page.locator('#json-export').click();
 const raw=await readFile((await(await pending).path())!,'utf8'),saved=decodeSettings(raw)!;
 expect(saved.pad!.notes).toEqual(JSON.parse(notes!));
 await page.reload();await page.locator('#files-open').click();
 await page.locator('#json-file').setInputFiles({name:'melody.json',mimeType:'application/json',buffer:Buffer.from(raw)});
 await expect(pad).toHaveAttribute('data-rhythm-notes',notes!);
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await page.locator('#files-close').click();await page.locator('#evolve').click();
 await page.waitForTimeout(550);
 await expect(pad).toHaveAttribute('data-rhythm-notes',notes!);
});

test('percussion pads keep their characteristic unpitched sound and do not show melodic bands',async({page})=>{
 await page.goto('/de/');await page.locator('[data-pad-mode=rhythm]').click();await page.keyboard.press('Numpad7');
 await expect(page.locator('[data-lane="0"] .note-bands')).toBeHidden();
 await page.keyboard.press('1');await page.waitForTimeout(200);await page.keyboard.press('8');
 const pad=page.locator('#drawing');await expect(pad).toHaveAttribute('data-rhythm-hits','2');
 expect(JSON.parse((await pad.getAttribute('data-rhythm-notes'))!).flat().every((n:unknown)=>n===null)).toBe(true);
 await expect(pad).toHaveAttribute('data-selected-pad','0');
});

test('Enter accepts tapped notes; Escape restores them without leaving focus view or adding a hit',async({page})=>{
 await page.goto('/de/');await page.locator('#clear').click();
 await page.locator('[data-pad-mode=rhythm]').click();await page.locator('#focus').click();
 await page.keyboard.press('Numpad5');await page.keyboard.press('1');
 const pad=page.locator('#drawing');await expect(pad).toHaveAttribute('data-rhythm-hits','1');
 const accepted=await pad.getAttribute('data-rhythm-notes');
 await pad.focus();await page.keyboard.press('Enter');
 await expect(pad).toHaveAttribute('data-selected-pad','');
 await expect(pad).toHaveAttribute('data-rhythm-notes',accepted!);
 await expect(pad).toHaveAttribute('data-music-level','1');
 await page.keyboard.press('Numpad5');await page.locator('#rhythm-record').click();
 await page.keyboard.press('8');await expect(pad).not.toHaveAttribute('data-rhythm-notes',accepted!);
 // Input and dialog shortcuts must not accept/discard the draft.
 await page.locator('#files-open').click();await page.keyboard.press('Enter');
 await expect(pad).toHaveAttribute('data-selected-pad','4');
 // Native Enter may activate the dialog's focused Close button.
 if(!await page.locator('#files-dialog').isVisible())await page.locator('#files-open').click();
 await page.keyboard.press('Escape');await expect(pad).toHaveAttribute('data-selected-pad','4');
 await expect(page.locator('body')).toHaveClass(/focus-view/);
 await pad.focus();await page.keyboard.press('Escape');
 await expect(pad).toHaveAttribute('data-selected-pad','');
 await expect(pad).toHaveAttribute('data-rhythm-notes',accepted!);
 await expect(pad).toHaveAttribute('data-rhythm-hits','1');
 await expect(pad).toHaveAttribute('data-music-level','1');
 await expect(page.locator('body')).toHaveClass(/focus-view/);
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
});
