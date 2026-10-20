import {validateProject} from '../src/lib/model';
import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {stage3DExample} from '../src/lib/stage3d-example';
async function load(page:any){await page.goto('/en/');await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(stage3DExample));await page.locator('#import-json').click();await expect(page.locator('#json-dialog')).not.toBeVisible();await expect(page.locator('#stage .stage3d-canvas')).toHaveAttribute('data-stage3d-time','0');}

test('3D loads only on demand; the two-scene robot demo includes a real cover',async({page})=>{
 test.setTimeout(60000);const requests:string[]=[];page.on('request',r=>requests.push(r.url()));page.on('dialog',d=>d.accept());await page.goto('/en/');expect(requests.some(u=>u.includes('/src/scripts/stage3d.ts')||u.includes('/deps/three.js'))).toBe(false);
 await page.locator('#open-stage3d').click();await page.locator('#stage3d-demo').click();await expect(page.locator('#stage3d-dialog')).not.toBeVisible({timeout:30000});await expect(page.locator('#project-title')).toHaveValue(stage3DExample.title);await expect(page.locator('#thumbnail-content img')).toHaveAttribute('src',/^data:image\/png;base64,/);
 await expect(page.locator('#stage .stage3d-canvas')).toHaveAttribute('data-stage3d-stage','plaza');await page.locator('#timeline').fill('8');await expect(page.locator('#stage .stage3d-canvas').last()).toHaveAttribute('data-stage3d-time','1');
 const file=page.waitForEvent('download');await page.locator('#save-project').click();const p=JSON.parse(await readFile((await (await file).path())!,'utf8'));expect(Object.keys(p.characters)).toEqual(['mika','bo','lina']);expect(p.scenes).toHaveLength(2);expect(p.thumbnail.data.length).toBeGreaterThan(1000);
});

test('resource edits apply project-wide and individual imports copy or explicitly update IDs',async({page})=>{
 await load(page);await page.locator('#open-stage3d').click();await page.locator('#stage3d-resource').selectOption('mika');await page.locator('[data-resource-field=name]').fill('Mika II');
 const download=page.waitForEvent('download');await page.locator('#stage3d-export').click();const resource=await download;expect(resource.suggestedFilename()).toBe('mika.scenecharacter.json');const source=await readFile((await resource.path())!,'utf8');expect(JSON.parse(source).definition.name).toBe('Mika II');
 await page.locator('#stage3d-file').setInputFiles({name:'mika.scenecharacter.json',mimeType:'application/json',buffer:Buffer.from(source)});await expect(page.locator('#stage3d-resource')).toHaveValue('mika_2');
 await page.locator('#stage3d-import-mode').selectOption('update');await page.locator('#stage3d-file').setInputFiles({name:'mika.scenecharacter.json',mimeType:'application/json',buffer:Buffer.from(source)});await expect(page.locator('#stage3d-resource')).toHaveValue('mika');expect(await page.locator('#stage3d-resource option').count()).toBe(4);
 await page.locator('#stage3d-apply').click();await expect(page.locator('#stage3d-dialog')).not.toBeVisible();const saved=page.waitForEvent('download');await page.locator('#save-project').click();const p=JSON.parse(await readFile((await (await saved).path())!,'utf8'));expect(p.characters.mika.name).toBe('Mika II');expect(p.scenes[1].stage3d.actors[0].character).toBe('mika');
 await page.locator('#undo-project').click();await page.locator('#open-stage3d').click();await expect(page.locator('[data-resource-field=name]')).toHaveValue('Mika');await page.locator('#stage3d-close').click();
});

test('invalid scene shots and referenced resource deletion do not mutate the project',async({page})=>{
 await load(page);await page.locator('#open-stage3d').click();await page.locator('#stage3d-remove').click();await expect(page.locator('#stage3d-status')).toContainText('used by a scene');
 await page.locator('#stage3d-scene-settings summary').click();await page.locator('#stage3d-shot').fill('{"stage":"missing"}');await page.locator('#stage3d-apply').click();await expect(page.locator('#stage3d-status')).toContainText('missing stage');await expect(page.locator('#stage3d-dialog')).toBeVisible();await page.locator('#stage3d-close').click();await page.locator('#open-stage3d').click();expect(JSON.parse(await page.locator('#stage3d-shot').inputValue()).stage).toBe('plaza');
 await page.locator('#stage3d-kind').selectOption('stage');const download=page.waitForEvent('download');await page.locator('#stage3d-export').click();const f=await download;expect(f.suggestedFilename()).toBe('plaza.scenestage.json');await page.locator('#stage3d-close').click();
});

