import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {animationSettingsCopy} from '../src/lib/animation-settings';
import {styleCopy,styleIds} from '../src/lib/presets';
async function exported(page:Page){
 await page.locator('#files-open').click();const pending=page.waitForEvent('download');await page.locator('#json-export').click();
 const data=JSON.parse(await readFile((await(await pending).path())!,'utf8'));await page.locator('#files-close').click();return data;
}
test('musical controls move into settings without duplicates and preserve persistence',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/de/');
 await expect(page.locator('.controls-tile')).toHaveCount(1);await expect(page.locator('.music-tile')).toHaveCount(1);
 await expect(page.locator('#main>.controls-tile,#main>.music-tile')).toHaveCount(0);
 await page.locator('#animation-settings-open').click();await expect(page.locator('[data-animation-panel=home] .animation-home-tile')).toHaveCount(4);
 await page.locator('[data-animation-open=music]').click();await page.locator('[data-style-preset=classical]').click();
 await page.locator('#animation-settings-back').click();await expect(page.locator('#animation-current-music')).toHaveText(styleCopy.de.names[styleIds.indexOf('classical')]);
 await page.locator('[data-animation-open=controls]').click();
 for(const [id,value] of [['tempo','120'],['volume','0.42'],['transpose','5'],['note-effect','125']]){
  await page.locator('#'+id).fill(value);await page.locator('#'+id).dispatchEvent('input');
 }
 await expect(page.locator('#tempo-value')).toHaveText('120 BPM');await expect(page.locator('#volume-value')).toHaveText('60 %');
 await expect(page.locator('#note-effect-value')).toHaveText('125 %');
 const saved=await exported(page);expect(saved).toMatchObject({style:'classical',bpm:120,volume:.42,transpose:5,noteEffect:1.25});
 await page.locator('#animation-settings-close').click();await expect(page.locator('.controls-tile')).toBeHidden();await expect(page.locator('.music-tile')).toBeHidden();
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();await page.waitForTimeout(350);
 await page.reload();await page.locator('#animation-settings-open').click();await page.locator('[data-animation-open=controls]').click();
 await expect(page.locator('#tempo')).toHaveValue('120');await expect(page.locator('#volume')).toHaveValue('0.42');await expect(page.locator('#transpose')).toHaveValue('5');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');expect(errors).toEqual([]);
});
for(const lang of ['de','en','es','fr'] as const)test('localized music settings fit narrow focus view and both themes: '+lang,async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/'+lang+'/');
 await page.locator('#focus').click();await page.locator('#animation-settings-open').click();
 await expect(page.locator('[data-animation-open=controls]')).toHaveAccessibleName(animationSettingsCopy[lang].controls);
 await page.locator('[data-animation-open=controls]').click();await expect(page.locator('#tempo')).toBeVisible();await expect(page.locator('#volume')).toBeVisible();
 await page.locator('#volume').fill('0.56');await page.locator('#volume').dispatchEvent('input');await expect(page.locator('#volume-value')).toHaveText('80 %');
 await page.keyboard.press('Escape');await page.locator('[data-animation-open=music]').click();
 await expect(page.locator('[data-style-preset]')).toHaveCount(styleIds.length);await page.locator('[data-style-preset=sport]').click();await expect(page.locator('[data-style-preset=sport]')).toHaveAttribute('aria-pressed','true');
 const size=await page.locator('#animation-settings').boundingBox();expect(Math.abs(size!.height-size!.width)).toBeLessThan(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
 await page.locator('#palette-dropdown summary').click();await page.locator('#theme-light').click();await page.locator('#preferences-close').click();
 await expect(page.locator('[data-style-preset=sport]')).toBeVisible();await page.locator('#animation-settings-back').click();await page.locator('[data-animation-open=controls]').click();
 await expect(page.locator('#transpose')).toBeVisible();await page.locator('#animation-settings-close').click();await expect(page.locator('#drawing')).toBeVisible();
});
