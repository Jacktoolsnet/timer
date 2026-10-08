import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
async function exportedJSON(page:import('@playwright/test').Page){const pending=page.waitForEvent('download');await page.locator('#save-project').click();const download=await pending;return readFile((await download.path())!,'utf8');}
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
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.goto('/de/ai/');await expect(page.locator('#ai-guide')).toContainText('External URLs, SVG data URLs and other MIME prefixes are rejected.');expect((await request.get('/ai.txt')).ok()).toBeTruthy();expect((await (await request.get('/schema.json')).json()).properties.version.const).toBe('1.0');
});
test('blocked storage does not prevent editing',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('blocked');};Storage.prototype.setItem=()=>{throw Error('blocked');};});await page.goto('/en/');await page.locator('[data-add=shape]').click();await expect(page.locator('#element-list li')).toHaveCount(2);
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
  await expect(page.locator('#scene-list button').nth(2)).toHaveAttribute('aria-current','true');await expect(page.locator('#element-form [name=text]')).toHaveValue('Unsaved third-scene text');expect(await page.locator('#timeline').inputValue()).toBe(beforeTime);
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
 await page.locator('#image-file').setInputFiles({name:'trash-test.png',mimeType:'image/png',buffer:Buffer.from(pixel.split(',')[1],'base64')});await expect(page.locator('#asset-list .asset-row button svg')).toHaveCount(1);
 await page.locator('#asset-list .asset-row button').click();await page.locator('#confirm-delete').click();await expect(page.locator('#asset-list img')).toHaveCount(0);
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
 await page.locator('#asset-list .asset-row button').click();await expect(page.locator('#delete-description')).toContainText('references');await page.locator('#cancel-delete').click();await expect(page.locator('#asset-list img')).toHaveCount(1);
 await page.locator('#asset-list .asset-row button').click();await page.locator('#confirm-delete').click();await expect(page.locator('#asset-list img')).toHaveCount(0);await expect(page.locator('#scene-form [name=backgroundAsset]')).toHaveValue('');expect(dialogs).toEqual([]);
});

test('JSON footer has three icons, clipboard paste and safe denial fallback',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{readText:async()=>'{"version":"1.0"}'}}));
 await page.goto('/en/');await page.locator('#open-json').click();await expect(page.locator('.json-footer button')).toHaveCount(3);
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
