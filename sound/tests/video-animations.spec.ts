import {chooseAnimation} from './animation-helpers';
import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {videoAnimationCopy,videoAnimationPlan,videoAnimationKeys} from '../src/lib/video-animations';
import {decodeSettings} from '../src/lib/sound-settings';
import {defaultVideoTitle} from '../src/lib/video-info';
import {fileCopy} from '../src/lib/file-copy';
test('social-video changes begin early, stay frequent in long takes and never interrupt a crossfade',()=>{
 expect(defaultVideoTitle('Jazz & Blues')).toBe('Random Jazz & Blues Sound Session');
 for(const seconds of [60,180,600])for(const random of [()=>0,()=>.5,()=>1]){
  const plan=videoAnimationPlan(seconds,random),all=videoAnimationKeys.flatMap(key=>plan[key]).sort((a,b)=>a-b);
  expect(all[0]).toBeGreaterThanOrEqual(1800);expect(all[0]).toBeLessThanOrEqual(2400);
  expect(all.at(-1)!).toBeLessThan(seconds*1000-1800);
  all.forEach((time,i)=>{if(i)expect(time-all[i-1]).toBeGreaterThanOrEqual(1250);});
  for(const key of videoAnimationKeys){
   expect(plan[key].length).toBeGreaterThanOrEqual(Math.floor(seconds/7));
   plan[key].forEach((time,i)=>{if(i){expect(time-plan[key][i-1]).toBeGreaterThanOrEqual(5000);expect(time-plan[key][i-1]).toBeLessThanOrEqual(6000);}});
  }
 }
 const single=videoAnimationPlan(60,()=>.5,{visualization:true});
 expect(single.center).toEqual([]);expect(single.background).toEqual([]);expect(single.orbit).toEqual([]);
 single.visualization.forEach((time,i)=>{if(i)expect(time-single.visualization[i-1]).toBe(4250);});
 expect(videoAnimationKeys.flatMap(key=>videoAnimationPlan(60,()=>.5,{})[key])).toEqual([]);
});
async function options(page:Page){
 await page.locator('#files-open').click();test.skip(await page.locator('#video-record').isDisabled(),'No native MP4');
 await page.locator('.video-animation-options summary').click();
 for(const key of videoAnimationKeys)await page.locator('#video-animation-'+key).check();
 await page.locator('#recording-duration').fill('1');
}
async function clock(page:Page){
 await page.addInitScript(()=>{
  Math.random=()=>.5;
  const frame=window.requestAnimationFrame.bind(window);(window as any).videoAdvance=0;
  window.requestAnimationFrame=callback=>frame(time=>callback(time+(window as any).videoAdvance));
 });
}
test('video changes all selected layers temporarily, independently of normal Play; saved choices restore after stopping',async({page})=>{
 await clock(page);await page.goto('/de/');await options(page);
 await page.locator('#video-record').click();await expect(page.locator('#video-status')).toHaveText(fileCopy.de.recording);
 await page.evaluate(()=>(window as any).videoAdvance=7000);
 await expect.poll(async()=>page.locator('#orbit').getAttribute('data-visualization')).not.toBe('orbit');
 // Advance further to verify the other enabled layers and restoration too.
 await page.evaluate(()=>(window as any).videoAdvance=32000);
 await expect.poll(async()=>page.locator('#orbit').getAttribute('data-visualization')).not.toBe('orbit');
 await expect.poll(async()=>page.locator('#orbit').getAttribute('data-mode')).not.toBe('comet');
 await expect.poll(async()=>page.locator('#sound-atmosphere').getAttribute('data-mode')).not.toBe('clouds');
 await expect(page.locator('[data-center-mode=ring]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-orbit-mode=comet]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-background-mode=clouds]')).toHaveAttribute('aria-pressed','true');
 await page.locator('#files-open').click();const jsonDownload=page.waitForEvent('download');await page.locator('#json-export').click();
 const during=JSON.parse(await readFile((await(await jsonDownload).path())!,'utf8'));
 expect(during.visualization).toBe('orbit');expect(during.landscapeVariant).toBe('rivers');await page.locator('#files-close').click();
 const download=page.waitForEvent('download');await page.locator('#video-stop').click();await download;
 await expect(page.locator('#orbit')).toHaveAttribute('data-visualization','orbit');
 await expect(page.locator('#orbit')).toHaveAttribute('data-center-variant','ring');
 await expect(page.locator('#orbit')).toHaveAttribute('data-mode','comet');
 await expect(page.locator('#sound-atmosphere')).toHaveAttribute('data-mode','clouds');
});
test('explicitly disabled animation layers stay off throughout a randomized video',async({page})=>{
 await clock(page);await page.goto('/de/');
 for(const key of ['center','orbit','background'])await chooseAnimation(page,'[data-'+key+'-mode=off]');
 await options(page);await page.locator('#video-record').click();await expect(page.locator('#video-status')).toHaveText(fileCopy.de.recording);
 await page.evaluate(()=>(window as any).videoAdvance=50000);await page.waitForTimeout(200);
 await expect(page.locator('#orbit')).toHaveAttribute('data-center-variant','off');await expect(page.locator('#orbit')).toHaveAttribute('data-mode','off');await expect(page.locator('#sound-atmosphere')).toBeHidden();
 const download=page.waitForEvent('download');await page.locator('#video-stop').click();await download;
});
for(const lang of ['de','en','es','fr'] as const)test(`video animation switches are optional, localized and project-safe: ${lang}`,async({page})=>{
 await page.goto('/'+lang+'/');await page.locator('#files-open').click();await page.locator('.video-animation-options summary').click();
 for(const key of videoAnimationKeys)await expect(page.locator('#video-animation-'+key)).not.toBeChecked();
 await expect(page.locator('#video-animation-visualization')).toHaveAccessibleName(videoAnimationCopy[lang].visualization);
 await page.locator('#video-animation-center').check();await page.locator('#video-animation-background').check();await page.locator('#video-animation-visualization').check();
 const download=page.waitForEvent('download');await page.locator('#json-export').click();const raw=await readFile((await(await download).path())!,'utf8');
 expect(decodeSettings(raw)!.recording!.animations).toEqual({center:true,orbit:false,background:true,visualization:true});
 const legacy=JSON.parse(raw);delete legacy.recording.animations.visualization;expect(decodeSettings(JSON.stringify(legacy))).not.toBeNull();
 const invalid=JSON.parse(raw);invalid.recording.animations.visualization='yes';expect(decodeSettings(JSON.stringify(invalid))).toBeNull();
 const bad=JSON.parse(raw);bad.recording.animations.center='yes';expect(decodeSettings(JSON.stringify(bad))).toBeNull();
 await page.reload();await page.locator('#files-open').click();await page.locator('#json-file').setInputFiles({name:'animation.json',mimeType:'application/json',buffer:Buffer.from(raw)});
 await page.locator('.video-animation-options summary').click();await expect(page.locator('#video-animation-center')).toBeChecked();await expect(page.locator('#video-animation-orbit')).not.toBeChecked();await expect(page.locator('#video-animation-visualization')).toBeChecked();
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
});

