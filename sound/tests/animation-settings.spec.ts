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
 await expect(page.locator('.pad-mode-controls button')).toHaveCount(5);
 const before=await exported(page);await page.locator('[data-pad-mode=rhythm]').click();await page.locator('#play').click();
 await page.locator('#animation-settings-open').click();
 await expect(page.locator('[data-animation-panel=home]')).toBeVisible();await expect(page.locator('[data-animation-panel=sound]')).toBeHidden();
 await expect(page.locator('[data-pad-mode=rhythm]')).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('.draw-wrap')).toBeHidden();await expect(page.locator('dialog[open]')).toHaveCount(0);
 await expect(page.locator('#animation-settings')).toHaveCSS('aspect-ratio','1 / 1');
 await page.locator('[data-animation-open=sound]').click();await expect(page.locator('button[data-visualization]:visible')).toHaveCount(5);
 await expect(page.locator('#orbit-settings-open')).toHaveCount(1);
 await page.locator('button[data-visualization=flower]').click();await expect(page.locator('#orbit')).toHaveAttribute('data-visualization','flower');
 await expect(page.locator('button[data-center-mode=ring]')).toBeDisabled();
 await page.locator('#orbit-settings-open').click();await expect(page.locator('[data-animation-panel=orbit]')).toBeVisible();
 await expect(page.locator('#orbit')).toHaveAttribute('data-visualization','orbit');
 await expect(page.locator('button[data-center-mode=ring]')).toBeEnabled();
 await page.locator('[data-animation-open=orbit-trail]').click();await page.locator('[data-orbit-mode=pulse]').click();await page.locator('#animation-settings-back').click();await page.locator('[data-animation-open=orbit-center]').click();await page.locator('[data-center-mode=bars]').click();
 await page.locator('#animation-settings-back').click();
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

test('inline settings have back navigation, allow other controls, block hidden tapping keys and return to the previous input',async({page})=>{
 await page.goto('/de/');await page.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.reject(new Error('fallback'));});
 await page.locator('[data-pad-mode=rhythm]').click();await page.locator('#focus').click();await page.locator('#animation-settings-open').click();
 await expect(page.locator('#animation-settings-open')).toHaveAttribute('aria-pressed','true');
 await page.locator('#play').click();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await page.keyboard.press('Numpad7');await page.keyboard.press('Digit1');
 await expect(page.locator('#drawing')).toHaveAttribute('data-selected-pad','');
 await page.locator('[data-animation-open=sound]').click();await expect(page.locator('#animation-settings-title')).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.locator('[data-animation-panel=home]')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('#animation-settings')).toBeHidden();
 await expect(page.locator('body')).toHaveClass(/focus-view/);await expect(page.locator('[data-pad-mode=rhythm]')).toHaveAttribute('aria-pressed','true');
 await page.locator('#animation-settings-open').click();await page.locator('[data-pad-mode=notes]').click();
 await expect(page.locator('#animation-settings')).toBeHidden();await expect(page.locator('#note-editor')).toBeVisible();
 await page.locator('#animation-settings-open').click();await page.locator('#animation-settings-close').click();
 await expect(page.locator('#note-editor')).toBeVisible();
 await page.locator('#animation-settings-open').click();await page.locator('#hide-focus-controls').click();await expect(page.locator('#animation-settings')).toBeHidden();
 await page.locator('#orbit').click();await expect(page.locator('#animation-settings')).toBeVisible();
});

test('opening the settings grid preserves an unfinished pad take and ignores hidden rhythm shortcuts',async({page})=>{
 await page.goto('/de/');await page.locator('[data-pad-mode=rhythm]').click();
 await page.keyboard.press('Numpad7');await expect(page.locator('#drawing')).toHaveAttribute('data-selected-pad','0');
 await page.keyboard.press('Digit1');await expect.poll(()=>page.locator('#drawing').getAttribute('data-rhythm-hits')).not.toBe('0');
 const pattern=await page.locator('#drawing').getAttribute('data-rhythm-pattern');
 await page.locator('#animation-settings-open').click();await page.keyboard.press('Digit8');await page.keyboard.press('Numpad3');
 await expect(page.locator('#drawing')).toHaveAttribute('data-rhythm-pattern',pattern!);
 await page.locator('#animation-settings-close').click();
 await expect(page.locator('#drawing')).toHaveAttribute('data-selected-pad','0');await expect(page.locator('#drawing')).toHaveAttribute('data-rhythm-pattern',pattern!);
 await expect(page.locator('#rhythm-cancel')).toBeEnabled();await page.locator('#rhythm-cancel').click();
 await expect(page.locator('#drawing')).toHaveAttribute('data-rhythm-hits','0');
});

