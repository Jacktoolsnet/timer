import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
async function exportedJSON(page:import('@playwright/test').Page){const pending=page.waitForEvent('download');await page.locator('#save-project').click();const download=await pending;return readFile((await download.path())!,'utf8');}
import {demoProject} from '../src/lib/model';
const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=';
test('editor, image embedding and downloaded project round trip',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/de/');
 await expect(page.locator('#scene-list li')).toHaveCount(2);
 await page.locator('#project-title').fill('Mein Film');await page.locator('#project-format').selectOption('portrait');
 await page.locator('#element-add-menu summary').click();await page.locator('[data-add=text]').click();await page.locator('#element-form [name=text]').fill('Hallo Welt');
 await page.locator('#image-file').setInputFiles({name:'pixel.png',mimeType:'image/png',buffer:Buffer.from(pixel.split(',')[1],'base64')});
 await expect(page.locator('#asset-list img')).toHaveCount(1);
 await page.locator('#scene-form [name=backgroundAsset]').selectOption({label:'pixel.png'});
 const downloadEvent=page.waitForEvent('download');await page.locator('#save-project').click();const download=await downloadEvent;expect(download.suggestedFilename()).toBe('Mein-Film.scenescript.json');
 const path=await download.path();expect(path).toBeTruthy();await page.locator('#project-file').setInputFiles(path!);
 await expect(page.locator('#project-title')).toHaveValue('Mein Film');await expect(page.locator('#asset-list img')).toHaveCount(1);
 const json=JSON.parse(await exportedJSON(page));expect(json.assets[Object.keys(json.assets)[0]].data).toBe(pixel);expect(json.scenes[0].elements.at(-1).text).toBe('Hallo Welt');expect(errors).toEqual([]);
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
 await page.goto('/en/');await page.locator('#play').click();await page.waitForTimeout(150);await page.locator('#play').click();expect(Number(await page.locator('#timeline').inputValue())).toBeGreaterThan(0);
 await page.locator('#focus').click();await expect(page.locator('body')).toHaveClass(/recording/);await page.locator('#start-recording').click();await expect(page.locator('#countdown')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('body')).not.toHaveClass(/recording/);
 await page.locator('#focus').click();await page.locator('#start-recording').click();await expect(page.locator('#countdown')).toBeVisible();await expect(page.locator('#countdown')).not.toBeVisible({timeout:6000});await page.keyboard.press('Space');const value=await page.locator('#timeline').inputValue();await page.waitForTimeout(100);expect(await page.locator('#timeline').inputValue()).toBe(value);await page.keyboard.press('Escape');await expect(page.locator('body')).not.toHaveClass(/recording/);
});
test('language routes, AI instructions, schema and mobile layout',async({page,request})=>{
 for(const lang of ['de','en','es','fr']){await page.goto('/'+lang+'/');await expect(page.locator('html')).toHaveAttribute('lang',lang);await expect(page.locator('#scene-list li')).toHaveCount(2);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.goto('/de/ai/');await expect(page.locator('#ai-guide')).toContainText('Safe SVG assets and deterministic animation');await expect(page.locator('#ai-guide')).toContainText('No scripts, on* handlers');expect((await request.get('/ai.txt')).ok()).toBeTruthy();expect((await (await request.get('/schema.json')).json()).properties.version.const).toBe('1.0');
});
test('blocked storage does not prevent editing',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('blocked');};Storage.prototype.setItem=()=>{throw Error('blocked');};});await page.goto('/en/');await page.locator('#element-add-menu summary').click();await page.locator('[data-add=shape]').click();await expect(page.locator('#element-list li')).toHaveCount(2);
});

async function mockWakeLock(page:import('@playwright/test').Page){
 await page.addInitScript(()=>{
  const state={requests:0,releases:0};
  (window as unknown as {wakeTest:typeof state}).wakeTest=state;
  Object.defineProperty(navigator,'wakeLock',{configurable:true,value:{request:async()=>{
   state.requests++;
   const sentinel=new EventTarget() as EventTarget & {release:()=>Promise<void>};
   sentinel.release=async()=>{state.releases++;sentinel.dispatchEvent(new Event('release'));};
   return sentinel;
  }}});
 });
}
test('wake lock follows playback, pause and completion',async({page})=>{
 await mockWakeLock(page);await page.goto('/en/');
 const state=()=>page.evaluate(()=>(window as unknown as {wakeTest:{requests:number;releases:number}}).wakeTest);
 await page.locator('#play').click();await expect.poll(async()=>(await state()).requests).toBe(1);
 await expect(page.locator('#wake-status')).toBeEmpty();
 await page.locator('#play').click();await expect.poll(async()=>(await state()).releases).toBe(1);
 await page.locator('#play').click();await expect.poll(async()=>(await state()).requests).toBe(2);
 await page.locator('#play').click();await page.locator('#timeline').fill('9.9');await page.locator('#play').click();
 await expect(page.locator('#play')).toHaveAttribute('title','Play from here');await expect.poll(async()=>(await state()).requests).toBe(3);await expect.poll(async()=>(await state()).releases).toBe(3);
});
test('recording hides pointer before playback and releases countdown wake lock on exit',async({page})=>{
 await mockWakeLock(page);await page.goto('/en/');await page.locator('#focus').click();
 await page.locator('#start-recording').click();await expect(page.locator('#countdown')).toBeVisible();await expect(page.locator('#stage-frame')).toHaveCSS('cursor','none');await expect(page.locator('#exit-focus')).toHaveCSS('cursor','none');
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {wakeTest:{requests:number}}).wakeTest.requests)).toBe(1);
 await page.keyboard.press('Escape');await expect(page.locator('#stage-frame')).not.toHaveCSS('cursor','none');
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {wakeTest:{releases:number}}).wakeTest.releases)).toBe(1);
});
test('denied wake lock shows fallback and does not stop playback',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'wakeLock',{configurable:true,value:{request:async()=>{throw new Error('denied');}}}));
 await page.goto('/en/');await page.locator('#play').click();await expect(page.locator('#wake-status')).toContainText('unavailable or was denied');await expect(page.locator('#play')).toHaveAttribute('title','Pause');await page.locator('#play').click();
});

test('custom project and unsaved edits survive recording exit',async({page})=>{
 const custom=demoProject();custom.title='Imported four-scene project';
 custom.scenes.push({...structuredClone(custom.scenes[0]),id:'third',name:'Third imported scene',elements:[{...structuredClone(custom.scenes[0].elements[0]),id:'third-text',text:'Custom third scene'}]},{...structuredClone(custom.scenes[1]),id:'fourth',name:'Fourth imported scene',elements:[{...structuredClone(custom.scenes[1].elements[0]),id:'fourth-text',text:'Custom fourth scene'}]});
 custom.assets.photo={name:'photo.png',data:pixel};custom.scenes.forEach(s=>s.backgroundAsset='photo');
 await page.goto('/en/');await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(custom));await page.locator('#import-json').click();await expect(page.locator('#json-dialog')).not.toBeVisible();
 await page.locator('#project-title').fill('Unsaved imported project');
 await page.locator('#scene-list button').nth(2).click();await page.locator('#element-list button').click();await page.locator('#element-form [name=text]').fill('Unsaved third-scene text');
 const beforeTime=await page.locator('#timeline').inputValue();
 const before=await exportedJSON(page);await page.locator('#project-title').fill('Unsaved imported project');
 for(const mode of ['countdown-escape','playback-button','native-fullscreen-exit']){
  await page.locator('#focus').click();await page.locator('#start-recording').click();await expect(page.locator('#countdown')).toBeVisible();
  if(mode==='countdown-escape')await page.keyboard.press('Escape');
  else {
   await expect(page.locator('#countdown')).not.toBeVisible({timeout:6000});
   await expect.poll(async()=>Number(await page.locator('#timeline').inputValue())).toBeGreaterThan(0);
   if(mode==='native-fullscreen-exit'&&await page.evaluate(()=>Boolean(document.fullscreenElement)))await page.evaluate(()=>document.exitFullscreen());
   else await page.locator('#exit-focus').click({force:true});
  }
  await expect(page.locator('body')).not.toHaveClass(/recording/);
  await expect(page.locator('#editor-status')).toContainText('Unsaved changes');expect(await exportedJSON(page)).toBe(before);await page.locator('#project-title').fill('Unsaved imported project');
  await expect(page.locator('#scene-list button').nth(2)).toHaveAttribute('aria-current','true');await expect(page.locator('#element-form [name=text]')).toHaveText('Unsaved third-scene text');expect(await page.locator('#timeline').inputValue()).toBe(beforeTime);
  await expect(page.locator('#editor-status')).toContainText('Unsaved changes');
 }
});

