import {chooseAnimation} from './animation-helpers';
import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {videoAnimationPlan,videoAnimationKeys} from '../src/lib/video-animations';
import {decodeSettings} from '../src/lib/sound-settings';
import {defaultVideoTitle} from '../src/lib/video-info';
import {fileCopy} from '../src/lib/file-copy';
test('independent change plans scale with video length and keep changes away from the endpoints',()=>{
 const short=videoAnimationPlan(60,()=>.5),long=videoAnimationPlan(600,()=>.5);
 expect(defaultVideoTitle('Jazz & Blues')).toBe('Random Jazz & Blues Sound Session');
 for(const key of videoAnimationKeys){
  expect(short[key].length).toBeGreaterThanOrEqual(6);expect(short[key].length).toBeLessThanOrEqual(9);
  expect(short[key][0]).toBeGreaterThan(4000);expect(short[key].at(-1)!).toBeLessThan(57000);
  short[key].forEach((time,i)=>{expect(long[key][i]).toBeCloseTo(time*10);if(i)expect(time-short[key][i-1]).toBeGreaterThan(3000);});
 }
 expect(new Set(videoAnimationKeys.map(key=>short[key][0])).size).toBe(3);
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
 await expect.poll(async()=>page.locator('#orbit').getAttribute('data-center-variant')).not.toBe('ring');
 // Other layer schedules have not reached their later first change yet (deterministic plan below is not required).
 await page.evaluate(()=>(window as any).videoAdvance=32000);
 await expect.poll(async()=>page.locator('#orbit').getAttribute('data-mode')).not.toBe('comet');
 await expect.poll(async()=>page.locator('#sound-atmosphere').getAttribute('data-mode')).not.toBe('clouds');
 await expect(page.locator('[data-center-mode=ring]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-orbit-mode=comet]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-background-mode=clouds]')).toHaveAttribute('aria-pressed','true');
 const download=page.waitForEvent('download');await page.locator('#video-stop').click();await download;
 await expect(page.locator('#orbit')).toHaveAttribute('data-center-variant','ring');
 await expect(page.locator('#orbit')).toHaveAttribute('data-mode','comet');
 await expect(page.locator('#sound-atmosphere')).toHaveAttribute('data-mode','clouds');
});
test('explicitly disabled animation layers stay off throughout a randomized video',async({page})=>{
 await clock(page);await page.goto('/de/');
 for(const key of videoAnimationKeys)await chooseAnimation(page,'[data-'+key+'-mode=off]');
 await options(page);await page.locator('#video-record').click();await expect(page.locator('#video-status')).toHaveText(fileCopy.de.recording);
 await page.evaluate(()=>(window as any).videoAdvance=50000);await page.waitForTimeout(200);
 await expect(page.locator('#orbit')).toHaveAttribute('data-center-variant','off');await expect(page.locator('#orbit')).toHaveAttribute('data-mode','off');await expect(page.locator('#sound-atmosphere')).toBeHidden();
 const download=page.waitForEvent('download');await page.locator('#video-stop').click();await download;
});
for(const lang of ['de','en','es','fr'])test(`video animation switches are optional, localized and project-safe: ${lang}`,async({page})=>{
 await page.goto('/'+lang+'/');await page.locator('#files-open').click();await page.locator('.video-animation-options summary').click();
 for(const key of videoAnimationKeys)await expect(page.locator('#video-animation-'+key)).not.toBeChecked();
 await page.locator('#video-animation-center').check();await page.locator('#video-animation-background').check();
 const download=page.waitForEvent('download');await page.locator('#json-export').click();const raw=await readFile((await(await download).path())!,'utf8');
 expect(decodeSettings(raw)!.recording!.animations).toEqual({center:true,orbit:false,background:true});
 const bad=JSON.parse(raw);bad.recording.animations.center='yes';expect(decodeSettings(JSON.stringify(bad))).toBeNull();
 await page.reload();await page.locator('#files-open').click();await page.locator('#json-file').setInputFiles({name:'animation.json',mimeType:'application/json',buffer:Buffer.from(raw)});
 await page.locator('.video-animation-options summary').click();await expect(page.locator('#video-animation-center')).toBeChecked();await expect(page.locator('#video-animation-orbit')).not.toBeChecked();
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
});

test('automatic title follows the style, but changing styles never overwrites custom text',async({page})=>{
 await page.addInitScript(()=>{
  const fill=CanvasRenderingContext2D.prototype.fillText;(window as any).captionTexts=[];
  CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...rest){if(this.canvas.width===720&&this.canvas.height===1280)(window as any).captionTexts.push(text);return fill.call(this,text,x,y,...rest);};
 });
 await page.goto('/de/');await page.locator('#files-open').click();await page.locator('#video-info-enabled').check();
 await page.locator('#video-info-title').fill('Mein eigener Titel');await page.locator('#files-close').click();
 await page.locator('[data-style-preset=jazz]').click();await page.locator('#files-open').click();
 await expect(page.locator('#video-info-title')).toHaveValue('Mein eigener Titel');
 await expect(page.locator('#video-info-title')).toHaveAttribute('placeholder','Random Jazz & Blues Sound Session');
 test.skip(await page.locator('#video-record').isDisabled(),'No native MP4');
 await page.locator('#video-info-title').fill('');await page.locator('#video-format input[value=portrait]').check();
 await page.locator('#video-record').click();await expect(page.locator('#video-status')).toHaveText(fileCopy.de.recording);
 await expect.poll(async()=>page.evaluate(()=>(window as any).captionTexts.includes('Random Jazz & Blues Sound Session'))).toBe(true);
 await page.waitForTimeout(600);const download=page.waitForEvent('download');await page.locator('#video-stop').click();await download;
});
