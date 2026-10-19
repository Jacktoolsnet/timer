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

test('MP4 and 1080p are export defaults and alternatives remain selectable',async({page})=>{
 await page.goto('/en/');await page.locator('#open-export').click();await expect(page.locator('#export-format')).toHaveValue('mp4');await expect(page.locator('#export-resolution')).toHaveValue('1080');await page.locator('#export-resolution').selectOption('720');await expect(page.locator('#export-resolution')).toHaveValue('720');await page.locator('#export-format').selectOption('webm');await expect(page.locator('#export-format')).toHaveValue('webm');
});

test('exports estimated above 512 MiB are not rejected by an artificial size limit',async({page})=>{
 await page.goto('/en/');
 const result=await page.evaluate(async()=>{
  const {demoProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string);
  const {exportVideo,exportSupported}=await import(/* @vite-ignore */ '/src/scripts/video-export.ts' as string);
  const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].duration=600;
  const options={format:'webm',resolution:1080,fps:24,audio:false};
  if(!await exportSupported(p,options))return null;
  const controller=new AbortController();controller.abort();
  try{await exportVideo(p,options,controller.signal,()=>{});return 'unexpected success';}
  catch(error){return (error as Error).name;}
 });
 test.skip(result===null,'WebM encoder unavailable');
 expect(result).toBe('AbortError');
});

test('1080p MP4 includes AAC music even without a native AAC encoder',async({page})=>{
 await page.goto('/en/');
 const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].duration=.3;p.scenes[0].elements=[];p.scenes[0].transition='none';p.music=defaultMusic();p.music.fadeIn=0;p.music.fadeOut=0;
 const result=await page.evaluate(async p=>{
  const {exportVideo,exportSupported}=await import(/* @vite-ignore */ '/src/scripts/video-export.ts' as string);
  const options={format:'mp4',resolution:1080,fps:30,audio:true};
  if(!await exportSupported(p,options))return null;
  const blob=await exportVideo(p,options,new AbortController().signal,()=>{});
  const moduleURL=performance.getEntriesByType('resource').map(e=>e.name).find(n=>n.includes('/mediabunny.js?v='))!,m=await import(/* @vite-ignore */ moduleURL);
  const input=new m.Input({formats:m.ALL_FORMATS,source:new m.BlobSource(blob)});
  try{
   const video=await input.getPrimaryVideoTrack(),audio=await input.getPrimaryAudioTrack();
   const packet=audio?await new m.EncodedPacketSink(audio).getFirstPacket():null;
   return {type:blob.type,width:video.displayWidth,codec:audio?.codec,packetBytes:packet?.data.byteLength??0,duration:await input.computeDuration()};
  }finally{input.dispose();}
 },p);
 test.skip(result===null,'H.264 encoder unavailable in this browser');
 expect(result!.type).toBe('video/mp4');expect(result!.width).toBe(1920);expect(result!.codec).toBe('aac');expect(result!.packetBytes).toBeGreaterThan(0);expect(result!.duration).toBeGreaterThanOrEqual(.29);
});

test('export overlay shows the current rendered frame and resets on reopening',async({page})=>{
 const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].duration=20;p.scenes[0].elements=[];p.scenes[0].transition='none';p.scenes[0].background='#ff0000';
 await page.goto('/en/');await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();
 await page.locator('#open-export').click();await expect(page.locator('#export-preview')).toBeHidden();
 await page.locator('#export-format').selectOption('webm');await page.locator('#export-resolution').selectOption('480');await page.locator('#export-audio').uncheck();await page.locator('#start-export').click();
 await expect(page.locator('#export-preview')).toBeVisible();
 await expect(page.locator('#export-status')).toBeEmpty();await expect(page.locator('#export-progress-label')).toHaveText(/\d+\.\d %/);
 const pixel=await page.locator('#export-preview-canvas').evaluate((c:HTMLCanvasElement)=>({width:c.width,height:c.height,pixel:Array.from(c.getContext('2d')!.getImageData(10,10,1,1).data)}));
 expect(pixel.width).toBeLessThanOrEqual(320);expect(pixel.height).toBeLessThanOrEqual(180);expect(pixel.pixel.slice(0,3)).toEqual([255,0,0]);
 await page.locator('#cancel-export').click();await expect(page.locator('#start-export')).toBeEnabled();await page.locator('#cancel-export').click();
 await page.locator('#open-export').click();await expect(page.locator('#export-preview')).toBeHidden();
});

