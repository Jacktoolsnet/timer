import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const url='/examples/light-collector.scenescript.json';
async function ready(page:any){await page.goto('/de/');await expect(page.locator('#editor')).toHaveAttribute('data-ready','true');await expect(page.locator('#stage .stage2d-canvas')).toHaveAttribute('data-stage2d-time','0');}
test('2D resources and independent instances edit, roundtrip and support undo',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await ready(page);
 await expect(page.locator('#project-title')).toHaveValue('Der kleine Lichtsammler');await expect(page.locator('#timeline')).toHaveAttribute('max','22');await expect(page.locator('#stage .stage2d-canvas')).toHaveAttribute('data-stage2d-actors','8');
 await page.locator('[data-stage2d-track=collector-1] .timeline-bar').click();await expect(page.locator('#stage .stage2d-canvas')).toHaveAttribute('data-stage2d-time','5.25');
 await expect(page.locator('#scene-list button')).toHaveCount(2);await page.locator('#scene-list button').nth(1).click();await page.locator('#element-list button').filter({hasText:'Schlusstitel'}).click();
 const title=page.locator('#element-form [contenteditable=true]');await title.fill('Ein neuer Anfang');await title.dispatchEvent('input');await page.locator('#undo-project').click();await expect(title).toHaveText('Manchmal genügt');await page.locator('#redo-project').click();await expect(title).toHaveText('Ein neuer Anfang');await page.locator('#scene-list button').first().click();
 await page.locator('[data-actor-id=collector]').getByRole('button',{name:'Duplizieren',exact:true}).click();const second=page.locator('[data-actor-id]').last();await expect(page.locator('[data-actor-id]')).toHaveCount(9);await second.locator('[data-stage2d-field$="-override"]').check();await second.locator('[data-stage2d-field$="-color"]').fill('#4488ff');await second.locator('[data-stage2d-field$="-color"]').dispatchEvent('change');
 const pending=page.waitForEvent('download');await page.locator('#save-project').click();const file=await pending,p=JSON.parse(await readFile((await file.path())!,'utf8'));expect(p.scenes[0].stage2d.actors.at(-1).object).toBe('collector');expect(p.scenes[0].stage2d.actors.at(-1).color).toBe('#4488ff');expect(p.objects2d.collector.color).toBe('#f28b70');expect(p.scenes[1].elements.find((e:any)=>e.id==='closing-title').text).toBe('Ein neuer Anfang');
 await page.locator('#project-file').setInputFiles((await file.path())!);await expect(page.locator('[data-actor-id]')).toHaveCount(9);await page.locator('#load-default-project').click();await expect(page.locator('[data-actor-id]')).toHaveCount(8);
 await page.locator('#play').click();await expect.poll(()=>page.locator('#stage .stage2d-canvas').getAttribute('data-stage2d-time')).not.toBe('0');await page.locator('#play').click();expect(errors).toEqual([]);
});
test('common renderer produces repeatable export frames, overlays and actual WebM video',async({page},info)=>{
 test.setTimeout(120000);await ready(page);
 await page.locator('#timeline').fill('4.9');await expect(page.locator('#stage .stage2d-canvas')).toHaveAttribute('data-stage2d-time','4.9');
 const result=await page.evaluate(async url=>{
  const {parseProject,newElement}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string),{exportVideo}=await import(/* @vite-ignore */ '/src/scripts/video-export.ts' as string);
  const p=parseProject(await(await fetch(url)).text()),m=new ExportMedia(p,new AbortController().signal),r=new ExportRenderer(p,m);const frames=[];
  let previewMatches=false;
  try{const native=await r.frame(4.9,1920,1080);previewMatches=native.toDataURL()===document.querySelector<HTMLCanvasElement>('#stage .stage2d-canvas')!.toDataURL();native.width=0;native.height=0;for(const time of [1.8,4.9,7.95,11.5,13.5,4.9]){const c=await r.frame(time,640,360);frames.push({time,png:c.toDataURL()});c.width=0;c.height=0;}}finally{r.dispose();m.dispose();}
  // Existing text layers still composite above the new canvas, including during fades.
  const text=newElement('text','overlay');text.text='PIX I 2D';text.animation='none';p.scenes[0].elements=[text];p.scenes[0].transition='fade';
  const mm=new ExportMedia(p,new AbortController().signal),rr=new ExportRenderer(p,mm);let overlay='';try{const c=await rr.frame(4.9,640,360);overlay=c.toDataURL();c.width=0;c.height=0;}finally{rr.dispose();mm.dispose();}
  p.scenes[0].elements=[];p.scenes[0].transition='none';const {retimeStage2D}=await import(/* @vite-ignore */ '/src/lib/stage2d.ts' as string);retimeStage2D(p.scenes[0].stage2d!,.5/p.scenes[0].duration);p.scenes[0].duration=.5;p.scenes=p.scenes.slice(0,1);
  const blob=await exportVideo(p,{format:'webm',resolution:480,fps:24,audio:false},new AbortController().signal,()=>{});
  const video=document.createElement('video'),src=URL.createObjectURL(blob);let duration=0;try{video.src=src;await new Promise((resolve,reject)=>{video.onloadedmetadata=resolve;video.onerror=reject;});duration=video.duration;}finally{URL.revokeObjectURL(src);}
  return {previewMatches,frames,overlay,size:blob.size,type:blob.type,duration,leaked:document.querySelectorAll('[data-export-renderer]').length};
 },url);
 expect(result.previewMatches).toBe(true);expect(result.frames[1].png).toBe(result.frames.at(-1)!.png);expect(new Set(result.frames.map(f=>f.png)).size).toBe(5);expect(result.overlay).not.toBe(result.frames[1].png);expect(result.size).toBeGreaterThan(1000);expect(result.type).toBe('video/webm');expect(result.duration).toBeCloseTo(.5,1);expect(result.leaked).toBe(0);
 for(const frame of result.frames.slice(0,-1))await info.attach('Lichtsammler-'+frame.time,{body:Buffer.from(frame.png.split(',')[1],'base64'),contentType:'image/png'});
});
test('2D can be added to an empty scene and removed; portrait/square render without clipping the composition',async({page})=>{
 await ready(page);page.on('dialog',d=>d.accept());await page.locator('#new-project').click();await expect(page.locator('#stage .stage2d-canvas')).toHaveCount(0);await page.locator('[data-stage2d-field=enabled]').check();await expect(page.locator('#stage .stage2d-canvas')).toHaveAttribute('data-stage2d-time','0');await page.locator('[data-stage2d-field=enabled]').uncheck();await expect(page.locator('#stage .stage2d-canvas')).toHaveCount(0);
 const result=await page.evaluate(async url=>{const {parseProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{Stage2DRenderer}=await import(/* @vite-ignore */ '/src/scripts/stage2d.ts' as string);const p=parseProject(await(await fetch(url)).text()),r=await new Stage2DRenderer().init();try{const c=document.createElement('canvas');r.render(p.scenes[0].stage2d!,16,8,360,640,c,p);const first=c.toDataURL();r.render(p.scenes[0].stage2d!,16,8,400,400,c,p);r.render(p.scenes[0].stage2d!,16,8,360,640,c,p);const repeat=first===c.toDataURL();r.render(p.scenes[0].stage2d!,16,13.5,640,360,c,p);const ending=c.getContext('2d')!.getImageData(0,0,640,360).data;for(let i=0;i<6;i++)r.render({...p.scenes[0].stage2d!,ending:{title:'Variation '+i,subtitle:'Test',at:12,duration:1}},16,13.5,640,360,c,p);r.render(p.scenes[0].stage2d!,16,13.5,640,360,c,p);const after=c.getContext('2d')!.getImageData(0,0,640,360).data;return {repeat,cacheMaxDelta:ending.reduce((max:number,value:number,i:number)=>Math.max(max,Math.abs(value-after[i])),0)};}finally{r.dispose();}},url);expect(result.repeat).toBe(true);expect(result.cacheMaxDelta).toBeLessThanOrEqual(1);
});

test('unavailable WebGL reports an error without blocking the editor or disabling ordinary scenes',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]):any{if(type==='webgl'||type==='webgl2'||type==='experimental-webgl')return null;return original.apply(this,[type,...args] as any);};});
 await page.goto('/en/');await expect(page.locator('#editor')).toHaveAttribute('data-ready','true');await expect(page.locator('#stage .stage2d-canvas')).toHaveAttribute('data-stage2d-error','true');await expect(page.locator('#editor-status')).toContainText('WebGL is not available');
 const error=await page.evaluate(async url=>{const {parseProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{exportStill}=await import(/* @vite-ignore */ '/src/scripts/still-export.ts' as string);try{await exportStill(parseProject(await(await fetch(url)).text()),1,new AbortController().signal);return 'unexpected success';}catch(error){return (error as Error).message;}},url);expect(error).toContain('WebGL is not available');
 await page.locator('[data-stage2d-field=enabled]').uncheck();await expect(page.locator('#stage .stage2d-canvas')).toHaveCount(0);await expect(page.locator('#scene-form [name=name]')).toBeEnabled();
});

