import {test,expect} from '@playwright/test';
import {demoProject,newElement} from '../src/lib/model';
import {defaultMusic} from '../src/lib/music';
import {readFile} from 'node:fs/promises';
test('offline export encodes complete WebM with rendered pixels and music',async({page})=>{
 test.setTimeout(90000);const p=demoProject();p.title='Export test';p.scenes=p.scenes.slice(0,1);p.scenes[0].duration=.3;p.scenes[0].transition='none';p.scenes[0].background='#ff0000';p.scenes[0].elements=[];p.music=defaultMusic();p.music.fadeIn=0;p.music.fadeOut=0;
 await page.goto('/en/');await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();await page.locator('#open-export').click();await page.locator('#export-format').selectOption('webm');await page.locator('#export-resolution').selectOption('480');
 const download=page.waitForEvent('download',{timeout:80000});await page.locator('#start-export').click();const file=await download;expect(file.suggestedFilename()).toBe('Export test.webm');const bytes=await readFile((await file.path())!);
 const result=await page.evaluate(async(data)=>{
  const moduleURL=performance.getEntriesByType('resource').map(e=>e.name).find(n=>n.includes('/mediabunny.js?v='))!;const m=await import(/* @vite-ignore */ moduleURL);
  const input=new m.Input({formats:m.ALL_FORMATS,source:new m.BufferSource(new Uint8Array(data))});const track=await input.getPrimaryVideoTrack();const frame=await new m.CanvasSink(track).getCanvas(.1);const ctx=frame.canvas.getContext('2d')!;const pixel=Array.from(ctx.getImageData(20,20,1,1).data);let peak=0;const audio=await input.getPrimaryAudioTrack();for await(const item of new m.AudioBufferSink(audio).buffers()){for(const sample of item.buffer.getChannelData(0))peak=Math.max(peak,Math.abs(sample));}const duration=await input.computeDuration();input.dispose();return {pixel,peak,duration,width:frame.canvas.width};
 },Array.from(bytes));
 expect(result.width).toBe(854);expect(result.pixel[0]).toBeGreaterThan(200);expect(result.pixel[1]).toBeLessThan(30);expect(result.peak).toBeGreaterThan(.001);expect(result.duration).toBeCloseTo(.3,1);await expect(page.locator('#project-title')).toHaveValue('Export test');await expect(page.locator('#export-dialog')).not.toBeVisible();await expect(page.locator('.app-toast[data-kind=success]')).toBeVisible();await expect(page.locator('.app-toast')).toHaveText('Video exported');
});
test('cancel stops export and removes the offscreen renderer',async({page})=>{
 await page.goto('/en/');await page.locator('#open-export').click();await page.locator('#export-format').selectOption('webm');await page.locator('#export-audio').uncheck();await page.locator('#start-export').click();await page.locator('#cancel-export').click();await expect(page.locator('#export-status')).toHaveText('Export cancelled');await expect(page.locator('#start-export')).toBeEnabled();expect(await page.evaluate(()=>document.querySelector('[data-export-renderer]'))).toBeNull();
});
test('export preserves shape and scene background colors',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);const s=p.scenes[0];s.transition='none';s.background='#112233';s.elements=[];const shape=newElement('shape');Object.assign(shape,{x:0,y:0,width:30,height:30,fillColor:'#00ff00',borderWidth:0,animation:'none'});s.elements.push(shape);
 const result=await page.evaluate(async(p)=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string);const {ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);try{const canvas=await renderer.frame(1,480,270);const c=canvas.getContext('2d')!;return [Array.from(c.getImageData(20,20,1,1).data),Array.from(c.getImageData(450,240,1,1).data)];}finally{renderer.dispose();media.dispose();}
 },p);
 expect(result[0].slice(0,3)).toEqual([0,255,0]);expect(result[1].slice(0,3)).toEqual([17,34,51]);
});
test('MP4 encodes when the configured browser encoder is available',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].duration=.2;p.scenes[0].elements=[];p.scenes[0].transition='none';
 const result=await page.evaluate(async(p)=>{const {exportVideo,exportSupported}=await import(/* @vite-ignore */ '/src/scripts/video-export.ts' as string);const o={format:'mp4',resolution:480,fps:24,audio:false};if(!await exportSupported(p,o))return null;const blob=await exportVideo(p,o,new AbortController().signal,()=>{});return {type:blob.type,bytes:blob.size,header:Array.from(new Uint8Array(await blob.arrayBuffer()).slice(4,8))};},p);
 test.skip(!result,'MP4 encoder unavailable in this browser');expect(result!.type).toBe('video/mp4');expect(result!.bytes).toBeGreaterThan(100);expect(result!.header).toEqual([102,116,121,112]);
});
test('offline video frames respect trim and audio is included only when unmuted',async({page})=>{
 test.setTimeout(90000);await page.goto('/en/');const result=await page.evaluate(async()=>{
  const canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;const context=canvas.getContext('2d')!;const ac=new AudioContext();await ac.resume();const osc=ac.createOscillator(),gain=ac.createGain(),dest=ac.createMediaStreamDestination();gain.gain.value=.1;osc.connect(gain).connect(dest);osc.start();
  const stream=canvas.captureStream(10);stream.addTrack(dest.stream.getAudioTracks()[0]);const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8,opus'});const chunks:Blob[]=[];recorder.ondataavailable=e=>chunks.push(e.data);const done=new Promise(resolve=>recorder.onstop=resolve);context.fillStyle='#ff0000';context.fillRect(0,0,160,90);recorder.start();await new Promise(r=>setTimeout(r,350));context.fillStyle='#0000ff';context.fillRect(0,0,160,90);await new Promise(r=>setTimeout(r,450));recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());await ac.close();const blob=new Blob(chunks,{type:'video/webm'});const data=await new Promise<string>(resolve=>{const f=new FileReader();f.onload=()=>resolve(f.result as string);f.readAsDataURL(blob);});
  const {demoProject,newElement}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string);const {inspectVideo}=await import(/* @vite-ignore */ '/src/scripts/video.ts' as string);const duration=await inspectVideo(data);const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].duration=.2;p.scenes[0].transition='none';p.videos={clip:{name:'test.webm',data,duration}};const e=newElement('video');Object.assign(e,{x:0,y:0,width:100,height:100,animation:'none',at:0,video:{asset:'clip',start:.4,end:.7,loop:false,muted:false,volume:1,fit:'cover'}});p.scenes[0].elements=[e];
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string);const {ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);const {ExportAudio}=await import(/* @vite-ignore */ '/src/scripts/export-audio.ts' as string);const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);try{const frame=await renderer.frame(.1,480,270),pixel=Array.from(frame.getContext('2d').getImageData(200,100,1,1).data);const mixer=new ExportAudio(p,media,.2),audio=await mixer.chunk(0,.2);e.video.muted=true;const silent=await mixer.chunk(0,.2);return {pixel,peak:Math.max(...audio.map(Math.abs)),silent:Math.max(...silent.map(Math.abs))};}finally{renderer.dispose();media.dispose();}
 });expect(result.pixel[2]).toBeGreaterThan(200);expect(result.pixel[0]).toBeLessThan(30);expect(result.peak).toBeGreaterThan(.02);expect(result.silent).toBe(0);
});

