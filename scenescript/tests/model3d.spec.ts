import {test,expect} from './helpers/editor-test';
import {readFile} from 'node:fs/promises';
import {construction3DExample} from '../src/lib/model3d-example';
async function load(page:any){await page.goto('/en/');await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(construction3DExample));await page.locator('#import-json').click();await expect(page.locator('#json-dialog')).not.toBeVisible();await expect(page.locator('#stage .stage3d-canvas')).toHaveAttribute('data-stage3d-time','0');}
test('construction demo creates a real cover; model animation preview and individual copy import work',async({page})=>{
 page.on('dialog',d=>d.accept());await page.goto('/en/');await page.locator('#open-stage3d').click();await page.locator('#stage3d-demo-type').selectOption('construction');await page.locator('#stage3d-demo').click();
 await expect(page.locator('#stage3d-dialog')).not.toBeVisible();await expect(page.locator('#project-title')).toHaveValue(construction3DExample.title);await expect(page.locator('#thumbnail-content img')).toHaveAttribute('src',/^data:image\/png;base64,/);
 await page.locator('#open-stage3d').click();await expect(page.locator('#stage3d-model')).toBeVisible();await page.locator('#stage3d-model-animation').selectOption('drive');
 const canvas=page.locator('#stage3d-resource-preview canvas');await expect(canvas).toHaveAttribute('data-stage3d-time','0');const first=await canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL());
 await page.locator('#stage3d-model-time').fill('0.5');await expect(canvas).toHaveAttribute('data-stage3d-time','0.5');expect(await canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL())).not.toBe(first);
 const pending=page.waitForEvent('download');await page.locator('#stage3d-export').click();const file=await pending,source=await readFile((await file.path())!,'utf8');expect(JSON.parse(source).definition.model.parts.length).toBeGreaterThan(20);
 await page.locator('#stage3d-file').setInputFiles({name:'truck.scenecharacter.json',mimeType:'application/json',buffer:Buffer.from(source)});await expect(page.locator('#stage3d-resource')).toHaveValue('truck_2');await expect(canvas).toHaveAttribute('data-resource3d-id','truck_2');
 await page.locator('#stage3d-apply').click();const saved=page.waitForEvent('download');await page.locator('#save-project').click();const p=JSON.parse(await readFile((await (await saved).path())!,'utf8'));expect(p.characters.truck_2.model).toEqual(p.characters.truck.model);expect(p.scenes[0].stage3d.actors[0].character).toBe('truck');
});
test('invalid model JSON remains visible across selection changes and blocks stale apply/export',async({page})=>{
 await load(page);await page.locator('#open-stage3d').click();const input=page.locator('#stage3d-model'),original=await input.inputValue();
 await input.fill('{broken');await expect(input).toHaveAttribute('aria-invalid','true');await expect(page.locator('.model3d-editor:has(#stage3d-model)>.model3d-error')).not.toBeEmpty();await expect(page.locator('.model3d-editor:has(#stage3d-model)>.model3d-error')).toHaveCSS('user-select','text');
 await page.locator('#stage3d-export').click();await expect(page.locator('#stage3d-status')).not.toBeEmpty();await page.locator('#stage3d-apply').click();await expect(page.locator('#stage3d-dialog')).toBeVisible();
 await page.locator('#stage3d-resource').selectOption('robot');await page.locator('#stage3d-resource').selectOption('truck');await expect(input).toHaveValue('{broken');
 await input.fill(original);await expect(input).not.toHaveAttribute('aria-invalid','true');await page.locator('#stage3d-apply').click();await expect(page.locator('#stage3d-dialog')).not.toBeVisible();
});
test('hierarchies use local pivots, inherit transforms but not mesh sizes, and render/export deterministically',async({page})=>{
 await page.goto('/en/');const result=await page.evaluate(async raw=>{
  const {parseModel3D}=await import(/* @vite-ignore */ '/src/lib/model3d.ts' as string),{createModel3D}=await import(/* @vite-ignore */ '/src/scripts/model3d.ts' as string),{Stage3DRenderer}=await import(/* @vite-ignore */ '/src/scripts/stage3d.ts' as string),{validateProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  const storage={geometries:new Set<any>(),materials:new Map<string,any>()},model=parseModel3D({parts:[{id:'child',parent:'parent',position:{x:2},pivot:{x:1},rotation:{z:90},joints:[{id:'turn',axis:'z',min:0,max:90}]},{id:'parent',shape:'group',position:{x:1},rotation:{z:90},size:{x:10,y:10,z:10}}]})!;
  const built=createModel3D(model,storage),mesh=built.root.getObjectByName('child-geometry')!;built.root.updateMatrixWorld(true);const initial=[mesh.matrixWorld.elements[12],mesh.matrixWorld.elements[13]];built.update({turn:90},[],0);built.root.updateMatrixWorld(true);const turned=[mesh.matrixWorld.elements[12],mesh.matrixWorld.elements[13]];storage.geometries.forEach(g=>g.dispose());storage.materials.forEach(m=>m.dispose());
  const p=validateProject(raw),shot=p.scenes[0].stage3d!,renderer=new Stage3DRenderer(),canvas=document.createElement('canvas'),draw=(time:number)=>{renderer.render(p,shot,time,1920,1080,canvas);return canvas.toDataURL();};
  const first=draw(.6),world=Array.from((renderer as any).cache.values())[0] as any,geometry=Array.from(world.geometries),materials=world.materials.size,later=draw(1.6);for(let i=0;i<20;i++)draw(i/5);const repeated=draw(.6);
  const expected=document.createElement('canvas');expected.width=480;expected.height=270;expected.getContext('2d')!.drawImage(canvas,0,0,480,270);
  const media=new ExportMedia(p,new AbortController().signal),exporter=new ExportRenderer(p,media);let error=0;
  try{const frame=await exporter.frame(.6,480,270),a=frame.getContext('2d')!.getImageData(0,0,480,270).data,b=expected.getContext('2d')!.getImageData(0,0,480,270).data;for(let i=0;i<a.length;i++)error+=Math.abs(a[i]-b[i]);error/=a.length;}finally{exporter.dispose();media.dispose();}
  const stableGeometry=geometry.length===world.geometries.size&&geometry.every(g=>world.geometries.has(g))&&materials===world.materials.size;renderer.dispose();return {initial,turned,animated:first!==later,stable:first===repeated,stableGeometry,error};
 },construction3DExample);
 expect(result.initial[0]).toBeCloseTo(2);expect(result.initial[1]).toBeCloseTo(3);expect(result.turned[0]).toBeCloseTo(1);expect(result.turned[1]).toBeCloseTo(4);expect(result.animated).toBe(true);expect(result.stable).toBe(true);expect(result.stableGeometry).toBe(true);expect(result.error).toBeLessThan(1);
});
test('custom facial joints react to existing speech and expression channels',async({page})=>{
 await page.goto('/en/');const result=await page.evaluate(async raw=>{
  const {validateProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{defaultNarration}=await import(/* @vite-ignore */ '/src/lib/audio.ts' as string),{Stage3DRenderer}=await import(/* @vite-ignore */ '/src/scripts/stage3d.ts' as string);
  const p=validateProject(raw),shot=p.scenes[0].stage3d!;shot.actors=shot.actors.slice(1);const actor=shot.actors[0];actor.expressions=[];actor.motions=[];actor.speech={source:'scene',strength:1};p.characters.robot.expression='blink';p.audios.voice={name:'test.wav',data:'data:audio/wav;base64,AAAA',duration:8};p.scenes[0].narration={...defaultNarration(),asset:'voice'};
  const renderer=new Stage3DRenderer(),canvas=document.createElement('canvas'),envelopes=new Map([['voice',{duration:8,rate:50,levels:new Float32Array(400).fill(1)}]]);
  try{
   renderer.render(p,shot,1,480,270,canvas,false,envelopes);const world=Array.from((renderer as any).cache.values())[0] as any,root=world.custom[0].root,open=root.getObjectByName('mouth').position.y,lid=root.getObjectByName('lidL').position.y;
   renderer.render(p,shot,1,480,270,canvas);const closed=root.getObjectByName('mouth').position.y;return {open,closed,lid};
  }finally{renderer.dispose();}
 },construction3DExample);
 expect(result.open).toBeCloseTo(2.04);expect(result.closed).toBeCloseTo(2.22);expect(result.lid).toBeCloseTo(2.59);
});
test('construction objects export as a short MP4',async({page})=>{
 test.setTimeout(60000);await page.goto('/en/');const result=await page.evaluate(async raw=>{
  const {validateProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{exportVideo,exportSupported}=await import(/* @vite-ignore */ '/src/scripts/video-export.ts' as string);const p=validateProject(raw),s=p.scenes[0];s.duration=.3;s.elements=[];s.stage3d!.stageMotions!.forEach((m:any)=>m.duration=.3);s.stage3d!.actors.forEach((a:any)=>{a.duration=.3;a.expressions=[];a.motions.forEach((m:any)=>m.duration=.3);});const options={format:'mp4',resolution:480,fps:24,audio:false};if(!await exportSupported(p,options))return null;const blob=await exportVideo(p,options,new AbortController().signal,()=>{});return blob.size;
 },construction3DExample);
 test.skip(result===null,'No MP4 encoder');expect(result).toBeGreaterThan(1000);
});

test('instanced scale joints resize each copy without shifting offsets or drifting across updates',async({page})=>{
 await page.goto('/en/');
 const result=await page.evaluate(async()=>{
  const {parseModel3D}=await import(/* @vite-ignore */ '/src/lib/model3d.ts' as string),{createModel3D}=await import(/* @vite-ignore */ '/src/scripts/model3d.ts' as string);
  const model=parseModel3D({parts:[{id:'eyes',shape:'box',size:{x:.2,y:.3,z:.1},instances:[{x:-.4},{x:.4}],joints:[{id:'height',motion:'scale',axis:'y',min:0,max:2,value:1,control:'blink',target:0},{id:'width',motion:'scale',axis:'x',min:0,max:3,value:1}]}],animations:{close:{duration:2,tracks:[{joint:'height',keys:[{at:0,value:1},{at:1,value:0},{at:2,value:1}]}]}}})!;
  const storage={geometries:new Set<any>(),materials:new Map<string,any>()},built=createModel3D(model,storage),mesh:any=built.root.getObjectByName('eyes-geometry');
  const capture=()=>({matrices:Array.from(mesh.instanceMatrix.array) as number[],visible:mesh.visible,scale:mesh.scale.toArray(),version:mesh.instanceMatrix.version,bounds:[mesh.boundingBox.min.toArray(),mesh.boundingBox.max.toArray()],radius:mesh.boundingSphere.radius});
  try{
   const first=capture();built.update({height:2,width:3},[],0);const enlarged=capture();built.update({height:2,width:3},[],0);const repeated=capture();
   built.update({},[],0,{blink:1});const shut=capture();built.update({},[],0);const rewind=capture();
   const motions=[{animation:'close',at:0,duration:2,speed:1,loop:false,blend:0}];built.update({},motions,1);const animatedClosed=capture();built.update({},motions,0);const animatedReset=capture();
   return {first,enlarged,repeated,shut,rewind,animatedClosed,animatedReset,geometries:storage.geometries.size,materials:storage.materials.size};
  }finally{storage.geometries.forEach(g=>g.dispose());storage.materials.forEach(m=>m.dispose());}
 });
 const {first,enlarged,repeated,shut,rewind,animatedClosed,animatedReset}=result;
 for(const offset of [0,16]){expect(first.matrices[offset]).toBeCloseTo(.2);expect(enlarged.matrices[offset]).toBeCloseTo(.6);expect(enlarged.matrices[offset+5]).toBeCloseTo(.6);expect(enlarged.matrices[offset+12]).toBeCloseTo(first.matrices[offset+12]);}
 expect(first.matrices[12]).toBeCloseTo(-.4);expect(first.matrices[28]).toBeCloseTo(.4);
 expect(enlarged.scale).toEqual([1,1,1]);expect(enlarged.bounds[0][0]).toBeCloseTo(-.7);expect(enlarged.bounds[1][0]).toBeCloseTo(.7);expect(enlarged.radius).toBeGreaterThan(first.radius);
 expect(repeated.matrices).toEqual(enlarged.matrices);expect(repeated.version).toBe(enlarged.version);expect(shut.visible).toBe(false);expect(animatedClosed.visible).toBe(false);
 expect(rewind.matrices).toEqual(first.matrices);expect(animatedReset.matrices).toEqual(first.matrices);expect(rewind.visible).toBe(true);expect(result.geometries).toBe(1);expect(result.materials).toBe(1);
});