test('German demo storyboard contains the story, subjects and four timed shots without auto-approval',async({page})=>{
 await ready(page);await page.locator('#open-storyboard').click();await expect(page.locator('#storyboard-dialog')).toBeVisible();
 await expect(page.locator('[data-project-field=story]')).toContainText('Ein kleiner, freundlicher Roboter');await expect(page.locator('[data-project-field=language]')).toContainText('Deutsch');await expect(page.locator('[data-project-field=duration]')).toContainText('22 s');
 await expect(page.locator('#storyboard-approve')).toHaveAttribute('aria-pressed','false');await expect(page.locator('#storyboard-script-open')).toBeDisabled();
 for(const [tab,count,first] of [['characters',2,'Der Lichtsammler'],['objects',2,'Der Lichtfunke'],['settings',2,'Der grüne Waldweg'],['shots',4,'Ankommen']] as const){
  await page.locator('[data-board-tab='+tab+']').click();await expect(page.locator('[data-board-item]')).toHaveCount(count);await expect(page.locator('#storyboard-content .board-card')).toContainText(first);
 }
 await page.locator('[data-board-item=transformation]').click();await expect(page.locator('[data-shot-id=transformation]')).toContainText('ein kleiner Funke.');
 const pending=page.waitForEvent('download');await page.locator('#storyboard-download').click();const file=await pending,exported=JSON.parse(await readFile((await file.path())!,'utf8'));expect(exported.board.language).toBe('Deutsch');expect(exported.board.shots.map((s:any)=>s.duration)).toEqual([4,3,10,5]);expect(exported.board.approved).toBe(false);
 await page.locator('#storyboard-close').click();await expect(page.locator('#stage .stage2d-canvas')).toHaveAttribute('data-stage2d-time','0');
});

