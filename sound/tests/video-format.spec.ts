import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {videoDimensions} from '../src/lib/video-export';
import {decodeSettings} from '../src/lib/sound-settings';
import {fileCopy} from '../src/lib/file-copy';
test('format dimensions retain the same short side in both orientations',()=>{
 expect(videoDimensions()).toEqual({width:1280,height:720});expect(videoDimensions('portrait')).toEqual({width:720,height:1280});
});
for(const format of ['landscape','portrait'] as const)test(`real MP4 has ${format} metadata and a complete circular orbit`,async({page})=>{
 await page.goto('/de/');await page.locator('#files-open').click();test.skip(await page.locator('#video-record').isDisabled(),'No native MP4');
 await page.locator('#video-format input[value='+format+']').check();
 const size=videoDimensions(format);await expect(page.locator('#video-resolution')).toHaveText(size.width+' × '+size.height);
 await page.locator('#video-record').click();await expect(page.locator('#video-status')).toHaveText(fileCopy.de.recording);
 await page.locator('#files-open').click();await expect(page.locator('#video-format input').first()).toBeDisabled();await page.locator('#files-close').click();
 await page.waitForTimeout(1100);const pending=page.waitForEvent('download');await page.locator('#video-stop').click();
 const bytes=await readFile((await(await pending).path())!);
 const metadata=await page.evaluate(async base64=>{
  const video=document.createElement('video');video.muted=true;video.preload='metadata';video.src='data:video/mp4;base64,'+base64;
  await new Promise<void>((resolve,reject)=>{video.onloadedmetadata=()=>resolve();video.onerror=()=>reject(Error('Decode failed'));});
  const result={width:video.videoWidth,height:video.videoHeight};video.removeAttribute('src');video.load();return result;
 },bytes.toString('base64'));
 expect(metadata).toEqual(size);
 const composition=await page.evaluate(async size=>{
  const path='/src/lib/video-export.ts',{paintVideo}=await import(path);
  const canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;
  const ctx=canvas.getContext('2d')!,orbit=document.querySelector<HTMLCanvasElement>('#orbit')!,background=document.querySelector<HTMLCanvasElement>('#sound-atmosphere')!;
  const calls:any[]=[];const draw=ctx.drawImage.bind(ctx);
  ctx.drawImage=((source:any,...args:any[])=>{calls.push({orbit:source===orbit,args});(draw as any)(source,...args);}) as typeof ctx.drawImage;
  paintVideo(ctx,orbit,background,true);return calls;
 },size);
 const circle=composition.find(c=>c.orbit)!.args;
 expect(circle).toEqual([(size.width-680)/2,(size.height-680)/2,680,680]);
 const backdrop=composition.find(c=>!c.orbit)!.args;
 expect(backdrop[0]).toBeLessThanOrEqual(.01);expect(backdrop[1]).toBeLessThanOrEqual(.01);
 expect(backdrop[0]+backdrop[2]).toBeGreaterThanOrEqual(size.width-.01);expect(backdrop[1]+backdrop[3]).toBeGreaterThanOrEqual(size.height-.01);
});
for(const lang of ['de','en','es','fr'])test(`video format radio tiles are localized and saved without autoplay: ${lang}`,async({page})=>{
 await page.goto('/'+lang+'/');await page.locator('#files-open').click();await expect(page.locator('#video-format input[value=landscape]')).toBeChecked();
 await page.locator('#video-format input[value=portrait]').check();
 const download=page.waitForEvent('download');await page.locator('#json-export').click();const raw=await readFile((await(await download).path())!,'utf8');
 expect(decodeSettings(raw)!.recording!.videoFormat).toBe('portrait');
 const bad=JSON.parse(raw);bad.recording.videoFormat='square';expect(decodeSettings(JSON.stringify(bad))).toBeNull();
 await page.reload();await page.locator('#files-open').click();await page.locator('#json-file').setInputFiles({name:'portrait.json',mimeType:'application/json',buffer:Buffer.from(raw)});
 await expect(page.locator('#video-format input[value=portrait]')).toBeChecked();await expect(page.locator('#video-resolution')).toHaveText('720 × 1280');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 delete bad.recording.videoFormat;await page.locator('#json-file').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await expect(page.locator('#video-format input[value=landscape]')).toBeChecked();
});
