import {test,expect,type Page} from '@playwright/test';
import {streamX,streamPitchY,streamPlot,streamPreviewNotes} from '../src/lib/note-stream';
import {partsForStyle} from '../src/lib/presets';
import {decodeSettings} from '../src/lib/sound-settings';
import {visualizationCopy} from '../src/lib/visualization';
import {readFile} from 'node:fs/promises';
import type {NoteScore} from '../src/lib/note-score';

test('stream geometry places actual onsets exactly on the strike line, preserving length, pitch and chord simultaneity',()=>{
 expect(streamX(5,5,2)).toBe(streamPlot.strike);expect(streamX(6,5,2)).toBeGreaterThan(streamPlot.strike);expect(streamX(4.5,5,2)).toBeLessThan(streamPlot.strike);
 expect(streamX(6,5,2)-streamX(5,5,2)).toBeCloseTo(streamX(4,3,2)-streamX(3,3,2));
 expect(streamPitchY(24,200,50)).toBeLessThan(streamPitchY(0,200,50));expect(streamPitchY(24,200,50,false)).toBe(200);
 const score:NoteScore=[0,4,7].map(pitch=>({start:.25,duration:.1,points:[{offset:0,pitch,velocity:.8}]}));const before=JSON.stringify(score);
 const notes=streamPreviewNotes({index:0,at:10,notes:score},2,10.5);expect(notes).toHaveLength(3);expect(new Set(notes.map(n=>n.at)).size).toBe(1);expect(notes[0].at).toBe(11);expect(notes[0].length).toBeCloseTo(.4);expect(JSON.stringify(score)).toBe(before);
 const linked:NoteScore=[{start:.2,duration:.4,points:[{offset:0,pitch:0,velocity:.3},{offset:.2,pitch:12,velocity:1}]}];const curve=streamPreviewNotes({index:0,at:0,notes:linked,glide:false},2,0)[0];expect(curve.curve?.[1]).toEqual({offset:.8,pitch:12,level:1});expect(curve.glide).toBe(false);
});
function fixture(){return {version:2,visualization:'stream',style:'pop',bpm:160,volume:.3,center:'ring',background:'off',orbit:'comet',tracks:partsForStyle('pop').map((p,i)=>({enabled:true,mute:false,instrument:i===4?'strings':p.instrument,points:Array.from({length:16},(_,s)=>p.steps.includes(s)),score:i===4?[{start:.2,duration:.24,points:[{offset:0,pitch:0,velocity:.5},{offset:.12,pitch:7,velocity:.9}]}]:null,grid:16,slots:16,pitch:p.pitch??0,volume:.5,phase:0,direction:1,directionMode:'forward',randomDynamics:false,morph:null}))};}
async function load(page:Page,data:unknown){await page.locator('#files-open').click();await page.locator('#json-file').setInputFiles({name:'stream.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.locator('#files-close').click();}
async function exported(page:Page){await page.locator('#files-open').click();const pending=page.waitForEvent('download');await page.locator('#json-export').click();const data=JSON.parse(await readFile((await (await pending).path())!,'utf8'));await page.locator('#files-close').click();return data;}
async function spy(page:Page){await page.addInitScript(()=>{
 (window as any).streamLabels=[];(window as any).streamStrikes=[];const text=CanvasRenderingContext2D.prototype.fillText,arc=CanvasRenderingContext2D.prototype.arc;
 CanvasRenderingContext2D.prototype.fillText=function(label,x,y,...rest){if(this.canvas.id==='orbit'&&x===24)(window as any).streamLabels.push(label);return text.call(this,label,x,y,...rest);};
 CanvasRenderingContext2D.prototype.arc=function(x,y,r,...rest){if(this.canvas.id==='orbit'&&x===174)(window as any).streamStrikes.push({x,y,r});return arc.call(this,x,y,r,...rest);};
 });}
test('stream mode validates and older projects keep their existing view',()=>{
 const data=fixture();expect(decodeSettings(JSON.stringify(data))?.visualization).toBe('stream');expect(decodeSettings(JSON.stringify({...data,visualization:'invalid'}))).toBeNull();expect(decodeSettings(JSON.stringify({...data,visualization:'landscape'}))?.visualization).toBe('landscape');
 const legacy={...data};delete (legacy as Partial<typeof data>).visualization;expect(decodeSettings(JSON.stringify(legacy))).not.toBeNull();
});
test('nine stream lanes render upcoming notes and actual impacts; switching views neither changes nor stops music',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await spy(page);await page.goto('/de/');await load(page,fixture());const before=await exported(page);
 await expect(page.locator('#orbit')).toHaveAttribute('data-visualization','stream');await expect.poll(()=>page.evaluate(()=>new Set((window as any).streamLabels.filter((s:string)=>/^[1-9]$/.test(s))).size)).toBe(9);
 await page.locator('#play').click();await expect.poll(()=>page.evaluate(()=>(window as any).streamStrikes.length)).toBeGreaterThan(0);
 const a=await page.locator('#orbit').evaluate(el=>(el as HTMLCanvasElement).toDataURL());await page.waitForTimeout(300);expect(await page.locator('#orbit').evaluate(el=>(el as HTMLCanvasElement).toDataURL())).not.toBe(a);
 await page.locator('#orbit').click({position:{x:120,y:120}});const saved=await exported(page);expect(saved.tracks).toEqual(before.tracks);expect(saved.visualization).toBe('stream');
 await page.locator('button[data-visualization=orbit]').click();await page.evaluate(()=>(window as any).streamLabels=[]);await page.waitForTimeout(180);expect(await page.evaluate(()=>(window as any).streamLabels.length)).toBe(0);
 await page.locator('button[data-visualization=landscape]').click();await page.locator('button[data-visualization=stream]').click();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');expect(errors).toEqual([]);
});
test('notes reach the line only when they sound, while the future preview remains provisional',async({page})=>{
 await spy(page);await page.goto('/de/');const data=fixture();data.tracks.forEach((tr,i)=>tr.enabled=i===4);await load(page,data);
 await page.locator('#play').click();await page.waitForTimeout(220);expect(await page.evaluate(()=>(window as any).streamStrikes.length)).toBe(0);
 await expect.poll(()=>page.evaluate(()=>(window as any).streamStrikes.length)).toBeGreaterThan(0);
});
test('stream choice round-trips, persists with consent and does not autoplay after reload',async({page})=>{
 await page.goto('/de/');await load(page,fixture());await expect(page.locator('[data-orbit-mode=comet]')).toBeDisabled();await expect(page.locator('[data-center-mode=ring]')).toBeDisabled();
 const saved=await exported(page);await page.locator('button[data-visualization=orbit]').click();await load(page,saved);await expect(page.locator('button[data-visualization=stream]')).toHaveAttribute('aria-pressed','true');
 expect(await page.evaluate(()=>localStorage.getItem('jacktools.sound.settings.v1'))).toBeNull();await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('jacktools.sound.settings.v1')!).visualization)).toBe('stream');await page.reload();await expect(page.locator('#orbit')).toHaveAttribute('data-visualization','stream');await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
});
test('localized choices fit mobile, and stream is retained in focus view with reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});for(const lang of ['de','en','es','fr'] as const){await page.goto('/'+lang+'/');await expect(page.locator('button[data-visualization=stream]')).toContainText(visualizationCopy[lang].stream);expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);}
 await page.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.reject(new Error('fallback'));});await page.locator('button[data-visualization=stream]').click();await page.locator('#focus').click();await page.locator('#hide-focus-controls').click();await expect(page.locator('.visualization-switch')).toBeHidden();await expect(page.locator('#orbit')).toBeVisible();await expect(page.locator('#orbit')).toHaveAttribute('data-visualization','stream');
});
test('MP4 uses the note stream canvas and keeps its audio track',async({page})=>{
 test.setTimeout(45000);await spy(page);await page.goto('/de/');await load(page,fixture());await page.locator('#files-open').click();test.skip(await page.locator('#video-record').isDisabled(),'No native MP4 encoder');await page.locator('#video-record').click();await page.waitForTimeout(1300);
 const pending=page.waitForEvent('download');await page.locator('#video-stop').click();const bytes=await readFile((await (await pending).path())!);expect(bytes.subarray(4,8).toString()).toBe('ftyp');expect(bytes.includes(Buffer.from('vide'))).toBe(true);expect(bytes.includes(Buffer.from('soun'))).toBe(true);expect(await page.evaluate(()=>(window as any).streamLabels.length)).toBeGreaterThan(0);
});
