import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {animationSettingsCopy} from '../src/lib/animation-settings';
import {visualizationCopy} from '../src/lib/visualization';
import {animationCopy} from '../src/lib/sound-i18n';

async function exported(page:Page){
 await page.locator('#files-open').click();const pending=page.waitForEvent('download');await page.locator('#json-export').click();
 const data=JSON.parse(await readFile((await(await pending).path())!,'utf8'));await page.locator('#files-close').click();return data;
}

test('settings replace scattered controls, navigate live and leave music and input mode untouched',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/de/');
 await expect(page.locator('.orbit-wrap button[data-visualization]')).toHaveCount(0);await expect(page.locator('.animations-tile')).toHaveCount(0);
 await expect(page.locator('.pad-mode-controls button')).toHaveCount(4);
 const before=await exported(page);await page.locator('[data-pad-mode=rhythm]').click();await page.locator('#play').click();
 await page.locator('#animation-settings-open').click();
 await expect(page.locator('[data-animation-panel=home]')).toBeVisible();await expect(page.locator('[data-animation-panel=sound]')).toBeHidden();
 await expect(page.locator('[data-pad-mode=rhythm]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-animation-open=sound]').click();await expect(page.locator('button[data-visualization]:visible')).toHaveCount(5);
 await expect(page.locator('#orbit-settings-open')).toHaveCount(1);
 await page.locator('button[data-visualization=flower]').click();await expect(page.locator('#orbit')).toHaveAttribute('data-visualization','flower');
 await expect(page.locator('button[data-center-mode=ring]')).toBeDisabled();
 await page.locator('#orbit-settings-open').click();await expect(page.locator('[data-animation-panel=orbit]')).toBeVisible();
 await expect(page.locator('#orbit')).toHaveAttribute('data-visualization','orbit');
 await expect(page.locator('button[data-center-mode=ring]')).toBeEnabled();
 await page.locator('[data-orbit-mode=pulse]').click();await page.locator('[data-center-mode=bars]').click();
 await expect(page.locator('#orbit')).toHaveAttribute('data-mode','pulse');await expect(page.locator('#orbit')).toHaveAttribute('data-center-variant','bars');
 await page.locator('#animation-settings-back').click();await expect(page.locator('[data-animation-panel=sound]')).toBeVisible();
 await page.locator('#animation-settings-back').click();await expect(page.locator('#animation-current-sound')).toHaveText('Orbit');
 await page.locator('[data-animation-open=background]').click();await page.locator('[data-background-mode=waves]').click();
 await page.locator('#animation-settings-back').click();await expect(page.locator('#animation-current-background')).toHaveText('Klangwellen');
 await page.locator('#animation-settings-close').click();await expect(page.locator('#animation-settings-open')).toBeFocused();
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-pad-mode=rhythm]')).toHaveAttribute('aria-pressed','true');
 const after=await exported(page);
 for(const key of ['tracks','style','bpm','volume','transpose'])expect(after[key]).toEqual(before[key]);
 expect(after).toMatchObject({visualization:'orbit',orbit:'pulse',center:'bars',background:'waves'});expect(errors).toEqual([]);
});

test('Escape closes settings without leaving focus; keyboard and backdrop restore focus to the opener',async({page})=>{
 await page.goto('/de/');await page.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.reject(new Error('fallback'));});
 await page.locator('#focus').click();await page.locator('#animation-settings-open').click();
 await expect(page.locator('[data-animation-open=sound]')).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.locator('[data-animation-open=background]')).toBeFocused();
 await page.keyboard.press('Enter');await expect(page.locator('#animation-settings-title')).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.locator('#animation-settings-dialog')).toBeHidden();
 await expect(page.locator('body')).toHaveClass(/focus-view/);await expect(page.locator('#animation-settings-open')).toBeFocused();
 await page.locator('#animation-settings-open').click();
 const r=(await page.locator('#animation-settings-dialog').boundingBox())!;await page.mouse.click(r.x-4,r.y+8);
 await expect(page.locator('#animation-settings-dialog')).toBeHidden();await expect(page.locator('#animation-settings-open')).toBeFocused();
 await page.locator('#hide-focus-controls').click();await expect(page.locator('#animation-settings-open')).toBeHidden();
 await page.locator('#orbit').click();await expect(page.locator('#animation-settings-open')).toBeVisible();
 await page.locator('#animation-settings-open').click();await expect(page.locator('#animation-settings-dialog')).toBeVisible();
});

