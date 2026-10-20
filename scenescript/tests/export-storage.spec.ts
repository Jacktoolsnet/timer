import {test,expect,type Page} from './helpers/editor-test';
import {demoProject} from '../src/lib/model';
async function load(page:Page,duration=.3){const p=demoProject();p.title='Disk export';p.scenes=p.scenes.slice(0,1);p.scenes[0].duration=duration;p.scenes[0].transition='none';p.scenes[0].background='#ff0000';p.scenes[0].elements=[];await page.goto('/en/');await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();await expect(page.locator('#json-dialog')).not.toBeVisible();}
async function mockPicker(page:Page,mode='ok'){
 await page.addInitScript((mode)=>{
  const state={picked:0,active:false,name:'',closed:0,aborted:0,parts:[] as {position:number;data:number[]}[]};(window as any).savedVideo=state;
  (window as any).showSaveFilePicker=async(options:any)=>{state.picked++;state.active=navigator.userActivation.isActive;state.name=options.suggestedName;if(mode==='picker-cancel')throw new DOMException('Cancelled','AbortError');return {createWritable:async()=>({write:async(chunk:any)=>{if(mode==='quota')throw new DOMException('Disk full','QuotaExceededError');state.parts.push({position:chunk.position,data:Array.from(chunk.data)});},close:async()=>{if(mode==='close-fail')throw Error('Commit failed');state.closed++;},abort:async()=>{state.aborted++;}})};};
 },mode);
}
test('native save picker runs with user activation and commits a playable MP4 without a download Blob',async({page})=>{
 await mockPicker(page);await load(page);await page.locator('#open-export').click();await page.locator('#export-destination').selectOption('file');await page.locator('#export-resolution').selectOption('480');
 let downloads=0;page.on('download',()=>downloads++);await page.locator('#start-export').click();await expect(page.locator('#export-dialog')).not.toBeVisible();
 const result=await page.evaluate(async()=>{
  const state=(window as any).savedVideo,size=Math.max(...state.parts.map((p:any)=>p.position+p.data.length)),data=new Uint8Array(size);for(const p of state.parts)data.set(p.data,p.position);
  const url=performance.getEntriesByType('resource').map(e=>e.name).find(n=>n.includes('/mediabunny.js?v='))!,m=await import(/* @vite-ignore */ url),input=new m.Input({formats:m.ALL_FORMATS,source:new m.BufferSource(data)});
  try{return {picked:state.picked,active:state.active,name:state.name,closed:state.closed,aborted:state.aborted,duration:await input.computeDuration(),header:Array.from(data.slice(4,8))};}finally{input.dispose();}
 });expect(result).toMatchObject({picked:1,active:true,name:'Disk export.mp4',closed:1,aborted:0,header:[102,116,121,112]});expect(result.duration).toBeCloseTo(.3,1);expect(downloads).toBe(0);
});
test('long videos recommend disk output before starting and respect a manual destination choice',async({page})=>{
 await mockPicker(page);await load(page,22*60);await page.locator('#open-export').click();await expect(page.locator('#export-destination')).toHaveValue('file');await expect(page.locator('#export-estimate')).toContainText('MiB');await expect(page.locator('#export-storage-hint')).toContainText('not collected in RAM');
 await page.locator('#export-destination').selectOption('download');await page.locator('#export-resolution').selectOption('480');await expect(page.locator('#export-destination')).toHaveValue('download');
});
for(const mode of ['picker-cancel','quota','close-fail'])test(`native ${mode} does not announce success or commit an incomplete video`,async({page})=>{
 await mockPicker(page,mode);await load(page);await page.locator('#open-export').click();await page.locator('#export-destination').selectOption('file');await page.locator('#export-resolution').selectOption('480');await page.locator('#start-export').click();
 await expect(page.locator('#export-status')).toContainText(mode==='picker-cancel'?'Export cancelled':mode==='quota'?'Not enough':'Commit failed');await expect(page.locator('#start-export')).toBeEnabled();await expect(page.locator('#export-dialog')).toBeVisible();
 expect(await page.evaluate(()=>(window as any).savedVideo.closed)).toBe(0);expect(await page.locator('[data-export-renderer]').count()).toBe(0);if(mode!=='picker-cancel')expect(await page.evaluate(()=>(window as any).savedVideo.aborted)).toBe(1);
});
test('actual encoding avoids ArrayBuffer resize and produces disk-backed download data',async({page})=>{
 await page.goto('/en/');const result=await page.evaluate(async()=>{
  const {demoProject,newElement}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{exportVideo}=await import(/* @vite-ignore */ '/src/scripts/video-export.ts' as string);
  const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].duration=.1;p.scenes[0].transition='none';const canvas=document.createElement('canvas');canvas.width=854;canvas.height=480;const ctx=canvas.getContext('2d')!,image=ctx.createImageData(854,480);let seed=1;for(let i=0;i<image.data.length;i++){seed=(seed*1664525+1013904223)>>>0;image.data[i]=i%4===3?255:seed>>>24;}ctx.putImageData(image,0,0);p.assets.noise={name:'noise.png',data:canvas.toDataURL()};const e=newElement('image');Object.assign(e,{asset:'noise',x:0,y:0,width:100,height:100,animation:'none'});p.scenes[0].elements=[e];
  const descriptor=Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,'resize')!,progress:number[]=[];
  Object.defineProperty(ArrayBuffer.prototype,'resize',{...descriptor,value(){throw Error('A giant growing output ArrayBuffer must not be used');}});
  try{const blob=await exportVideo(p,{format:'mp4',resolution:480,fps:30,audio:false},new AbortController().signal,(v:number)=>progress.push(v));const dir=await (await navigator.storage.getDirectory()).getDirectoryHandle('scenescript-video-exports'),entries=[];for await(const [name] of dir.entries())entries.push(name);return {type:blob.type,size:blob.size,last:progress.at(-1),entries,renderer:!!document.querySelector('[data-export-renderer]')};}
  finally{Object.defineProperty(ArrayBuffer.prototype,'resize',descriptor);}
 });expect(result.type).toBe('video/mp4');expect(result.size).toBeGreaterThan(65536);expect(result.last).toBe(1);expect(result.entries.some(n=>n.endsWith('.tmp'))).toBe(true);expect(result.renderer).toBe(false);
});
test('insufficient temporary quota is detected before any frame is rendered',async({page})=>{
 await page.goto('/en/');const result=await page.evaluate(async()=>{
  const {demoProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{exportVideo}=await import(/* @vite-ignore */ '/src/scripts/video-export.ts' as string);navigator.storage.estimate=async()=>({quota:1,usage:0});let frames=0,progress=0;
  try{await exportVideo(demoProject(),{format:'webm',resolution:480,fps:24,audio:false},new AbortController().signal,()=>progress++,()=>frames++);return {error:'none',frames,progress};}catch(error){return {error:(error as Error).message,frames,progress,renderer:!!document.querySelector('[data-export-renderer]')};}
 });expect(result).toEqual({error:'exportDiskSpace',frames:0,progress:0,renderer:false});
});
test('a browser without disk storage rejects a long export immediately, but can still export a short video',async({page})=>{
 await page.goto('/en/');const result=await page.evaluate(async()=>{
  const {demoProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{exportVideo}=await import(/* @vite-ignore */ '/src/scripts/video-export.ts' as string);navigator.storage.getDirectory=async()=>{throw new DOMException('Blocked','SecurityError');};
  const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].duration=1320;p.scenes[0].elements=[];let calls=0,error='';try{await exportVideo(p,{format:'webm',resolution:480,fps:24,audio:false},new AbortController().signal,()=>calls++);}catch(e){error=(e as Error).message;}
  p.scenes[0].duration=.1;const blob=await exportVideo(p,{format:'webm',resolution:480,fps:24,audio:false},new AbortController().signal,()=>{});return {error,calls,shortSize:blob.size};
 });expect(result.error).toBe('exportDiskUnavailable');expect(result.calls).toBe(0);expect(result.shortSize).toBeGreaterThan(100);
});
test('cancelling a disk export aborts the transaction rather than closing and saving it',async({page})=>{
 await page.goto('/en/');const result=await page.evaluate(async()=>{
  const {demoProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{exportVideoToFile}=await import(/* @vite-ignore */ '/src/scripts/video-export.ts' as string);const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].elements=[];p.scenes[0].duration=2;
  const controller=new AbortController();let closes=0,aborts=0;const handle={createWritable:async()=>({write:async()=>{},close:async()=>{closes++;},abort:async()=>{aborts++;}})};let error='';
  try{await exportVideoToFile(p,{format:'webm',resolution:480,fps:24,audio:false},controller.signal,(v:number)=>{if(v>.1)controller.abort();},handle);}catch(e){error=(e as Error).name;}
  return {error,closes,aborts,renderer:!!document.querySelector('[data-export-renderer]')};
 });expect(result).toEqual({error:'AbortError',closes:0,aborts:1,renderer:false});
});
test('completed temporary files can be cleared without deleting an unfinished file',async({page})=>{
 await load(page);const result=await page.evaluate(async()=>{
  const {exportVideo}=await import(/* @vite-ignore */ '/src/scripts/video-export.ts' as string),{demoProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string);const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].elements=[];p.scenes[0].duration=.1;await exportVideo(p,{format:'webm',resolution:480,fps:24,audio:false},new AbortController().signal,()=>{});
  const dir=await (await navigator.storage.getDirectory()).getDirectoryHandle('scenescript-video-exports');await dir.getFileHandle('video-other-tab.tmp',{create:true});let completed=0;for await(const [name,entry] of dir.entries())if(name.endsWith('.tmp')&&entry.kind==='file'&&(await (entry as FileSystemFileHandle).getFile()).size>0)completed++;return completed;
 });expect(result).toBe(1);await page.locator('#open-export').click();await page.locator('#clear-export-files').click();await expect(page.locator('#export-status')).toContainText('Temporary export files deleted');
 const remaining=await page.evaluate(async()=>{const d=await (await navigator.storage.getDirectory()).getDirectoryHandle('scenescript-video-exports'),names=[];for await(const [n] of d.entries())names.push(n);return names;});expect(remaining).toEqual(['video-other-tab.tmp']);
});

