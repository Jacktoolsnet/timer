import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const url='/examples/light-collector.scenescript.json';
async function ready(page:any){await page.goto('/de/');await expect(page.locator('#editor')).toHaveAttribute('data-ready','true');await expect(page.locator('#stage .stage2d-canvas')).toHaveAttribute('data-stage2d-time','0');}
test('Lichtsammler opens as the real default, edits and roundtrips with undo and explicit default restore',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await ready(page);
 await expect(page.locator('#project-title')).toHaveValue('Der kleine Lichtsammler');await expect(page.locator('#timeline')).toHaveAttribute('max','16');await expect(page.locator('#stage .stage3d-canvas')).toHaveCount(0);
 await expect(page.locator('[data-stage2d-track]')).toHaveCount(5);await page.locator('[data-stage2d-track=wave] .timeline-bar').click();await expect(page.locator('#stage .stage2d-canvas')).toHaveAttribute('data-stage2d-time','5.25');
 const title=page.locator('[data-stage2d-field=endingTitle]');await title.fill('Ein neuer Anfang');await title.dispatchEvent('change');await expect(title).toHaveValue('Ein neuer Anfang');
 await page.locator('#undo-project').click();await expect(title).toHaveValue('Manchmal genügt');await page.locator('#redo-project').click();await expect(title).toHaveValue('Ein neuer Anfang');
 await page.locator('[data-stage2d-field=wave]').uncheck();await page.locator('#timeline').fill('4.9');await expect(page.locator('#stage .stage2d-canvas')).toHaveAttribute('data-stage2d-time','4.9');
 const pending=page.waitForEvent('download');await page.locator('#save-project').click();const file=await pending,p=JSON.parse(await readFile((await file.path())!,'utf8'));expect(p.scenes[0].stage2d.wave).toBe(false);expect(p.scenes[0].stage2d.endingTitle).toBe('Ein neuer Anfang');
 await page.locator('#project-file').setInputFiles((await file.path())!);await expect(title).toHaveValue('Ein neuer Anfang');
 await page.locator('#load-default-project').click();await expect(title).toHaveValue('Manchmal genügt');await expect(page.locator('[data-stage2d-field=wave]')).toBeChecked();
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
  p.scenes[0].elements=[];p.scenes[0].transition='none';p.scenes[0].duration=.5;
  const blob=await exportVideo(p,{format:'webm',resolution:480,fps:24,audio:false},new AbortController().signal,()=>{});
  const video=document.createElement('video'),src=URL.createObjectURL(blob);let duration=0;try{video.src=src;await new Promise((resolve,reject)=>{video.onloadedmetadata=resolve;video.onerror=reject;});duration=video.duration;}finally{URL.revokeObjectURL(src);}
  return {previewMatches,frames,overlay,size:blob.size,type:blob.type,duration,leaked:document.querySelectorAll('[data-export-renderer]').length};
 },url);
 expect(result.previewMatches).toBe(true);expect(result.frames[1].png).toBe(result.frames.at(-1)!.png);expect(new Set(result.frames.map(f=>f.png)).size).toBe(5);expect(result.overlay).not.toBe(result.frames[1].png);expect(result.size).toBeGreaterThan(1000);expect(result.type).toBe('video/webm');expect(result.duration).toBeCloseTo(.5,1);expect(result.leaked).toBe(0);
 for(const frame of result.frames.slice(0,-1))await info.attach('Lichtsammler-'+frame.time,{body:Buffer.from(frame.png.split(',')[1],'base64'),contentType:'image/png'});
});
test('2D can be added to an empty scene and removed; portrait/square render without clipping the composition',async({page})=>{
 await ready(page);page.on('dialog',d=>d.accept());await page.locator('#new-project').click();await expect(page.locator('#stage .stage2d-canvas')).toHaveCount(0);await page.locator('[data-stage2d-field=enabled]').check();await expect(page.locator('#stage .stage2d-canvas')).toHaveAttribute('data-stage2d-time','0');await page.locator('[data-stage2d-field=enabled]').uncheck();await expect(page.locator('#stage .stage2d-canvas')).toHaveCount(0);
 const result=await page.evaluate(async url=>{const {parseProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{Stage2DRenderer}=await import(/* @vite-ignore */ '/src/scripts/stage2d.ts' as string);const p=parseProject(await(await fetch(url)).text()),r=await new Stage2DRenderer().init();try{const c=document.createElement('canvas');r.render(p.scenes[0].stage2d!,16,8,360,640,c);const first=c.toDataURL();r.render(p.scenes[0].stage2d!,16,8,400,400,c);r.render(p.scenes[0].stage2d!,16,8,360,640,c);const repeat=first===c.toDataURL();r.render(p.scenes[0].stage2d!,16,13.5,640,360,c);const ending=c.toDataURL();for(let i=0;i<6;i++)r.render({...p.scenes[0].stage2d!,endingTitle:'Variation '+i},16,13.5,640,360,c);r.render(p.scenes[0].stage2d!,16,13.5,640,360,c);return {repeat,cacheRepeat:ending===c.toDataURL()};}finally{r.dispose();}},url);expect(result).toEqual({repeat:true,cacheRepeat:true});
});

test('unavailable WebGL reports an error without blocking the editor or disabling ordinary scenes',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]):any{if(type==='webgl'||type==='webgl2'||type==='experimental-webgl')return null;return original.apply(this,[type,...args] as any);};});
 await page.goto('/en/');await expect(page.locator('#editor')).toHaveAttribute('data-ready','true');await expect(page.locator('#stage .stage2d-canvas')).toHaveAttribute('data-stage2d-error','true');await expect(page.locator('#editor-status')).toContainText('WebGL is not available');
 const error=await page.evaluate(async url=>{const {parseProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{exportStill}=await import(/* @vite-ignore */ '/src/scripts/still-export.ts' as string);try{await exportStill(parseProject(await(await fetch(url)).text()),1,new AbortController().signal);return 'unexpected success';}catch(error){return (error as Error).message;}},url);expect(error).toContain('WebGL is not available');
 await page.locator('[data-stage2d-field=enabled]').uncheck();await expect(page.locator('#stage .stage2d-canvas')).toHaveCount(0);await expect(page.locator('#scene-form [name=name]')).toBeEnabled();
});