test('text glow and shadow render into exported canvas',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);const s=p.scenes[0];s.transition='none';s.background='#000000';const e=s.elements[0];Object.assign(e,{text:'Glow',runs:[],font:'Arial',fontSize:150,animation:'none'});e.textEffects.glow={enabled:true,color:'#00ff00',intensity:30};e.textEffects.shadow={enabled:true,color:'#ff0000',blur:2,x:20,y:20,opacity:1};
 const result=await page.evaluate(async p=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string);const {ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
  try{const count=async()=>{const canvas=await renderer.frame(1,480,270),pixels=canvas.getContext('2d')!.getImageData(0,0,480,270).data;let green=0,red=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i+1]>pixels[i]+15&&pixels[i+1]>pixels[i+2]+15)green++;if(pixels[i]>pixels[i+1]+15&&pixels[i]>pixels[i+2]+15)red++;}return {green,red};};const enabled=await count();p.scenes[0].elements[0].textEffects.glow.enabled=false;p.scenes[0].elements[0].textEffects.shadow.enabled=false;return {enabled,disabled:await count()};}finally{renderer.dispose();media.dispose();}
 },p);
 expect(result.enabled.green).toBeGreaterThan(20);expect(result.enabled.red).toBeGreaterThan(20);expect(result.disabled).toEqual({green:0,red:0});
});

test('text outline is painted into the exported canvas',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);const s=p.scenes[0];s.transition='none';s.background='#000000';const e=s.elements[0];Object.assign(e,{text:'Outline',runs:[],font:'Arial',fontSize:150,animation:'none'});e.textEffects.outline={enabled:true,color:'#ff0000',width:12};
 const result=await page.evaluate(async p=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string);const {ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
  try{const count=async()=>{const canvas=await renderer.frame(1,480,270),pixels=canvas.getContext('2d')!.getImageData(0,0,480,270).data;let red=0,white=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i]>pixels[i+1]+30&&pixels[i]>pixels[i+2]+30)red++;if(pixels[i]>240&&pixels[i+1]>240&&pixels[i+2]>240)white++;}return {red,white};};const enabled=await count();p.scenes[0].elements[0].textEffects.outline.enabled=false;return {enabled,disabled:await count()};}finally{renderer.dispose();media.dispose();}
 },p);
 expect(result.enabled.red).toBeGreaterThan(20);expect(result.enabled.white).toBeGreaterThan(20);expect(result.disabled.red).toBe(0);
});

test('text gradients paint colored glyphs into exported canvas without filling the text box',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);const s=p.scenes[0];s.transition='none';s.background='#000000';const e=s.elements[0];Object.assign(e,{text:'Gradient',runs:[],font:'Arial',fontSize:150,animation:'none'});e.textGradient={type:'linear',angle:90,x:50,y:50,stops:[{color:'#ff0000',position:0,opacity:1},{color:'#0000ff',position:100,opacity:1}]};
 const result=await page.evaluate(async p=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string);const {ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
  try{const count=async()=>{const canvas=await renderer.frame(1,480,270),pixels=canvas.getContext('2d')!.getImageData(0,0,480,270).data;let red=0,blue=0,black=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i]>pixels[i+2]+30)red++;if(pixels[i+2]>pixels[i]+30)blue++;if(pixels[i]===0&&pixels[i+1]===0&&pixels[i+2]===0)black++;}return {red,blue,black};};const enabled=await count();const other=[];for(const type of ['radial','conic'] as const){p.scenes[0].elements[0].textGradient!.type=type;other.push(await count());}p.scenes[0].elements[0].textGradient!.type='linear';p.scenes[0].elements[0].textEffects.outline={enabled:true,color:'#00ff00',width:4};p.scenes[0].elements[0].textEffects.glow={enabled:true,color:'#00ff00',intensity:4};p.scenes[0].elements[0].textEffects.shadow.enabled=true;const combined=await count();p.scenes[0].elements[0].textGradient=null;p.scenes[0].elements[0].textEffects.outline.enabled=false;p.scenes[0].elements[0].textEffects.glow.enabled=false;p.scenes[0].elements[0].textEffects.shadow.enabled=false;return {enabled,other,combined,disabled:await count()};}finally{renderer.dispose();media.dispose();}
 },p);
 for(const frame of [...result.other,result.combined]){expect(frame.red).toBeGreaterThan(20);expect(frame.blue).toBeGreaterThan(20);}
 expect(result.enabled.red).toBeGreaterThan(20);expect(result.enabled.blue).toBeGreaterThan(20);expect(result.enabled.black).toBeGreaterThan(480*270*.9);expect(result.disabled.red).toBe(0);expect(result.disabled.blue).toBe(0);
});