test('recording waits for manual start without a countdown or wake lock',async({page})=>{
 await mockWakeLock(page);await page.goto('/en/');await page.locator('#focus').click();
 await expect(page.locator('#start-recording')).toBeVisible();await expect(page.locator('#start-recording')).toBeEnabled();
 await page.waitForTimeout(3300);await expect(page.locator('#countdown')).not.toBeVisible();await expect(page.locator('#timeline')).toHaveValue('0');
 await expect(page.locator('#stage-frame')).not.toHaveCSS('cursor','none');
 expect(await page.evaluate(()=>(window as unknown as {wakeTest:{requests:number}}).wakeTest.requests)).toBe(0);
 await page.keyboard.press('Space');await expect(page.locator('#countdown')).toBeVisible();await expect(page.locator('#start-recording')).not.toBeVisible();await expect(page.locator('#stage-frame')).toHaveCSS('cursor','none');
 await page.keyboard.press('Escape');await expect(page.locator('body')).not.toHaveClass(/recording/);
});

test('small windows show notice; widening preserves the current project',async({page})=>{
 await page.goto('/de/');await page.locator('#project-title').fill('Tablet project');
 await page.setViewportSize({width:390,height:844});await expect(page.locator('.small-screen-note')).toBeVisible();await expect(page.locator('.small-screen-note')).toContainText('768');await expect(page.locator('.editor-toolbar')).not.toBeVisible();await expect(page.locator('.studio-grid')).not.toBeVisible();
 await page.setViewportSize({width:768,height:1024});await expect(page.locator('.small-screen-note')).not.toBeVisible();await expect(page.locator('#project-title')).toHaveValue('Tablet project');await expect(page.locator('.studio-grid')).toBeVisible();
});
test('AI guide remains accessible on smartphone-sized windows',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/en/');await page.locator('.small-screen-note a').click();await expect(page.locator('#ai-guide')).toBeVisible();
});

test('project spans three columns and preview expands without losing state',async({page})=>{
 await page.goto('/en/');const projectBox=await page.locator('.project-panel').boundingBox(),previewBox=await page.locator('.studio-preview').boundingBox();expect(projectBox!.width).toBeGreaterThan(previewBox!.width*2.5);expect(Math.abs(projectBox!.y-previewBox!.y)).toBeLessThan(2);expect(Math.abs(projectBox!.height-previewBox!.height)).toBeLessThan(2);
 const smallWidth=(await page.locator('#stage-frame').boundingBox())!.width;
 await page.locator('#open-preview').click();await expect(page.locator('#preview-dialog')).toBeVisible();await expect(page.locator('#play .control-label')).not.toBeVisible();expect((await page.locator('#play').boundingBox())!.width).toBeGreaterThanOrEqual(48);expect((await page.locator('#stage-frame').boundingBox())!.width).toBeGreaterThan(smallWidth*1.5);
 await page.locator('#safe-toggle').check();await page.locator('#timeline').fill('2');await page.keyboard.press('Escape');await expect(page.locator('#preview-dialog')).not.toBeVisible();await expect(page.locator('#timeline')).toHaveValue('2');await expect(page.locator('#play .control-label')).not.toBeVisible();await expect(page.locator('#stage')).toHaveCount(1);
 await page.locator('#open-preview').click();await page.locator('#focus').click();await expect(page.locator('#preview-dialog')).not.toBeVisible();await expect(page.locator('#start-recording')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#timeline')).toHaveValue('2');await expect(page.locator('#stage-frame')).toBeVisible();
});

test('project images scroll horizontally without widening the page',async({page})=>{
 const project=demoProject();for(let i=0;i<12;i++)project.assets['photo-'+i]={name:'Photo '+i+'.png',data:pixel};
 await page.goto('/en/');await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(project));await page.locator('#import-json').click();await expect(page.locator('#json-dialog')).not.toBeVisible();
 await expect(page.locator('.project-panel #asset-list img')).toHaveCount(12);await expect(page.locator('.scene-sidebar #asset-list')).toHaveCount(0);
 expect(await page.locator('#asset-list').evaluate(el=>el.scrollWidth>el.clientWidth)).toBeTruthy();
 await page.locator('#asset-list').evaluate(el=>{el.scrollLeft=el.scrollWidth;});expect(await page.locator('#asset-list').evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.locator('#asset-list').evaluate(el=>{el.scrollLeft=0;});expect(await page.locator('#asset-list').evaluate(el=>el.scrollLeft)).toBe(0);
});

test('scene settings span two columns and element settings fill the third row',async({page})=>{
 await page.goto('/en/');const panels=['.scene-sidebar','.scene-inspector','.elements-panel','.element-inspector'];
 const boxes=await Promise.all(panels.map(selector=>page.locator(selector).boundingBox()));
 for(let i=1;i<3;i++){expect(boxes[i]!.x).toBeGreaterThan(boxes[i-1]!.x);expect(Math.abs(boxes[i]!.y-boxes[0]!.y)).toBeLessThan(2);}
 expect(boxes[1]!.width).toBeGreaterThan(boxes[0]!.width*1.9);
 for(let i=1;i<3;i++)expect(Math.abs(boxes[i]!.height-boxes[0]!.height)).toBeLessThan(2);
 expect(Math.abs(boxes[3]!.x-boxes[0]!.x)).toBeLessThan(2);
 expect(boxes[3]!.y).toBeGreaterThan(Math.max(...boxes.slice(0,3).map(b=>b!.y+b!.height)));
 expect(Math.abs(boxes[3]!.x+boxes[3]!.width-boxes[2]!.x-boxes[2]!.width)).toBeLessThan(2);
 await page.locator('#element-list button').click();await expect(page.locator('.element-inspector [name=text]')).toBeVisible();await expect(page.locator('.scene-inspector [name=name]')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});

test('project toolbar uses labeled icons and JSON is paste-only',async({page})=>{
 await page.goto('/en/');await expect(page.locator('.editor-toolbar #import-image svg')).toHaveCount(1);
 for(const id of ['new-project','load-project','save-project','open-json','import-image']){const button=page.locator('#'+id);expect(await button.getAttribute('title')).toBeTruthy();expect(await button.getAttribute('aria-label')).toBeTruthy();expect((await button.textContent())!.trim()).toBe('');}
 await page.locator('#open-json').click();await expect(page.locator('#json-input')).toHaveValue('');await expect(page.locator('#copy-json')).toHaveCount(0);await page.locator('#close-json').click();
 await page.locator('#image-file').setInputFiles({name:'trash-test.png',mimeType:'image/png',buffer:Buffer.from(pixel.split(',')[1],'base64')});await expect(page.locator('#asset-list .asset-row .asset-actions button svg')).toHaveCount(3);
 await page.locator('#asset-list .asset-row button[data-delete-asset]').click();await page.locator('#confirm-delete').click();await expect(page.locator('#asset-list img')).toHaveCount(0);
});

test('app fullscreen hides surroundings and preserves edits and recording return',async({page})=>{
 await page.goto('/en/');await page.locator('#project-title').fill('Fullscreen project');await page.locator('#editor-fullscreen').click();await expect(page.locator('body')).toHaveClass(/editor-fullscreen/);await expect(page.locator('.site-header')).not.toBeVisible();await expect(page.locator('.scene-intro')).not.toBeVisible();await expect(page.locator('.site-footer')).not.toBeVisible();await expect(page.locator('.studio-grid')).toBeVisible();
 await page.locator('#open-json').click();await expect(page.locator('#json-dialog')).toBeVisible();await page.locator('#close-json').click();
 await page.locator('#focus').click();await expect(page.locator('#start-recording')).toBeVisible();await page.locator('#exit-focus').click({force:true});await expect(page.locator('body')).not.toHaveClass(/recording/);await expect(page.locator('body')).toHaveClass(/editor-fullscreen/);
 await page.locator('#editor-fullscreen').click();await expect(page.locator('.site-header')).toBeVisible();await expect(page.locator('#project-title')).toHaveValue('Fullscreen project');
 await page.locator('#editor-fullscreen').click();await page.keyboard.press('Escape');await expect(page.locator('body')).not.toHaveClass(/editor-fullscreen/);await expect(page.locator('#project-title')).toHaveValue('Fullscreen project');
});

test('project toolbar is a vertical rail on the left',async({page})=>{
 await page.goto('/en/');const rail=await page.locator('.editor-toolbar').boundingBox(),content=await page.locator('.project-content').boundingBox();expect(rail!.x+rail!.width).toBeLessThan(content!.x);
 const controls=page.locator('.editor-toolbar > *');let previousY=-1;
 for(let i=0;i<await controls.count();i++){const box=(await controls.nth(i).boundingBox())!;expect(box.y).toBeGreaterThan(previousY);previousY=box.y;}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});

test('play toggles pause and scene navigation works in compact and overlay preview',async({page})=>{
 await page.goto('/en/');await expect(page.locator('#previous-scene')).toBeDisabled();await page.locator('#play').click();await expect(page.locator('#play')).toHaveAttribute('title','Pause');await page.locator('#play').click();await expect(page.locator('#play')).toHaveAttribute('title','Play from here');
 const paused=await page.locator('#timeline').inputValue();await page.waitForTimeout(100);await expect(page.locator('#timeline')).toHaveValue(paused);
 await page.locator('#next-scene').click();await expect(page.locator('#scene-list button').nth(1)).toHaveAttribute('aria-current','true');await expect(page.locator('#timeline')).toHaveValue('5');await expect(page.locator('#next-scene')).toBeDisabled();await page.locator('#previous-scene').click();await expect(page.locator('#timeline')).toHaveValue('0');
 await page.locator('#open-preview').click();await page.locator('#play').click();await page.locator('#next-scene').click();await expect(page.locator('#play')).toHaveAttribute('title','Pause');await expect.poll(async()=>Number(await page.locator('#timeline').inputValue())).toBeGreaterThan(5);await page.locator('#play').click();await expect(page.locator('#play')).toHaveAttribute('title','Play from here');await page.locator('#close-preview').click();
});

test('delete overlays support cancel, Escape and explicit scene/image confirmation',async({page})=>{
 const dialogs:string[]=[];page.on('dialog',d=>{dialogs.push(d.type());void d.dismiss();});await page.goto('/en/');
 await page.locator('#delete-scene').click();await expect(page.locator('#delete-dialog')).toBeVisible();await expect(page.locator('#delete-name')).toHaveText('A new idea');await expect(page.locator('#cancel-delete')).toBeFocused();await page.locator('#cancel-delete').click();await expect(page.locator('#scene-list li')).toHaveCount(2);
 await page.locator('#editor-fullscreen').click();await page.locator('#delete-scene').click();await page.keyboard.press('Escape');await expect(page.locator('#delete-dialog')).not.toBeVisible();await expect(page.locator('body')).toHaveClass(/editor-fullscreen/);
 await page.locator('#delete-scene').click();await page.locator('#confirm-delete').click();await expect(page.locator('#scene-list li')).toHaveCount(1);await expect(page.locator('#delete-scene')).toBeDisabled();
 await page.locator('#image-file').setInputFiles({name:'delete-me.png',mimeType:'image/png',buffer:Buffer.from(pixel.split(',')[1],'base64')});await page.locator('#scene-form [name=backgroundAsset]').selectOption({label:'delete-me.png'});
 await page.locator('#asset-list .asset-row button[data-delete-asset]').click();await expect(page.locator('#delete-description')).toContainText('references');await page.locator('#cancel-delete').click();await expect(page.locator('#asset-list img')).toHaveCount(1);
 await page.locator('#asset-list .asset-row button[data-delete-asset]').click();await page.locator('#confirm-delete').click();await expect(page.locator('#asset-list img')).toHaveCount(0);await expect(page.locator('#scene-form [name=backgroundAsset]')).toHaveValue('');expect(dialogs).toEqual([]);
});

test('JSON footer has three icons, clipboard paste and safe denial fallback',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{readText:async()=>'{"version":"1.0"}'}}));
 await page.goto('/en/');await page.locator('#open-json').click();await expect(page.locator('#json-dialog .json-footer button')).toHaveCount(3);
 for(const id of ['paste-json','import-json','close-json']){await expect(page.locator('#'+id+' svg')).toHaveCount(1);expect(await page.locator('#'+id).getAttribute('title')).toBeTruthy();}
 await page.locator('#paste-json').click();await expect(page.locator('#json-input')).toHaveValue('{"version":"1.0"}');await expect(page.locator('#json-dialog')).toBeVisible();
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{readText:async()=>{throw new Error('denied');}}}));await page.locator('#paste-json').click();await expect(page.locator('#json-status')).toContainText('Ctrl+V');await expect(page.locator('#json-input')).toHaveValue('{"version":"1.0"}');
 await page.locator('#close-json').click();await expect(page.locator('#json-dialog')).not.toBeVisible();await expect(page.locator('#scene-list li')).toHaveCount(2);
});

