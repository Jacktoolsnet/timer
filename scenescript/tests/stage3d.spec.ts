import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {stage3DExample} from '../src/lib/stage3d-example';
async function load(page:any){await page.goto('/en/');await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(stage3DExample));await page.locator('#import-json').click();await expect(page.locator('#json-dialog')).not.toBeVisible();await expect(page.locator('#stage .stage3d-canvas')).toHaveAttribute('data-stage3d-time','0');}

test('3D loads only on demand; the two-scene robot demo includes a real cover',async({page})=>{
 test.setTimeout(60000);const requests:string[]=[];page.on('request',r=>requests.push(r.url()));page.on('dialog',d=>d.accept());await page.goto('/en/');expect(requests.some(u=>u.includes('/src/scripts/stage3d.ts')||u.includes('/deps/three.js'))).toBe(false);
 await page.locator('#open-stage3d').click();await page.locator('#stage3d-demo').click();await expect(page.locator('#stage3d-dialog')).not.toBeVisible({timeout:30000});await expect(page.locator('#project-title')).toHaveValue(stage3DExample.title);await expect(page.locator('#thumbnail-content img')).toHaveAttribute('src',/^data:image\/png;base64,/);
 await expect(page.locator('#stage .stage3d-canvas')).toHaveAttribute('data-stage3d-stage','plaza');await page.locator('#timeline').fill('8');await expect(page.locator('#stage .stage3d-canvas').last()).toHaveAttribute('data-stage3d-time','1');
 const file=page.waitForEvent('download');await page.locator('#save-project').click();const p=JSON.parse(await readFile((await (await file).path())!,'utf8'));expect(Object.keys(p.characters)).toEqual(['mika','bo']);expect(p.scenes).toHaveLength(2);expect(p.thumbnail.data.length).toBeGreaterThan(1000);
});

test('resource edits apply project-wide and individual imports copy or explicitly update IDs',async({page})=>{
 await load(page);await page.locator('#open-stage3d').click();await page.locator('#stage3d-resource').selectOption('mika');await page.locator('[data-resource-field=name]').fill('Mika II');
 const download=page.waitForEvent('download');await page.locator('#stage3d-export').click();const resource=await download;expect(resource.suggestedFilename()).toBe('mika.scenecharacter.json');const source=await readFile((await resource.path())!,'utf8');expect(JSON.parse(source).definition.name).toBe('Mika II');
 await page.locator('#stage3d-file').setInputFiles({name:'mika.scenecharacter.json',mimeType:'application/json',buffer:Buffer.from(source)});await expect(page.locator('#stage3d-resource')).toHaveValue('mika_2');
 await page.locator('#stage3d-import-mode').selectOption('update');await page.locator('#stage3d-file').setInputFiles({name:'mika.scenecharacter.json',mimeType:'application/json',buffer:Buffer.from(source)});await expect(page.locator('#stage3d-resource')).toHaveValue('mika');expect(await page.locator('#stage3d-resource option').count()).toBe(3);
 await page.locator('#stage3d-apply').click();await expect(page.locator('#stage3d-dialog')).not.toBeVisible();const saved=page.waitForEvent('download');await page.locator('#save-project').click();const p=JSON.parse(await readFile((await (await saved).path())!,'utf8'));expect(p.characters.mika.name).toBe('Mika II');expect(p.scenes[1].stage3d.actors[0].character).toBe('mika');
 await page.locator('#undo-project').click();await page.locator('#open-stage3d').click();await expect(page.locator('[data-resource-field=name]')).toHaveValue('Mika');await page.locator('#stage3d-close').click();
});

test('invalid scene shots and referenced resource deletion do not mutate the project',async({page})=>{
 await load(page);await page.locator('#open-stage3d').click();await page.locator('#stage3d-remove').click();await expect(page.locator('#stage3d-status')).toContainText('used by a scene');
 await page.locator('#stage3d-shot').fill('{"stage":"missing"}');await page.locator('#stage3d-apply').click();await expect(page.locator('#stage3d-status')).toContainText('missing stage');await expect(page.locator('#stage3d-dialog')).toBeVisible();await page.locator('#stage3d-close').click();await page.locator('#open-stage3d').click();expect(JSON.parse(await page.locator('#stage3d-shot').inputValue()).stage).toBe('plaza');
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
  const {validateProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{exportVideo,exportSupported}=await import(/* @vite-ignore */ '/src/scripts/video-export.ts' as string);const p=validateProject(source);p.scenes=p.scenes.slice(0,1);p.scenes[0].duration=.3;p.scenes[0].elements=[];p.scenes[0].stage3d.actors.forEach((a:any)=>{a.at=0;a.duration=.3;});const o={format:'mp4',resolution:480,fps:24,audio:false};if(!await exportSupported(p,o))return null;
  const blob=await exportVideo(p,o,new AbortController().signal,()=>{}),url=URL.createObjectURL(blob),video=document.createElement('video');video.src=url;video.muted=true;try{await new Promise<void>((resolve,reject)=>{video.onloadeddata=()=>resolve();video.onerror=()=>reject(new Error('cannot decode MP4'));});await new Promise<void>(resolve=>{video.onseeked=()=>resolve();video.currentTime=.1;});const c=document.createElement('canvas');c.width=video.videoWidth;c.height=video.videoHeight;c.getContext('2d')!.drawImage(video,0,0);const data=c.getContext('2d')!.getImageData(0,0,c.width,c.height).data;let min=255,max=0;for(let i=0;i<data.length;i+=4){min=Math.min(min,data[i]);max=Math.max(max,data[i]);}return {bytes:blob.size,type:blob.type,width:c.width,range:max-min};}finally{video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
 },stage3DExample);test.skip(!result,'MP4 encoder unavailable');expect(result!.bytes).toBeGreaterThan(1000);expect(result!.type).toBe('video/mp4');expect(result!.width).toBe(854);expect(result!.range).toBeGreaterThan(100);
});

test('3D dialog fits tablet and desktop and has translated controls',async({page})=>{
 for(const [lang,title] of [['de','3D-Bühnen & Charaktere'],['en','3D stages & characters'],['es','Escenarios y personajes 3D'],['fr','Décors et personnages 3D']]){await page.goto(`/${lang}/`);await page.locator('#open-stage3d').click();await expect(page.locator('#stage3d-title')).toHaveText(title);expect(await page.locator('#stage3d-dialog').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);await page.locator('#stage3d-close').click();}
});


test('unavailable WebGL2 reports a preview error and rejects export instead of a blank file',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:any,...args:any[]):any{if(type==='webgl2')return null;return original.apply(this,[type,...args] as any);};});
 await page.goto('/en/');await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(stage3DExample));await page.locator('#import-json').click();await expect(page.locator('#editor-status')).toContainText('WebGL 2 is not available');
 const result=await page.evaluate(async(source)=>{const {validateProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{exportStill}=await import(/* @vite-ignore */ '/src/scripts/still-export.ts' as string);try{await exportStill(validateProject(source),1,new AbortController().signal);return 'unexpected success';}catch(e){return (e as Error).message;}},stage3DExample);
 expect(result).toContain('WebGL 2 is not available');expect(await page.locator('[data-export-renderer]').count()).toBe(0);
});
