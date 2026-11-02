import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {decodeSettings} from '../src/lib/sound-settings';
import {fileCopy} from '../src/lib/file-copy';

async function exported(page:Page){
 const pending=page.waitForEvent('download');await page.locator('#json-export').click();
 const download=await pending;expect(download.suggestedFilename()).toMatch(/\.json$/);
 return readFile((await download.path())!,'utf8');
}
test('JSON round trip preserves nine tracks, melody, custom rhythm, levels and animations without storage consent',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');
 await page.locator('[data-style-preset=focus]').click();
 await page.locator('#tempo').fill('92');await page.locator('#tempo').dispatchEvent('input');
 await page.locator('#volume').fill('0.56');await page.locator('#volume').dispatchEvent('input');
 await page.locator('#transpose').fill('5');await page.locator('#transpose').dispatchEvent('input');
 await page.locator('[data-background-mode=waves]').click();
 await page.locator('[data-center-mode=bars]').click();
 await page.locator('[data-orbit-mode=pulse]').click();
 await page.locator('[data-pad-mode=rhythm]').click();
 await page.keyboard.press('Numpad9');
 await expect(page.locator('#drawing')).toHaveAttribute('data-rhythm-hits','1');
 await page.locator('#rhythm-done').click();await page.locator('#play').click();
 await page.locator('#files-open').click();
 const raw=await exported(page),saved=decodeSettings(raw)!;
 expect(saved).not.toBeNull();expect(saved.tracks).toHaveLength(9);
 expect(saved.style).toBe('focus');expect(saved.volume).toBe(.56);
 expect(saved.transpose).toBe(5);expect(saved.background).toBe('waves');
 expect(saved.pad!.hits[2].filter(Boolean)).toHaveLength(1);
 await page.locator('#files-close').click();
 await page.locator('[data-style-preset=rock]').click();await page.locator('#play').click();
 await page.locator('#files-open').click();
 await page.locator('#json-file').setInputFiles({name:'piece.json',mimeType:'application/json',buffer:Buffer.from(raw)});
 await expect(page.locator('#file-status')).toHaveText(fileCopy.de.imported);
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('#tempo')).toHaveValue('92');await expect(page.locator('#volume-value')).toHaveText('80 %');
 await expect(page.locator('#transpose')).toHaveValue('5');
 await expect(page.locator('#drawing')).toHaveAttribute('data-music-level','1');
 await expect(page.locator('#drawing')).toHaveAttribute('data-rhythm-editing','false');
 const restored=JSON.parse(await exported(page));expect(restored).toEqual(saved);
 expect(await page.evaluate(()=>localStorage.getItem('jacktools.sound.settings.v1'))).toBeNull();
 expect(errors).toEqual([]);
});