for(const language of ['de','en','es','fr'] as const)test('localized responsive settings work in both themes: '+language,async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await page.goto('/'+language+'/');
 const c=animationSettingsCopy[language];await expect(page.locator('#animation-settings-open')).toHaveAccessibleName(c.title);
 await page.locator('#palette-dropdown summary').click();await page.locator('#theme-light').click();await page.locator('#preferences-close').click();
 await page.locator('#animation-settings-open').click();await expect(page.locator('#animation-settings-title')).toHaveText(c.title);
 await expect(page.locator('[data-animation-open=sound]')).toContainText(c.sound);
 await expect(page.locator('[data-animation-open=background]')).toContainText(c.background);
 await page.locator('[data-animation-open=sound]').click();await expect(page.locator('button[data-visualization=flower]')).toHaveText(visualizationCopy[language].flower);
 expect(await page.locator('#animation-settings-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.locator('#orbit-settings-open').click();await expect(page.locator('#animation-settings-title')).toHaveText(c.orbit);
 await expect(page.locator('[data-animation-panel=orbit] h3').nth(1)).toHaveText(animationCopy[language].center);
 await page.locator('#animation-settings-close').click();expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
});

test('animation changes stay available during MP4 recording, without capturing the settings UI',async({page})=>{
 test.setTimeout(45000);
 await page.addInitScript(()=>{
  const draw=CanvasRenderingContext2D.prototype.drawImage;(window as any).videoSources=[];
  CanvasRenderingContext2D.prototype.drawImage=function(this:CanvasRenderingContext2D,source:CanvasImageSource,...args:number[]){
   if(this.canvas.id!=='orbit'&&source instanceof HTMLCanvasElement&&(source.id==='orbit'||source.id==='sound-atmosphere'))(window as any).videoSources.push(source.id);
   return (draw as any).call(this,source,...args);
  };
 });
 await page.goto('/de/');await page.locator('#files-open').click();test.skip(await page.locator('#video-record').isDisabled(),'No native MP4 encoder');
 await page.locator('#recording-fullscreen').check();await page.locator('#video-record').click();await expect(page.locator('body')).toHaveClass(/focus-view/);
 await page.locator('#animation-settings-open').click();await page.locator('[data-animation-open=sound]').click();
 await page.locator('button[data-visualization=flower]').click();await page.waitForTimeout(700);
 await expect(page.locator('#video-stop')).toBeAttached();await expect(page.locator('#orbit')).toHaveAttribute('data-visualization','flower');
 await page.locator('#animation-settings-back').click();await page.locator('[data-animation-open=background]').click();await page.locator('[data-background-mode=stars]').click();
 await page.locator('#animation-settings-close').click();
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#sound-atmosphere')).toHaveAttribute('data-mode','stars');
 const pending=page.waitForEvent('download');await page.locator('#video-stop').click();const bytes=await readFile((await(await pending).path())!);
 expect(bytes.subarray(4,8).toString()).toBe('ftyp');expect(bytes.includes(Buffer.from('vide'))).toBe(true);expect(bytes.includes(Buffer.from('soun'))).toBe(true);
 expect(new Set(await page.evaluate(()=>(window as any).videoSources))).toEqual(new Set(['orbit','sound-atmosphere']));
 const saved=await exported(page);expect(saved.visualization).toBe('flower');expect(saved.background).toBe('stars');
});