test('preview is emitted at most once per percentage point while progress stays frame-accurate',async({page})=>{
 test.setTimeout(90000);await page.goto('/en/');
 const result=await page.evaluate(async()=>{
  const {demoProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string);
  const {exportVideo}=await import(/* @vite-ignore */ '/src/scripts/video-export.ts' as string);
  const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].duration=2;p.scenes[0].elements=[];p.scenes[0].transition='none';
  const progress:number[]=[],previewTimes:number[]=[];
  await exportVideo(p,{format:'webm',resolution:480,fps:60,audio:false},new AbortController().signal,(v:number)=>progress.push(v),(_:HTMLCanvasElement,time:number)=>previewTimes.push(time));
  return {progress,previewTimes};
 });
 expect(result.progress).toHaveLength(121);expect(result.progress.at(-1)).toBe(1);
 expect(result.progress.slice(0,-1).every((v,i)=>Math.abs(v-(i+1)/120*.98)<1e-10)).toBe(true);
 expect(result.previewTimes.length).toBeLessThanOrEqual(99);expect(result.previewTimes.length).toBeLessThan(120);
 const buckets=result.previewTimes.map(time=>Math.floor((Math.round(time*60)+1)/120*.98*100));
 expect(new Set(buckets).size).toBe(buckets.length);
 expect(result.previewTimes[0]).toBe(0);
});

test('video export decoder preserves sequential, repeated, backwards and end-frame requests',async({page})=>{
 await page.goto('/en/');const result=await page.evaluate(async()=>{
  const {demoProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string);
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string);
  const moduleURL=performance.getEntriesByType('resource').map(e=>e.name).find(n=>n.includes('/mediabunny.js?v='))!,m=await import(/* @vite-ignore */ moduleURL);
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const ctx=canvas.getContext('2d')!;
  const target=new m.BufferTarget(),output=new m.Output({target,format:new m.WebMOutputFormat()}),source=new m.CanvasSource(canvas,{codec:'vp9',bitrate:100000});output.addVideoTrack(source,{frameRate:10});await output.start();
  for(let i=0;i<6;i++){ctx.fillStyle=i<3?'#ff0000':'#0000ff';ctx.fillRect(0,0,64,64);await source.add(i/10,.1);}await output.finalize();
  const data=await new Promise<string>(resolve=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.readAsDataURL(new Blob([target.buffer],{type:'video/webm'}));});
  const p=demoProject();p.videos={clip:{name:'clip.webm',data,duration:.6}};
  const controller=new AbortController(),media=new ExportMedia(p,controller.signal);const frames=[];
  try{for(const time of [0,.05,.1,.3,.35,.35,.599,.1,.4,5]){const frame=await media.frame('clip',time);frames.push({timestamp:frame.timestamp,pixel:Array.from(frame.canvas.getContext('2d')!.getImageData(10,10,1,1).data)});}controller.abort();let aborted=false;try{await media.frame('clip',0);}catch(error){aborted=(error as Error).name==='AbortError';}return {frames,aborted};}finally{media.dispose();}
 });
 expect(result.aborted).toBe(true);
 expect(result.frames.map(f=>Math.round(f.timestamp*10))).toEqual([0,0,1,3,3,3,5,1,4,5]);
 for(const [i,frame] of result.frames.entries())expect(frame.pixel[i<3||i===7?0:2]).toBeGreaterThan(200);
});