test('preview overlay fits a short window without scrolling',async({page})=>{
 await page.setViewportSize({width:1024,height:640});await page.goto('/en/');await page.locator('#open-preview').click();
 await expect.poll(()=>page.locator('#preview-dialog').evaluate(el=>el.scrollHeight-el.clientHeight)).toBeLessThanOrEqual(1);
 await expect.poll(()=>page.locator('#preview-overlay-host').evaluate(el=>el.scrollHeight-el.clientHeight)).toBeLessThanOrEqual(1);
 const stage=await page.locator('#stage-frame').boundingBox(),footer=await page.locator('.preview-dialog-footer').boundingBox();
 expect(stage!.height).toBeGreaterThan(0);expect(stage!.y+stage!.height).toBeLessThan(footer!.y);
 await page.locator('#close-preview').click();await expect(page.locator('#preview-dialog')).not.toBeVisible();
});

test('number steppers change values and respect bounds',async({page})=>{
 await page.goto('/en/');
 const input=page.locator('#scene-form input[name=duration]'),stepper=input.locator('..');
 const initial=Number(await input.inputValue());
 await stepper.getByRole('button',{name:'Increase: Duration (seconds)',exact:true}).click();
 await expect(input).toHaveValue(String(Number((initial+0.1).toFixed(6))));
 await stepper.getByRole('button',{name:'Decrease: Duration (seconds)',exact:true}).click();await expect(input).toHaveValue(String(initial));
 const minimum=await input.getAttribute('min');await input.fill(minimum!);await input.dispatchEvent('change');await expect(stepper.locator('button').first()).toBeDisabled();
});

test('safe-area switch is available in compact and expanded preview',async({page})=>{
 await page.goto('/en/');const toggle=page.getByRole('switch',{name:'Show safe text areas'});
 await expect(toggle).toBeVisible();await toggle.check();await expect(page.locator('#safe-overlay')).toBeVisible();
 await page.locator('#open-preview').click();await expect(toggle).toBeChecked();await toggle.uncheck();await expect(page.locator('#safe-overlay')).not.toBeVisible();
 await page.locator('#close-preview').click();await expect(toggle).toBeVisible();await expect(toggle).not.toBeChecked();
});

test('element toolbar adds, duplicates, moves and deletes selected elements',async({page})=>{
 await page.goto('/en/');const toolbar=page.locator('.element-toolbar');
 expect(Math.abs((await toolbar.boundingBox())!.width-(await page.locator('.scene-toolbar').boundingBox())!.width)).toBeLessThan(1);
 await expect(page.locator('#delete-element')).toBeDisabled();
 await page.locator('#element-add-menu summary').click();await page.locator('[data-add=shape]').click();
 await expect(page.locator('#element-add-menu')).not.toHaveAttribute('open','');
 await expect(page.locator('#element-list button')).toHaveCount(2);
 await page.locator('#element-up').click();await expect(page.locator('#element-list button').first()).toHaveAttribute('aria-current','true');
 await page.locator('#element-down').click();await expect(page.locator('#element-list button').last()).toHaveAttribute('aria-current','true');
 await page.locator('#duplicate-element').click();await expect(page.locator('#element-list button')).toHaveCount(3);
 await page.locator('#delete-element').click();await expect(page.locator('#element-list button')).toHaveCount(2);
 await expect(page.locator('#element-form .compact-actions')).toHaveCount(0);
});

test('text styles use switches and survive JSON export and import',async({page})=>{
 await page.goto('/en/');await page.locator('#element-list button').first().click();
 for(const name of ['Bold','Italic','Underline','Strikethrough'])await page.getByRole('switch',{name,exact:true}).check();
 const json=await exportedJSON(page),element=JSON.parse(json).scenes[0].elements[0];
 for(const key of ['bold','italic','underline','strikethrough'])expect(element[key]).toBe(true);
 const style=await page.locator('.scene-element > span > span').first().evaluate(el=>({font:el.style.fontStyle,decoration:el.style.textDecoration}));expect(style.font).toBe('italic');expect(style.decoration).toContain('underline');expect(style.decoration).toContain('line-through');
 await page.locator('#open-json').click();await page.locator('#json-input').fill(json);await page.locator('#import-json').click();await page.locator('#element-list button').first().click();
 for(const name of ['Bold','Italic','Underline','Strikethrough'])await expect(page.getByRole('switch',{name,exact:true})).toBeChecked();
});

test('selected words receive rich formatting while block defaults remain unchanged',async({page})=>{
 await page.goto('/en/');await page.locator('#element-list button').first().click();const editor=page.locator('.rich-text-editor');await editor.fill('Hello world');
 await editor.evaluate(el=>{const node=el.querySelector('span')!.firstChild!;const range=document.createRange();range.setStart(node,6);range.setEnd(node,11);const selection=window.getSelection()!;selection.removeAllRanges();selection.addRange(range);el.dispatchEvent(new MouseEvent('mouseup'));});
 await page.getByRole('switch',{name:'Bold',exact:true}).check();await page.locator('#element-form [name=font]').selectOption('Georgia');await page.locator('#element-form [name=color]').fill('#ff8800');
 const data=JSON.parse(await exportedJSON(page)),e=data.scenes[0].elements[0];expect(e.text).toBe('Hello world');expect(e.bold).toBe(false);expect(e.runs.find((r:any)=>r.text==='world')).toMatchObject({bold:true,font:'Georgia',color:'#ff8800'});
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(data));await page.locator('#import-json').click();await page.locator('#element-list button').first().click();await expect(editor).toHaveText('Hello world');await expect(editor.locator('span').last()).toHaveCSS('font-family','Georgia');
});