test('absolute-time preview and export agree, reverse seeks are stable, and renderer is reused',async({page})=>{
 test.setTimeout(60000);await load(page);const result=await page.evaluate(async(source)=>{
  const {validateProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{Stage3DRenderer}=await import(/* @vite-ignore */ '/src/scripts/stage3d.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string),{ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string);
  const p=validateProject(source);p.scenes[0].elements=[];const renderer=new Stage3DRenderer(),media=new ExportMedia(p,new AbortController().signal),output=new ExportRenderer(p,media),canvas=document.createElement('canvas');
  const pixels=(c:HTMLCanvasElement)=>Array.from(c.getContext('2d')!.getImageData(0,0,c.width,c.height).data);
  try{renderer.render(p,p.scenes[0].stage3d,2,480,270,canvas);const first=pixels(canvas);renderer.render(p,p.scenes[0].stage3d,5,480,270,canvas);const later=pixels(canvas);for(let i=0;i<25;i++)renderer.render(p,p.scenes[0].stage3d,i/7,480,270,canvas);renderer.render(p,p.scenes[0].stage3d,2,480,270,canvas);const repeated=pixels(canvas);
   // Match native resolution first: the export compositor downsamples its 3D background.
   const native=document.createElement('canvas');renderer.render(p,p.scenes[0].stage3d,2,1920,1080,native);const expected=document.createElement('canvas');expected.width=480;expected.height=270;expected.getContext('2d')!.drawImage(native,0,0,480,270);const actual=await output.frame(2,480,270),a=pixels(actual),e=pixels(expected);let error=0;for(let i=0;i<a.length;i++)error+=Math.abs(a[i]-e[i]);return {stable:first.every((v,i)=>v===repeated[i]),animated:first.some((v,i)=>v!==later[i]),meanError:error/a.length,colors:new Set(first.filter((_,i)=>i%4===0)).size};
  }finally{renderer.dispose();output.dispose();media.dispose();}
 },stage3DExample);
 expect(result.stable).toBe(true);expect(result.animated).toBe(true);expect(result.meanError).toBeLessThan(1);expect(result.colors).toBeGreaterThan(50);expect(await page.locator('[data-export-renderer]').count()).toBe(0);
});

test('short 3D MP4 export contains rendered scene pixels',async({page})=>{
 test.setTimeout(90000);await page.goto('/en/');const result=await page.evaluate(async(source)=>{
  const {validateProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{exportVideo,exportSupported}=await import(/* @vite-ignore */ '/src/scripts/video-export.ts' as string);const p=validateProject(source);p.scenes=p.scenes.slice(0,1);p.scenes[0].duration=.3;p.scenes[0].elements=[];p.scenes[0].stage3d.actors.forEach((a:any)=>{a.at=0;a.duration=.3;a.expressions=[];a.actions=[{...a.actions[0],type:'wave',at:0,duration:.3,toX:null,toZ:null,rotation:null,target:'',faceMovement:false}];});const o={format:'mp4',resolution:480,fps:24,audio:false};if(!await exportSupported(p,o))return null;
  const blob=await exportVideo(p,o,new AbortController().signal,()=>{}),url=URL.createObjectURL(blob),video=document.createElement('video');video.src=url;video.muted=true;try{await new Promise<void>((resolve,reject)=>{video.onloadeddata=()=>resolve();video.onerror=()=>reject(new Error('cannot decode MP4'));});await new Promise<void>(resolve=>{video.onseeked=()=>resolve();video.currentTime=.1;});const c=document.createElement('canvas');c.width=video.videoWidth;c.height=video.videoHeight;c.getContext('2d')!.drawImage(video,0,0);const data=c.getContext('2d')!.getImageData(0,0,c.width,c.height).data;let min=255,max=0;for(let i=0;i<data.length;i+=4){min=Math.min(min,data[i]);max=Math.max(max,data[i]);}return {bytes:blob.size,type:blob.type,width:c.width,range:max-min};}finally{video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
 },stage3DExample);test.skip(!result,'MP4 encoder unavailable');expect(result!.bytes).toBeGreaterThan(1000);expect(result!.type).toBe('video/mp4');expect(result!.width).toBe(854);expect(result!.range).toBeGreaterThan(100);
});

test('3D dialog fits tablet and desktop and has translated controls',async({page})=>{
 for(const [lang,title] of [['de','3D-Bühnen & Charaktere'],['en','3D stages & characters'],['es','Escenarios y personajes 3D'],['fr','Décors et personnages 3D']]){await page.goto(`/${lang}/`);await page.locator('#open-stage3d').click();await expect(page.locator('#stage3d-title')).toHaveText(title);expect(await page.locator('#stage3d-dialog').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
  const buttons=page.locator('#stage3d-dialog button');await expect(buttons).toHaveCount(9);
  for(const button of await buttons.all()){await expect(button).toHaveText('');await expect(button.locator('svg[aria-hidden=true]')).toHaveCount(1);const label=await button.getAttribute('aria-label');expect(label).toBeTruthy();await expect(button).toHaveAttribute('title',label!);if(await button.isVisible()){const bounds=await button.boundingBox();expect(bounds!.width).toBeGreaterThanOrEqual(44);expect(bounds!.height).toBeGreaterThanOrEqual(44);}}
  await page.locator('#stage3d-close').click();}
});


test('unavailable WebGL2 reports a preview error and rejects export instead of a blank file',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:any,...args:any[]):any{if(type==='webgl2')return null;return original.apply(this,[type,...args] as any);};});
 await page.goto('/en/');await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(stage3DExample));await page.locator('#import-json').click();await expect(page.locator('#editor-status')).toContainText('WebGL 2 is not available');
 const result=await page.evaluate(async(source)=>{const {validateProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{exportStill}=await import(/* @vite-ignore */ '/src/scripts/still-export.ts' as string);try{await exportStill(validateProject(source),1,new AbortController().signal);return 'unexpected success';}catch(e){return (e as Error).message;}},stage3DExample);
 expect(result).toContain('WebGL 2 is not available');expect(await page.locator('[data-export-renderer]').count()).toBe(0);
});


test('3D dropdowns and popup options follow the theme and support keyboard selection',async({page})=>{
 await page.goto('/en/');await page.locator('#open-stage3d').click();const selects=page.locator('#stage3d-dialog select');await expect(selects).toHaveCount(6);
 for(const select of await selects.all()){await expect(select).toHaveCSS('border-radius','10px');if(await select.isVisible())expect(await select.evaluate(n=>n.getBoundingClientRect().height)).toBeGreaterThanOrEqual(40);}
 const kind=page.locator('#stage3d-kind'),baseSelect=await page.evaluate(()=>CSS.supports('appearance','base-select'));
 for(const theme of ['light','dark']){
  await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
  if(baseSelect){await kind.click();await expect.poll(()=>kind.evaluate(n=>n.matches(':open'))).toBe(true);
   const styles=await kind.evaluate(n=>{const picker=getComputedStyle(n,'::picker(select)'),selected=getComputedStyle(n.querySelector('option:checked')!);return {appearance:picker.appearance,radius:picker.borderRadius,background:picker.backgroundColor,optionRadius:selected.borderRadius,optionWeight:selected.fontWeight,checkmark:getComputedStyle(n.querySelector('option:checked')!,'::checkmark').color};});
   expect(styles.appearance).toBe('base-select');expect(styles.radius).toBe('14px');expect(styles.background).not.toBe('rgba(0, 0, 0, 0)');expect(styles.optionRadius).toBe('8px');expect(styles.optionWeight).toBe('600');expect(styles.checkmark).not.toBe('rgba(0, 0, 0, 0)');await page.keyboard.press('Escape');await expect(page.locator('#stage3d-dialog')).toBeVisible();
  }
 }
 await kind.focus();await page.keyboard.press('Space');await page.keyboard.press('End');await page.keyboard.press('Enter');await expect(kind).toHaveValue('stage');await page.locator('#stage3d-add').click();await expect(page.locator('[data-resource-field=skyColor]')).toBeVisible();
 await page.locator('#stage3d-close').click();
});


async function resourcePixels(page:any){return page.locator('#stage3d-resource-preview canvas').evaluate((c:HTMLCanvasElement)=>c.toDataURL());}

test('selected characters have their own formatted settings and isolated live preview on the right',async({page})=>{
 await load(page);await page.locator('#open-stage3d').click();await expect(page.locator('#stage3d-resource-label')).toHaveText('Character');
 await expect(page.locator('.stage3d-library [data-resource-field]')).toHaveCount(0);await expect(page.locator('.stage3d-details [data-resource-field]')).toHaveCount(8);await expect(page.locator('#stage3d-fields fieldset')).toHaveCount(2);
 const canvas=page.locator('#stage3d-resource-preview canvas');await expect(canvas).toHaveAttribute('data-resource3d-id','mika');await expect(canvas).toHaveAttribute('data-stage3d-time','0');await expect(canvas).toHaveAttribute('aria-label','Mika');
 const left=(await page.locator('.stage3d-library').boundingBox())!,right=(await page.locator('.stage3d-details').boundingBox())!;expect(right.x).toBeGreaterThanOrEqual(left.x+left.width);const previewBox=(await canvas.boundingBox())!,footer=(await page.locator('#stage3d-dialog footer').boundingBox())!;expect(previewBox.y+previewBox.height).toBeLessThanOrEqual(footer.y);
 const original=await resourcePixels(page);await page.locator('[data-resource-field=bodyColor]').fill('#ff0055');await expect.poll(()=>resourcePixels(page)).not.toBe(original);await expect(page.locator('.stage3d-color-swatch output').first()).toHaveText('#FF0055');
 await page.locator('[data-resource-field=name]').fill('Mika preview');await expect(page.locator('#stage3d-detail-title')).toHaveText('Character · Mika preview');await expect(canvas).toHaveAttribute('aria-label','Mika preview');await expect(page.locator('#stage3d-resource option:checked')).toHaveText('mika · Mika preview');
 await page.locator('#stage3d-resource').selectOption('bo');await expect(page.locator('[data-resource-field=name]')).toHaveValue('Bo');await expect(canvas).toHaveAttribute('data-resource3d-id','bo');await expect(canvas).toHaveAttribute('aria-label','Bo');await expect(canvas).toHaveAttribute('data-stage3d-time','0');expect(await resourcePixels(page)).not.toBe(original);
 expect(await page.locator('#stage3d-scene-settings').getAttribute('open')).toBeNull();expect(JSON.parse(await page.locator('#stage3d-shot').inputValue()).actors).toHaveLength(3);
 await page.locator('#stage3d-close').click();await expect(page.locator('#stage3d-resource-preview canvas')).toHaveCount(0);
});

test('a new character previews without a stage assignment, invalid heights are reported, and closing discards edits',async({page})=>{
 await page.goto('/en/');await page.locator('#open-stage3d').click();await page.locator('#stage3d-add').click();const canvas=page.locator('#stage3d-resource-preview canvas');await expect(canvas).toHaveAttribute('data-stage3d-time','0');await expect(canvas).toHaveAttribute('data-resource3d-id','character');await expect(page.locator('#stage3d-shot')).toHaveValue('null');
 await page.locator('[data-resource-field=height]').fill('6');await expect(page.locator('#stage3d-resource-preview-status')).toBeEmpty();await expect(canvas).toHaveAttribute('data-stage3d-time','0');
 await page.locator('[data-resource-field=height]').fill('');await expect(page.locator('#stage3d-resource-preview-status')).toContainText('height');await page.locator('#stage3d-apply').click();await expect(page.locator('#stage3d-dialog')).toBeVisible();await expect(page.locator('#stage3d-status')).toContainText('height');
 await page.locator('[data-resource-field=height]').fill('2');await expect(page.locator('#stage3d-resource-preview-status')).toBeEmpty();await expect(canvas).toHaveAttribute('data-stage3d-time','0');await page.locator('#stage3d-close').click();await page.locator('#open-stage3d').click();await expect(page.locator('#stage3d-resource option')).toHaveCount(0);await page.locator('#stage3d-close').click();
});

test('resource preview ignores broken scene JSON and stage selection does not change scene actors',async({page})=>{
 await load(page);await page.locator('#open-stage3d').click();const shot=await page.locator('#stage3d-shot').inputValue();await page.locator('#stage3d-scene-settings summary').click();await page.locator('#stage3d-shot').fill('{broken');
 await page.locator('[data-resource-field=bodyColor]').fill('#112233');await expect(page.locator('#stage3d-resource-preview canvas')).toHaveAttribute('data-stage3d-time','0');await expect(page.locator('#stage3d-resource-preview-status')).toBeEmpty();
 await page.locator('#stage3d-shot').fill(shot);await page.locator('#stage3d-kind').selectOption('stage');await expect(page.locator('#stage3d-resource-label')).toHaveText('Stage');await expect(page.locator('.stage3d-details [data-resource-field]')).toHaveCount(4);const canvas=page.locator('#stage3d-resource-preview canvas');await expect(canvas).toHaveAttribute('data-resource3d-id','plaza');await expect(canvas).toHaveAttribute('data-stage3d-time','0');
 const before=await resourcePixels(page);await page.locator('[data-resource-field=groundColor]').fill('#ff2277');await expect.poll(()=>resourcePixels(page)).not.toBe(before);expect(await page.locator('#stage3d-shot').inputValue()).toBe(shot);
 await page.locator('#stage3d-apply').click();const pending=page.waitForEvent('download');await page.locator('#save-project').click();const saved=JSON.parse(await readFile((await (await pending).path())!,'utf8'));expect(saved.stages.plaza.groundColor).toBe('#ff2277');expect(saved.scenes[0].stage3d).toEqual(JSON.parse(shot));expect(saved.scenes[1].stage3d).toEqual(validateProject(stage3DExample).scenes[1].stage3d);
});


test('disposing a resource preview before its lazy renderer is ready does not restore its buffers',async({page})=>{
 await page.goto('/en/');const result=await page.evaluate(async()=>{const {resource3DPreview}=await import(/* @vite-ignore */ '/src/lib/stage3d-resource-preview.ts' as string),{defaultCharacter3D}=await import(/* @vite-ignore */ '/src/lib/stage3d.ts' as string),{createStage3DView,prepareStage3DPreview}=await import(/* @vite-ignore */ '/src/scripts/stage3d-preview.ts' as string);const p=resource3DPreview('character','robot',defaultCharacter3D()),errors:string[]=[];const view=createStage3DView(p.project,p.shot,640,480,(e:Error)=>errors.push(e.message),{studio:true});view.dispose();await prepareStage3DPreview();view.draw(1);return {width:view.canvas.width,height:view.canvas.height,errors};});expect(result).toEqual({width:0,height:0,errors:[]});
});


test('AI-authored action lists give identical preview poses when seeking backwards',async({page})=>{
 await load(page);const captures:string[]=[];for(const time of ['0.5','3.8','5','1.2','3.8']){await page.locator('#timeline').fill(time);const canvas=page.locator('#stage .stage3d-canvas');await expect(canvas).toHaveAttribute('data-stage3d-time',String(Number(time)));captures.push(await canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL()));}
 expect(captures[1]).toBe(captures[4]);expect(captures[0]).not.toBe(captures[1]);expect(captures[1]).not.toBe(captures[2]);
});