test('SVG animations are frozen at the requested export time',async({page})=>{
 await page.goto('/en/');const result=await page.evaluate(async()=>{
  const {demoProject,newElement}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string);
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string);
  const {ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].transition='none';p.scenes[0].background='#000000';
  const source='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="0" y="0" width="100" height="100" fill="#ff0000"><animate attributeName="fill" values="#ff0000;#0000ff" dur="1s" fill="freeze" /></rect><g><animateTransform attributeName="transform" type="translate" from="0 0" to="30 0" dur="1s" fill="freeze"/><circle cx="10" cy="10" r="5" fill="#00ff00"/></g></svg>';
  p.assets={svg:{name:'animated.svg',data:'data:image/svg+xml;base64,'+btoa(source)}};const e=newElement('image');Object.assign(e,{x:0,y:0,width:100,height:100,asset:'svg',animation:'none',fit:'cover'});p.scenes[0].elements=[e];
  const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
  try{const a=await renderer.frame(0,480,270),b=await renderer.frame(1,480,270);return [Array.from(a.getContext('2d')!.getImageData(240,135,1,1).data),Array.from(b.getContext('2d')!.getImageData(240,135,1,1).data)];}finally{renderer.dispose();media.dispose();}
 });expect(result[0].slice(0,3)).toEqual([255,0,0]);expect(result[1].slice(0,3)).toEqual([0,0,255]);
});

test('export audio uses one aligned slide switch instead of a visible checkbox',async({page})=>{
 await page.goto('/en/');await page.locator('#open-export').click();
 const input=page.locator('#export-audio'),track=page.locator('#export-options .safe-switch-track');
 await expect(input).toHaveCSS('opacity','0');await expect(input).toHaveCSS('position','absolute');
 const a=await input.boundingBox(),b=await track.boundingBox();expect(a).not.toBeNull();expect(b).not.toBeNull();
 expect(a!.x).toBeCloseTo(b!.x,0);expect(a!.y).toBeCloseTo(b!.y,0);expect(a!.height).toBeCloseTo(b!.height,0);
 await expect(input).toBeChecked();await input.click();await expect(input).not.toBeChecked();await input.press('Space');await expect(input).toBeChecked();
});
