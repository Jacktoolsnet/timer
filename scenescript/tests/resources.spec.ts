import {test,expect} from './helpers/editor-test';
import {readFile} from 'node:fs/promises';
import {demoProject} from '../src/lib/model';
import {wav} from './audio-fixture';
import {openResources,closeResources} from './helpers/resources';
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64');

test('thumbnail stays in the project, resource launchers follow it and both overlays return focus',async({page})=>{
 await page.goto('/de/');await expect(page.locator('#project-content #thumbnail-heading')).toBeVisible();await expect(page.locator('#project-content .media-gallery-tile')).toHaveCount(1);await expect(page.locator('#project-content #asset-list')).toHaveCount(0);await expect(page.locator('#resources-dialog')).not.toBeVisible();
 expect(await page.locator('.resource-launchers').evaluate(n=>Boolean(n.previousElementSibling?.querySelector('#thumbnail-heading')))).toBe(true);
 await expect(page.locator('#open-resources')).toHaveText('Ressourcen');await expect(page.locator('#open-stage3d')).toHaveText('3D-Ressourcen');
 await page.locator('#open-resources').focus();await page.keyboard.press('Enter');await expect(page.locator('#resources-dialog')).toBeVisible();await expect(page.locator('#resources-dialog .media-gallery-tile')).toHaveCount(3);await page.keyboard.press('Escape');await expect(page.locator('#open-resources')).toBeFocused();
 await page.locator('#open-stage3d').click();await expect(page.locator('#stage3d-dialog')).toBeVisible();await page.locator('#stage3d-close').click();await expect(page.locator('#open-stage3d')).toBeFocused();
});

test('media import, preview, rename, download and deletion work inside nested overlays',async({page})=>{
 await page.goto('/en/');await openResources(page);const picker=page.waitForEvent('filechooser');await page.locator('#gallery-import-image').click();await(await picker).setFiles({name:'robot.png',mimeType:'image/png',buffer:pixel});await expect(page.locator('#resources-dialog #asset-list img')).toHaveCount(1);
 await page.locator('[data-preview-asset]').click();await expect(page.locator('#asset-preview-dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#resources-dialog')).toBeVisible();await expect(page.locator('[data-preview-asset]')).toBeFocused();
 await page.locator('[data-rename-asset]').click();await page.locator('#rename-input').fill('Robot cover');await page.locator('#apply-rename').click();await expect(page.locator('#asset-list .asset-row>span')).toHaveText('Robot cover');
 const pending=page.waitForEvent('download');await page.locator('[data-save-asset]').click();const file=await pending;expect(file.suggestedFilename()).toBe('Robot cover.png');expect(await readFile((await file.path())!)).toEqual(pixel);
 await page.locator('[data-delete-asset]').click();await page.locator('#cancel-delete').click();await expect(page.locator('#asset-list img')).toHaveCount(1);await page.locator('[data-delete-asset]').click();await page.locator('#confirm-delete').click();await expect(page.locator('#asset-list img')).toHaveCount(0);
 await closeResources(page);await page.locator('#undo-project').click();await openResources(page);await expect(page.locator('#asset-list .asset-row>span')).toHaveText('Robot cover');await closeResources(page);await expect(page.locator('#open-resources')).toBeFocused();
});

test('resource import errors are readable inside the overlay and closing pauses audio previews',async({page})=>{
 await page.goto('/en/');await page.locator('#play').click();await expect(page.locator('#play')).toHaveAttribute('title','Pause');await openResources(page);await expect(page.locator('#play')).toHaveAttribute('title','Play from here');
 await page.locator('#image-file').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('broken')});await expect(page.locator('#resources-status')).toBeVisible();await expect(page.locator('#resources-status')).toContainText('Please check:');expect(await page.locator('#resources-status').evaluate(n=>getComputedStyle(n).userSelect)).toBe('text');
 const picker=page.waitForEvent('filechooser');await page.locator('#gallery-import-audio').click();await(await picker).setFiles({name:'voice.wav',mimeType:'audio/wav',buffer:wav(3)});await expect(page.locator('#audio-list audio')).toHaveCount(1);
 await page.locator('#audio-list audio').evaluate(async(n:HTMLAudioElement)=>{await n.play();});await expect.poll(()=>page.locator('#audio-list audio').evaluate((n:HTMLAudioElement)=>n.paused)).toBe(false);
 await page.keyboard.press('Escape');await expect(page.locator('#resources-dialog')).not.toBeVisible();await expect.poll(()=>page.locator('#audio-list audio').evaluate((n:HTMLAudioElement)=>n.paused)).toBe(true);
});

test('translated galleries fit the viewport and do not widen the page with many assets',async({page})=>{
 const p=demoProject();for(let i=0;i<12;i++)p.assets['image'+i]={name:'Photo '+i+'.png',data:'data:image/png;base64,'+pixel.toString('base64')};
 for(const [lang,label] of [['de','Ressourcen'],['en','Resources'],['es','Recursos'],['fr','Ressources']]){
  await page.goto(`/${lang}/`);await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();await openResources(page);await expect(page.locator('#resources-title')).toHaveText(label);
  const dimensions=await page.locator('#resources-dialog').evaluate(n=>({width:n.clientWidth,scroll:n.scrollWidth,bottom:n.getBoundingClientRect().bottom}));expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);expect(dimensions.bottom).toBeLessThanOrEqual(page.viewportSize()!.height);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const close=page.locator('#close-resources');await expect(close).toBeVisible();await expect(close).toHaveText('');await expect(close.locator('svg')).toHaveCount(1);expect(await close.getAttribute('aria-label')).toBeTruthy();expect(await close.getAttribute('title')).toBe(await close.getAttribute('aria-label'));await closeResources(page);await expect(page.locator('#asset-list img')).toHaveCount(12);
 }
});