test('resource edits propagate, referenced deletion is blocked, and new shape resources can be used',async({page})=>{
 await ready(page);await page.locator('#timeline').fill('4.9');const before=await page.locator('#stage .stage2d-canvas').evaluate((c:HTMLCanvasElement)=>c.toDataURL());
 await page.locator('#open-stage2d').click();await expect(page.locator('#stage2d-dialog')).toBeVisible();await page.locator('[data-stage2d-field=resource-color]').fill('#4488ff');await page.locator('[data-stage2d-field=resource-color]').dispatchEvent('change');await page.locator('#stage2d-dialog').getByRole('button',{name:'Schließen',exact:true}).click();
 await expect.poll(()=>page.locator('#stage .stage2d-canvas').evaluate((c:HTMLCanvasElement)=>c.toDataURL())).not.toBe(before);await page.locator('#undo-project').click();await expect.poll(()=>page.locator('#stage .stage2d-canvas').evaluate((c:HTMLCanvasElement)=>c.toDataURL())).toBe(before);
 await page.locator('#open-stage2d').click();await page.locator('#stage2d-dialog').getByRole('button',{name:'Entfernen',exact:true}).click();await expect(page.locator('#stage2d-status')).toContainText('noch verwendet');
 await page.locator('#stage2d-dialog').getByRole('button',{name:'Hinzufügen',exact:true}).click();await page.locator('[data-stage2d-field=resource-type]').selectOption('shape');await page.locator('#stage2d-dialog').getByRole('button',{name:'In dieser Szene verwenden',exact:true}).click();await page.locator('#stage2d-dialog').getByRole('button',{name:'Schließen',exact:true}).click();await expect(page.locator('#stage .stage2d-canvas')).toHaveAttribute('data-stage2d-actors','9');
});
test('all checkbox presentations are slide toggles and native keyboard operation is retained',async({page})=>{
 await ready(page);const toggle=page.locator('[data-stage2d-field=camera]');await expect(toggle).toBeChecked();expect(await toggle.evaluate(e=>getComputedStyle(e).appearance)).toBe('none');expect(await toggle.evaluate(e=>getComputedStyle(e).borderRadius)).toBe('999px');await toggle.focus();await page.keyboard.press('Space');await expect(toggle).not.toBeChecked();await expect(toggle).toBeFocused();await page.keyboard.press('Space');await expect(toggle).toBeChecked();
 const offenders=await page.locator('input[type=checkbox]').evaluateAll(nodes=>nodes.filter(n=>!n.closest('.safe-switch,.board-approval-switch,.storage-switch')&&getComputedStyle(n).appearance!=='none').map(n=>n.id));expect(offenders).toEqual([]);
});