test('storage controls are localized and stay inside the export dialog',async({page})=>{
 for(const [lang,label] of [['de','Speicherziel'],['en','Save destination'],['es','Destino'],['fr','Destination']]){
  await page.goto(`/${lang}/`);await page.locator('#open-export').click();await expect(page.locator('.export-destination-label')).toContainText(label);
  expect(await page.locator('#export-dialog').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);await page.locator('#cancel-export').click();
 }
});


test('cleanup cannot see or delete bytes still in an uncommitted OPFS writer',async({page})=>{
 await page.goto('/en/');const result=await page.evaluate(async()=>{
  const {clearCompletedVideoExports}=await import(/* @vite-ignore */ '/src/scripts/export-storage.ts' as string),directory=await (await navigator.storage.getDirectory()).getDirectoryHandle('scenescript-video-exports',{create:true});
  const handle=await directory.getFileHandle('video-running.tmp',{create:true}),writer=await handle.createWritable();await writer.write(new Uint8Array([1,2,3]));const before=(await handle.getFile()).size;await clearCompletedVideoExports();const kept=await directory.getFileHandle('video-running.tmp');await writer.close();const committed=(await kept.getFile()).size;await clearCompletedVideoExports();let removed=false;try{await directory.getFileHandle('video-running.tmp');}catch{removed=true;}return {before,committed,removed};
 });expect(result).toEqual({before:0,committed:3,removed:true});
});