test('AAC video audio is identical across adjacent one-second export chunks',async({page})=>{
 await page.goto('/en/');const result=await page.evaluate(async()=>{
  const {demoProject,newElement}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string);
  const {defaultMusic}=await import(/* @vite-ignore */ '/src/lib/music.ts' as string);
  const {exportSupported}=await import(/* @vite-ignore */ '/src/scripts/video-export.ts' as string);
  const {ExportAudio}=await import(/* @vite-ignore */ '/src/scripts/export-audio.ts' as string);
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string);
  const p=demoProject();p.music=defaultMusic();if(!await exportSupported(p,{format:'mp4',resolution:480,fps:24,audio:true}))return null;p.music=null;
  const moduleURL=performance.getEntriesByType('resource').map(e=>e.name).find(n=>n.includes('/mediabunny.js?v='))!,m=await import(/* @vite-ignore */ moduleURL);
  const target=new m.BufferTarget(),output=new m.Output({target,format:new m.Mp4OutputFormat()}),source=new m.AudioSampleSource({codec:'aac',bitrate:128000});output.addAudioTrack(source);await output.start();
  const rate=48000,length=rate*4,data=Float32Array.from({length:length*2},(_,i)=>.2*Math.sin((i%length)*2*Math.PI*220/rate));
  const sample=new m.AudioSample({data,format:'f32-planar',numberOfChannels:2,sampleRate:rate,timestamp:0});try{await source.add(sample);}finally{sample.close();}await output.finalize();
  const url=await new Promise<string>(resolve=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.readAsDataURL(new Blob([target.buffer],{type:'video/mp4'}));});
  p.scenes=p.scenes.slice(0,1);p.scenes[0].duration=3;p.videos={clip:{name:'tone.mp4',data:url,duration:4}};const e=newElement('video');e.video={asset:'clip',start:.3,end:3.3,loop:false,muted:false,volume:1,fit:'cover'};p.scenes[0].elements=[e];
  const oneMedia=new ExportMedia(p,new AbortController().signal),splitMedia=new ExportMedia(p,new AbortController().signal);
  try{
   const whole=await new ExportAudio(p,oneMedia,3).chunk(0,3),mixer=new ExportAudio(p,splitMedia,3);let maxError=0,peak=0;
   for(let second=0;second<3;second++){const part=await mixer.chunk(second,second+1);for(let c=0;c<2;c++)for(let j=0;j<rate;j++){maxError=Math.max(maxError,Math.abs(part[c*rate+j]-whole[c*rate*3+second*rate+j]));peak=Math.max(peak,Math.abs(part[c*rate+j]));}}
   return {maxError,peak};
  }finally{oneMedia.dispose();splitMedia.dispose();}
 });
 test.skip(result===null,'H.264 encoder unavailable');expect(result!.peak).toBeGreaterThan(.1);expect(result!.maxError).toBeLessThan(1e-6);
});

test('line drawing exports distinct start, partial and completed frames for every shape',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].transition='none';p.scenes[0].background='#000000';
 const e=newElement('shape');Object.assign(e,{x:10,y:10,width:80,height:80,fillColor:'#00ff00',borderColor:'#ffffff',borderWidth:12,animation:'draw',animationDuration:2});p.scenes[0].elements=[e];
 const result=await page.evaluate(async(p)=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string);const {ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  const results=[];
  for(const type of ['rectangle','ellipse','triangle','diamond','star','arrow'] as const){
   p.scenes[0].elements[0].shapeType=type;
   const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
   try{
    const counts=[];
    for(const t of [0,.8,2]){
     const canvas=await renderer.frame(t,480,270),data=canvas.getContext('2d')!.getImageData(0,0,480,270).data;let lit=0;
     for(let i=0;i<data.length;i+=4)if(data[i]+data[i+1]+data[i+2]>100)lit++;
     counts.push(lit);
    }results.push(counts);
   }finally{renderer.dispose();media.dispose();}
  }return results;
 },p);
 for(const [start,partial,end] of result){expect(start).toBeLessThan(10);expect(partial).toBeGreaterThan(50);expect(end).toBeGreaterThan(partial*2);}
});