test('mutable scene edits cannot poison cached poses, and two shared robots render independently on different stages',async({page})=>{
 await ready(page);await page.locator('#timeline').fill('4.9');const canvas=page.locator('#stage .stage2d-canvas'),before=await canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL());const scale=page.locator('[data-stage2d-field=collector-scale]');await scale.fill('1.3');await scale.dispatchEvent('change');await expect.poll(()=>canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL())).not.toBe(before);await page.locator('#undo-project').click();await expect.poll(()=>canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL())).toBe(before);
 const result=await page.evaluate(async url=>{const {parseProject,validateProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{Stage2DRenderer}=await import(/* @vite-ignore */ '/src/scripts/stage2d.ts' as string),{defaultAction2D}=await import(/* @vite-ignore */ '/src/lib/stage2d.ts' as string);const p=parseProject(await(await fetch(url)).text()),shot=p.scenes[0].stage2d!,blue=structuredClone(shot.actors[0]);blue.id='blue';blue.name='Blau';blue.x=740;blue.color='#4488ff';blue.actions=[{...defaultAction2D('wave'),at:0,duration:2}];shot.actors.push(blue);shot.transition=null;shot.ending=null;const next=structuredClone(p.scenes[0]);next.id='night-scene';next.stage2d!.stage='night-garden';p.scenes.push(next);validateProject(p);const r=await new Stage2DRenderer().init(),c=document.createElement('canvas');try{r.render(shot,16,1,640,360,c,p);const first=c.toDataURL(),pixels=c.getContext('2d')!.getImageData(0,0,640,360).data;let blues=0,corals=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i+2]>150&&pixels[i+2]>pixels[i]*1.4)blues++;if(pixels[i]>180&&pixels[i]>pixels[i+1]*1.3)corals++;}r.render(next.stage2d!,16,1,640,360,c,p);const night=c.toDataURL();r.render(shot,16,1,640,360,c,p);return {blues,corals,different:night!==first,repeat:first===c.toDataURL(),resources:Object.keys(p.objects2d).length};}finally{r.dispose();}},url);expect(result.blues).toBeGreaterThan(200);expect(result.corals).toBeGreaterThan(200);expect(result.different).toBe(true);expect(result.repeat).toBe(true);expect(result.resources).toBe(4);
});

test('new action types and camera keys can be added through the UI and scene duration retimes them',async({page})=>{
 await ready(page);await page.locator('details:has(>fieldset[data-actor-id=spark]) > summary').click();const spark=page.locator('[data-actor-id=spark]');await spark.locator('[data-stage2d-field=spark-new-action]').selectOption('attach');await spark.getByRole('button',{name:'Aktion +',exact:true}).click();await expect(spark.locator('[data-action-index="3"] [data-stage2d-field$="-type"]')).toHaveValue('attach');await expect(spark.locator('[data-action-index="3"] [data-stage2d-field$="-target"]')).toHaveValue('collector');
 await page.locator('[data-stage2d-editor]').getByRole('button',{name:'Kamera / Parallaxe +',exact:true}).click();await expect(page.locator('[data-stage2d-field^="camera-"][data-stage2d-field$="-at"]')).toHaveCount(7);
 await page.locator('#scene-form [name=duration]').fill('8');await page.locator('#scene-form [name=duration]').dispatchEvent('change');await expect(page.locator('#timeline')).toHaveAttribute('max','8');
 const pending=page.waitForEvent('download');await page.locator('#save-project').click();const file=await pending,p=JSON.parse(await readFile((await file.path())!,'utf8'));expect(p.scenes[0].stage2d.actors[1].actions[0].duration).toBeCloseTo(16*8/17);expect(p.scenes[0].stage2d.camera).toHaveLength(7);expect(p.scenes[0].stage2d.actors[1].actions[3].at).toBeCloseTo(8.05*8/17);
});