test('rich editor preserves newlines and allows disabling an inherited style for a word',async({page})=>{
 await page.goto('/en/');await page.locator('#element-list button').first().click();const editor=page.locator('.rich-text-editor');await editor.fill('Hello world');await page.getByRole('switch',{name:'Underline',exact:true}).check();
 await editor.evaluate(el=>{const node=el.querySelector('span')!.firstChild!;const range=document.createRange();range.setStart(node,6);range.setEnd(node,11);const selection=window.getSelection()!;selection.removeAllRanges();selection.addRange(range);el.dispatchEvent(new MouseEvent('mouseup'));});
 await page.getByRole('switch',{name:'Underline',exact:true}).uncheck();await expect(editor).toHaveCSS('text-decoration-line','none');await expect(editor.locator('span').last()).toHaveCSS('text-decoration-line','none');
 const data=JSON.parse(await exportedJSON(page));expect(data.scenes[0].elements[0].underline).toBe(true);expect(data.scenes[0].elements[0].runs.at(-1).underline).toBe(false);
 await editor.fill('Line one');await editor.press('End');await editor.press('Enter');await editor.pressSequentially('Line two');expect(JSON.parse(await exportedJSON(page)).scenes[0].elements[0].text).toBe('Line one\nLine two');
});

test('image and shape settings use appearance, layout and animation groups',async({page})=>{
 await page.goto('/en/');
 for(const type of ['image','shape']){
  await page.locator('#element-add-menu summary').click();await page.locator(`[data-add=${type}]`).click();
  const form=page.locator('#element-form');await expect(form.locator('fieldset')).toHaveCount(3);
  const appearance=form.locator(`.${type}StyleGroup`);await expect(appearance.locator('[name=opacity]')).toBeVisible();await expect(appearance.locator('[name=radius]')).toBeVisible();
  await expect(form.locator('.elementLayoutGroup [name=x]')).toBeVisible();await expect(form.locator('.elementMotionGroup [name=animation]')).toBeVisible();
  if(type==='image'){await expect(appearance.locator('[name=asset]')).toBeVisible();await expect(appearance.locator('[name=fit]')).toBeVisible();}else{await expect(appearance.locator('[name=fillColor]')).toBeVisible();}
  await form.locator('[name=width]').fill('60');await form.locator('[name=width]').dispatchEvent('change');
  expect(JSON.parse(await exportedJSON(page)).scenes[0].elements.at(-1).width).toBe(60);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 }
});

test('rename dialog handles scene, element and image names without changing content or IDs',async({page})=>{
 await page.goto('/en/');await page.locator('#rename-scene').click();const dialog=page.locator('#rename-dialog');await expect(dialog.locator('header')).toBeVisible();await expect(dialog.locator('footer button')).toHaveCount(2);
 await page.locator('#rename-input').fill('Renamed scene');await page.locator('#cancel-rename').click();await expect(page.locator('#scene-list button').first()).not.toContainText('Renamed scene');
 await page.locator('#rename-scene').click();await page.locator('#rename-input').fill('Renamed scene');await page.locator('#rename-input').press('Enter');await expect(page.locator('#scene-list button').first()).toContainText('Renamed scene');
 await expect(page.locator('#rename-element')).toBeDisabled();await page.locator('#element-list button').first().click();const original=JSON.parse(await exportedJSON(page));
 await page.locator('#rename-element').click();await page.locator('#rename-input').fill('Headline');await page.locator('#apply-rename').click();await expect(page.locator('#element-list button').first()).toContainText('Headline');
 await page.locator('#image-file').setInputFiles({name:'original.png',mimeType:'image/png',buffer:Buffer.from(pixel.split(',')[1],'base64')});await page.locator('#asset-list [data-rename-asset]').click();await page.locator('#rename-input').fill('Cover image');await page.locator('#apply-rename').click();await expect(page.locator('#asset-list .asset-row > span')).toHaveText('Cover image');
 const saved=JSON.parse(await exportedJSON(page)),element=saved.scenes[0].elements[0];expect(saved.scenes[0].name).toBe('Renamed scene');expect(element.name).toBe('Headline');expect(element.id).toBe(original.scenes[0].elements[0].id);expect(element.text).toBe(original.scenes[0].elements[0].text);expect(Object.values(saved.assets)[0]).toMatchObject({name:'Cover image',data:pixel});
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(saved));await page.locator('#import-json').click();await expect(page.locator('#element-list button').first()).toContainText('Headline');
 await page.locator('#rename-scene').click();await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();
});

test('JSON validation errors can be copied with a manual fallback',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as any).copiedError=text;}}}));
 await page.goto('/en/');await page.locator('#open-json').click();await expect(page.locator('#copy-json-error')).not.toBeVisible();await page.locator('#json-input').fill('{"version":"wrong"}');await page.locator('#import-json').click();
 const message=await page.locator('#json-status').textContent();await page.locator('#copy-json-error').click();expect(await page.evaluate(()=>(window as any).copiedError)).toBe(message);await expect(page.locator('.app-toast[data-kind=success]')).toContainText('copied');await expect(page.locator('#json-status')).toHaveText(message!);
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied');}}}));await page.locator('#copy-json-error').click();await expect(page.locator('#json-copy-status')).toContainText('Ctrl+C');expect(await page.evaluate(()=>window.getSelection()?.toString())).toBe(message);
 await page.locator('#json-input').fill('{}');await expect(page.locator('#copy-json-error')).not.toBeVisible();await expect(page.locator('#json-copy-status')).toBeEmpty();
});

test('copy confirmation is a bottom toast above the modal and dismisses automatically',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{}}}));await page.goto('/en/');await page.locator('#open-json').click();await page.locator('#json-input').fill('{}');await page.locator('#import-json').click();await page.locator('#copy-json-error').click();
 const toast=page.locator('.app-toast');await expect(toast).toBeVisible();await expect(toast).toHaveAttribute('data-kind','success');await expect(toast).toHaveAttribute('role','status');await expect(page.locator('#json-copy-status')).toBeEmpty();
 const box=await toast.boundingBox(),viewport=page.viewportSize()!;expect(box!.y).toBeGreaterThan(viewport.height*.75);expect(box!.y+box!.height).toBeLessThanOrEqual(viewport.height);
 expect(await toast.evaluate(el=>el.matches(':popover-open'))).toBe(true);await expect(toast).toHaveCount(0,{timeout:6000});
 await page.locator('#copy-json-error').click();await expect(toast).toHaveCount(1);await page.locator('#close-json').click();await expect(toast).toHaveCount(0);
});

test('crossfade, slide and wipe transition complete scene layers while paused and seeking',async({page})=>{
 const project=demoProject();project.scenes.forEach(s=>{s.transition='none';s.elements.forEach(e=>{e.animation='none';e.at=0;});});project.scenes[0].background='#ff0000';project.scenes[1].background='#0000ff';project.scenes[1].transition='crossfade';project.scenes[1].transitionDuration=2;
 await page.goto('/en/');await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(project));await page.locator('#import-json').click();
 await page.locator('#next-scene').click();await expect(page.locator('#scene-form [name=transition]')).toHaveValue('crossfade');await expect(page.locator('.scene-layer')).toHaveCount(2);
 await page.locator('#timeline').fill('6');const incoming=page.locator('.scene-layer[data-scene-index="1"]'),outgoing=page.locator('.scene-layer[data-scene-index="0"]');await expect(incoming).toHaveCSS('opacity','0.5');await expect(incoming).toHaveCSS('background-color','rgb(0, 0, 255)');await expect(outgoing).toHaveCSS('background-color','rgb(255, 0, 0)');
 await page.locator('#scene-form [name=transition]').selectOption('slide-left');await page.locator('#timeline').fill('6');expect(await incoming.evaluate(el=>el.style.transform)).toBe('translate(50%, 0%)');expect(await outgoing.evaluate(el=>el.style.transform)).toBe('translate(-50%, 0%)');
 await page.locator('#scene-form [name=transition]').selectOption('wipe-up');await page.locator('#timeline').fill('6');expect(await incoming.evaluate(el=>el.style.clipPath)).toBe('inset(50% 0% 0%)');
 await page.locator('#open-preview').click();await expect(page.locator('.scene-layer')).toHaveCount(2);await page.locator('#timeline').fill('7');await expect(page.locator('.scene-layer')).toHaveCount(1);await expect(incoming).toHaveCSS('opacity','1');await page.locator('#close-preview').click();
 const saved=JSON.parse(await exportedJSON(page));expect(saved.scenes[1].transition).toBe('wipe-up');expect(saved.scenes[1].transitionDuration).toBe(2);
});