test('automatic title follows the style, but changing styles never overwrites custom text',async({page})=>{
 await page.addInitScript(()=>{
  const fill=CanvasRenderingContext2D.prototype.fillText;(window as any).captionTexts=[];
  CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...rest){if(this.canvas.width===720&&this.canvas.height===1280)(window as any).captionTexts.push(text);return fill.call(this,text,x,y,...rest);};
 });
 await page.goto('/de/');await page.locator('#files-open').click();await page.locator('#video-info-enabled').check();
 await page.locator('#video-info-title').fill('Mein eigener Titel');await page.locator('#files-close').click();
 await page.locator('#animation-settings-open').click();await page.locator('[data-animation-open=music]').click();await page.locator('[data-style-preset=jazz]').click();await page.locator('#animation-settings-close').click();await page.locator('#files-open').click();
 await expect(page.locator('#video-info-title')).toHaveValue('Mein eigener Titel');
 await expect(page.locator('#video-info-title')).toHaveAttribute('placeholder','Random Jazz & Blues Sound Session');
 test.skip(await page.locator('#video-record').isDisabled(),'No native MP4');
 await page.locator('#video-info-title').fill('');await page.locator('#video-format input[value=portrait]').check();
 await page.locator('#video-record').click();await expect(page.locator('#video-status')).toHaveText(fileCopy.de.recording);
 await expect.poll(async()=>page.evaluate(()=>(window as any).captionTexts.includes('Random Jazz & Blues Sound Session'))).toBe(true);
 await page.waitForTimeout(600);const download=page.waitForEvent('download');await page.locator('#video-stop').click();await download;
});

test('a single enabled centre layer changes early while the other video layers stay fixed',async({page})=>{
 await clock(page);await page.goto('/de/');await options(page);
 for(const key of ['visualization','orbit','background'])await page.locator('#video-animation-'+key).uncheck();
 const originalOrbitMode=await page.locator('#orbit').getAttribute('data-mode');
 await page.locator('#video-record').click();await expect(page.locator('#video-status')).toHaveText(fileCopy.de.recording);
 await page.evaluate(()=>(window as any).videoAdvance=3000);
 await expect(page.locator('#orbit')).not.toHaveAttribute('data-center-variant','ring');
 await expect(page.locator('#orbit')).toHaveAttribute('data-visualization','orbit');expect(await page.locator('#orbit').getAttribute('data-mode')).toBe(originalOrbitMode);
 const download=page.waitForEvent('download');await page.locator('#video-stop').click();await download;
 await expect(page.locator('#orbit')).toHaveAttribute('data-center-variant','ring');
});
