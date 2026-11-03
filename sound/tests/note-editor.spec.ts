import {test,expect,type Page} from '@playwright/test';
import {validScore,cloneScore,scoreValue,deleteScorePoint,type NoteScore} from '../src/lib/note-score';
import {decodeSettings} from '../src/lib/sound-settings';
import {partsForStyle} from '../src/lib/presets';
const chain:NoteScore=[{start:.1,duration:.3,points:[{offset:0,pitch:0,velocity:.2},{offset:.1,pitch:7,velocity:1},{offset:.2,pitch:4,velocity:.4}]}];
test('score validation, interpolated pitch/level and point deletion preserve bounded independent notes',()=>{
 expect(validScore(chain)).toBe(true);const copy=cloneScore(chain);copy[0].points[0].pitch=9;expect(chain[0].points[0].pitch).toBe(0);
 expect(scoreValue(chain[0],.05).pitch).toBeCloseTo(3.5);expect(scoreValue(chain[0],.05).velocity).toBeCloseTo(.6);
 const removed=deleteScorePoint(chain,0,0);expect(removed[0].start).toBeCloseTo(.2);expect(removed[0].points[0].offset).toBe(0);expect(validScore(removed)).toBe(true);
 expect(deleteScorePoint([{start:0,duration:.1,points:[{offset:0,pitch:0,velocity:1}]}],0,0)).toEqual([]);
 for(const invalid of [[{...chain[0],start:.9}], [{...chain[0],duration:0}], [{...chain[0],points:[{offset:0,pitch:Infinity,velocity:1}]}], [{...chain[0],points:[{offset:0,pitch:0,velocity:0}]}]])expect(validScore(invalid)).toBe(false);
});
function fixture(score:NoteScore|null=null,instrument='strings'){
 return {version:2,style:'pop',bpm:220,volume:.3,center:'off',background:'off',orbit:'dot',tracks:partsForStyle('pop').map((p,i)=>({score:i===4?score:null,enabled:i===4,mute:false,instrument:i===4?instrument:p.instrument,points:Array.from({length:16},(_,s)=>s===0),grid:16,slots:16,pitch:0,volume:.5,phase:0,direction:1,directionMode:'forward',randomDynamics:false,morph:null}))};
}
async function load(page:Page,data:ReturnType<typeof fixture>){
 await page.locator('#files-open').click();await page.locator('#json-file').setInputFiles({name:'score.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.locator('#files-close').click();
}
async function read(page:Page){return page.locator('#note-editor').evaluate(el=>JSON.parse((el as HTMLElement).dataset.score!) as NoteScore);}
async function choose(page:Page){await page.locator('[data-pad-mode=notes]').click();await page.locator('[data-score-track="4"]').click();}
async function clickGrid(page:Page,x:number,y:number){const b=(await page.locator('#score-grid').boundingBox())!;await page.mouse.click(b.x+x/700*b.width,b.y+y/500*b.height);}
async function exported(page:Page){
 await page.locator('#files-open').click();const download=page.waitForEvent('download');await page.locator('#json-export').click();const stream=await (await download).createReadStream();const chunks:Buffer[]=[];for await(const c of stream!)chunks.push(c);await page.locator('#files-close').click();return JSON.parse(Buffer.concat(chunks).toString());
}
test('legacy projects remain valid and scores round-trip with strict validation',()=>{
 const data=fixture(chain);expect(decodeSettings(JSON.stringify(data))?.tracks[4].score).toEqual(chain);
 expect(decodeSettings(JSON.stringify({...data,pad:{mode:'notes',beats:4,hits:Array.from({length:9},()=>Array(32).fill(false))}}))?.pad?.mode).toBe('notes');
 data.tracks[4].score=[{...chain[0],points:[{offset:0,pitch:80,velocity:1}]}];expect(decodeSettings(JSON.stringify(data))).toBeNull();
});
test('opening the editor preserves generated notes; changes can be discarded, accepted, exported and deleted',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/de/');await load(page,fixture());
 await page.locator('[data-pad-mode=notes]').click();await expect(page.locator('#score-instruments [data-score-track]')).toHaveCount(9);
 expect((await page.locator('#drawing').getAttribute('data-lane-levels'))?.split(',').every(v=>v==='1')).toBe(true);
 await page.locator('[data-score-track="4"]').click();const original=await read(page);expect(original.length).toBeGreaterThan(0);await expect(page.locator('#score-companions [data-score-track]')).toHaveCount(8);
 await clickGrid(page,280,330);expect((await read(page)).length).toBe(original.length+1);await page.locator('#score-volume').fill('35');expect((await read(page)).at(-1)!.points[0].velocity).toBe(.35);
 await page.locator('#score-grid').focus();await page.keyboard.press('Escape');await expect(page.locator('#note-editor')).toHaveAttribute('data-selected','');
 await page.locator('[data-score-track="4"]').click();expect(await read(page)).toEqual(original);
 await clickGrid(page,280,330);await page.locator('#score-done').click();const saved=await exported(page);expect(saved.tracks[4].score.length).toBe(original.length+1);
 await page.locator('[data-score-track="4"]').click();await page.locator(`[data-score-note="${original.length}"][data-score-point="0"]`).click();await page.locator('#score-delete').click();expect((await read(page)).length).toBe(original.length);
 await page.locator('#score-grid').focus();await page.keyboard.press('Enter');expect(errors).toEqual([]);
});
test('drawing a connection creates independent pitches and volumes, supports free placement and Delete',async({page})=>{
 await page.goto('/de/');await load(page,fixture([]));await choose(page);
 const b=(await page.locator('#score-grid').boundingBox())!;
 await page.mouse.move(b.x+b.width*150/700,b.y+b.height*360/500);await page.mouse.down();
 const after=(await page.locator('#score-grid').boundingBox())!;
 await page.mouse.move(after.x+after.width*360/700,after.y+after.height*200/500,{steps:8});await page.mouse.up();
 const notes=await read(page);expect(notes).toHaveLength(1);expect(notes[0].points.length).toBeGreaterThan(1);expect(validScore(notes)).toBe(true);
 await page.locator('#score-volume').fill('25');expect((await read(page))[0].points.at(-1)!.velocity).toBe(.25);expect((await read(page))[0].points[0].velocity).toBe(.8);
 await page.locator('#score-grid').focus();await page.keyboard.press('Delete');expect((await read(page))[0].points.length).toBe(notes[0].points.length-1);
 await page.locator('#score-snap').uncheck();await clickGrid(page,573,370);const free=(await read(page)).at(-1)!;expect(Math.abs(free.start*32-Math.round(free.start*32))).toBeGreaterThan(.01);
 await page.locator('[data-pad-mode=draw]').click();await choose(page);expect(await read(page)).toEqual([]);
});
test('held score curves glide in real audio, ramp volume and survive Random Play without extra attacks',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).scoreAudio={starts:0,ramps:[],levels:[]};const start=OscillatorNode.prototype.start,ramp=AudioParam.prototype.exponentialRampToValueAtTime,linear=AudioParam.prototype.linearRampToValueAtTime;
  AudioParam.prototype.linearRampToValueAtTime=function(value,at){(window as any).scoreAudio.levels.push({value,at});return linear.call(this,value,at);};
  OscillatorNode.prototype.start=function(at){(window as any).scoreAudio.starts++;return start.call(this,at);};
  AudioParam.prototype.exponentialRampToValueAtTime=function(value,at){(window as any).scoreAudio.ramps.push({value,at});return ramp.call(this,value,at);};
 });
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/de/');await load(page,fixture(chain));await page.locator('#play').click();await page.waitForTimeout(850);
 const audio=await page.evaluate(()=>(window as any).scoreAudio);expect(audio.starts).toBeGreaterThan(0);expect(audio.starts).toBeLessThan(10);expect(audio.ramps.some((r:any)=>Math.abs(r.value-261.626*2**(7/12))<2)).toBe(true);
 expect(audio.levels.some((r:any)=>r.value===1)).toBe(true);expect(audio.levels.some((r:any)=>r.value===.4)).toBe(true);
 await page.locator('#evolve').click();await page.waitForTimeout(900);const saved=await exported(page);expect(saved.tracks[4].score).toEqual(chain);expect(errors).toEqual([]);
});