for(const language of ['de','en','es','fr'] as const)test('localized responsive settings work in both themes: '+language,async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await page.goto('/'+language+'/');
 const c=animationSettingsCopy[language];await expect(page.locator('#animation-settings-open')).toHaveAccessibleName(c.title);
 await page.locator('#palette-dropdown summary').click();await page.locator('#theme-light').click();await page.locator('#preferences-close').click();
 await page.locator('#animation-settings-open').click();await expect(page.locator('#animation-settings-title')).toHaveText(c.title);
 await expect(page.locator('[data-animation-open=sound]')).toContainText(c.sound);
 await expect(page.locator('[data-animation-open=background]')).toContainText(c.background);
 await page.locator('[data-animation-open=sound]').click();await expect(page.locator('button[data-visualization=flower]')).toHaveText(visualizationCopy[language].flower);
 expect(await page.locator('#animation-settings').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.locator('#orbit-settings-open').click();await expect(page.locator('#animation-settings-title')).toHaveText(c.orbit);
 await expect(page.locator('[data-animation-open=orbit-center]')).toHaveText(animationCopy[language].center);
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
 await page.locator('#animation-settings-back').click();await page.locator('[data-animation-open=controls]').click();
 await page.locator('#volume').fill('0.35');await page.locator('#volume').dispatchEvent('input');await expect(page.locator('#volume-value')).toHaveText('50 %');
 await page.locator('#animation-settings-back').click();await page.locator('[data-animation-open=music]').click();await page.locator('[data-style-preset=focus]').click();
 await expect(page.locator('[data-style-preset=focus]')).toHaveAttribute('aria-pressed','true',{timeout:7000});
 await page.locator('#animation-settings-close').click();
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#sound-atmosphere')).toHaveAttribute('data-mode','stars');
 const pending=page.waitForEvent('download');await page.locator('#video-stop').click();const bytes=await readFile((await(await pending).path())!);
 expect(bytes.subarray(4,8).toString()).toBe('ftyp');expect(bytes.includes(Buffer.from('vide'))).toBe(true);expect(bytes.includes(Buffer.from('soun'))).toBe(true);
 expect(new Set(await page.evaluate(()=>(window as any).videoSources))).toEqual(new Set(['orbit','sound-atmosphere']));
 const saved=await exported(page);expect(saved.visualization).toBe('flower');expect(saved.background).toBe('stars');
});

test('fourth button opens music directly, switches roots and restores input and focus without changing playback',async({page})=>{
 await page.goto('/de/');
 await expect(page.locator('.pad-mode-controls > button')).toHaveCount(5);
 expect(await page.locator('.pad-mode-controls > button').evaluateAll(buttons=>buttons.map(button=>(button as HTMLElement).dataset.padMode||(button as HTMLElement).id)))
  .toEqual(['draw','rhythm','notes','music-settings-open','animation-settings-open']);
 await page.locator('[data-pad-mode=rhythm]').click();await page.locator('#play').click();
 await page.locator('#music-settings-open').click();
 await expect(page.locator('[data-animation-panel=music]')).toBeVisible();
 await expect(page.locator('#animation-settings-back')).toBeHidden();
 await expect(page.locator('#music-settings-open')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#animation-settings-open')).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('[data-pad-mode=rhythm]')).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-library-open=classical]').click();await expect(page.locator('#song-library-dialog')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('#song-library-dialog')).toBeHidden();
 await expect(page.locator('[data-animation-panel=music]')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('#animation-settings')).toBeHidden();
 await expect(page.locator('#music-settings-open')).toBeFocused();
 await expect(page.locator('[data-pad-mode=rhythm]')).toHaveAttribute('aria-pressed','true');
 await page.locator('#music-settings-open').click();await page.locator('#animation-settings-open').click();
 await expect(page.locator('[data-animation-panel=home]')).toBeVisible();
 await expect(page.locator('#music-settings-open')).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('#animation-settings-open')).toHaveAttribute('aria-pressed','true');
 await page.locator('#music-settings-open').click();await page.locator('#music-settings-open').click();
 await expect(page.locator('#animation-settings')).toBeHidden();
 await page.locator('#music-settings-open').click();await page.locator('[data-pad-mode=notes]').click();
 await expect(page.locator('#animation-settings')).toBeHidden();await expect(page.locator('#note-editor')).toBeVisible();
 await expect(page.locator('#music-settings-open')).toHaveAttribute('aria-pressed','false');
});

for(const language of ['de','en','es','fr'] as const)test('direct music button is localized and fits a 320px screen: '+language,async({page})=>{
 await page.setViewportSize({width:320,height:760});await page.goto('/'+language+'/');
 const button=page.locator('#music-settings-open'),c=animationSettingsCopy[language];
 await expect(button).toHaveAccessibleName(c.music);await expect(button).toHaveAttribute('title',c.music);
 await button.click();await expect(page.locator('#animation-settings-title')).toHaveText(c.music);
 expect(await page.locator('.pad-mode-controls').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#animation-settings-close').click();await expect(button).toBeFocused();
});
