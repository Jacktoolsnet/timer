import {test,expect} from '@playwright/test';
import {demoProject} from '../src/lib/model';
const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=';
test('editor, image embedding and downloaded project round trip',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/de/');
 await expect(page.locator('#scene-list li')).toHaveCount(2);
 await page.locator('#project-title').fill('Mein Film');await page.locator('#project-format').selectOption('portrait');
 await page.locator('[data-add=text]').click();await page.locator('#element-form [name=text]').fill('Hallo Welt');
 await page.locator('#image-file').setInputFiles({name:'pixel.png',mimeType:'image/png',buffer:Buffer.from(pixel.split(',')[1],'base64')});
 await expect(page.locator('#asset-list img')).toHaveCount(1);
 await page.locator('#scene-form [name=backgroundAsset]').selectOption({label:'pixel.png'});
 const downloadEvent=page.waitForEvent('download');await page.locator('#save-project').click();const download=await downloadEvent;expect(download.suggestedFilename()).toBe('Mein-Film.scenescript.json');
 const path=await download.path();expect(path).toBeTruthy();await page.locator('#project-file').setInputFiles(path!);
 await expect(page.locator('#project-title')).toHaveValue('Mein Film');await expect(page.locator('#asset-list img')).toHaveCount(1);
 await page.locator('#open-json').click();const json=JSON.parse(await page.locator('#json-input').inputValue());expect(json.assets[Object.keys(json.assets)[0]].data).toBe(pixel);expect(json.scenes[0].elements.at(-1).text).toBe('Hallo Welt');await page.locator('#close-json').click();expect(errors).toEqual([]);
});
test('invalid import leaves existing project untouched; plain text never executes',async({page})=>{
 await page.goto('/en/');await page.locator('#open-json').click();await page.locator('#json-input').fill('{"version":"wrong"}');await page.locator('#import-json').click();await expect(page.locator('#json-status')).toContainText('version');await page.locator('#close-json').click();await expect(page.locator('#scene-list li')).toHaveCount(2);
 const p=demoProject();p.scenes[0].elements[0].text='<img src=x onerror=alert(1)>';
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();await expect(page.locator('#json-dialog')).not.toBeVisible();await expect(page.locator('#stage')).toContainText('<img src=x onerror=alert(1)>');await expect(page.locator('#stage img')).toHaveCount(0);
});
test('appearance independent from project; consent and deletion',async({page})=>{
 await page.goto('/de/');await page.locator('#palette-dropdown summary').click();await page.locator('#theme').click();await page.locator('[name=colorScheme][value=blue]').check();await page.locator('#font-size').fill('3');await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();
 await page.locator('#project-title').fill('Local draft');await page.waitForTimeout(650);
 page.on('dialog',d=>d.accept());await page.reload();await expect(page.locator('#project-title')).toHaveValue('Local draft');await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await expect(page.locator('html')).toHaveAttribute('data-font-size','3');
 await expect(page.locator('#stage')).toHaveCSS('background-color','rgb(38, 59, 66)');await page.locator('#privacy-open').click();await page.locator('#clear-storage').click();expect(await page.evaluate(()=>localStorage.getItem('jacktools.scenescript.project.v1'))).toBeNull();
});
test('playback, focus countdown, pause and exit',async({page})=>{
 await page.goto('/en/');await page.locator('#play').click();await page.waitForTimeout(150);await page.locator('#pause').click();expect(Number(await page.locator('#timeline').inputValue())).toBeGreaterThan(0);
 await page.locator('#focus').click();await expect(page.locator('body')).toHaveClass(/recording/);await expect(page.locator('#countdown')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('body')).not.toHaveClass(/recording/);
 await page.locator('#focus').click();await expect(page.locator('#countdown')).toBeVisible();await expect(page.locator('#countdown')).not.toBeVisible({timeout:6000});await page.keyboard.press('Space');const value=await page.locator('#timeline').inputValue();await page.waitForTimeout(100);expect(await page.locator('#timeline').inputValue()).toBe(value);await page.keyboard.press('Escape');await expect(page.locator('body')).not.toHaveClass(/recording/);
});
test('language routes, AI instructions, schema and mobile layout',async({page,request})=>{
 for(const lang of ['de','en','es','fr']){await page.goto('/'+lang+'/');await expect(page.locator('html')).toHaveAttribute('lang',lang);await expect(page.locator('#scene-list li')).toHaveCount(2);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.goto('/de/ai/');await expect(page.locator('#ai-guide')).toContainText('Never use remote URLs');expect((await request.get('/ai.txt')).ok()).toBeTruthy();expect((await (await request.get('/schema.json')).json()).properties.version.const).toBe('1.0');
});
test('blocked storage does not prevent editing',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('blocked');};Storage.prototype.setItem=()=>{throw Error('blocked');};});await page.goto('/en/');await page.locator('[data-add=shape]').click();await expect(page.locator('#element-list li')).toHaveCount(2);
});
