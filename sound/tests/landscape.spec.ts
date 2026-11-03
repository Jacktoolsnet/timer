import {chooseAnimation} from './animation-helpers';
import {test,expect,type Page} from '@playwright/test';
import {LandscapeHistory,landscapeValue,landscapeWindow} from '../src/lib/landscape';
import {partsForStyle} from '../src/lib/presets';
import {decodeSettings} from '../src/lib/sound-settings';
import {visualizationCopy} from '../src/lib/visualization';
import {readFile} from 'node:fs/promises';

test('landscape follows explicit pitch/volume curves and distinguishes gliding from acoustic articulation',()=>{
 const note={at:1,pitch:0,level:.2,length:2,glide:true,curve:[{offset:0,pitch:0,level:.2},{offset:1,pitch:12,level:1}]};
 expect(landscapeValue(note,1.5).pitch).toBe(6);expect(landscapeValue(note,1.5).level).toBeCloseTo(.6);expect(landscapeValue({...note,glide:false},1.5).pitch).toBe(0);
 expect(landscapeValue(note,.9).level).toBe(0);expect(landscapeValue(note,4).level).toBeLessThan(.01);
 expect(landscapeWindow(40,4)).toBeLessThanOrEqual(14);expect(landscapeWindow(220,3)).toBeGreaterThanOrEqual(3);
 const history=new LandscapeHistory();history.record(0,note);note.curve[0].pitch=55;expect(history.sample(0,1.5).pitch).toBe(6);
 history.record(0,{at:2,pitch:12,level:1,length:.2,pulseOnly:true});expect(history.sample(0,2.1).level).toBe(1);
 for(let i=0;i<500;i++)history.record(1,{at:i/10,pitch:7,level:.4,length:.1});expect(history.notes(1).length).toBeLessThanOrEqual(192);
 history.record(1,{at:NaN,pitch:7,level:.4,length:1});expect(history.notes(1).length).toBeLessThanOrEqual(192);
 history.release(0,1.5);expect(history.sample(0,1.25).pitch).toBe(3);expect(history.sample(0,2.5).level).toBeLessThan(.01);
 history.clear();expect(history.notes(0)).toEqual([]);expect(history.notes(1)).toEqual([]);
});
function fixture(){return {version:2,visualization:'landscape',style:'pop',bpm:160,volume:.3,center:'ring',background:'off',orbit:'comet',tracks:partsForStyle('pop').map(p=>({enabled:true,mute:false,instrument:p.instrument,points:Array.from({length:16},(_,s)=>p.steps.includes(s)),grid:16,slots:16,pitch:p.pitch??0,volume:.5,phase:0,direction:1,directionMode:'forward',randomDynamics:false,morph:null}))};}
async function load(page:Page,data:unknown){await page.locator('#files-open').click();await page.locator('#json-file').setInputFiles({name:'landscape.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.locator('#files-close').click();}
async function exported(page:Page){await page.locator('#files-open').click();const pending=page.waitForEvent('download');await page.locator('#json-export').click();const json=JSON.parse(await readFile((await (await pending).path())!,'utf8'));await page.locator('#files-close').click();return json;}
async function spy(page:Page){await page.addInitScript(()=>{(window as any).landscapeLines=[];const fill=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){if(this.canvas.id==='orbit'&&/^[1-9]$/.test(text))(window as any).landscapeLines.push(text);return fill.call(this,text,...args);};});}

test('view setting validates without breaking older projects',()=>{
 const data=fixture();expect(decodeSettings(JSON.stringify(data))?.visualization).toBe('landscape');expect(decodeSettings(JSON.stringify({...data,visualization:'unknown'}))).toBeNull();
 const {visualization,...legacy}=data;expect(decodeSettings(JSON.stringify(legacy))).not.toBeNull();
});
test('switching view preserves the music, draws nine streams only when chosen and keeps orbit effects separate',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await spy(page);await page.goto('/de/');const before=await exported(page);await page.locator('#play').click();
 await chooseAnimation(page,'button[data-visualization=landscape]');await expect(page.locator('#orbit')).toHaveAttribute('data-visualization','landscape');
 await expect.poll(()=>page.evaluate(()=>new Set((window as any).landscapeLines).size)).toBe(9);
 await expect(page.locator('[data-center-mode=ring]')).toBeDisabled();await expect(page.locator('[data-orbit-mode=comet]')).toBeDisabled();
 await page.locator('#orbit').click({position:{x:100,y:100}});const after=await exported(page);expect(after.tracks).toEqual(before.tracks);expect(after.bpm).toBe(before.bpm);expect(after.style).toBe(before.style);expect(after.visualization).toBe('landscape');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 const canvas=page.locator('#orbit');const first=await canvas.evaluate(el=>(el as HTMLCanvasElement).toDataURL());await page.waitForTimeout(350);expect(await canvas.evaluate(el=>(el as HTMLCanvasElement).toDataURL())).not.toBe(first);
 await chooseAnimation(page,'button[data-visualization=orbit]');await page.evaluate(()=>(window as any).landscapeLines=[]);await page.waitForTimeout(300);expect(await page.evaluate(()=>(window as any).landscapeLines.length)).toBe(0);
 await expect(page.locator('[data-center-mode=ring]')).toBeEnabled();expect(errors).toEqual([]);
});
test('landscape selection persists only with consent, round-trips through JSON and never autoplays',async({page})=>{
 await page.goto('/de/');await load(page,fixture());await expect(page.locator('button[data-visualization=landscape]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 const saved=await exported(page);await chooseAnimation(page,'button[data-visualization=orbit]');await load(page,saved);await expect(page.locator('#orbit')).toHaveAttribute('data-visualization','landscape');expect(await page.evaluate(()=>localStorage.getItem('jacktools.sound.settings.v1'))).toBeNull();
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('jacktools.sound.settings.v1')!).visualization)).toBe('landscape');
 await page.reload();await expect(page.locator('#orbit')).toHaveAttribute('data-visualization','landscape');await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
});
test('view choices are localized and landscape remains available with hidden focus controls',async({page})=>{
 for(const language of ['de','en','es','fr'] as const){await page.goto('/'+language+'/');await expect(page.locator('button[data-visualization=landscape]')).toContainText(visualizationCopy[language].landscape);}
 await page.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.reject(new Error('test fallback'));});await chooseAnimation(page,'button[data-visualization=landscape]');await page.locator('#focus').click();await page.locator('#hide-focus-controls').click();await expect(page.locator('body')).toHaveClass(/focus-idle/);
 await expect(page.locator('#orbit')).toBeVisible();await expect(page.locator('.visualization-switch')).toBeHidden();await expect(page.locator('#orbit')).toHaveAttribute('data-visualization','landscape');
});
test('native MP4 records the landscape canvas with sound',async({page})=>{
 test.setTimeout(45000);await spy(page);await page.goto('/de/');await load(page,fixture());await page.locator('#files-open').click();test.skip(await page.locator('#video-record').isDisabled(),'No native MP4 encoder');
 await page.locator('#video-record').click();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');await page.waitForTimeout(1400);const pending=page.waitForEvent('download');await page.locator('#video-stop').click();const bytes=await readFile((await (await pending).path())!);
 expect(bytes.subarray(4,8).toString()).toBe('ftyp');expect(bytes.includes(Buffer.from('vide'))).toBe(true);expect(bytes.includes(Buffer.from('soun'))).toBe(true);expect(await page.evaluate(()=>(window as any).landscapeLines.length)).toBeGreaterThan(0);
});