test('face style selector updates preview and survives standalone and project export',async({page})=>{
 await load(page);await page.locator('#open-stage3d').click();
 const style=page.locator('[data-resource-field=style]');
 for(const [id,expected] of [['mika','robot'],['bo','pixel'],['lina','brick']]){
  await page.locator('#stage3d-resource').selectOption(id);await expect(style).toHaveValue(expected);
  await expect(page.locator('#stage3d-resource-preview canvas')).toHaveAttribute('data-resource3d-id',id);
 }
 const canvas=page.locator('#stage3d-resource-preview canvas');await expect(canvas).toHaveAttribute('data-stage3d-time','0');
 const before=await canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL());await style.selectOption('pixel');
 await expect.poll(()=>canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL())).not.toBe(before);
 const download=page.waitForEvent('download');await page.locator('#stage3d-export').click();
 const resource=JSON.parse(await readFile((await (await download).path())!,'utf8'));expect(resource.definition.style).toBe('pixel');
 await page.locator('#stage3d-apply').click();
 const saved=page.waitForEvent('download');await page.locator('#save-project').click();
 const project=JSON.parse(await readFile((await (await saved).path())!,'utf8'));expect(project.characters.lina.style).toBe('pixel');expect(project.characters.mika.style).toBe('robot');
});