test('only accepted score drafts enter opt-in browser storage, and reload never starts playback',async({page})=>{
 await page.goto('/de/');await load(page,fixture([]));await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();
 await choose(page);await clickGrid(page,280,330);
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('jacktools.sound.settings.v1')!).tracks[4].score);
 await expect.poll(stored).toEqual([]);await page.locator('#score-done').click();await expect.poll(stored).not.toEqual([]);const accepted=await stored();
 await page.locator('[data-score-track="4"]').click();await clickGrid(page,450,220);await expect.poll(stored).toEqual(accepted);
 await page.reload();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');await expect(page.locator('#note-editor')).toHaveAttribute('data-selected','');
 await page.locator('[data-score-track="4"]').click();expect(await read(page)).toEqual(accepted);
});
test('acoustic connected points articulate distinct notes instead of bending a piano sample',async({page})=>{
 await page.addInitScript(()=>{(window as any).pianoStarts=[];const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(at=0,...rest){if(at>0)(window as any).pianoStarts.push(at);return start.call(this,at,...rest);};});
 await page.goto('/de/');await load(page,fixture(chain,'piano'));await page.locator('#play').click();await page.waitForTimeout(900);
 const starts=await page.evaluate(()=>(window as any).pianoStarts as number[]);expect(starts.length).toBeGreaterThanOrEqual(3);expect(starts[1]-starts[0]).toBeCloseTo(60/220*8*.1,2);expect(starts[2]-starts[1]).toBeCloseTo(60/220*8*.1,2);
});
test('touch adds and selects notes; pitch grid occupies the visible paper in all four languages',async({page},info)=>{
 for(const lang of ['de','en','es','fr']){
  await page.goto('/'+lang+'/');await load(page,fixture([]));await choose(page);const b=(await page.locator('#score-grid').boundingBox())!;
  expect(b.height).toBeGreaterThan(120);const paper=(await page.locator('.score-paper').boundingBox())!;expect(b.height/paper.height).toBeGreaterThan(.9);
  await page.locator('#score-grid').scrollIntoViewIfNeeded();const box=(await page.locator('#score-grid').boundingBox())!;
  if(info.project.name==='mobile')await page.touchscreen.tap(box.x+box.width*.4,box.y+box.height*.5);else await page.mouse.click(box.x+box.width*.4,box.y+box.height*.5);
  expect(await read(page)).toHaveLength(1);await expect(page.locator('#score-volume')).toBeVisible();
 }
});