test('zoom and through-black transitions render complete scenes and save their values',async({page})=>{
 const project=demoProject();project.scenes.forEach(s=>{s.transition='none';s.elements.forEach(e=>e.animation='none');});project.scenes[1].transition='through-black';project.scenes[1].transitionDuration=2;
 await page.goto('/en/');await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(project));await page.locator('#import-json').click();await page.locator('#next-scene').click();
 const incoming=page.locator('.scene-layer[data-scene-index="1"]'),outgoing=page.locator('.scene-layer[data-scene-index="0"]');await page.locator('#timeline').fill('5.5');await expect(outgoing).toHaveCSS('opacity','0.5');await expect(incoming).toHaveCSS('opacity','0');
 await page.locator('#timeline').fill('6');await expect(outgoing).toHaveCSS('opacity','0');await expect(incoming).toHaveCSS('opacity','0');await expect(page.locator('#stage')).toHaveCSS('background-color','rgb(0, 0, 0)');
 await page.locator('#timeline').fill('6.5');await expect(incoming).toHaveCSS('opacity','0.5');
 for(const [kind,startScale] of [['zoom-in','scale(0.7)'],['zoom-out','scale(1.3)']]){
  await page.locator('#scene-form [name=transition]').selectOption(kind);expect(await incoming.evaluate(el=>el.style.transform)).toBe(startScale);await page.locator('#timeline').fill('6');await expect(incoming).toHaveCSS('opacity','0.5');await page.locator('#timeline').fill('7');await expect(page.locator('.scene-layer')).toHaveCount(1);expect(await incoming.evaluate(el=>el.style.transform)).toBe('scale(1)');
 }
 expect(JSON.parse(await exportedJSON(page)).scenes[1].transition).toBe('zoom-out');
});

test('shapes support no fill, independent borders and JSON round trips',async({page})=>{
 await page.goto('/en/');await page.locator('#element-add-menu summary').click();await page.locator('[data-add=shape]').click();const shape=page.locator('.scene-element.selected');
 await page.getByRole('switch',{name:'No fill',exact:true}).check();await expect(page.locator('[name=fillColor]')).toBeDisabled();await expect(shape).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
 await page.getByRole('switch',{name:'No border',exact:true}).uncheck();await page.locator('[name=borderColor]').fill('#ff8800');await page.locator('[name=borderWidth]').fill('12');await page.locator('[name=borderWidth]').dispatchEvent('change');await expect(shape).toHaveCSS('border-top-width','12px');await expect(shape).toHaveCSS('border-top-color','rgb(255, 136, 0)');
 const saved=JSON.parse(await exportedJSON(page));expect(saved.scenes[0].elements.at(-1)).toMatchObject({fillColor:'none',borderColor:'#ff8800',borderWidth:12});
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(saved));await page.locator('#import-json').click();await page.locator('#element-list button').last().click();await expect(page.getByRole('switch',{name:'No fill',exact:true})).toBeChecked();await expect(shape).toHaveCSS('border-top-width','12px');
 await page.getByRole('switch',{name:'No border',exact:true}).check();await expect(shape).toHaveCSS('border-top-style','none');await page.getByRole('switch',{name:'No fill',exact:true}).uncheck();await page.locator('[name=fillColor]').fill('#008800');await expect(shape).toHaveCSS('background-color','rgb(0, 136, 0)');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});

test('shape border line styles render and persist independently of no border',async({page})=>{
 await page.goto('/en/');await page.locator('#element-add-menu summary').click();await page.locator('[data-add=shape]').click();await page.getByRole('switch',{name:'No border',exact:true}).uncheck();
 for(const style of ['solid','dashed','dotted','double']){await page.locator('[name=borderStyle]').selectOption(style);await expect(page.locator('.scene-element.selected')).toHaveCSS('border-top-style',style);}
 const saved=JSON.parse(await exportedJSON(page));expect(saved.scenes[0].elements.at(-1).borderStyle).toBe('double');
 await page.getByRole('switch',{name:'No border',exact:true}).check();await expect(page.locator('.scene-element.selected')).toHaveCSS('border-top-style','none');await page.getByRole('switch',{name:'No border',exact:true}).uncheck();await expect(page.locator('.scene-element.selected')).toHaveCSS('border-top-style','double');
});

test('built-in shape types render SVG contours with all border styles and round trip',async({page})=>{
 await page.goto('/en/');await page.locator('#element-add-menu summary').click();await page.locator('[data-add=shape]').click();await page.getByRole('switch',{name:'No border',exact:true}).uncheck();
 for(const kind of ['ellipse','triangle','diamond','star','arrow']){
  await page.locator('[name=shapeType]').selectOption(kind);await expect(page.locator('.scene-element.selected .shape-svg')).toHaveCount(1);await expect(page.locator('[name=radius]')).toBeDisabled();
  await expect(page.locator('.shape-svg > '+(kind==='ellipse'?'ellipse':'polygon')).first()).toHaveAttribute('fill','#b86445');
 }
 for(const style of ['solid','dashed','dotted','double']){
  await page.locator('[name=borderStyle]').selectOption(style);const outline=page.locator('.shape-svg > polygon').last();await expect(outline).toHaveAttribute('stroke','#ffffff');
  if(style==='dashed'||style==='dotted')await expect(outline).toHaveAttribute('stroke-dasharray',style==='dashed'?'12 8':'0 8');if(style==='double')await expect(page.locator('.shape-svg mask')).toHaveCount(1);
 }
 await page.getByRole('switch',{name:'No fill',exact:true}).check();await expect(page.locator('.shape-svg > polygon').first()).toHaveAttribute('fill','none');
 const saved=JSON.parse(await exportedJSON(page));expect(saved.scenes[0].elements.at(-1)).toMatchObject({shapeType:'arrow',borderStyle:'double',fillColor:'none'});
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(saved));await page.locator('#import-json').click();await page.locator('#element-list button').last().click();await expect(page.locator('[name=shapeType]')).toHaveValue('arrow');await expect(page.locator('.shape-svg mask')).toHaveCount(1);
 await page.locator('[name=shapeType]').selectOption('rectangle');await expect(page.locator('[name=radius]')).toBeEnabled();await expect(page.locator('.scene-element.selected')).toHaveCSS('border-top-style','double');
});

const animatedSvg='<svg xmlns="http://www.w3.org/2000/svg" id="diagram" viewBox="0 0 100 100"><defs><linearGradient id="paint"><stop offset="0%" stop-color="#ff8800"/><stop offset="100%" stop-color="#ffffff"/></linearGradient></defs><circle cx="10" cy="50" r="8" fill="url(#paint)"><animate attributeName="cx" from="10" to="90" dur="4s" repeatCount="indefinite"/></circle><text x="5" y="90" fill="#ffffff">Grüße 😀</text></svg>';
test('SVG import embeds UTF-8 artwork and synchronizes its animation with scene time',async({page})=>{
 await page.goto('/en/');await page.locator('#element-add-menu summary').click();await page.locator('[data-add=image]').click();await page.locator('#image-file').setInputFiles({name:'motion.svg',mimeType:'image/svg+xml',buffer:Buffer.from(animatedSvg)});await expect(page.locator('.scene-svg-image')).toHaveCount(1);
 await page.locator('#element-form [name=animation]').selectOption('none');await page.locator('#element-form [name=at]').fill('1');await page.locator('#element-form [name=at]').dispatchEvent('change');
 await page.locator('#scene-form [name=backgroundAsset]').selectOption({label:'motion.svg'});await page.locator('#timeline').fill('2');
 const svg=page.locator('.scene-svg-image');await expect.poll(()=>svg.locator('circle').evaluate(el=>(el as SVGCircleElement).cx.animVal.value)).toBeCloseTo(30,3);
 await expect.poll(()=>page.locator('.scene-svg-background circle').evaluate(el=>(el as SVGCircleElement).cx.animVal.value)).toBeCloseTo(50,3);
 expect(await svg.evaluate(el=>(el as SVGSVGElement).animationsPaused())).toBe(true);expect(await page.locator('#stage svg[id]').evaluateAll(nodes=>new Set(nodes.map(n=>n.id)).size===nodes.length)).toBe(true);await expect(svg.locator('text')).toHaveText('Grüße 😀');
 await page.locator('#timeline').fill('1.5');await expect.poll(()=>svg.locator('circle').evaluate(el=>(el as SVGCircleElement).cx.animVal.value)).toBeCloseTo(20,3);
 await page.locator('#open-preview').click();await expect(svg).toBeVisible();await page.locator('#play').click();await page.waitForTimeout(150);await page.locator('#play').click();const stopped=await svg.evaluate(el=>(el as SVGSVGElement).getCurrentTime());await page.waitForTimeout(100);expect(await svg.evaluate(el=>(el as SVGSVGElement).getCurrentTime())).toBeCloseTo(stopped,3);await page.locator('#close-preview').click();
 const saved=JSON.parse(await exportedJSON(page));const asset:any=Object.values(saved.assets)[0];expect(asset.data).toMatch(/^data:image\/svg\+xml;base64,/);expect(Buffer.from(asset.data.split(',')[1],'base64').toString()).toContain('Grüße 😀');
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(saved));await page.locator('#import-json').click();await expect(page.locator('#json-dialog')).not.toBeVisible();await page.locator('#timeline').fill('2');await expect.poll(()=>svg.locator('circle').evaluate(el=>(el as SVGCircleElement).cx.animVal.value)).toBeCloseTo(30,3);
});
test('unsafe SVG files and JSON are rejected without script execution or network requests',async({page})=>{
 await page.goto('/en/');const requests:string[]=[];page.on('request',request=>{if(request.url().includes('svg-attack.example'))requests.push(request.url());});
 const unsafe='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><script>window.svgAttack=true</script><image href="https://svg-attack.example/image.png"/></svg>';
 await page.locator('#image-file').setInputFiles({name:'unsafe.svg',mimeType:'image/svg+xml',buffer:Buffer.from(unsafe)});await expect(page.locator('#editor-status')).toContainText('SVG');await expect(page.locator('#asset-list img')).toHaveCount(0);
 const project=demoProject();project.assets.bad={name:'unsafe.svg',data:'data:image/svg+xml;base64,'+Buffer.from(unsafe).toString('base64')};await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(project));await page.locator('#import-json').click();await expect(page.locator('#json-status')).toContainText('SVG');await expect(page.locator('#scene-list button')).toHaveCount(2);expect(await page.evaluate(()=>(window as any).svgAttack)).toBeUndefined();expect(requests).toEqual([]);
});

