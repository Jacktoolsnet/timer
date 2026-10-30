import {fileURLToPath} from 'node:url';
import {test,expect} from '@playwright/test';
const url='/examples/space-adventure-storyboard/space-adventure.scenescript.json';
async function loadSpace(page:any){await page.locator('#project-file').setInputFiles(fileURLToPath(new URL('../public'+url,import.meta.url)));await expect(page.locator('#project-title')).toHaveValue('Six Targets. One Escape. | Space Adventure');}
test('space adventure imports as a video project with all nine scenes and the approved storyboard',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/en/');await expect(page.locator('#editor')).toHaveAttribute('data-ready','true');await loadSpace(page);
 await expect(page.locator('#project-title')).toHaveValue('Six Targets. One Escape. | Space Adventure');
 await expect(page.locator('#scene-list li')).toHaveCount(9);await expect(page.locator('#timeline')).toHaveAttribute('max','28.6');
 await page.locator('#timeline').fill('4');await expect(page.locator('#stage')).toContainText('DESTROY ALL');
 await expect(page.locator('#stage .stage3d-canvas')).toHaveAttribute('data-stage3d-time','1');
 await page.locator('#open-storyboard').click();await expect(page.locator('#storyboard-approve')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-board-tab=objects]').click();await expect(page.locator('[data-board-review]')).toHaveCount(3);
 for(const toggle of await page.locator('[data-board-review]').getByRole('switch').all())await expect(toggle).toBeChecked();
 await page.locator('#storyboard-close').click();
 page.on('dialog',d=>d.accept());await page.locator('#new-project').click();await expect(page.locator('#scene-list li')).toHaveCount(1);
 await page.locator('#load-default-project').click();await expect(page.locator('#project-title')).toHaveValue('Der kleine Lichtsammler');await expect(page.locator('#scene-list li')).toHaveCount(1);
 expect(errors).toEqual([]);
});
test('native space animation renders each beat and deterministic reverse seeks including its synthesized audio',async({page},info)=>{
 test.setTimeout(120000);await page.goto('/en/');await expect(page.locator('#editor')).toHaveAttribute('data-ready','true');await loadSpace(page);
 const frames=await page.evaluate(async url=>{
  const {parseProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string),{ExportAudio}=await import(/* @vite-ignore */ '/src/scripts/export-audio.ts' as string);
  const p=parseProject(await(await fetch(url)).text()),m=new ExportMedia(p,new AbortController().signal),r=new ExportRenderer(p,m),audio=new ExportAudio(p,m,28.6);
  try{const out=[];for(const t of [1.2,4,7.4,10.7,10.9,11.15,11.6,16.5,18.7,20.9,24.4,25.5,27.3,28.1,28.45,28.55,28.6,4]){
   const c=await r.frame(t,270,480);out.push({time:t,png:c.toDataURL(),width:c.width,height:c.height});c.width=0;c.height=0;
  }const samples=await audio.chunk(7,8);return {frames:out,peak:samples.reduce((a:number,b:number)=>Math.max(a,Math.abs(b)),0)};}finally{r.dispose();m.dispose();}
 },url);
 expect(frames.peak).toBeGreaterThan(.01);expect(frames.frames[1].png).toBe(frames.frames.at(-1)!.png);
 expect(new Set(frames.frames.map(f=>f.png)).size).toBe(17);
 for(const f of frames.frames.slice(0,-1)){expect(f.width).toBe(270);expect(f.height).toBe(480);await info.attach('space-frame-'+f.time,{body:Buffer.from(f.png.split(',')[1],'base64'),contentType:'image/png'});}
});

test('cockpit displays change with timeline time and stay deterministic when seeking backwards',async({page},info)=>{
 test.setTimeout(120000);await page.goto('/en/');await expect(page.locator('#editor')).toHaveAttribute('data-ready','true');await loadSpace(page);
 await page.locator('#timeline').fill('15.2');await expect(page.locator('#stage')).toContainText('TARGETS  3 / 6');
 await page.locator('#timeline').fill('16.15');await expect(page.locator('#stage')).toContainText('FIRING');
 await page.locator('#timeline').fill('16.6');await expect(page.locator('#stage')).toContainText('TARGET DESTROYED');await expect(page.locator('#stage')).toContainText('TARGETS  4 / 6');
 await page.locator('#timeline').fill('15.2');await expect(page.locator('#stage')).toContainText('TARGETS  3 / 6');
 const out=await page.evaluate(async url=>{
  const {parseProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  const p=parseProject(await(await fetch(url)).text()),m=new ExportMedia(p,new AbortController().signal),r=new ExportRenderer(p,m),frames=[];
  try{for(const t of [4.2,5.4,15.2,16.15,16.6,25.5,4.2]){const c=await r.frame(t,360,640);frames.push({time:t,png:c.toDataURL()});c.width=0;c.height=0;}return frames;}finally{r.dispose();m.dispose();}
 },url);
 expect(out[0].png).not.toBe(out[1].png);expect(out[0].png).toBe(out.at(-1)!.png);
 for(const f of out.slice(0,-1))await info.attach('cockpit-'+f.time,{body:Buffer.from(f.png.split(',')[1],'base64'),contentType:'image/png'});
});

test('Play keeps the opening wormhole rendering after 3D playback preparation',async({page})=>{
 test.setTimeout(90000);await page.goto('/en/');await expect(page.locator('#editor')).toHaveAttribute('data-ready','true');await loadSpace(page);
 // Start through the actual transport, not ExportRenderer or a paused seek.
 // Other textured shots must not evict the active world during preparation.
 const result=await page.evaluate(()=>new Promise<{time:number;error:boolean;changed:boolean}>((resolve,reject)=>{
  let observer:MutationObserver|undefined;const timeout=setTimeout(()=>{observer?.disconnect();reject(new Error('Opening preview never advanced'));},30000);
  document.querySelector<HTMLButtonElement>('#play')!.click();
  const canvas=document.querySelector<HTMLCanvasElement>('#stage .stage3d-canvas')!;
  let first='';
  const inspect=()=>{
   if(canvas.dataset.stage3dError){clearTimeout(timeout);observer?.disconnect();resolve({time:Number(canvas.dataset.stage3dTime),error:true,changed:false});return;}
   const time=Number(canvas.dataset.stage3dTime??0);if(!first&&canvas.width)first=canvas.toDataURL();
   if(time>=1.5){clearTimeout(timeout);observer?.disconnect();resolve({time,error:false,changed:canvas.toDataURL()!==first});}
  };
  observer=new MutationObserver(inspect);observer.observe(canvas,{attributes:true});inspect();
 }));
 expect(result.error).toBe(false);expect(result.time).toBeGreaterThanOrEqual(1.5);expect(result.changed).toBe(true);
});