test('German demo storyboard contains the story, subjects and four timed shots without auto-approval',async({page})=>{
 await ready(page);await page.locator('#open-storyboard').click();await expect(page.locator('#storyboard-dialog')).toBeVisible();
 await expect(page.locator('[data-project-field=story]')).toContainText('Ein kleiner, freundlicher Roboter');await expect(page.locator('[data-project-field=language]')).toContainText('Deutsch');await expect(page.locator('[data-project-field=duration]')).toContainText('16 s');
 await expect(page.locator('#storyboard-approve')).toHaveAttribute('aria-pressed','false');await expect(page.locator('#storyboard-script-open')).toBeDisabled();
 for(const [tab,count,first] of [['characters',1,'Der Lichtsammler'],['objects',1,'Der Lichtfunke'],['settings',2,'Der grüne Waldweg'],['shots',4,'Ankommen']] as const){
  await page.locator('[data-board-tab='+tab+']').click();await expect(page.locator('[data-board-item]')).toHaveCount(count);await expect(page.locator('#storyboard-content .board-card')).toContainText(first);
 }
 await page.locator('[data-board-item=transformation]').click();await expect(page.locator('[data-shot-id=transformation]')).toContainText('ein kleiner Funke.');
 const pending=page.waitForEvent('download');await page.locator('#storyboard-download').click();const file=await pending,exported=JSON.parse(await readFile((await file.path())!,'utf8'));expect(exported.board.language).toBe('Deutsch');expect(exported.board.shots.map((s:any)=>s.duration)).toEqual([4,3,4,5]);expect(exported.board.approved).toBe(false);
 await page.locator('#storyboard-close').click();await expect(page.locator('#stage .stage2d-canvas')).toHaveAttribute('data-stage2d-time','0');
});