test('SVG animation stays at zero during recording readiness and countdown',async({page})=>{
 const project=demoProject();project.assets.motion={name:'motion.svg',data:'data:image/svg+xml;base64,'+Buffer.from(animatedSvg).toString('base64')};project.scenes=project.scenes.slice(0,1);project.scenes[0].elements=[{...project.scenes[0].elements[0],type:'image',asset:'motion',animation:'none',at:0}];
 await page.goto('/en/');await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(project));await page.locator('#import-json').click();await page.locator('#timeline').fill('2');await page.locator('#focus').click();await expect(page.locator('#start-recording')).toBeVisible();
 const time=()=>page.locator('.scene-svg-image').evaluate(el=>(el as SVGSVGElement).getCurrentTime());await expect.poll(time).toBe(0);await page.waitForTimeout(150);expect(await time()).toBe(0);await page.locator('#start-recording').click();await expect(page.locator('#countdown')).toHaveText('3');await page.waitForTimeout(150);expect(await time()).toBe(0);
 await page.keyboard.press('Escape');await expect.poll(time).toBe(2);await expect(page.locator('#timeline')).toHaveValue('2');
});

test('asset save downloads original PNG and SVG bytes without saving the project',async({page})=>{
 await page.goto('/en/');
 for(const image of [
  {name:'generated.png',mimeType:'image/png',buffer:Buffer.from(pixel.split(',')[1],'base64'),renamed:'My generated image',filename:'My generated image.png'},
  {name:'animated.svg',mimeType:'image/svg+xml',buffer:Buffer.from(animatedSvg),renamed:'Animation.svg',filename:'Animation.svg'}
 ]){
  await page.locator('#image-file').setInputFiles({name:image.name,mimeType:image.mimeType,buffer:image.buffer});
  const row=page.locator('#asset-list .asset-row').last();
  await row.locator('[data-rename-asset]').click();await page.locator('#rename-input').fill(image.renamed);await page.locator('#apply-rename').click();
  const project=JSON.parse(await exportedJSON(page));
  await page.locator('#project-title').fill('Still unsaved');
  const pending=page.waitForEvent('download');await row.locator('[data-save-asset]').click();const download=await pending;
  expect(download.suggestedFilename()).toBe(image.filename);
  const asset=Object.values(project.assets).at(-1) as {data:string};
  expect(await readFile((await download.path())!)).toEqual(Buffer.from(asset.data.split(',')[1],'base64'));
  await expect(page.locator('#editor-status')).toHaveText('Unsaved changes');
 }
});

test('asset thumbnails open a bounded image overlay with header and footer',async({page})=>{
 await page.goto('/en/');
 await page.locator('#image-file').setInputFiles({name:'preview.png',mimeType:'image/png',buffer:Buffer.from(pixel.split(',')[1],'base64')});
 const thumbnail=page.locator('[data-preview-asset]'),dialog=page.locator('#asset-preview-dialog');
 await thumbnail.focus();await page.keyboard.press('Enter');
 await expect(dialog).toBeVisible();await expect(dialog.locator('header')).toContainText('preview.png');
 await expect(page.locator('#asset-preview-image')).toHaveAttribute('src',pixel);
 await expect(page.locator('#asset-preview-image')).toHaveAttribute('alt','preview.png');
 expect(await dialog.evaluate(element=>element.scrollHeight<=element.clientHeight)).toBe(true);
 const bounds=await page.locator('#asset-preview-image').boundingBox();expect(bounds!.height).toBeGreaterThan(120);
 await dialog.locator('footer button').click();await expect(dialog).not.toBeVisible();await expect(thumbnail).toBeFocused();
 await thumbnail.click();await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();
 await expect(page.locator('#asset-preview-image')).not.toHaveAttribute('src',/./);
 await expect(page.locator('#asset-list img')).toHaveCount(1);
});