test('2D resource overlay shares the 3D layout and previews only the selected resource',async({page})=>{
 await ready(page);
 await page.locator('#open-stage3d').click();
 const reference=await page.locator('#stage3d-dialog').evaluate(el=>({width:el.getBoundingClientRect().width,header:getComputedStyle(el.querySelector('.json-header')!).padding,library:getComputedStyle(el.querySelector('.stage3d-library')!).borderRadius}));
 await page.locator('#stage3d-close').click();
 await page.locator('#open-stage2d').click();
 const dialog=page.locator('#stage2d-dialog'),canvas=dialog.locator('#stage2d-resource-preview canvas');
 await expect(canvas).toHaveAttribute('data-stage2d-time','0');
 await expect(canvas).toHaveAttribute('data-stage2d-actors','1');
 await expect(dialog.locator('#stage2d-fields legend')).toHaveText(['Allgemein','Aussehen']);
 await expect(dialog.locator('.stage3d-color-swatch output').first()).toHaveText('#F28B70');
 const layout=await dialog.evaluate(el=>({
  width:el.getBoundingClientRect().width,
  header:getComputedStyle(el.querySelector('.json-header')!).padding,
  library:getComputedStyle(el.querySelector('.stage3d-library')!).borderRadius,
  fits:el.getBoundingClientRect().left>=0&&el.getBoundingClientRect().right<=innerWidth&&el.getBoundingClientRect().bottom<=innerHeight,
  overflow:el.querySelector('.dialog-inner')!.scrollWidth<=el.querySelector('.dialog-inner')!.clientWidth+1,
  buttons:[...el.querySelectorAll('button')].every(b=>!!b.querySelector('svg')&&!!b.title&&b.title===b.getAttribute('aria-label')&&b.getBoundingClientRect().width>=44&&b.getBoundingClientRect().height>=44)
 }));
 expect({width:layout.width,header:layout.header,library:layout.library}).toEqual(reference);
 expect(layout.fits&&layout.overflow&&layout.buttons).toBe(true);
 const first=await canvas.evaluate(el=>(el as HTMLCanvasElement).toDataURL());
 await dialog.locator('[data-stage2d-field=resource-color]').fill('#4488ff');
 await dialog.locator('[data-stage2d-field=resource-color]').dispatchEvent('change');
 await expect(canvas).toHaveAttribute('data-stage2d-time','0');
 await expect(dialog.locator('.stage3d-color-swatch output').first()).toHaveText('#4488FF');
 expect(await canvas.evaluate(el=>(el as HTMLCanvasElement).toDataURL())).not.toBe(first);
 await dialog.locator('[data-stage2d-field=resource]').selectOption('spark');
 await expect(canvas).toHaveAttribute('aria-label','Ressourcenvorschau · Lichtfunke');
 await dialog.locator('[data-stage2d-field=resource-kind]').selectOption('stages2d');
 await expect(canvas).toHaveAttribute('data-stage2d-actors','0');
 await dialog.getByRole('button',{name:'Schließen',exact:true}).click();
 await expect(dialog).not.toBeVisible();
 await page.locator('#open-stage2d').click();
 await expect(canvas).toHaveAttribute('data-stage2d-time','0');
 await page.keyboard.press('Escape');
 await expect(dialog).not.toBeVisible();
});

