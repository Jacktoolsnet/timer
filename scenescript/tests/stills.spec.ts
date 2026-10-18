import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {demoProject} from '../src/lib/model';
import {contactLayout} from '../src/lib/still-plan';
function fixture(){const p=demoProject();p.title='Visual review';for(const [i,s] of p.scenes.entries()){s.duration=4;s.transition='none';s.elements=[];s.background=i?'#00ff00':'#ff0000';}return p;}
async function load(page:Page,p=fixture()){
 await page.goto('/en/');await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();await expect(page.locator('#json-dialog')).not.toBeVisible();
}
async function pixels(page:Page,data:Buffer,points:number[][]){return page.evaluate(async({base64,points})=>{const image=new Image();image.src='data:image/png;base64,'+base64;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const c=canvas.getContext('2d')!;c.drawImage(image,0,0);const result={width:canvas.width,height:canvas.height,pixels:points.map(([x,y])=>Array.from(c.getImageData(x,y,1,1).data).slice(0,3))};canvas.width=canvas.height=0;return result;},{base64:data.toString('base64'),points});}
function unzip(bytes:Buffer){let pos=0;const files=new Map<string,Buffer>();while(bytes.readUInt32LE(pos)===0x04034b50){const size=bytes.readUInt32LE(pos+18),nameLength=bytes.readUInt16LE(pos+26),extra=bytes.readUInt16LE(pos+28),name=bytes.subarray(pos+30,pos+30+nameLength).toString('utf8'),start=pos+30+nameLength+extra;files.set(name,bytes.subarray(start,start+size));pos=start+size;}return files;}

test('full-resolution exact-time PNG uses export clock and does not change project or playhead',async({page})=>{
 await load(page);await page.locator('#timeline').fill('1.5');await page.locator('#open-stills').click();await expect(page.locator('#still-time')).toHaveValue('1.5');
 await page.locator('#still-time').fill('5.25');const pending=page.waitForEvent('download');await page.locator('#download-still').click();const file=await pending;expect(file.suggestedFilename()).toBe('Visual-review-frame-5.250s.png');
 const image=await pixels(page,await readFile((await file.path())!),[[960,540]]);expect(image).toEqual({width:1920,height:1080,pixels:[[0,255,0]]});
 await expect(page.locator('#still-status')).toHaveText('Images prepared for download.');expect(await page.locator('[data-export-renderer]').count()).toBe(0);
 await page.locator('#still-current').click();await expect(page.locator('#still-time')).toHaveValue('1.5');await page.locator('#close-stills').click();await expect(page.locator('#timeline')).toHaveValue('1.5');
 const saved=page.waitForEvent('download');await page.locator('#save-project').click();expect(JSON.parse(await readFile((await (await saved).path())!,'utf8'))).toEqual(fixture());
});

test('contact sheet contains selected scene samples, captions and actual scene pixels',async({page})=>{
 const p=fixture();await load(page,p);await page.locator('#open-stills').click();const rows=page.locator('.still-scene-row');await rows.nth(0).locator('[data-still-times]').fill('0; 1; 2,5');await rows.nth(1).locator('[data-still-times]').fill('0; 1; 3');
 const pending=page.waitForEvent('download');await page.locator('#download-contact').click();const file=await pending;expect(file.suggestedFilename()).toBe('Visual-review-contact.png');
 const l=contactLayout(p,6),secondY=l.header+l.frameHeight+l.caption+l.gap;
 const result=await pixels(page,await readFile((await file.path())!),[[l.gap+20,l.header+20],[l.gap+20,secondY+20],[2,2],[l.gap+20,l.header+l.frameHeight+10]]);
 expect(result.width).toBe(l.width);expect(result.height).toBe(l.height);expect(result.pixels).toEqual([[255,0,0],[0,255,0],[244,244,244],[244,244,244]]);
 await expect(page.locator('#still-status')).toHaveText('Images prepared for download.');
 
});

test('multiple contact pages arrive in one ZIP with exact frame-to-scene mapping',async({page})=>{
 await load(page);await page.locator('#open-stills').click();const rows=page.locator('.still-scene-row');await rows.nth(0).locator('[data-still-times]').fill('0; 1; 2; 3');await rows.nth(1).locator('[data-still-times]').fill('0; 1; 2');
 const pending=page.waitForEvent('download');await page.locator('#download-contact').click();const file=await pending;expect(file.suggestedFilename()).toBe('Visual-review-contact.zip');const files=unzip(await readFile((await file.path())!));expect([...files.keys()]).toEqual(['contact-001.png','contact-002.png','frames.json']);
 const manifest=JSON.parse(files.get('frames.json')!.toString());expect(manifest.frames).toHaveLength(7);expect(manifest.frames[6]).toMatchObject({sceneIndex:1,sceneId:'outro',localTime:2,time:6,page:2,cell:1});
 const image=await pixels(page,files.get('contact-002.png')!,[[30,90]]);expect(image.pixels[0]).toEqual([0,255,0]);
});