test('scene and all shape types support editable gradients and JSON round trips',async({page})=>{
 await page.goto('/en/');
 const scene=page.locator('[data-gradient=backgroundGradient]');
 await scene.locator('[name=gradientType]').selectOption('linear');
 await expect(page.locator('.scene-layer').last()).toHaveCSS('background-image',/linear-gradient/);
 await scene.locator('[name=gradientAngle]').fill('125');await scene.locator('[name=gradientAngle]').dispatchEvent('change');
 await scene.locator('[name=stopColor]').first().fill('#ff0000');
 await scene.getByRole('button',{name:'Add color stop',exact:true}).click();await expect(scene.locator('.gradient-stop')).toHaveCount(3);
 await scene.locator('[name=stopOpacity]').last().fill('0');await scene.locator('[name=stopOpacity]').last().dispatchEvent('change');
 await scene.locator('[name=gradientType]').selectOption('radial');
 await scene.locator('[name=gradientX]').fill('25');await scene.locator('[name=gradientX]').dispatchEvent('change');
 await scene.locator('[name=gradientY]').fill('75');await scene.locator('[name=gradientY]').dispatchEvent('change');
 await expect(page.locator('.scene-layer').last()).toHaveCSS('background-image',/radial-gradient.*25% 75%/);
 await page.locator('#element-add-menu summary').click();await page.locator('[data-add=shape]').click();
 const fill=page.locator('[data-gradient=fillGradient]');
 for(const type of ['linear','radial','conic']){
  await fill.locator('[name=gradientType]').selectOption(type);
  for(const shape of ['rectangle','ellipse','triangle','diamond','star','arrow']){
   await page.locator('[name=shapeType]').selectOption(shape);
   const node=shape==='rectangle'?page.locator('.scene-element.selected'):page.locator('.scene-element.selected foreignObject div');
   await expect(node).toHaveCSS('background-image',new RegExp(type+'-gradient'));
   if(shape!=='rectangle')await expect(page.locator('.scene-element.selected foreignObject')).toHaveAttribute('clip-path',/url\(#shape-fill-/);
  }
 }
 const saved=JSON.parse(await exportedJSON(page));expect(saved.scenes[0].backgroundGradient).toMatchObject({type:'radial',angle:125,x:25,y:75});expect(saved.scenes[0].backgroundGradient.stops).toHaveLength(3);expect(saved.scenes[0].backgroundGradient.stops.at(-1).opacity).toBe(0);
 expect(saved.scenes[0].elements.at(-1).fillGradient.type).toBe('conic');
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(saved));await page.locator('#import-json').click();await page.locator('#element-list button').last().click();
 await expect(fill.locator('[name=gradientType]')).toHaveValue('conic');
 await page.getByRole('switch',{name:'No fill',exact:true}).check();await expect(fill.locator('[name=gradientType]')).toHaveValue('solid');await expect(page.locator('.scene-element.selected foreignObject')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});

test('long scene and element lists scroll without increasing row two height',async({page})=>{
 await page.goto('/en/');
 const inspector=page.locator('.scene-inspector');
 const initialHeight=(await inspector.boundingBox())!.height;
 const project=demoProject();
 project.scenes=Array.from({length:60},(_,i)=>({...structuredClone(project.scenes[0]),id:'scene-'+i,name:'Scene '+i,elements:Array.from({length:i===0?60:0},(_,j)=>({...structuredClone(project.scenes[0].elements[0]),id:'element-'+j,text:'Element '+j}))}));
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(project));await page.locator('#import-json').click();
 expect((await inspector.boundingBox())!.height).toBeCloseTo(initialHeight,0);
 for(const selector of ['.scene-sidebar','.elements-panel']){
  const box=(await page.locator(selector).boundingBox())!,sceneBox=(await inspector.boundingBox())!;
  expect(box.height).toBeCloseTo(sceneBox.height,0);expect(box.y).toBeCloseTo(sceneBox.y,0);
 }
 for(const id of ['scene-list','element-list']){
  const list=page.locator('#'+id);
  expect(await list.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
  await list.evaluate(el=>el.scrollTop=el.scrollHeight);
  expect(await list.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 }
 await page.locator('#element-list button').last().click();await expect(page.locator('#element-list button').last()).toHaveAttribute('aria-current','true');
 expect(await page.locator('#element-list').evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 // The inspector may grow for extra settings, but long lists must still not size it.
 await page.locator('[data-gradient=backgroundGradient] [name=gradientType]').selectOption('radial');
 const expandedHeight=(await inspector.boundingBox())!.height;expect(expandedHeight).toBeGreaterThan(initialHeight);
 expect((await page.locator('.scene-sidebar').boundingBox())!.height).toBeCloseTo(expandedHeight,0);
 expect((await page.locator('.elements-panel').boundingBox())!.height).toBeCloseTo(expandedHeight,0);
 await page.locator('[data-gradient=backgroundGradient] [name=gradientType]').selectOption('solid');
 expect((await inspector.boundingBox())!.height).toBeCloseTo(initialHeight,0);
 await page.locator('#scene-list').evaluate(el=>el.scrollTop=el.scrollHeight);
 await page.locator('#scene-list button').last().click();await expect(page.locator('#scene-list button').last()).toHaveAttribute('aria-current','true');
 expect(await page.locator('#scene-list').evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
});

test('element order determines visible stacking and moving changes layers',async({page})=>{
 await page.goto('/en/');
 const project=demoProject(),template=project.scenes[0].elements[0];
 project.scenes[0].transition='none';
 project.scenes[0].elements=['#ff0000','#0000ff'].map((color,i)=>({...structuredClone(template),id:'layer-'+i,type:'shape' as const,text:'',animation:'none' as const,x:20,y:20,width:60,height:60,fillColor:color}));
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(project));await page.locator('#import-json').click();
 const topColor=()=>page.locator('#stage-frame').evaluate(frame=>{
  const rect=frame.getBoundingClientRect();const top=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)?.closest('.scene-element');
  return top?getComputedStyle(top).backgroundColor:null;
 });
 await page.locator('#stage-frame').scrollIntoViewIfNeeded();
 expect(await topColor()).toBe('rgb(0, 0, 255)');
 await page.locator('#element-list button').first().click();await page.locator('#stage-frame').scrollIntoViewIfNeeded();
 expect(await topColor()).toBe('rgb(0, 0, 255)'); // Selection must not raise a layer.
 await page.locator('#element-down').click();await page.locator('#stage-frame').scrollIntoViewIfNeeded();
 expect(await topColor()).toBe('rgb(255, 0, 0)');
 const saved=JSON.parse(await exportedJSON(page));expect(saved.scenes[0].elements.map((e:{id:string})=>e.id)).toEqual(['layer-1','layer-0']);
 await page.locator('#element-up').click();await page.locator('#stage-frame').scrollIntoViewIfNeeded();
 expect(await topColor()).toBe('rgb(0, 0, 255)');
 await page.locator('#open-preview').click();
 expect(await topColor()).toBe('rgb(0, 0, 255)');
});

test('simulation elements offer transparent effects, positioning and saved settings',async({page})=>{
 await page.goto('/en/');await page.locator('#element-add-menu summary').click();await page.locator('[data-add=simulation]').click();
 const canvas=page.locator('.scene-element.selected canvas');
 for(const type of ['particles','snow','bubbles']){
  await page.locator('#element-form [name=simulationType]').selectOption(type);
  await expect(page.locator('#element-list button').last()).toContainText(type==='particles'?'Particles':type==='snow'?'Snow':'Bubbles');
  await expect(canvas).toHaveCount(1);await expect(page.locator('.scene-element.selected')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  expect(await canvas.evaluate((node:HTMLCanvasElement)=>Array.from(node.getContext('2d')!.getImageData(0,0,1,1).data))).toEqual([0,0,0,0]);
 }
 await page.locator('[name=simulationColor]').fill('#ff8800');
 for(const [key,value] of [['simulationCount','24'],['simulationSpeed','2'],['simulationSize','12'],['simulationSeed','123'],['x','25'],['rotation','45']]){
  await page.locator('#element-form [name='+key+']').fill(value);await page.locator('#element-form [name='+key+']').dispatchEvent('change');
 }
 const before=await canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL());
 const time=await page.locator('#timeline').inputValue();
 await page.locator('#timeline').fill('3');await page.locator('#timeline').dispatchEvent('input');
 expect(await canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL())).not.toBe(before);
 await page.locator('#timeline').fill(time);await page.locator('#timeline').dispatchEvent('input');
 expect(await canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL())).toBe(before);
 const saved=JSON.parse(await exportedJSON(page));expect(saved.scenes[0].elements.at(-1)).toMatchObject({type:'simulation',x:25,rotation:45,simulation:{type:'bubbles',color:'#ff8800',count:24,speed:2,size:12,seed:123}});
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(saved));await page.locator('#import-json').click();await page.locator('#element-list button').last().click();
 await expect(page.locator('[name=simulationType]')).toHaveValue('bubbles');await expect(page.locator('[name=simulationCount]')).toHaveValue('24');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});

test('project simulation keeps one canvas and global time across transitions, pause and recording',async({page})=>{
 await page.goto('/en/');
 await page.locator('#project-simulation').click();await expect(page.locator('#simulation-dialog header')).toBeVisible();await expect(page.locator('#simulation-dialog footer button')).toHaveCount(2);
 await page.locator('#project-simulation-form [name=simulationType]').selectOption('snow');
 const stepper=page.locator('#project-simulation-form .number-stepper').first();
 const minus=(await stepper.locator('button').first().boundingBox())!,input=(await stepper.locator('input').boundingBox())!,plus=(await stepper.locator('button').last().boundingBox())!;
 expect(minus.width).toBe(30);expect(plus.width).toBe(30);expect(input.x-minus.x-minus.width).toBeCloseTo(4,0);expect(plus.x-input.x-input.width).toBeCloseTo(4,0);
 await page.locator('#project-simulation-form [name=simulationCount]').fill('30');await page.locator('#project-simulation-form [name=simulationCount]').dispatchEvent('change');
 await page.locator('#project-simulation-form [name=simulationSpeed]').fill('1.5');await page.locator('#project-simulation-form [name=simulationSpeed]').dispatchEvent('change');
 await page.locator('#project-simulation-form [name=simulationSize]').fill('8');await page.locator('#project-simulation-form [name=simulationSize]').dispatchEvent('change');
 await page.locator('#project-simulation-form [name=simulationSeed]').fill('99');await page.locator('#project-simulation-form [name=simulationSeed]').dispatchEvent('change');
 await page.locator('#apply-simulation').click();
 await page.locator('[name=backgroundOpacity]').fill('0');await page.locator('[name=backgroundOpacity]').dispatchEvent('change');
 const canvas=page.locator('.project-simulation-canvas');
 await expect(canvas).toHaveCount(1);
 await canvas.evaluate(node=>(window as any).originalSimulationCanvas=node);
 const seek=async(time:string)=>{await page.locator('#timeline').fill(time);await page.locator('#timeline').dispatchEvent('input');};
 await seek('4.99');const before=await canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL());
 await seek('5.01');await expect(canvas).toHaveAttribute('data-simulation-time','5.01');
 expect(await canvas.evaluate(node=>node===(window as any).originalSimulationCanvas)).toBe(true);
 await page.locator('[name=backgroundOpacity]').fill('0');await page.locator('[name=backgroundOpacity]').dispatchEvent('change');
 await page.locator('[name=transition]').selectOption('slide-left');
 await seek('5.01');expect(await canvas.evaluate(node=>node===(window as any).originalSimulationCanvas)).toBe(true);
 await expect(canvas).toHaveCSS('transform','none');
 await seek('4.99');expect(await canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL())).toBe(before);
 await page.locator('#play').click();await page.waitForTimeout(180);await page.locator('#play').click();
 const paused=await canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL());await page.waitForTimeout(180);
 expect(await canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL())).toBe(paused);
 await seek('5.25');await page.locator('[name=transition]').selectOption('through-black');await seek('5.25');
 await expect(page.locator('.project-transition-black')).toHaveCSS('opacity','1');
 const saved=JSON.parse(await exportedJSON(page));expect(saved.backgroundSimulation).toMatchObject({type:'snow',seed:99,count:30,speed:1.5,size:8});expect(saved.scenes.map((s:{backgroundOpacity:number})=>s.backgroundOpacity)).toEqual([0,0]);
 await seek('6');const prior=await canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL());
 await page.locator('#focus').click();await expect(canvas).toHaveAttribute('data-simulation-time','0');await page.waitForTimeout(120);await expect(canvas).toHaveAttribute('data-simulation-time','0');
 await page.locator('#exit-focus').click({force:true});await expect(canvas).toHaveAttribute('data-simulation-time','6');expect(await canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL())).toBe(prior);
 await page.locator('#project-simulation').click();await page.locator('#project-simulation-form [name=simulationType]').selectOption('none');await page.locator('#apply-simulation').click();await expect(canvas).toHaveCount(0);
});

