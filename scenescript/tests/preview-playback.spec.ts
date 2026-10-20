import {test,expect} from './helpers/editor-test';

test('live drift correction avoids audio-interrupting seeks and preserves trim loops',async({page})=>{
 await page.goto('/en/');const result=await page.evaluate(async()=>{
  const {syncVideo,videoPlayhead}=await import(/* @vite-ignore */ '/src/scripts/video.ts' as string);
  const v=document.createElement('video');let position=.4,seeks=0,pauses=0;
  Object.defineProperties(v,{readyState:{get:()=>4},paused:{get:()=>false},currentTime:{get:()=>position,set:(value:number)=>{position=value;seeks++;}},ended:{get:()=>false}});v.pause=()=>{pauses++;};
  const settings={asset:'clip',start:0,end:4,loop:false,muted:false,volume:1,fit:'cover'};
  syncVideo(v,settings,4,.4,false);pauses=0;syncVideo(v,settings,4,.6,true);
  const gentle={seeks,pauses,speed:v.playbackRate,clock:videoPlayhead(v,settings,2,2.3)};
  syncVideo(v,settings,4,2,true);const hard={seeks,position};
  position=.51;syncVideo(v,{...settings,end:.5,loop:true},4,.51,true);const loop={seeks,position};
  syncVideo(v,settings,4,.2,false);return {gentle,hard,loop,paused:{position,speed:v.playbackRate,pauses}};
 });
 expect(result.gentle.seeks).toBe(0);expect(result.gentle.pauses).toBe(0);expect(result.gentle.speed).toBeGreaterThan(1);expect(result.gentle.speed).toBeLessThanOrEqual(1.02);expect(result.gentle.clock).toBe(2.4);
 expect(result.hard).toEqual({seeks:1,position:2});expect(result.loop.seeks).toBe(2);expect(result.loop.position).toBeCloseTo(.01);
 expect(result.paused.position).toBe(.2);expect(result.paused.pauses).toBeGreaterThan(0);
});

test('preview preparation waits for buffered data and can be cancelled',async({page})=>{
 await page.goto('/en/');const result=await page.evaluate(async()=>{
  const {prepareVideo}=await import(/* @vite-ignore */ '/src/scripts/video.ts' as string);
  const v=document.createElement('video');let state=1,done=false;
  Object.defineProperties(v,{readyState:{get:()=>state},duration:{get:()=>10},buffered:{get:()=>({length:1,start:()=>0,end:()=>3})}});
  const controller=new AbortController(),pending=prepareVideo(v,controller.signal).then(()=>{done=true;});await Promise.resolve();const before=done;state=3;v.dispatchEvent(new Event('canplay'));await pending;
  state=1;const cancelled=new AbortController();const task=prepareVideo(v,cancelled.signal).then(()=>false,(error:Error)=>error.name==='AbortError');cancelled.abort();return {before,done,cancelled:await task};
 });
 expect(result).toEqual({before:false,done:true,cancelled:true});
});

test('audible video clocks preview and recording without repeated seeks',async({page})=>{
 test.setTimeout(60000);await page.goto('/en/');
 const project=await page.evaluate(async()=>{
  const {demoProject,newElement}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string);
  const {defaultMusic}=await import(/* @vite-ignore */ '/src/lib/music.ts' as string);
  const {exportVideo}=await import(/* @vite-ignore */ '/src/scripts/video-export.ts' as string);
  const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].duration=6;p.scenes[0].transition='none';p.scenes[0].elements=[];p.music=defaultMusic();
  const blob=await exportVideo(p,{format:'webm',resolution:480,fps:24,audio:true},new AbortController().signal,()=>{});
  const data=await new Promise<string>(resolve=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.readAsDataURL(blob);});p.music=null;p.videos={clip:{name:'preview.webm',data,duration:6}};
  const e=newElement('video');e.animation='none';e.video={asset:'clip',start:0,end:6,loop:false,muted:false,volume:1,fit:'cover'};p.scenes[0].elements=[e];return p;
 });
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(project));await page.locator('#import-json').click();
 await page.evaluate(()=>{(window as any).previewEvents={seeks:0,pauses:0};for(const event of ['seeking','pause'])document.addEventListener(event,e=>{if(e.target instanceof HTMLVideoElement&&e.target.closest('#stage'))(window as any).previewEvents[event==='seeking'?'seeks':'pauses']++;},true);});
 await page.locator('#play').click();await expect.poll(()=>page.locator('#stage video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(1.2);
 const preview=await page.evaluate(()=>({...(window as any).previewEvents,time:Number((document.querySelector('#timeline') as HTMLInputElement).value),media:(document.querySelector('#stage video') as HTMLVideoElement).currentTime}));
 expect(preview.seeks).toBe(0);expect(preview.pauses).toBe(0);expect(Math.abs(preview.time-preview.media)).toBeLessThan(.2);
 await page.locator('#play').click();await page.locator('#focus').click();await page.locator('#start-recording').click();await expect(page.locator('#countdown')).toBeHidden({timeout:6000});
 await page.evaluate(()=>{(window as any).previewEvents={seeks:0,pauses:0};});await expect.poll(()=>page.locator('#stage video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(1.2);
 const recording=await page.evaluate(()=>(window as any).previewEvents);expect(recording.seeks).toBe(0);expect(recording.pauses).toBe(0);await page.locator('#exit-focus').click();
});