test('storyboard shows sketch first and real 2D resource previews for characters, objects and settings',async({page})=>{
 await ready(page);await page.locator('#open-storyboard').click();
 for(const [tab,id,actors]of [['characters','collector','1'],['objects','spark','1'],['settings','forest','0']] as const){
  await page.locator('[data-board-tab='+tab+']').click();
  const visuals=page.locator('.board-visuals'),canvas=visuals.locator('.board-resource2d-canvas canvas');
  await expect(visuals.locator(':scope > section').first()).toHaveClass(/board-image-field/);
  await expect(canvas).toHaveAttribute('data-stage2d-time','0');
  await expect(canvas).toHaveAttribute('data-stage2d-actors',actors);
  await expect(visuals.locator('[data-board-resource2d='+id+']')).toBeVisible();
  await expect(visuals.locator('.board-model-tile')).toHaveCount(0);
  const layout=await visuals.evaluate(el=>{
   const sketch=el.children[0].getBoundingClientRect(),resource=el.children[1].getBoundingClientRect();
   return {beside:Math.abs(sketch.top-resource.top)<2,wide:el.getBoundingClientRect().width>=740,overflow:el.scrollWidth>el.clientWidth+1,sketchLeft:sketch.left,resourceLeft:resource.left};
  });
  expect(layout.beside).toBe(layout.wide);expect(layout.overflow).toBe(false);if(layout.wide)expect(layout.sketchLeft).toBeLessThan(layout.resourceLeft);
 }
 await page.locator('[data-board-item=night-garden]').click();
 await expect(page.locator('.board-resource2d-canvas canvas')).toHaveAttribute('aria-label','2D-Ressource · Nachtgarten');
 await page.locator('#storyboard-close').click();
 await expect(page.locator('#stage .stage2d-canvas')).toHaveAttribute('data-stage2d-time','0');
});

test('storyboard 2D resource assignment persists, can be cleared, and follows representation settings',async({page})=>{
 await ready(page);await page.locator('#open-storyboard').click();await page.locator('[data-board-tab=characters]').click();
 const key='characters-collector-',visuals=page.locator('.board-visuals'),canvas=visuals.locator('.board-resource2d-canvas canvas');
 const choose=async(field:string,value:string)=>{await page.locator('[data-board-edit="'+key+field+'"]').click();await page.locator('#storyboard-field-select').selectOption(value);await page.locator('#storyboard-field-apply').click();};
 await choose('resource2d','');await expect(canvas).toHaveCount(0);await expect(visuals).toContainText('Keine zugeordnete 2D-Ressource vorhanden.');
 await choose('resource2d','spark');await expect(canvas).toHaveAttribute('aria-label','2D-Ressource · Lichtfunke');
 await choose('mode','3d');await expect(visuals.locator('.board-resource2d-tile')).toHaveCount(0);await expect(visuals.locator('.board-model-tile h4')).toHaveText('3D-Ressource');
 await choose('mode','inherit');await expect(canvas).toHaveAttribute('aria-label','2D-Ressource · Lichtfunke');await expect(visuals.locator('.board-model-tile')).toHaveCount(0);
 await page.locator('#storyboard-save').click();await page.locator('#storyboard-close').click();
 const pending=page.waitForEvent('download');await page.locator('#save-project').click();const saved=JSON.parse(await readFile((await(await pending).path())!,'utf8'));
 expect(saved.storyboard.characters[0].resource2d).toBe('spark');expect(saved.scenes[0].stage2d.actors[0].object).toBe('collector');expect(saved.objects2d.collector.color).toBe('#f28b70');
 await page.locator('#open-storyboard').click();await page.locator('[data-board-tab=characters]').click();await expect(canvas).toHaveAttribute('aria-label','2D-Ressource · Lichtfunke');
});

