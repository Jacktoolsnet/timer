import {openResources,closeResources} from './helpers/resources';
import {test,expect} from './helpers/editor-test';
import {readFile,writeFile} from 'node:fs/promises';
import {demoProject} from '../src/lib/model';

test('60 MiB project loads, remains editable and downloads with all media',async({page},info)=>{
 test.setTimeout(90000);
 const project=demoProject();project.title='Large JSON regression';
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64');
 // Trailing bytes keep the image tiny to decode but reproduce large embedded payloads.
 for(let i=0;i<6;i++){
  const image=Buffer.alloc((i===5?5:8)*1024*1024);png.copy(image);
  project.assets['image'+i]={name:`image${i}.png`,data:'data:image/png;base64,'+image.toString('base64')};
 }
 const path=info.outputPath('large.scenescript.json');await writeFile(path,JSON.stringify(project));
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/en/');
 await page.locator('#project-file').setInputFiles(path);
 await expect(page.locator('#project-title')).toHaveValue(project.title,{timeout:30000});
 await expect(page.locator('#json-dialog')).not.toBeVisible();
 await expect(page.locator('#asset-list img')).toHaveCount(6);
 await openResources(page);await expect(page.locator('#video-size')).toContainText('60.0 MiB');await closeResources(page);
 await page.locator('#element-list li button').first().click();
 await page.locator('#element-form [name=x]').fill('15');
 await expect(page.locator('#element-form [name=x]')).toHaveValue('15');
 const downloadPromise=page.waitForEvent('download');await page.locator('#save-project').click();
 const download=await downloadPromise;expect(await download.failure()).toBeNull();
 const saved=JSON.parse(await readFile((await download.path())!,'utf8'));
 expect(saved.scenes[0].elements[0].x).toBe(15);expect(Object.keys(saved.assets)).toHaveLength(6);
 for(const [id,asset] of Object.entries(project.assets))expect(saved.assets[id].data===asset.data).toBe(true);
 expect(errors).toEqual([]);
});
