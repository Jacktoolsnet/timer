import {chooseAnimation} from './animation-helpers';
import {test,expect,type Page} from '@playwright/test';
import {flowerPoint,flowerPitch,flowerNotes,paintSoundFlower} from '../src/lib/sound-flower';
import {LandscapeHistory} from '../src/lib/landscape';
import {partsForStyle} from '../src/lib/presets';
import {decodeSettings} from '../src/lib/sound-settings';
import {visualizationCopy} from '../src/lib/visualization';
import {readFile} from 'node:fs/promises';

test('petal axes stay stable and bounded and pitch separates chord beads',()=>{
 for(let i=0;i<9;i++)for(let p=-36;p<=72;p++){
  const point=flowerPitch(i,p);expect(point).toEqual(flowerPitch(i,p));
  expect(point.x).toBeGreaterThan(40);expect(point.x).toBeLessThan(660);expect(point.y).toBeGreaterThan(40);expect(point.y).toBeLessThan(660);
 }
 expect(flowerPitch(0,0)).not.toEqual(flowerPitch(0,12));expect(flowerPitch(0,0)).not.toEqual(flowerPitch(1,0));
 const h=new LandscapeHistory();for(const pitch of [0,4,7])h.record(0,{at:1,pitch,level:.8,length:2});
 expect(flowerNotes(h,0,.9)).toEqual([]);expect(flowerNotes(h,0,1.5)).toHaveLength(3);
 expect(new Set(flowerNotes(h,0,1.5).map(p=>p.y)).size).toBe(3);expect(flowerNotes(h,0,5)).toEqual([]);
});
test('held petals follow performed pitch and level curves, release and acoustic steps',()=>{
 const h=new LandscapeHistory(),note={at:1,pitch:0,level:.2,length:2,glide:true,curve:[{offset:0,pitch:0,level:.2},{offset:1,pitch:12,level:1}]};
 h.record(0,note);h.record(0,{at:2,pitch:12,level:1,length:.2,pulseOnly:true});
 const [light]=flowerNotes(h,0,1.5);expect(light.y).toBeCloseTo(flowerPitch(0,6).y);expect(light.level).toBeCloseTo(.6);
 expect(flowerNotes(h,0,2.1)).toHaveLength(1);
 h.record(1,{...note,glide:false});expect(flowerNotes(h,1,1.5)[0].y).toBeCloseTo(flowerPitch(1,0).y);
 h.release(0,1.5);expect(flowerNotes(h,0,2.6)).toEqual([]);
});
test('quiet petals retract, levels control their reach, and reduced motion fixes the silhouette',()=>{
 const h=new LandscapeHistory();h.record(0,{at:1,pitch:24,level:.8,length:2});
 function draw(time=1.5,volume=1,master=1,effect=1,mute=false,playing=true,reduced=false){
  let halos=0;const tips:{x:number;y:number}[]=[];
  const gradient={addColorStop(){}};
  const ctx={save(){},restore(){},beginPath(){},closePath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},stroke(){},fill(){},fillText(){},arc(){},
   bezierCurveTo(_a:number,_b:number,_c:number,_d:number,x:number,y:number){tips.push({x,y});},
   createLinearGradient(){return gradient;},createRadialGradient(){halos++;return gradient;}} as unknown as CanvasRenderingContext2D;
  paintSoundFlower(ctx,h,[{index:0,color:'#55ccff',volume,mute,pitched:true}],time,true,playing,reduced,master,effect);
  return {tip:tips[0],halos};
 }
 const quiet=draw(.9),active=draw();expect(active.halos).toBe(1);expect(active.tip.y).toBeLessThan(quiet.tip.y);
 for(const silent of [draw(1.5,0),draw(1.5,1,0),draw(1.5,1,1,0),draw(1.5,1,1,1,true),draw(1.5,1,1,1,false,false)]){
  expect(silent.halos).toBe(0);expect(silent.tip).toEqual(quiet.tip);
 }
 expect(draw(1.5,.1).tip.y).toBeGreaterThan(active.tip.y);
 expect(draw(3.5).tip.y).toBeGreaterThan(active.tip.y);expect(draw(5).tip).toEqual(quiet.tip);
 expect(draw(1.5,1,1,1,false,true,true).halos).toBe(0);
 expect(draw(.9,1,1,1,false,true,true).tip).toEqual(draw(1.5,1,1,1,false,true,true).tip);
 expect(flowerPoint(0,260)).toEqual(draw(1.5,1,1,1,false,true,true).tip);
});
function fixture(){return {version:2,visualization:'flower',style:'pop',bpm:160,volume:.3,center:'ring',background:'off',orbit:'comet',tracks:partsForStyle('pop').map((p,i)=>({enabled:true,mute:false,instrument:i===4?'strings':p.instrument,points:Array(16).fill(false),score:i===4?[{start:.2,duration:.24,points:[{offset:0,pitch:0,velocity:.5},{offset:.12,pitch:7,velocity:.9}]}]:null,grid:16,slots:16,pitch:p.pitch??0,volume:.5,phase:0,direction:1,directionMode:'forward',randomDynamics:false,morph:null}))};}
async function load(page:Page,data:unknown){await page.locator('#files-open').click();await page.locator('#json-file').setInputFiles({name:'flower.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.locator('#files-close').click();}
async function exported(page:Page){await page.locator('#files-open').click();const pending=page.waitForEvent('download');await page.locator('#json-export').click();const data=JSON.parse(await readFile((await (await pending).path())!,'utf8'));await page.locator('#files-close').click();return data;}
async function spy(page:Page){await page.addInitScript(()=>{
 (window as any).flowerLabels=[];(window as any).flowerHalos=0;
 const fill=CanvasRenderingContext2D.prototype.fillText,radial=CanvasRenderingContext2D.prototype.createRadialGradient;
 CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...args){if(this.canvas.id==='orbit'&&/^[1-9]$/.test(text))(window as any).flowerLabels.push(text);return fill.call(this,text,x,y,...args);};
 CanvasRenderingContext2D.prototype.createRadialGradient=function(...args){if(this.canvas.id==='orbit')(window as any).flowerHalos++;return radial.apply(this,args);};
 });}

test('flower round-trips and older or invalid view settings are handled',()=>{
 const f=fixture();expect(decodeSettings(JSON.stringify(f))?.visualization).toBe('flower');
 expect(decodeSettings(JSON.stringify({...f,visualization:'invalid'}))).toBeNull();
 const {visualization,...legacy}=f;expect(decodeSettings(JSON.stringify(legacy))).not.toBeNull();
});
test('flower rendering follows playback only, leaves music intact and stops when another view is chosen',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await spy(page);await page.goto('/de/');await load(page,fixture());
 await expect.poll(()=>page.evaluate(()=>new Set((window as any).flowerLabels).size)).toBe(9);
 expect(await page.evaluate(()=>(window as any).flowerHalos)).toBe(0);
 const before=await exported(page);await page.locator('#orbit').click({position:{x:180,y:180}});
 const after=await exported(page);expect(after.tracks).toEqual(before.tracks);expect(after.bpm).toBe(before.bpm);
 await expect(page.locator('[data-center-mode=ring]')).toBeDisabled();
 await page.locator('#play').click();await expect.poll(()=>page.evaluate(()=>(window as any).flowerHalos)).toBeGreaterThan(0);
 await page.locator('#play').click();await chooseAnimation(page,'button[data-visualization=stream]');
 await page.evaluate(()=>(window as any).flowerHalos=0);await page.waitForTimeout(250);expect(await page.evaluate(()=>(window as any).flowerHalos)).toBe(0);
 await chooseAnimation(page,'button[data-visualization=orbit]');await expect(page.locator('[data-center-mode=ring]')).toBeEnabled();expect(errors).toEqual([]);
});
test('view persists only with consent, restores without autoplay and works in focus',async({page})=>{
 await page.goto('/de/');await load(page,fixture());expect(await page.evaluate(()=>localStorage.getItem('jacktools.sound.settings.v1'))).toBeNull();
 const saved=await exported(page);expect(saved.visualization).toBe('flower');
 await chooseAnimation(page,'button[data-visualization=orbit]');await load(page,saved);
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('jacktools.sound.settings.v1')!).visualization)).toBe('flower');
 await page.reload();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');await expect(page.locator('#orbit')).toHaveAttribute('data-visualization','flower');
 await page.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.reject(new Error('fallback'));});
 await page.locator('#focus').click();await page.locator('#hide-focus-controls').click();await expect(page.locator('#animation-settings .visualization-switch')).toBeHidden();await expect(page.locator('#orbit')).toBeVisible();
});
test('localized selector fits mobile in both themes and reduced motion omits halos',async({page})=>{
 await spy(page);await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
 for(const lang of ['de','en','es','fr'] as const){
  await page.goto('/'+lang+'/');await expect(page.locator('button[data-visualization=flower]')).toContainText(visualizationCopy[lang].flower);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
 }
 await load(page,fixture());await page.locator('#palette-dropdown summary').click();await page.locator('#theme-light').click();await page.locator('#preferences-close').click();await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await page.locator('#play').click();await page.waitForTimeout(1100);expect(await page.evaluate(()=>(window as any).flowerHalos)).toBe(0);
 await expect(page.locator('#orbit')).toHaveAttribute('aria-label',visualizationCopy.fr.flowerDescription);
});
test('native MP4 captures the flower canvas with audio',async({page})=>{
 test.setTimeout(45000);await spy(page);await page.goto('/de/');await load(page,fixture());await page.locator('#files-open').click();
 test.skip(await page.locator('#video-record').isDisabled(),'No native MP4 encoder');
 await page.locator('#video-record').click();await page.waitForTimeout(1500);const pending=page.waitForEvent('download');await page.locator('#video-stop').click();
 const bytes=await readFile((await (await pending).path())!);expect(bytes.subarray(4,8).toString()).toBe('ftyp');expect(bytes.includes(Buffer.from('vide'))).toBe(true);expect(bytes.includes(Buffer.from('soun'))).toBe(true);expect(await page.evaluate(()=>(window as any).flowerHalos)).toBeGreaterThan(0);
});
