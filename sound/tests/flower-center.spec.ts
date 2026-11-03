import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {chooseAnimation} from './animation-helpers';
import {animationSettingsCopy} from '../src/lib/animation-settings';
import {decodeSettings} from '../src/lib/sound-settings';
import {paintSoundFlower} from '../src/lib/sound-flower';
import {LandscapeHistory} from '../src/lib/landscape';

async function exported(page:Page){
 await page.locator('#files-open').click();const download=page.waitForEvent('download');await page.locator('#json-export').click();
 const data=JSON.parse(await readFile((await(await download).path())!,'utf8'));await page.locator('#files-close').click();return data;
}
async function load(page:Page,data:unknown){
 await page.locator('#files-open').click();await page.locator('#json-file').setInputFiles({name:'flower.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.locator('#files-close').click();
}
test('native heart is optional so Off and alternate centres never retain an extra ring',()=>{
 function draw(showCenter:boolean){
  let hearts=0;const gradient={addColorStop(){}};
  const ctx={save(){},restore(){},beginPath(){},closePath(){},moveTo(){},quadraticCurveTo(){},bezierCurveTo(){},stroke(){},fill(){},fillText(){},createLinearGradient(){return gradient;},
   arc(x:number,y:number){if(x===350&&y===350)hearts++;}} as unknown as CanvasRenderingContext2D;
  paintSoundFlower(ctx,new LandscapeHistory(),[{index:0,color:'#55ccff',volume:1,mute:false,pitched:true}],0,true,false,false,1,1,showCenter);
  return hearts;
 }
 expect(draw(true)).toBe(1);expect(draw(false)).toBe(0);
});
test('flower gear has its own centre choices and both settings survive switching and JSON',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/de/');
 await chooseAnimation(page,'[data-center-mode=bars]');await chooseAnimation(page,'[data-flower-center-mode=sun]');
 await expect(page.locator('#orbit')).toHaveAttribute('data-visualization','flower');await expect(page.locator('#orbit')).toHaveAttribute('data-flower-center-variant','sun');
 await expect(page.locator('[data-center-mode=bars]')).toHaveAttribute('aria-pressed','true');
 await chooseAnimation(page,'button[data-visualization=orbit]');await expect(page.locator('#orbit')).toHaveAttribute('data-center-variant','bars');
 await chooseAnimation(page,'button[data-visualization=flower]');await expect(page.locator('#orbit')).toHaveAttribute('data-flower-center-variant','sun');
 await chooseAnimation(page,'[data-flower-center-mode=off]');const saved=await exported(page);
 expect(saved).toMatchObject({center:'bars',flowerCenter:'off',visualization:'flower'});expect(decodeSettings(JSON.stringify(saved))?.flowerCenter).toBe('off');
 expect(decodeSettings(JSON.stringify({...saved,flowerCenter:'unknown'}))).toBeNull();
 await chooseAnimation(page,'[data-flower-center-mode=ring]');await load(page,saved);
 await expect(page.locator('[data-flower-center-mode=off]')).toHaveAttribute('aria-pressed','true');
 const {flowerCenter,...legacy}=saved;await load(page,legacy);
 await expect(page.locator('#orbit')).toHaveAttribute('data-flower-center-variant','ring');await expect(page.locator('[data-center-mode=bars]')).toHaveAttribute('aria-pressed','true');
 expect(errors).toEqual([]);
});
test('each flower variant renders, Off removes the native heart, and consent restores both choices without autoplay',async({page})=>{
 await page.goto('/de/');await chooseAnimation(page,'[data-center-mode=filled]');
 await page.evaluate(()=>{
  (window as any).hearts=0;const arc=CanvasRenderingContext2D.prototype.arc;
  CanvasRenderingContext2D.prototype.arc=function(x,y,...args){if(this.canvas.id==='orbit'&&x===350&&y===350)(window as any).hearts++;return arc.call(this,x,y,...args);};
 });
 for(const mode of ['ring','filled','sun','sine','bars','random','off']){
  await chooseAnimation(page,'[data-flower-center-mode='+mode+']');await expect(page.locator('[data-flower-center-mode='+mode+']')).toHaveAttribute('aria-pressed','true');
  await page.waitForTimeout(80);
 }
 await page.evaluate(()=>(window as any).hearts=0);await page.waitForTimeout(160);expect(await page.evaluate(()=>(window as any).hearts)).toBe(0);
 await chooseAnimation(page,'[data-flower-center-mode=sine]');await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();
 await page.reload();await expect(page.locator('[data-center-mode=filled]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-flower-center-mode=sine]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
});
for(const lang of ['de','en','es','fr'] as const)test('localized flower settings navigate back correctly: '+lang,async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/'+lang+'/');await page.locator('#animation-settings-open').click();await page.locator('[data-animation-open=sound]').click();
 await expect(page.locator('#flower-settings-open')).toHaveAccessibleName(animationSettingsCopy[lang].flower);await page.locator('#flower-settings-open').click();
 await expect(page.locator('#animation-settings-title')).toHaveText(animationSettingsCopy[lang].flower);await expect(page.locator('[data-flower-center-mode]:visible')).toHaveCount(7);
 await expect(page.locator('[data-orbit-mode]:visible')).toHaveCount(0);expect(await page.locator('#animation-settings').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.locator('#animation-settings-back').click();await expect(page.locator('[data-animation-panel=sound]')).toBeVisible();
});
test('Random selection and temporary video centre changes target the flower independently of Orbit',async({page})=>{
 test.setTimeout(45000);
 await page.addInitScript(()=>{
  Math.random=()=>.5;const raf=requestAnimationFrame.bind(window);(window as any).advance=0;
  window.requestAnimationFrame=callback=>raf(time=>callback(time+(window as any).advance));
 });
 await page.goto('/de/');await chooseAnimation(page,'[data-center-mode=off]');await chooseAnimation(page,'[data-flower-center-mode=random]');
 const before=await page.locator('#orbit').getAttribute('data-flower-center-variant');await page.locator('#play').click();
 await expect.poll(()=>page.locator('#orbit').getAttribute('data-flower-center-variant')).not.toBe(before);await expect(page.locator('#orbit')).toHaveAttribute('data-center-variant','off');
 await page.locator('#play').click();await chooseAnimation(page,'[data-flower-center-mode=ring]');
 await page.locator('#files-open').click();test.skip(await page.locator('#video-record').isDisabled(),'No native MP4');
 await page.locator('.video-animation-options summary').click();await page.locator('#video-animation-center').check();await page.locator('#recording-duration').fill('1');await page.locator('#video-record').click();
 await page.evaluate(()=>(window as any).advance=32000);
 await expect.poll(()=>page.locator('#orbit').getAttribute('data-flower-center-variant')).not.toBe('ring');
 await expect(page.locator('#orbit')).toHaveAttribute('data-center-variant','off');await expect(page.locator('[data-flower-center-mode=ring]')).toHaveAttribute('aria-pressed','true');
 const download=page.waitForEvent('download');await page.locator('#video-stop').click();await download;
 await expect(page.locator('#orbit')).toHaveAttribute('data-flower-center-variant','ring');
});