test('free vector bird and city animate deterministically in scene preview and export',async({page})=>{
 const {free2DProject}=await import('../src/lib/free2d-example'),p=free2DProject();
 await page.route('**'+url,r=>r.fulfill({contentType:'application/json',body:JSON.stringify(p)}));
 await page.goto('/de/');await expect(page.locator('#editor')).toHaveAttribute('data-ready','true');
 const canvas=page.locator('#stage .stage2d-canvas');await expect(canvas).toHaveAttribute('data-stage2d-stage','city');
 await page.locator('#timeline').fill('0.5');await expect(canvas).toHaveAttribute('data-stage2d-time','0.5');
 const first=await canvas.evaluate(c=>(c as HTMLCanvasElement).toDataURL());
 await page.locator('#timeline').fill('0.1');await expect(canvas).toHaveAttribute('data-stage2d-time','0.1');expect(await canvas.evaluate(c=>(c as HTMLCanvasElement).toDataURL())).not.toBe(first);
 await page.locator('#timeline').fill('0.5');await expect(canvas).toHaveAttribute('data-stage2d-time','0.5');expect(await canvas.evaluate(c=>(c as HTMLCanvasElement).toDataURL())).toBe(first);
 const exported=await page.evaluate(async()=>{
  const {parseProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  const p=parseProject(await(await fetch('/examples/light-collector.scenescript.json')).text()),m=new ExportMedia(p,new AbortController().signal),r=new ExportRenderer(p,m);
  try{const canvas=await r.frame(.5,1920,1080);return canvas.toDataURL();}finally{r.dispose();m.dispose();}
 });expect(exported).toBe(first);
 await page.locator('#open-stage2d').click();await expect(page.locator('[data-stage2d-field=resource-type]')).toHaveValue('custom');await expect(page.locator('#stage2d-fields textarea')).toHaveValue(/"wing"/);
});

test('butterflies emerge at the star burst and follow wobbling flowers into a separate night scene',async({page},info)=>{
 await ready(page);
 const data=await page.evaluate(async url=>{
  const {parseProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{createStage2DScene}=await import(/* @vite-ignore */ '/src/scripts/stage2d-scene.ts' as string),{GARDEN_LANDINGS,BUTTERFLY_BIRTH}=await import(/* @vite-ignore */ '/src/lib/light-collector-garden.ts' as string),{Stage2DRenderer}=await import(/* @vite-ignore */ '/src/scripts/stage2d.ts' as string);
  const p=parseProject(await(await fetch(url)).text()),shot=p.scenes[0].stage2d!,scene=createStage2DScene(p,shot),renderer=await new Stage2DRenderer().init(),canvas=document.createElement('canvas');
  const find=(root:any,label:string):any=>root.label===label?root:root.children?.map((c:any)=>find(c,label)).find(Boolean);
  const landings=GARDEN_LANDINGS.map((l:any)=>{
   const butterfly=find(scene.root,'butterfly-'+l.id),flower=find(scene.root,l.flower),node=find(butterfly,'actor-pose'),hand=find(flower,'hand');
   const at=(time:number)=>{scene.draw(time);const a=node.toGlobal({x:0,y:0}),b=hand.toGlobal({x:0,y:0});return {distance:Math.hypot(a.x-b.x,a.y-b.y),x:a.x,y:a.y};};
   const before=at(l.at-.5),contact=at(l.at),reaction=at(l.at+.14),settled=at(16.9);return {before,contact,reaction,settled};
  });
  scene.draw(BUTTERFLY_BIRTH.at-.01);const hidden=GARDEN_LANDINGS.map((l:any)=>find(find(scene.root,'butterfly-'+l.id),'insect').alpha);
  scene.draw(BUTTERFLY_BIRTH.at+.5);const emerged=GARDEN_LANDINGS.map((l:any)=>find(find(scene.root,'butterfly-'+l.id),'insect').alpha);
  const frames=[];try{for(const time of [8.04,8.3,10.5,14.7,16.5,20.5,14.7]){const index=time>=17?1:0;renderer.render(p.scenes[index].stage2d!,p.scenes[index].duration,time-(index?17:0),960,540,canvas,p);frames.push({time,png:canvas.toDataURL()});}}finally{renderer.dispose();scene.root.destroy({children:true});}
  return {landings,hidden,emerged,frames};
 },url);
 expect(data.hidden).toEqual([0,0,0]);expect(data.emerged).toEqual([1,1,1]);
 for(const landing of data.landings){expect(landing.before.distance).toBeGreaterThan(2);expect(landing.contact.distance).toBeLessThan(.001);expect(landing.reaction.distance).toBeLessThan(.001);expect(landing.settled.distance).toBeLessThan(.001);expect(Math.abs(landing.reaction.x-landing.contact.x)).toBeGreaterThan(3);}
 expect(data.frames[3].png).toBe(data.frames.at(-1)!.png);
 for(const frame of data.frames.slice(0,-1))await info.attach('Schmetterlinge-'+frame.time,{body:Buffer.from(frame.png.split(',')[1],'base64'),contentType:'image/png'});
 await page.locator('#timeline').fill('20.5');await expect(page.locator('#stage .stage2d-canvas')).toHaveAttribute('data-stage2d-time','3.5');
});
