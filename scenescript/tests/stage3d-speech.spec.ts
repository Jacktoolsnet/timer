import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {wav} from './audio-fixture';
import {validateProject} from '../src/lib/model';
import {defaultNarration} from '../src/lib/audio';
import {defaultActor3D} from '../src/lib/stage3d';
import {stage3DExample} from '../src/lib/stage3d-example';
function speechProject(bound=true){
 const p=validateProject(stage3DExample);p.scenes=p.scenes.slice(0,1);const s=p.scenes[0];s.duration=4;s.elements=[];s.transition='none';
 const audio=wav();for(let i=0;i<32000;i++){const t=i/16000;if(t<.4||t>=.9&&t<1.3||t>=1.8)audio.writeInt16LE(0,44+i*2);}
 p.audios={voice:{name:'Teststimme.wav',data:'data:audio/wav;base64,'+audio.toString('base64'),duration:2}};
 s.narration={...defaultNarration(),asset:'voice',at:.5,start:.25,end:1.75};
 const shot=s.stage3d!;shot.camera={...shot.camera,yaw:0,pitch:9,distance:8,orbit:0,targetY:1.7};
 shot.actors=[{...defaultActor3D('mika','mika'),speech:bound?{source:'scene',strength:1}:null}];p.characters.mika.expression='happy';return p;
}
async function load(page:any,p:ReturnType<typeof speechProject>){
 await page.goto('/en/');await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();await expect(page.locator('#json-dialog')).not.toBeVisible();await expect(page.locator('#stage .stage3d-canvas')).toHaveAttribute('data-stage3d-time','0');
}
test('speech binding form assigns existing narration, supports strength, applies and discards drafts',async({page})=>{
 await load(page,speechProject(false));await page.locator('#open-stage3d').click();await page.locator('#stage3d-scene-settings summary').click();
 await expect(page.locator('#stage3d-speech-source')).toHaveValue('');await page.locator('#stage3d-speech-source').selectOption('scene');await expect(page.locator('#stage3d-speech-file')).toHaveText('Teststimme.wav');
 await page.locator('#stage3d-speech-strength').fill('1.5');await page.locator('#stage3d-speech-strength').dispatchEvent('change');
 expect(JSON.parse(await page.locator('#stage3d-shot').inputValue()).actors[0].speech).toEqual({source:'scene',strength:1.5});
 await page.locator('#stage3d-close').click();await page.locator('#open-stage3d').click();await page.locator('#stage3d-scene-settings summary').click();await expect(page.locator('#stage3d-speech-source')).toHaveValue('');
 await page.locator('#stage3d-speech-source').selectOption('project');await expect(page.locator('#stage3d-speech-file')).toContainText('No speech file');
 await page.locator('#stage3d-speech-source').selectOption('scene');await page.locator('#stage3d-apply').click();
 await page.locator('#timeline').fill('1');await expect(page.locator('#stage .stage3d-canvas')).toHaveAttribute('data-stage3d-time','1');
 const download=page.waitForEvent('download');await page.locator('#save-project').click();const saved=JSON.parse(await readFile((await (await download).path())!,'utf8'));
 expect(saved.scenes[0].stage3d.actors[0].speech).toEqual({source:'scene',strength:1});expect(saved.scenes[0].narration.asset).toBe('voice');expect(Object.keys(saved.audios)).toEqual(['voice']);
});
test('all face styles speak only during audio, retain their eyes, rewind identically and match export frames',async({page})=>{
 test.setTimeout(60000);await page.goto('/en/');
 const result=await page.evaluate(async source=>{
  const {Stage3DRenderer}=await import(/* @vite-ignore */ '/src/scripts/stage3d.ts' as string),{prepareStage3DSpeech}=await import(/* @vite-ignore */ '/src/scripts/stage3d-speech.ts' as string),{actor3DMouth}=await import(/* @vite-ignore */ '/src/lib/stage3d-speech.ts' as string),{ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  const p=source as any,shot=p.scenes[0].stage3d,renderer=new Stage3DRenderer(),results=[];
  try{for(const id of ['mika','bo','lina']){
   const actor=shot.actors[0];actor.character=id;p.characters[id].expression='happy';
   const envelopes=await prepareStage3DSpeech(p,shot),canvas=document.createElement('canvas'),draw=(t:number,voices=envelopes)=>{renderer.render(p,shot,t,1920,1080,canvas,false,voices);return canvas.toDataURL();};
   const snapshotEyes=()=>{const world=Array.from((renderer as any).cache.values()).at(-1) as any;return JSON.stringify(world.custom[0].character.model.parts.filter((p:any)=>p.id.startsWith('eye')||p.id.startsWith('brow')||p.id.startsWith('pixel_')&&p.position.y>2.69).map((p:any)=>{const anchor=world.custom[0].root.getObjectByName(p.id),mesh=world.custom[0].root.getObjectByName(p.id+'-geometry');return [anchor.position.toArray(),anchor.children[0].rotation.toArray(),mesh.scale.toArray(),mesh.visible];}));};
   const closed=draw(1,new Map()),closedEyes=snapshotEyes(),open=draw(1),openEyes=snapshotEyes();draw(3);draw(.1);const repeated=draw(1);
   const native=document.createElement('canvas');native.width=480;native.height=270;native.getContext('2d')!.drawImage(canvas,0,0,480,270);
   const media=new ExportMedia(p,new AbortController().signal),output=new ExportRenderer(p,media);let error=0;
   try{const actual=await output.frame(1,480,270),a=actual.getContext('2d')!.getImageData(0,0,480,270).data,b=native.getContext('2d')!.getImageData(0,0,480,270).data;for(let i=0;i<a.length;i++)error+=Math.abs(a[i]-b[i]);error/=a.length;}finally{output.dispose();media.dispose();}
   results.push({id,changed:open!==closed,eyes:openEyes===closedEyes,stable:repeated===open,open:actor3DMouth(p,shot,actor,1,envelopes),silence:[.2,.55,1.4,2.1].map(t=>actor3DMouth(p,shot,actor,t,envelopes)),error});
  }}finally{renderer.dispose();}return results;
 },speechProject());
 for(const r of result){expect(r.changed,r.id).toBe(true);expect(r.eyes,r.id).toBe(true);expect(r.stable,r.id).toBe(true);expect(r.open).toBeGreaterThan(.7);expect(r.silence.every(v=>v<.03)).toBe(true);expect(r.error).toBeLessThan(1);}
});
test('pending speech analysis does not redraw disposed views; invalid audio fails previews and export',async({page})=>{
 await page.goto('/en/');
 const result=await page.evaluate(async source=>{
  const {createStage3DView}=await import(/* @vite-ignore */ '/src/scripts/stage3d-preview.ts' as string),{prepareStage3DSpeech}=await import(/* @vite-ignore */ '/src/scripts/stage3d-speech.ts' as string),{ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  const p=source as any,errors:string[]=[],view=createStage3DView(p,p.scenes[0].stage3d,480,270,(e:Error)=>errors.push(e.message));view.draw(1);view.dispose();await prepareStage3DSpeech(p,p.scenes[0].stage3d);await new Promise(r=>setTimeout(r,30));
  const disposed=[view.canvas.width,view.canvas.height],bad=structuredClone(p);bad.audios.voice.data='data:audio/wav;base64,AAAA';
  let notify!:()=>void;const failed=new Promise<void>(resolve=>notify=resolve);const invalid=createStage3DView(bad,bad.scenes[0].stage3d,480,270,(e:Error)=>{errors.push(e.message);notify();});invalid.draw(1);await failed;
  const media=new ExportMedia(bad,new AbortController().signal),output=new ExportRenderer(bad,media);let exportError='';
  try{await output.frame(1,480,270);}catch(e){exportError=(e as Error).message;}finally{output.dispose();media.dispose();}
  const previewError=invalid.canvas.dataset.stage3dError;invalid.dispose();return {disposed,errors,previewError,exportError};
 },speechProject());
 expect(result.disposed).toEqual([0,0]);expect(result.errors).toHaveLength(1);expect(result.previewError).toBe('true');expect(result.exportError).toContain('unsupported format or codec');
});

test('silent MP4 export still animates mouths from narration',async({page})=>{
 test.setTimeout(60000);await page.goto('/en/');
 const result=await page.evaluate(async source=>{
  const {exportVideo,exportSupported}=await import(/* @vite-ignore */ '/src/scripts/video-export.ts' as string),{ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  const p=source as any,s=p.scenes[0];s.duration=.35;s.narration.at=0;s.narration.start=.5;s.narration.end=.85;s.stage3d.actors[0].duration=.35;
  const options={format:'mp4',resolution:480,fps:24,audio:false};if(!await exportSupported(p,options))return null;
  const video=await exportVideo(p,options,new AbortController().signal,()=>{}),url=URL.createObjectURL(video),player=document.createElement('video');
  try{
   player.src=url;player.muted=true;await new Promise<void>((resolve,reject)=>{player.onloadedmetadata=()=>resolve();player.onerror=()=>reject(new Error('Video decode failed'));});
   player.currentTime=.2;await new Promise<void>((resolve,reject)=>{player.onseeked=()=>resolve();player.onerror=()=>reject(new Error('Video seek failed'));});
   const canvas=document.createElement('canvas');canvas.width=player.videoWidth;canvas.height=player.videoHeight;canvas.getContext('2d')!.drawImage(player,0,0);
   const pixels=canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data;
   const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
   let error=0;
   try{const frame=await renderer.frame(.2,canvas.width,canvas.height),expected=frame.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data;for(let i=0;i<pixels.length;i++)error+=Math.abs(pixels[i]-expected[i]);error/=pixels.length;}finally{renderer.dispose();media.dispose();}
   return {size:video.size,error};
  }finally{player.removeAttribute('src');player.load();URL.revokeObjectURL(url);}
 },speechProject());
 test.skip(result===null,'Browser has no MP4 encoder');expect(result!.size).toBeGreaterThan(1000);expect(result!.error).toBeLessThan(8);
});
