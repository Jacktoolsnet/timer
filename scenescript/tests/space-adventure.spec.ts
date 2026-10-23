import {test,expect} from '@playwright/test';
const url='/examples/space-adventure-storyboard/space-adventure.scenescript.json';
test('space adventure imports as a video project with all nine scenes and the approved storyboard',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/en/');await expect(page.locator('#editor')).toHaveAttribute('data-ready','true');
 await expect(page.locator('#project-title')).toHaveValue('Six Targets. One Escape. | Space Adventure');
 await expect(page.locator('#scene-list li')).toHaveCount(9);await expect(page.locator('#timeline')).toHaveAttribute('max','30');
 await page.locator('#timeline').fill('4');await expect(page.locator('#stage')).toContainText('DESTROY ALL');
 await expect(page.locator('#stage .stage3d-canvas')).toHaveAttribute('data-stage3d-time','1');
 await page.locator('#open-storyboard').click();await expect(page.locator('#storyboard-approve')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-board-tab=objects]').click();await expect(page.locator('[data-board-review]')).toHaveCount(3);
 for(const toggle of await page.locator('[data-board-review]').getByRole('switch').all())await expect(toggle).toBeChecked();
 await page.locator('#storyboard-close').click();
 page.on('dialog',d=>d.accept());await page.locator('#new-project').click();await expect(page.locator('#scene-list li')).toHaveCount(1);
 await page.locator('#load-default-project').click();await expect(page.locator('#project-title')).toHaveValue('Six Targets. One Escape. | Space Adventure');await expect(page.locator('#scene-list li')).toHaveCount(9);
 expect(errors).toEqual([]);
});
test('native space animation renders each beat and deterministic reverse seeks including its synthesized audio',async({page},info)=>{
 test.setTimeout(120000);await page.goto('/en/');await expect(page.locator('#editor')).toHaveAttribute('data-ready','true');
 const frames=await page.evaluate(async url=>{
  const {parseProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string),{ExportAudio}=await import(/* @vite-ignore */ '/src/scripts/export-audio.ts' as string);
  const p=parseProject(await(await fetch(url)).text()),m=new ExportMedia(p,new AbortController().signal),r=new ExportRenderer(p,m),audio=new ExportAudio(p,m,30);
  try{const out=[];for(const t of [1.2,4,7.4,11.6,16.5,20.9,24.4,25.5,27.3,29.3,4]){
   const c=await r.frame(t,270,480);out.push({time:t,png:c.toDataURL(),width:c.width,height:c.height});c.width=0;c.height=0;
  }const samples=await audio.chunk(7,8);return {frames:out,peak:samples.reduce((a:number,b:number)=>Math.max(a,Math.abs(b)),0)};}finally{r.dispose();m.dispose();}
 },url);
 expect(frames.peak).toBeGreaterThan(.01);expect(frames.frames[1].png).toBe(frames.frames.at(-1)!.png);
 expect(new Set(frames.frames.map(f=>f.png)).size).toBe(10);
 for(const f of frames.frames.slice(0,-1)){expect(f.width).toBe(270);expect(f.height).toBe(480);await info.attach('space-frame-'+f.time,{body:Buffer.from(f.png.split(',')[1],'base64'),contentType:'image/png'});}
});
