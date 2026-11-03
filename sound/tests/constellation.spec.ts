import {chooseAnimation} from './animation-helpers';
import {test,expect,type Page} from '@playwright/test';
import {nebulaClouds,constellationStar,constellationLights,paintConstellation} from '../src/lib/constellation';
import {LandscapeHistory} from '../src/lib/landscape';
import {partsForStyle} from '../src/lib/presets';
import {decodeSettings} from '../src/lib/sound-settings';
import {constellationVariantCopy,visualizationCopy} from '../src/lib/visualization';
import {readFile} from 'node:fs/promises';

test('stable bounded stars distinguish pitches, chord heads and instrument groups',()=>{
 for(let i=0;i<9;i++)for(let p=-36;p<=72;p++){
  const star=constellationStar(i,p);expect(star).toEqual(constellationStar(i,p));
  expect(star.x).toBeGreaterThan(48);expect(star.x).toBeLessThan(650);expect(star.y).toBeGreaterThan(48);expect(star.y).toBeLessThan(650);
 }
 expect(constellationStar(0,0)).not.toEqual(constellationStar(0,12));
 expect(constellationStar(0,0)).not.toEqual(constellationStar(1,0));
 const h=new LandscapeHistory();
 for(const pitch of [0,4,7])h.record(0,{at:1,pitch,level:.8,length:2});
 expect(constellationLights(h,0,.9)).toEqual([]);expect(constellationLights(h,0,1.5)).toHaveLength(3);
 expect(new Set(constellationLights(h,0,1.5).map(p=>p.x))).toHaveProperty('size',3);
 expect(constellationLights(h,0,5)).toEqual([]);
});
test('stars follow actual sustained pitch and level curves without duplicating control points',()=>{
 const h=new LandscapeHistory(),note={at:1,pitch:0,level:.2,length:2,glide:true,curve:[{offset:0,pitch:0,level:.2},{offset:1,pitch:12,level:1}]};
 h.record(0,note);h.record(0,{at:2,pitch:12,level:1,length:.2,pulseOnly:true});
 const [light]=constellationLights(h,0,1.5);expect(light.x).toBeCloseTo(constellationStar(0,6).x);expect(light.level).toBeCloseTo(.6);
 expect(constellationLights(h,0,2.1)).toHaveLength(1);
 h.record(1,{...note,glide:false});expect(constellationLights(h,1,1.5)[0].x).toBeCloseTo(constellationStar(1,0).x);
 h.release(0,1.5);expect(constellationLights(h,0,2.6)).toEqual([]);
});
test('silence and mutes have no note glow; reduced motion retains a static cue without halos',()=>{
 const h=new LandscapeHistory();h.record(0,{at:1,pitch:7,level:.8,length:2});
 function draw(volume=1,master=1,effect=1,mute=false,playing=true,reduced=false){
  const radii:number[]=[];let halos=0;
  const ctx={save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},fillText(){},
   arc(_x:number,_y:number,r:number){radii.push(r);},createRadialGradient(){halos++;return {addColorStop(){}};}} as unknown as CanvasRenderingContext2D;
  paintConstellation(ctx,h,[{index:0,color:'#55ccff',volume,mute,pitched:true}],1.5,true,playing,reduced,master,effect);
  return {radii:radii.filter(r=>r>2),halos};
 }
 expect(draw().halos).toBe(1);
 for(const silent of [draw(0),draw(1,0),draw(1,1,0),draw(1,1,1,true),draw(1,1,1,false,false)]){
  expect(silent.radii).toEqual([]);expect(silent.halos).toBe(0);
 }
 expect(draw(1,1,1,false,true,true).halos).toBe(0);expect(draw(1,1,1,false,true,true).radii.length).toBeGreaterThan(0);
 expect(Math.max(...draw(.1).radii)).toBeLessThan(Math.max(...draw().radii));
});
function fixture(){return {version:2,visualization:'constellation',style:'pop',bpm:160,volume:.3,center:'ring',background:'off',orbit:'comet',tracks:partsForStyle('pop').map((p,i)=>({enabled:true,mute:false,instrument:i===4?'strings':p.instrument,points:Array(16).fill(false),score:i===4?[{start:.2,duration:.24,points:[{offset:0,pitch:0,velocity:.5},{offset:.12,pitch:7,velocity:.9}]}]:null,grid:16,slots:16,pitch:p.pitch??0,volume:.5,phase:0,direction:1,directionMode:'forward',randomDynamics:false,morph:null}))};}
async function load(page:Page,data:unknown){await page.locator('#files-open').click();await page.locator('#json-file').setInputFiles({name:'stars.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.locator('#files-close').click();}
async function exported(page:Page){await page.locator('#files-open').click();const pending=page.waitForEvent('download');await page.locator('#json-export').click();const data=JSON.parse(await readFile((await (await pending).path())!,'utf8'));await page.locator('#files-close').click();return data;}
async function spy(page:Page){await page.addInitScript(()=>{
 (window as any).starLabels=[];(window as any).starHalos=0;
 const fill=CanvasRenderingContext2D.prototype.fillText,radial=CanvasRenderingContext2D.prototype.createRadialGradient;
 CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...args){if(this.canvas.id==='orbit'&&/^[1-9]$/.test(text))(window as any).starLabels.push(text);return fill.call(this,text,x,y,...args);};
 CanvasRenderingContext2D.prototype.createRadialGradient=function(...args){if(this.canvas.id==='orbit')(window as any).starHalos++;return radial.apply(this,args);};
 });}

test('constellation round-trips and older or invalid view settings are handled',()=>{
 const f=fixture();expect(decodeSettings(JSON.stringify(f))?.visualization).toBe('constellation');
 expect(decodeSettings(JSON.stringify({...f,visualization:'invalid'}))).toBeNull();
 const {visualization,...legacy}=f;expect(decodeSettings(JSON.stringify(legacy))).not.toBeNull();
});
test('star rendering follows playback only, leaves music intact and stops when another view is chosen',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await spy(page);await page.goto('/de/');await load(page,fixture());
 await expect.poll(()=>page.evaluate(()=>new Set((window as any).starLabels).size)).toBe(9);
 expect(await page.evaluate(()=>(window as any).starHalos)).toBe(0);
 const before=await exported(page);await page.locator('#orbit').click({position:{x:180,y:180}});
 const after=await exported(page);expect(after.tracks).toEqual(before.tracks);expect(after.bpm).toBe(before.bpm);
 await expect(page.locator('[data-center-mode=ring]')).toBeDisabled();
 await page.locator('#play').click();await expect.poll(()=>page.evaluate(()=>(window as any).starHalos)).toBeGreaterThan(0);
 await page.locator('#play').click();await chooseAnimation(page,'button[data-visualization=stream]');
 await page.evaluate(()=>(window as any).starHalos=0);await page.waitForTimeout(250);expect(await page.evaluate(()=>(window as any).starHalos)).toBe(0);
 await chooseAnimation(page,'button[data-visualization=orbit]');await expect(page.locator('[data-center-mode=ring]')).toBeEnabled();expect(errors).toEqual([]);
});
test('view persists only with consent, restores without autoplay and works in focus',async({page})=>{
 await page.goto('/de/');await load(page,fixture());expect(await page.evaluate(()=>localStorage.getItem('jacktools.sound.settings.v1'))).toBeNull();
 const saved=await exported(page);expect(saved.visualization).toBe('constellation');
 await chooseAnimation(page,'button[data-visualization=orbit]');await load(page,saved);
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('jacktools.sound.settings.v1')!).visualization)).toBe('constellation');
 await page.reload();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');await expect(page.locator('#orbit')).toHaveAttribute('data-visualization','constellation');
 await page.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.reject(new Error('fallback'));});
 await page.locator('#focus').click();await page.locator('#hide-focus-controls').click();await expect(page.locator('#animation-settings .visualization-switch')).toBeHidden();await expect(page.locator('#orbit')).toBeVisible();
});
test('localized selector fits mobile in both themes and reduced motion omits halos',async({page})=>{
 await spy(page);await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
 for(const lang of ['de','en','es','fr'] as const){
  await page.goto('/'+lang+'/');await expect(page.locator('button[data-visualization=constellation]')).toContainText(visualizationCopy[lang].constellation);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
 }
 await load(page,fixture());await page.locator('#palette-dropdown summary').click();await page.locator('#theme-light').click();await page.locator('#preferences-close').click();await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await page.locator('#play').click();await page.waitForTimeout(1100);expect(await page.evaluate(()=>(window as any).starHalos)).toBe(0);
 await expect(page.locator('#orbit')).toHaveAttribute('aria-label',visualizationCopy.fr.constellationDescription);
});
test('native MP4 captures the constellation canvas with audio',async({page})=>{
 test.setTimeout(45000);await spy(page);await page.goto('/de/');await load(page,{...fixture(),constellationVariant:'nebula'});await page.locator('#files-open').click();
 test.skip(await page.locator('#video-record').isDisabled(),'No native MP4 encoder');
 await page.locator('#video-record').click();await page.waitForTimeout(1500);const pending=page.waitForEvent('download');await page.locator('#video-stop').click();
 const bytes=await readFile((await (await pending).path())!);expect(bytes.subarray(4,8).toString()).toBe('ftyp');expect(bytes.includes(Buffer.from('vide'))).toBe(true);expect(bytes.includes(Buffer.from('soun'))).toBe(true);expect(await page.evaluate(()=>(window as any).starHalos)).toBeGreaterThan(0);
});

