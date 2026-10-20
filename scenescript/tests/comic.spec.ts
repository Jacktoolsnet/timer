import {test,expect,type Page} from './helpers/editor-test';
import {comicProject} from '../src/lib/comic-example';
import {newElement} from '../src/lib/model';
import {defaultMotionPath} from '../src/lib/motion-path';
async function importComic(page:Page,p=comicProject()){
 await page.goto('/en/');await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();await expect(page.locator('#json-dialog')).not.toBeVisible();
}
async function seek(page:Page,t:number){await page.locator('#timeline').fill(String(t));}
async function save(page:Page){const pending=page.waitForEvent('download');await page.locator('#save-project').click();const file=await pending;const {readFile}=await import('node:fs/promises');return JSON.parse(await readFile((await file.path())!,'utf8'));}
test('comic route imports, tails follow speakers, dialogue ends and seek/replay geometry agree',async({page,request})=>{
 const response=await request.get('/comic.scenescript.json');expect(response.ok()).toBe(true);const p=await response.json();await importComic(page,p);
 const bubble=page.locator('[data-element-id=idea]'),path=bubble.locator('.bubble-body');
 await seek(page,.5);await expect(bubble).toBeVisible();const before=await path.getAttribute('d');
 await seek(page,1.5);const after=await path.getAttribute('d');expect(after).not.toBe(before);
 await seek(page,.5);expect(await path.getAttribute('d')).toBe(before);
 await seek(page,2);await expect(bubble).toBeHidden();await expect(page.locator('[data-element-id=reply]')).toBeVisible();
 await seek(page,4.5);await expect(page.locator('[data-element-id=reply]')).toBeHidden();await expect(page.locator('[data-element-id=thought] .bubble-outline circle')).toHaveCount(3);
 await seek(page,6);await expect(page.locator('[data-element-id=thought]')).toBeHidden();
});
test('bubble editor supports styled text, tail controls, overflow warnings and ends',async({page})=>{
 await page.goto('/en/');await page.locator('#element-add-menu summary').click();await page.locator('[data-add=bubble]').click();
 await expect(page.locator('#element-form [role=textbox]')).toBeVisible();
 await page.locator('#element-form [role=textbox]').fill('A friendly hello!');
 await page.locator('#element-form [name=bubbleKind]').selectOption('thought');
 await expect(page.locator('.scene-bubble .bubble-outline circle')).toHaveCount(3);
 await page.locator('#element-form [name=bubbleTailMode]').selectOption('none');
 await expect(page.locator('.scene-bubble .bubble-outline circle')).toHaveCount(0);
 await page.locator('#element-form [name=fontSize]').fill('400');await page.locator('#element-form [name=fontSize]').dispatchEvent('change');
 await expect(page.locator('#bubble-overflow')).toBeVisible();
 await page.locator('#element-form [name=elementEndEnabled]').check();await page.locator('#element-form [name=until]').fill('2');await page.locator('#element-form [name=until]').dispatchEvent('change');
 await page.locator('#element-form [name=exitAnimation]').selectOption('fade');
 const p=await save(page),e=p.scenes[0].elements.at(-1);expect(e.type).toBe('bubble');expect(e.text).toBe('A friendly hello!');expect(e.until).toBe(2);expect(e.exitAnimation).toBe('fade');
});
test('anchor rename, deletion and scene duplication keep references valid',async({page})=>{
 await importComic(page);await page.locator('#element-list button').filter({hasText:'Nova'}).click();
 await page.locator('.comic-settings').filter({has:page.locator('legend', {hasText:'Anchor points'})}).getByRole('button',{name:'Rename',exact:true}).click();
 await page.locator('#rename-input').fill('voice');await page.locator('#apply-rename').click();
 let p=await save(page);expect(p.scenes[0].elements[2].bubble.tail.anchor).toBe('voice');
 await page.locator('#duplicate-scene').click();p=await save(page);
 const copy=p.scenes[1];expect(copy.elements[2].bubble.tail.element).toBe(copy.elements[0].id);expect(copy.elements[0].id).not.toBe('nova');
 await page.locator('#element-list button').filter({hasText:'Nova'}).click();
 await page.locator('.comic-settings').filter({has:page.locator('legend', {hasText:'Anchor points'})}).getByRole('button',{name:'Delete',exact:true}).click();
 p=await save(page);expect(p.scenes[1].elements[2].bubble.tail.mode).toBe('manual');expect(p.scenes[1].elements[4].bubble.tail.mode).toBe('manual');
});
test('expanded preview tail handles use local transformed coordinates and never appear in recording',async({page})=>{
 const p=comicProject();p.scenes[0].elements[2].rotation=15;await importComic(page,p);
 await page.locator('#element-list button').filter({hasText:'idea'}).click();
 await page.getByRole('button',{name:'Edit tail in preview',exact:true}).click();
 const handle=page.locator('[data-comic-handle=tail]');await expect(handle).toBeVisible();
 const box=(await handle.boundingBox())!;
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+20,box.y+box.height/2+15);await page.mouse.up();
 await page.locator('#close-preview').click();const result=await save(page);expect(result.scenes[0].elements[2].bubble.tail.mode).toBe('manual');
 await page.locator('#focus').click();await expect(page.locator('.comic-edit-overlay')).toHaveCount(0);await page.locator('#exit-focus').click({force:true});
});
test('live and exported bubbles share exact geometry under paths, rotations and exit animations',async({page})=>{
 const p=comicProject();p.scenes[0].elements[0].rotation=20;p.scenes[0].elements[2].rotation=-15;p.scenes[0].elements[2].motionPath={...defaultMotionPath(),to:{x:5,y:0}};p.scenes[0].elements[2].exitAnimation='zoom-out';
 await importComic(page,p);await seek(page,1.8);const live=await page.locator('[data-element-id=idea] .bubble-body').getAttribute('d');
 const result=await page.evaluate(async(p)=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string);
  const {ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
  try{await renderer.frame(1.8,480,270);return {path:renderer.root.querySelector('[data-element-id=idea] .bubble-body')!.getAttribute('d'),handles:renderer.root.querySelectorAll('.comic-edit-overlay,.bubble-selection:not([hidden])').length};}finally{renderer.dispose();media.dispose();}
 },p);
 expect(result.path).toBe(live);expect(result.handles).toBe(0);
});
test('explicit video end clips exported video audio precisely',async({page})=>{
 // Stub the decoded audio sink to test sample-precise timeline clipping without codec dependencies.
 await page.goto('/en/');const result=await page.evaluate(async()=>{
  const {demoProject,newElement}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string);
  const {ExportAudio}=await import(/* @vite-ignore */ '/src/scripts/export-audio.ts' as string);
  const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].duration=1;const e=newElement('video','clip');e.until=.25;e.video={asset:'clip',start:0,end:1,muted:false,volume:1,loop:true,fit:'cover'};p.scenes[0].elements=[e];p.videos={clip:{duration:1,name:'clip',data:''}};
  const buffer=new AudioBuffer({length:48000,numberOfChannels:1,sampleRate:48000});buffer.getChannelData(0).fill(.5);
  const media={check(){},async audioSink(){return {async *buffers(){yield {timestamp:0,buffer};}};}} as any;
  const mixed=await new ExportAudio(p,media,1).chunk(0,.5);
  return {before:mixed[11999],after:mixed[12000]};
 });expect(result.before).toBe(.5);expect(result.after).toBe(0);
});

