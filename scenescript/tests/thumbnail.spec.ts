import {test,expect} from './helpers/editor-test';
import {openResources} from './helpers/resources';
import {readFile} from 'node:fs/promises';
import {demoProject} from '../src/lib/model';
const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=';
test('thumbnail plus imports, previews, downloads, replaces and removes independently',async({page})=>{
 await page.goto('/en/');await expect(page.locator('#thumbnail-content')).toContainText('No thumbnail yet');
 const picker=page.waitForEvent('filechooser');await page.locator('#import-thumbnail').click();await(await picker).setFiles({name:'cover.png',mimeType:'image/png',buffer:Buffer.from(pixel.split(',')[1],'base64')});await expect(page.locator('#thumbnail-content img')).toHaveAttribute('src',pixel);await expect(page.locator('#asset-list img')).toHaveCount(0);
 await page.locator('.thumbnail-preview').click();await expect(page.locator('#asset-preview-dialog')).toBeVisible();await expect(page.locator('#asset-preview-title')).toHaveText('cover.png');await page.locator('#close-asset-preview').click();
 const pending=page.waitForEvent('download');await page.locator('#save-thumbnail').click();const image=await pending;expect(image.suggestedFilename()).toBe('cover.png');expect(await readFile((await image.path())!)).toEqual(Buffer.from(pixel.split(',')[1],'base64'));
 await page.locator('#thumbnail-file').setInputFiles({name:'replacement.png',mimeType:'image/png',buffer:Buffer.from(pixel.split(',')[1],'base64')});await expect(page.locator('.thumbnail-name')).toHaveText('replacement.png');
 await page.locator('#delete-thumbnail').click();await page.locator('#cancel-delete').click();await expect(page.locator('#thumbnail-content img')).toHaveCount(1);await page.locator('#delete-thumbnail').click();await page.locator('#confirm-delete').click();await expect(page.locator('#thumbnail-content img')).toHaveCount(0);await expect(page.locator('#scene-list li')).toHaveCount(2);
});
test('AI thumbnail round trips in JSON and malformed replacement leaves it untouched',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.thumbnail={name:'AI cover.png',data:pixel};
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();await expect(page.locator('.thumbnail-name')).toHaveText('AI cover.png');await expect(page.locator('#stage img')).toHaveCount(0);
 const pending=page.waitForEvent('download');await page.locator('#save-project').click();const file=await pending;const json=JSON.parse(await readFile((await file.path())!,'utf8'));expect(json.thumbnail).toEqual(p.thumbnail);await page.locator('#project-file').setInputFiles((await file.path())!);await expect(page.locator('#thumbnail-content img')).toHaveAttribute('src',pixel);
 await page.locator('#thumbnail-file').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('not an image')});await expect(page.locator('#editor-status')).toContainText('Please check:');await expect(page.locator('.thumbnail-name')).toHaveText('AI cover.png');
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify({...p,thumbnail:{name:'bad',data:'https://example.com/a.png'}}));await page.locator('#import-json').click();await expect(page.locator('#json-status')).toContainText('thumbnail.data');await page.locator('#close-json').click();await expect(page.locator('.thumbnail-name')).toHaveText('AI cover.png');await page.locator('#new-project').click();await expect(page.locator('#thumbnail-content img')).toHaveCount(0);await expect(page.locator('#thumbnail-content')).toContainText('No thumbnail yet');
});

test('YouTube and TikTok cover downloads convert WebP and JPEG to real full-size PNG without changing stored images',async({page})=>{
 await page.goto('/en/');const images=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=320;c.height=180;const ctx=c.getContext('2d')!;ctx.fillStyle='#e28233';ctx.fillRect(0,0,320,180);return{webp:c.toDataURL('image/webp'),jpeg:c.toDataURL('image/jpeg')};});
 for(const [format,data]of Object.entries(images)){
  const p=demoProject();p.thumbnail={name:'YouTube '+format+'.'+(format==='jpeg'?'jpg':'webp'),data};
  p.publishing={youtube:{title:'',description:'',firstComment:'',tags:''},tiktok:{description:'',firstComment:'',cover:{name:'TikTok '+format+'.'+(format==='jpeg'?'jpg':'webp'),data}}};
  await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();
  for(const [prefix,name]of [['','YouTube'],['tiktok-','TikTok']]){
   const pending=page.waitForEvent('download');await page.locator('#save-'+prefix+'thumbnail').click();const download=await pending,bytes=await readFile((await download.path())!);
   expect(download.suggestedFilename()).toBe(name+' '+format+'.png');expect([...bytes.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);expect(bytes.readUInt32BE(16)).toBe(320);expect(bytes.readUInt32BE(20)).toBe(180);
   await expect(page.locator('#'+prefix+'thumbnail-content img')).toHaveAttribute('src',data);
  }
 }
});
test('ordinary image resource downloads retain their original format',async({page})=>{
 await page.goto('/en/');const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=8;c.height=8;return c.toDataURL('image/webp');}),p=demoProject();p.assets={regular:{name:'regular.webp',data}};
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();const pending=page.waitForEvent('download');await openResources(page);await page.locator('[data-save-asset="regular"]').click();const download=await pending;expect(download.suggestedFilename()).toBe('regular.webp');expect(await readFile((await download.path())!)).toEqual(Buffer.from(data.split(',')[1],'base64'));
});