test('nebula is deterministic, follows heard chord voices and fades without musical random state',()=>{
 const h=new LandscapeHistory();for(const pitch of [0,7])h.record(0,{at:1,pitch,level:.8,length:.1});
 const snapshot=JSON.stringify(h.notes(0));
 expect(nebulaClouds(h,0,.9,1)).toEqual([]);expect(nebulaClouds(h,0,1.1,0)).toEqual([]);
 const early=nebulaClouds(h,0,1.1,1),late=nebulaClouds(h,0,2,1);
 expect(early).toHaveLength(6);expect(early).toEqual(nebulaClouds(h,0,1.1,1));
 expect(new Set(early.map(p=>p.x)).size).toBe(6);
 for(let i=0;i<early.length;i++){expect(late[i].radius).toBeGreaterThan(early[i].radius);expect(late[i].alpha).toBeLessThan(early[i].alpha);}
 expect(nebulaClouds(h,0,5.4,1)).toEqual([]);
 expect(nebulaClouds(h,0,1.1,1,true).map(p=>[p.x,p.y,p.radius])).toEqual(nebulaClouds(h,0,1.2,1,true).map(p=>[p.x,p.y,p.radius]));
 expect(JSON.stringify(h.notes(0))).toBe(snapshot);
 h.record(1,{at:1,pitch:0,level:.3,length:2,glide:true,curve:[{offset:0,pitch:0,level:.3},{offset:1,pitch:12,level:1}]});
 expect(nebulaClouds(h,1,2,1).length).toBeGreaterThan(3);
});
test('nebula clouds honour mute, levels, playback and glow',()=>{
 const h=new LandscapeHistory();h.record(0,{at:1,pitch:7,level:.8,length:.1});
 function draw({mute=false,volume=1,master=1,effect=1,playing=true,reduced=false}={}){
  let clouds=0;const ctx={save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},fillText(){},arc(){},
   createRadialGradient(_x:number,_y:number,_r:number,_xx:number,_yy:number,r:number){if(r>40)clouds++;return {addColorStop(){}};}} as unknown as CanvasRenderingContext2D;
  paintConstellation(ctx,h,[{index:0,color:'#55ccff',volume,mute,pitched:true}],1.5,true,playing,reduced,master,effect,'nebula');
  return clouds;
 }
 expect(draw()).toBeGreaterThan(0);expect(draw({reduced:true})).toBeGreaterThan(0);
 for(const options of [{mute:true},{volume:0},{master:0},{effect:0},{playing:false}])expect(draw(options)).toBe(0);
});
test('nebula settings preserve music, round-trip JSON, restore with consent and default old files to stars',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/de/');await load(page,fixture());const before=await exported(page);
 await chooseAnimation(page,'button[data-constellation-variant=nebula]');await expect(page.locator('#orbit')).toHaveAttribute('data-constellation-variant','nebula');
 const saved=await exported(page);expect(saved.constellationVariant).toBe('nebula');expect(saved.tracks).toEqual(before.tracks);
 expect(decodeSettings(JSON.stringify({...saved,constellationVariant:'invalid'}))).toBeNull();
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();
 await page.reload();await expect(page.locator('#orbit')).toHaveAttribute('data-constellation-variant','nebula');await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await load(page,fixture());await expect(page.locator('#orbit')).toHaveAttribute('data-constellation-variant','stars');expect(errors).toEqual([]);
});
test('nebula tiles are localized, fit mobile and remain available in focus with reduced motion',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
 for(const lang of ['de','en','es','fr'] as const){
  await page.goto('/'+lang+'/');await chooseAnimation(page,'button[data-constellation-variant=nebula]');
  await expect(page.locator('button[data-constellation-variant=nebula]')).toContainText(constellationVariantCopy[lang].nebula);
  await expect(page.locator('#orbit')).toHaveAttribute('aria-label',constellationVariantCopy[lang].description);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
 }
 await page.locator('#focus').click();await page.locator('#hide-focus-controls').click();await expect(page.locator('#orbit')).toBeVisible();
 await expect(page.locator('#orbit')).toHaveAttribute('data-constellation-variant','nebula');
});