test('invalid times and empty selection stay in the dialog without changing the project',async({page})=>{
 await load(page);await page.locator('#open-stills').click();await page.locator('#still-time').fill('99');await page.locator('#download-still').click();await expect(page.locator('#still-status')).toContainText('Choose a project time');
 await page.locator('#still-none').click();await page.locator('#download-contact').click();await expect(page.locator('#still-status')).toContainText('choose 1–600 frames');
 await page.locator('#still-all').click();await page.locator('[data-still-times]').first().fill('4');await page.locator('#download-contact').click();await expect(page.locator('#still-status')).toContainText('0 ≤ seconds < 4');await expect(page.locator('#download-contact')).toBeEnabled();expect(await page.locator('[data-export-renderer]').count()).toBe(0);
});

test('cancel prevents a download and restores controls without leaving a renderer',async({page})=>{
 await load(page);await page.route('**/src/scripts/still-export.ts',async route=>{await new Promise(r=>setTimeout(r,500));await route.continue();});
 let downloads=0;page.on('download',()=>downloads++);await page.locator('#open-stills').click();await page.locator('#download-still').click();await page.locator('#close-stills').click();await expect(page.locator('#still-status')).toHaveText('Export cancelled');await expect(page.locator('#download-still')).toBeEnabled();expect(downloads).toBe(0);expect(await page.locator('[data-export-renderer]').count()).toBe(0);
});

test('PNG and shared export renderer agree for bubbles, camera, cropping and screen-fixed content',async({page})=>{
 await page.goto('/en/');const result=await page.evaluate(async()=>{
  const {newElement}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string);const {aiCameraExample}=await import(/* @vite-ignore */ '/src/lib/guide.ts' as string);const {parseProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string);
  const p=parseProject(JSON.stringify(aiCameraExample)),s=p.scenes[0];s.transition='none';const speaker=s.elements[0];speaker.anchors={body:{x:50,y:50}};const b=newElement('bubble','balloon');Object.assign(b,{text:'Hello!',space:'screen',x:50,y:5,width:35,height:20,animation:'none'});b.bubble!.tail={...b.bubble!.tail,mode:'anchor',element:speaker.id,anchor:'body'};s.elements.push(b);
  const asset=document.createElement('canvas');asset.width=100;asset.height=100;const c=asset.getContext('2d')!;c.fillStyle='#0000ff';c.fillRect(0,0,100,100);p.assets.crop={name:'crop.png',data:asset.toDataURL()};const cropped=newElement('image','cropped');Object.assign(cropped,{asset:'crop',x:4,y:70,width:20,height:20,animation:'none',crop:{x:10,y:10,width:80,height:80}});s.elements.push(cropped);
  const {exportStill}=await import(/* @vite-ignore */ '/src/scripts/still-export.ts' as string);const {ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string);
  const signal=new AbortController().signal,blob=await exportStill(p,4,signal),image=await createImageBitmap(blob),canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0);image.close();const actual=ctx.getImageData(0,0,1920,1080).data;
  const media=new ExportMedia(p,signal),renderer=new ExportRenderer(p,media);try{const expected=await renderer.frame(4,1920,1080),pixels=expected.getContext('2d')!.getImageData(0,0,1920,1080).data;let different=0,white=0;for(let i=0;i<actual.length;i++){if(actual[i]!==pixels[i])different++;if(i%4===0&&actual[i]===255)white++;}return {different,white};}finally{renderer.dispose();media.dispose();canvas.width=canvas.height=0;}
 });expect(result.different).toBe(0);expect(result.white).toBeGreaterThan(100);
});

test('bundled fonts are loaded and embedded into the shared renderer SVG',async({page})=>{
 await page.goto('/en/');const result=await page.evaluate(async()=>{
  const {demoProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{exportStill}=await import(/* @vite-ignore */ '/src/scripts/still-export.ts' as string);
  const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].elements[0].font='Allura';p.scenes[0].elements[0].animation='none';p.scenes[0].transition='none';
  const descriptor=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src')!,uris:string[]=[];
  Object.defineProperty(HTMLImageElement.prototype,'src',{...descriptor,set(value:string){if(value.startsWith('data:image/svg+xml'))uris.push(decodeURIComponent(value.slice(value.indexOf(',')+1)));descriptor.set!.call(this,value);}});
  try{const blob=await exportStill(p,1,new AbortController().signal);return {size:blob.size,embedded:uris.some(svg=>svg.includes('@font-face')&&svg.includes('base64,')&&svg.includes('Allura')),loaded:document.fonts.check('90px Allura')};}
  finally{Object.defineProperty(HTMLImageElement.prototype,'src',descriptor);}
 });expect(result.size).toBeGreaterThan(1000);expect(result.embedded).toBe(true);expect(result.loaded).toBe(true);
});

test('image export controls are translated and fit the desktop and tablet dialog',async({page})=>{
 for(const [lang,title] of [['de','Bilder & Kontaktbogen'],['en','Images & contact sheet'],['es','Imágenes y hoja de contacto'],['fr','Images et planche-contact']]){
  await page.goto(`/${lang}/`);await page.locator('#open-stills').click();await expect(page.locator('#stills-title')).toHaveText(title);
  expect(await page.locator('#stills-dialog').evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
  const close=page.locator('#close-stills');expect(await close.evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);await close.click();
 }
});