test('many simulation elements share a bounded canvas pixel budget',async({page})=>{
 await page.goto('/en/');
 const project=demoProject(),template=project.scenes[0].elements[0];
 project.scenes[0].elements=Array.from({length:100},(_,i)=>({...structuredClone(template),id:'effect-'+i,type:'simulation' as const,width:200,height:200,simulation:{type:'particles' as const,color:'#ffffff',count:1,speed:1,size:5,opacity:1,seed:i}}));
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(project));await page.locator('#import-json').click();
 await expect(page.locator('.scene-element canvas')).toHaveCount(100);
 const pixels=await page.locator('.scene-element canvas').evaluateAll(nodes=>nodes.reduce((sum,node)=>sum+(node as HTMLCanvasElement).width*(node as HTMLCanvasElement).height,0));
 expect(pixels).toBeLessThan(8100000);
});

test('scene background switch reveals simulation and preserves background settings',async({page})=>{
 await page.goto('/en/');await page.locator('#project-simulation').click();await page.locator('#project-simulation-form [name=simulationType]').selectOption('bubbles');await page.locator('#apply-simulation').click();
 await page.locator('[name=backgroundOpacity]').fill('0.6');await page.locator('[name=backgroundOpacity]').dispatchEvent('change');
 await page.locator('[name=background]').fill('#224466');
 const toggle=page.getByRole('switch',{name:'Show scene background',exact:true});
 await expect(toggle).toBeChecked();await toggle.uncheck();
 await expect(page.locator('.scene-backdrop')).toHaveCSS('opacity','0');
 await expect(page.locator('.project-simulation-canvas')).toHaveCount(1);
 await expect(page.locator('.scene-element').first()).toBeVisible();
 await expect(page.locator('[name=backgroundOpacity]')).toHaveValue('0.6');await expect(page.locator('[name=background]')).toHaveValue('#224466');
 const saved=JSON.parse(await exportedJSON(page));expect(saved.scenes[0]).toMatchObject({backgroundEnabled:false,backgroundOpacity:.6,background:'#224466'});
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(saved));await page.locator('#import-json').click();await expect(toggle).not.toBeChecked();
 await toggle.check();await expect(page.locator('.scene-backdrop')).toHaveCSS('opacity','0.6');
 await expect(page.locator('[name=background]')).toHaveValue('#224466');
});

test('empty bubble example renders visible particles in recording mode',async({page})=>{
 await page.goto('/en/');
 const response=await page.request.get('/simulation-test.scenescript.json');expect(response.ok()).toBe(true);
 await page.locator('#open-json').click();await page.locator('#json-input').fill(await response.text());await page.locator('#import-json').click();
 await expect(page.locator('.scene-element')).toHaveCount(0);
 await page.locator('#focus').click();await page.locator('#start-recording').click();
 await expect(page.locator('#countdown')).not.toBeVisible({timeout:5000});
 await expect(page.locator('#recording-start')).not.toBeVisible();await expect(page.locator('.scene-backdrop')).toHaveCSS('opacity','0');
 const canvas=page.locator('.project-simulation-canvas');
 expect(await canvas.evaluate((c:HTMLCanvasElement)=>{const data=c.getContext('2d')!.getImageData(0,0,c.width,c.height).data;let visible=0;for(let i=0;i<data.length;i+=4)if(data[i]>100&&data[i+3]>100)visible++;return visible;})).toBeGreaterThan(1000);
 const t=Number(await canvas.getAttribute('data-simulation-time'));await page.waitForTimeout(150);expect(Number(await canvas.getAttribute('data-simulation-time'))).toBeGreaterThan(t);
 await page.locator('#exit-focus').click({force:true});
});

test('simulation modal applies with checkmark and discards drafts with X or Escape',async({page})=>{
 await page.goto('/en/');const initial=JSON.parse(await exportedJSON(page));
 await page.locator('#project-simulation').click();await page.locator('#project-simulation-form [name=simulationType]').selectOption('bubbles');
 await expect(page.locator('.project-simulation-canvas')).toHaveCount(0);
 await page.locator('#close-simulation').click();
 expect(JSON.parse(await exportedJSON(page)).backgroundSimulation).toEqual(initial.backgroundSimulation);
 await page.locator('#project-simulation').click();await expect(page.locator('#project-simulation-form [name=simulationType]')).toHaveValue('none');
 await page.locator('#project-simulation-form [name=simulationType]').selectOption('snow');await page.locator('#apply-simulation').click();
 await expect(page.locator('#simulation-dialog')).not.toBeVisible();await expect(page.locator('.project-simulation-canvas')).toHaveCount(1);
 const saved=JSON.parse(await exportedJSON(page));expect(saved.backgroundSimulation.type).toBe('snow');
 await page.locator('#project-simulation').click();await page.locator('#project-simulation-form [name=simulationCount]').fill('100');await page.locator('#project-simulation-form [name=simulationCount]').dispatchEvent('change');
 await page.keyboard.press('Escape');expect(JSON.parse(await exportedJSON(page)).backgroundSimulation).toEqual(saved.backgroundSimulation);
 await page.locator('#project-simulation').click();await expect(page.locator('#project-simulation-form [name=simulationCount]')).toHaveValue('60');
 await page.locator('#project-simulation-form [name=simulationCount]').fill('77');await page.locator('#project-simulation-form [name=simulationCount]').dispatchEvent('change');
 await page.locator('#project-simulation-form [name=simulationSeed]').fill('123');await page.locator('#project-simulation-form [name=simulationSeed]').dispatchEvent('change');
 await page.locator('#apply-simulation').click();expect(JSON.parse(await exportedJSON(page)).backgroundSimulation).toMatchObject({type:'snow',count:77,seed:123});
});
test('recording alignment frame hides for countdown and restart appears three seconds after completion',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=[p.scenes[0]];p.scenes[0].duration=.3;p.scenes[0].elements=[];
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();await page.locator('#focus').click();
 await expect(page.locator('#recording-frame')).toBeVisible();await expect(page.locator('#start-recording')).toHaveAttribute('aria-label','Start presentation');
 const bounds=await page.locator('#stage-frame').boundingBox();expect(await page.locator('#recording-frame').boundingBox()).toEqual(bounds);
 await page.locator('#start-recording').click();await expect(page.locator('#recording-frame')).not.toBeVisible();await expect(page.locator('#stage-frame')).toHaveCSS('cursor','none');
 await expect.poll(async()=>Number(await page.locator('#timeline').inputValue()),{timeout:6000}).toBe(.3);await page.waitForTimeout(1500);await expect(page.locator('#recording-start')).not.toBeVisible();
 await expect(page.locator('#start-recording')).toBeVisible({timeout:3000});await expect(page.locator('#start-recording')).toHaveAttribute('aria-label','Restart presentation');await expect(page.locator('#recording-frame')).toBeVisible();
 await page.locator('#start-recording').click();await expect(page.locator('#countdown')).toBeVisible();await expect(page.locator('#recording-frame')).not.toBeVisible();expect(await page.locator('#timeline').inputValue()).toBe('0');await page.keyboard.press('Escape');await page.waitForTimeout(3300);await expect(page.locator('#recording-start')).not.toBeVisible();await expect(page.locator('#recording-frame')).not.toBeVisible();
});

test('gallery import buttons open image and video file pickers',async({page})=>{
 await page.goto('/en/');await expect(page.locator('.media-gallery-tile')).toHaveCount(2);
 for(const [id,accept] of [['gallery-import-image','image/png'],['gallery-import-video','video/*']]){
  await expect(page.locator('#'+id)).toBeVisible();await expect(page.locator('#'+id+' svg')).toHaveCount(1);await expect(page.locator('#'+id)).toHaveText('');await expect(page.locator('#'+id)).toHaveAttribute('aria-label',/Import/);const pending=page.waitForEvent('filechooser');await page.locator('#'+id).click();const chooser=await pending;expect(await chooser.element().getAttribute('accept')).toContain(accept);
 }
});