test('invalid, unknown and oversized JSON never change or stop the current piece',async({page})=>{
 await page.goto('/de/');await page.locator('#play').click();await page.locator('#files-open').click();
 const before=await exported(page);
 for(const raw of ['{','{}',JSON.stringify({...JSON.parse(before),version:999}),' '.repeat(1024*1024+1)]){
  await page.locator('#json-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(raw)});
  await expect(page.locator('#file-status')).toHaveText(fileCopy.de.invalid);
  await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 }
 expect(JSON.parse(await exported(page))).toEqual(JSON.parse(before));
});

for(const lang of ['de','en','es','fr'] as const)test('localized file controls and honest MP4 unsupported message: '+lang,async({page})=>{
 await page.addInitScript(()=>{if(typeof MediaRecorder!=='undefined')MediaRecorder.isTypeSupported=()=>false;});
 await page.goto('/'+lang+'/');await page.locator('#files-open').click();
 await expect(page.locator('#files-dialog')).toBeVisible();
 await expect(page.locator('#files-title')).toHaveText(fileCopy[lang].title);
 if(lang==='de')await page.locator('#files-dialog').screenshot({path:'test-results/files-dialog-'+test.info().project.name+'.png'});
 await expect(page.locator('#video-support')).toHaveText(fileCopy[lang].unsupported);
 await expect(page.locator('#video-record')).toBeDisabled();
 for(const [id,label] of [['json-export',fileCopy[lang].export],['json-import',fileCopy[lang].import]]){
  await expect(page.locator('#'+id)).toHaveAttribute('title',label);
  await expect(page.locator('#'+id)).toHaveText('');
 }
 const raw=await exported(page);expect(decodeSettings(raw)).not.toBeNull();
 await page.locator('#files-close').click();await expect(page.locator('#files-dialog')).not.toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('native MP4 contains real video and audio, and a second recording works',async({page})=>{
 test.setTimeout(45000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');await page.locator('#files-open').click();
 test.skip(await page.locator('#video-record').isDisabled(),'No native MP4 encoder in this browser');
 for(let take=0;take<2;take++){
  await page.locator('#video-record').click();
  await expect(page.locator('#video-status')).toHaveText(fileCopy.de.recording);
  await expect(page.locator('#files-dialog')).not.toBeVisible();
  await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
  await page.waitForTimeout(2200);
  await page.locator('#files-open').click();
  await expect(page.locator('#json-import')).toBeDisabled();
  await expect(page.locator('#video-record')).toBeEnabled();
  await expect(page.locator('#video-record')).toHaveAttribute('title',fileCopy.de.stop);
  await page.locator('#files-close').click();
  const pending=page.waitForEvent('download');
  if(take===0)await page.locator('#video-stop').click();
  else {await page.locator('#files-open').click();await page.locator('#video-record').click();}
  const download=await pending;expect(download.suggestedFilename()).toMatch(/\.mp4$/);
  const bytes=await readFile((await download.path())!);
  expect(bytes.subarray(4,8).toString()).toBe('ftyp');
  expect(bytes.includes(Buffer.from('vide'))).toBe(true);
  expect(bytes.includes(Buffer.from('soun'))).toBe(true);
  await expect(page.locator('#video-download')).toBeVisible();
  const metadata=await page.locator('#video-download').evaluate(async(link)=>{
   const video=document.createElement('video');video.src=(link as HTMLAnchorElement).href;
   await new Promise<void>((resolve,reject)=>{video.onloadedmetadata=()=>resolve();video.onerror=()=>reject(Error('Video decode failed'));});
   const result={width:video.videoWidth,height:video.videoHeight,duration:video.duration};video.removeAttribute('src');video.load();return result;
  });
  expect(metadata.width).toBe(1280);expect(metadata.height).toBe(720);
  expect(metadata.duration).toBeGreaterThan(1);
  if(take===0){
   await page.locator('#play').click();
   const media=await page.locator('#video-download').evaluate(async(link)=>{
    const video=document.createElement('video');video.src=(link as HTMLAnchorElement).href;video.playsInline=true;
    document.body.append(video);
    await new Promise<void>((resolve,reject)=>{video.onloadeddata=()=>resolve();video.onerror=()=>reject(Error('Video decode failed'));});
    const audio=new AudioContext(),source=audio.createMediaElementSource(video),analyser=audio.createAnalyser();
    source.connect(analyser);analyser.connect(audio.destination);await audio.resume();await video.play();
    let peak=0;const samples=new Float32Array(analyser.fftSize);
    for(let i=0;i<15;i++){await new Promise(r=>setTimeout(r,70));analyser.getFloatTimeDomainData(samples);peak=Math.max(peak,...samples.map(Math.abs));}
    const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;
    const ctx=canvas.getContext('2d')!;ctx.drawImage(video,0,0);
    const pixels=ctx.getImageData(0,0,1280,720).data,colors=new Set<string>();
    for(let i=0;i<pixels.length;i+=400)colors.add(pixels[i]+','+pixels[i+1]+','+pixels[i+2]);
    video.pause();video.removeAttribute('src');video.load();video.remove();source.disconnect();await audio.close();
    return {peak,colors:colors.size};
   });
   expect(media.peak).toBeGreaterThan(.001);expect(media.colors).toBeGreaterThan(15);
  }
  await page.locator('#files-open').click();await expect(page.locator('#json-import')).toBeEnabled();
 }
 expect(errors).toEqual([]);
});


test('stopping playback or hiding the tab finalizes MP4 without discarding it',async({page})=>{
 await page.goto('/de/');await page.locator('#files-open').click();
 test.skip(await page.locator('#video-record').isDisabled(),'No native MP4 encoder');
 for(const action of ['stop','hide']){
  await page.locator('#video-record').click();await expect(page.locator('#video-status')).toHaveText(fileCopy.de.recording);
  await page.waitForTimeout(1100);
  const pending=page.waitForEvent('download');
  if(action==='stop')await page.locator('#play').click();
  else await page.evaluate(()=>{
   Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
   document.dispatchEvent(new Event('visibilitychange'));
  });
  await pending;await expect(page.locator('#video-download')).toBeVisible();
  await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});
  await page.locator('#files-open').click();await expect(page.locator('#json-import')).toBeEnabled();
 }
});

test('encoder startup errors remain recoverable and do not break JSON',async({page})=>{
 await page.addInitScript(()=>{
  if(typeof MediaRecorder!=='undefined')window.MediaRecorder=new Proxy(MediaRecorder,{construct(){throw Error('Encoder unavailable');}});
 });
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');await page.locator('#files-open').click();
 test.skip(await page.locator('#video-record').isDisabled(),'No native MP4 encoder');
 await page.locator('#video-record').click();
 await expect(page.locator('#video-status')).toHaveText(fileCopy.de.videoError);
 await expect(page.locator('#video-record')).toBeEnabled();
 await expect(page.locator('#json-import')).toBeEnabled();
 expect(decodeSettings(await exported(page))).not.toBeNull();expect(errors).toEqual([]);
});

test('Escape closes the files dialog without leaving focus view or tapping notes',async({page})=>{
 await page.addInitScript(()=>{Element.prototype.requestFullscreen=async()=>{throw Error('Denied');};});
 await page.goto('/de/');await page.locator('[data-pad-mode=rhythm]').click();
 await page.locator('#focus').click();await page.locator('#files-open').click();
 await page.keyboard.press('Numpad7');
 await expect(page.locator('#drawing')).toHaveAttribute('data-rhythm-hits','0');
 await page.keyboard.press('Escape');await expect(page.locator('#files-dialog')).not.toBeVisible();
 await expect(page.locator('body')).toHaveClass(/focus-view/);
});