test('base expression previews all styles and survives character export and project save',async({page})=>{
 await load(page);await page.locator('#open-stage3d').click();
 const expression=page.locator('[data-resource-field=expression]');
 for(const id of ['mika','bo','lina']){
  await page.locator('#stage3d-resource').selectOption(id);await expect(expression).toHaveValue('neutral');
  const canvas=page.locator('#stage3d-resource-preview canvas');await expect(canvas).toHaveAttribute('data-stage3d-time','0');
  const before=await canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL());await expression.selectOption('surprised');
  await expect.poll(()=>canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL())).not.toBe(before);
 }
 const pending=page.waitForEvent('download');await page.locator('#stage3d-export').click();
 const resource=JSON.parse(await readFile((await (await pending).path())!,'utf8'));expect(resource.definition.expression).toBe('surprised');
 await page.locator('#stage3d-apply').click();const saved=page.waitForEvent('download');await page.locator('#save-project').click();
 const p=JSON.parse(await readFile((await (await saved).path())!,'utf8'));
 expect(Object.values(p.characters).every((c:any)=>c.expression==='surprised')).toBe(true);
 expect(p.scenes[0].stage3d.actors[0].expressions[0].expression).toBe('surprised');
});

test('face animation rewinds identically on every style without allocating per-frame GPU resources',async({page})=>{
 await page.goto('/en/');
 const result=await page.evaluate(async()=>{
  const {resource3DPreview}=await import(/* @vite-ignore */ '/src/lib/stage3d-resource-preview.ts' as string),{Stage3DRenderer}=await import(/* @vite-ignore */ '/src/scripts/stage3d.ts' as string),{stage3DExample}=await import(/* @vite-ignore */ '/src/lib/stage3d-example.ts' as string),{validateProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string);
  const renderer=new Stage3DRenderer(),results=[];
  try{
   for(const [id,character]of Object.entries(stage3DExample.characters)){
    const v=resource3DPreview('character',id,character);v.project.scenes[0].duration=6;
    v.shot.actors[0].expressions=['happy','sad','angry','surprised','blink'].map((expression,i)=>({expression,at:i+1,duration:i===4?.24:1,intensity:1,blend:.1}));
    validateProject(v.project);
    const canvas=document.createElement('canvas'),draw=(t:number)=>{renderer.render(v.project,v.shot,t,360,360,canvas,true);return canvas.toDataURL();};
    const samples=[0,1.5,2.5,3.5,4.5,5.12].map(draw);
    const world=Array.from((renderer as any).cache.values()).at(-1) as any;
    const geometry=Array.from(world.geometries),materials=Array.from(world.materials.values()),parts=world.robots[0].root.children.length;
    const baseline=draw(1.5);for(let i=0;i<40;i++)draw((i%12)*.45);const repeated=draw(1.5);
    results.push({unique:new Set(samples).size,stable:baseline===repeated,geometryStable:geometry.every(g=>world.geometries.has(g))&&world.geometries.size===geometry.length,materialsStable:materials.every(m=>Array.from(world.materials.values()).includes(m))&&world.materials.size===materials.length,partsStable:parts===world.robots[0].root.children.length});
   }
  }finally{renderer.dispose();}
  return results;
 });
 expect(result).toHaveLength(3);for(const r of result)expect(r).toEqual({unique:6,stable:true,geometryStable:true,materialsStable:true,partsStable:true});
});