test('anchor coordinate edits retain both axes and deleting a speaker detaches its bubbles',async({page})=>{
 await importComic(page);await page.locator('#element-list button').filter({hasText:'Nova'}).click();
 const anchors=page.locator('.comic-settings').filter({has:page.locator('legend',{hasText:'Anchor points'})});
 await anchors.locator('[name=path-x]').fill('60');await anchors.locator('[name=path-x]').dispatchEvent('change');
 await anchors.locator('[name=path-y]').fill('30');await anchors.locator('[name=path-y]').dispatchEvent('change');
 let p=await save(page);expect(p.scenes[0].elements[0].anchors.mouth).toEqual({x:60,y:30});
 await page.locator('#delete-element').click();p=await save(page);expect(p.scenes[0].elements.map((e:any)=>e.id)).not.toContain('nova');
 expect(p.scenes[0].elements.find((e:any)=>e.id==='idea').bubble.tail.mode).toBe('manual');
});
test('comic can be encoded as a playable WebM with no editing handles',async({page})=>{
 await page.goto('/en/');const p=comicProject();
 // Render a short excerpt of the actual example through the complete export path.
 p.scenes[0].duration=.3;p.scenes[0].elements=p.scenes[0].elements.slice(0,3);p.scenes[0].elements[2].until=.3;
 const result=await page.evaluate(async p=>{
  const {exportVideo}=await import(/* @vite-ignore */ '/src/scripts/video-export.ts' as string);
  const blob=await exportVideo(p,{format:'webm',resolution:480,fps:24,audio:false},new AbortController().signal,()=>{});
  const moduleURL=performance.getEntriesByType('resource').map(e=>e.name).find(n=>n.includes('/mediabunny.js?v='))!,m=await import(/* @vite-ignore */ moduleURL);
  const input=new m.Input({formats:m.ALL_FORMATS,source:new m.BlobSource(blob)});try{const track=await input.getPrimaryVideoTrack();const frame=await new m.CanvasSink(track).getCanvas(.2);return {width:frame.canvas.width,duration:await input.computeDuration(),bytes:blob.size};}finally{input.dispose();}
 },p);
 expect(result.width).toBe(854);expect(result.duration).toBeGreaterThanOrEqual(.29);expect(result.bytes).toBeGreaterThan(1000);await expect(page.locator('[data-export-renderer]')).toHaveCount(0);
});
test('video views stop and mute at explicit visibility ends',async({page})=>{
 await page.goto('/en/');
 const data=await page.evaluate(async()=>{
  const c=document.createElement('canvas');c.width=160;c.height=90;c.getContext('2d')!.fillRect(0,0,160,90);
  const stream=c.captureStream(10),rec=new MediaRecorder(stream,{mimeType:'video/webm'}),chunks:Blob[]=[];
  const done=new Promise<void>(resolve=>{rec.onstop=()=>resolve();});rec.ondataavailable=e=>chunks.push(e.data);rec.start();const timer=setInterval(()=>c.getContext('2d')!.fillRect(0,0,160,90),50);await new Promise(r=>setTimeout(r,350));clearInterval(timer);rec.stop();await done;stream.getTracks().forEach(t=>t.stop());
  const data=await new Promise<string>(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.readAsDataURL(new Blob(chunks,{type:'video/webm'}));});
  const {inspectVideo}=await import(/* @vite-ignore */ '/src/scripts/video.ts' as string);return {data,duration:await inspectVideo(data)};
 });
 const p=comicProject();p.scenes[0].duration=1;const e=newElement('video','clip');e.animation='none';e.until=.15;e.video={asset:'clip',start:0,end:null,loop:true,muted:false,volume:1,fit:'cover'};p.scenes[0].elements=[e];p.videos={clip:{name:'clip.webm',duration:data.duration,data:data.data}};
 await importComic(page,p);await seek(page,.05);const video=page.locator('[data-element-id=clip] video');await expect(video).toBeVisible();
 await page.locator('#play').click();await expect.poll(async()=>Number(await page.locator('#timeline').inputValue())).toBeGreaterThan(.2);
 await expect(video).toBeHidden();expect(await video.evaluate((v:HTMLVideoElement)=>v.paused&&v.muted)).toBe(true);
 await page.locator('#play').click();
});
