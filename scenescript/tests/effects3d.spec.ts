import {test,expect} from '@playwright/test';

test('generic damage restores shared materials, detaches debris in world space and seeks deterministically',async({page})=>{
 await page.goto('/en/');await expect(page.locator('#editor')).toHaveAttribute('data-ready','true');
 const result=await page.evaluate(async()=>{
  const {parseModel3D}=await import(/* @vite-ignore */ '/src/lib/model3d.ts' as string),{createModel3D}=await import(/* @vite-ignore */ '/src/scripts/model3d.ts' as string),{defaultEffect3D}=await import(/* @vite-ignore */ '/src/lib/effects3d.ts' as string),THREE=await import(/* @vite-ignore */ performance.getEntriesByType('resource').map(e=>e.name).find(n=>/\/three\.js\?/.test(n))!);
  const model=parseModel3D({parts:[{id:'assembly',shape:'group'},{id:'cover',parent:'assembly',color:'#88aacc'},{id:'other',position:{x:3},color:'#88aacc'}],effectSites:[{id:'engine',part:'assembly',radius:.5,debris:['cover']}]})!;
  const events=[{...defaultEffect3D(),site:'engine',kind:'burn',at:1,duration:1,result:'char'},{...defaultEffect3D(),site:'engine',at:3,duration:1,result:'break'}];
  // Use the SAME Three module as the renderer without relying on Vite's versioned URL.
  const storage={geometries:new Set<any>(),materials:new Map<string,any>()};
  const built=createModel3D(model,storage,{},events,(t:number)=>new THREE.Matrix4().makeTranslation(t*2,0,0));
  const cover:any=built.root.getObjectByName('cover-geometry'),other:any=built.root.getObjectByName('other-geometry'),content=built.root.getObjectByName('assembly')!.children[0].children[0];
  const sample=(time:number,owner=time*2)=>{built.root.position.x=owner;built.update({},[],time);built.root.updateMatrixWorld(true);const fragment:any=built.root.getObjectByName('debris-cover'),fire:any=built.root.getObjectByName('effect-0');return {source:content.visible,cover:cover.material.color.getHexString(),other:other.material.color.getHexString(),fragment:fragment.visible,world:fragment.getWorldPosition(new THREE.Vector3()).toArray(),fire:fire.visible,pool:Array.from(fire.children[0].instanceMatrix.array)};};
  try{const pristine=sample(0),burning=sample(1.5),charred=sample(2.5),blast=sample(3.2),moved=sample(3.2,200),ended=sample(5),back=sample(0),again=sample(3.2);return {pristine,burning,charred,blast,moved,ended,back,again};}
  finally{built.root.traverse((o:any)=>{if(o.isInstancedMesh)o.dispose();});storage.geometries.forEach(g=>g.dispose());storage.materials.forEach(m=>m.dispose());}
 });
 expect(result.burning.fire).toBe(true);expect(result.charred.cover).not.toBe(result.pristine.cover);expect(result.charred.other).toBe(result.pristine.other);
 expect(result.blast.source).toBe(false);expect(result.blast.fragment).toBe(true);expect(result.ended.source).toBe(false);expect(result.ended.fragment).toBe(false);
 for(let i=0;i<3;i++)expect(result.moved.world[i]).toBeCloseTo(result.blast.world[i],7);
 expect(result.back.cover).toBe(result.pristine.cover);expect(result.back.source).toBe(true);expect(result.back.fire).toBe(false);
 expect(result.again).toEqual(result.blast);
});

test('preview and export share burning, explosion and persistent destruction with deterministic frames',async({page},info)=>{
 test.setTimeout(120000);await page.goto('/en/');await expect(page.locator('#editor')).toHaveAttribute('data-ready','true');
 const result=await page.evaluate(async()=>{
  const {parseProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{createStage3DView,prepareStage3DPreview}=await import(/* @vite-ignore */ '/src/scripts/stage3d-preview.ts' as string),{ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  const p=parseProject(JSON.stringify({version:'1.0',format:'portrait',title:'Object-neutral effects',stages:{room:{transparentBackground:true,model:{parts:[{id:'body',shape:'group'},{id:'cover',parent:'body',color:'#4499bb',size:{x:2,y:2,z:2}}],effectSites:[{id:'damage',part:'body',radius:1}]}}},scenes:[{id:'s',duration:6,transition:'none',background:'#101828',stage3d:{stage:'room',camera:{distance:10,targetY:0},effects:[{site:'damage',kind:'burn',at:1,duration:1,result:'char'},{site:'damage',at:3,duration:1.5,result:'break',seed:19}]},elements:[]}]}));
  await prepareStage3DPreview();const errors:string[]=[],view=createStage3DView(p,p.scenes[0].stage3d!,270,480,(e:Error)=>errors.push(e.message)),media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media),frames=[];
  try{for(const t of [0,1.5,2.5,3.2,5,0,3.2]){view.draw(t);const canvas=document.createElement('canvas');canvas.width=270;canvas.height=480;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#101828';ctx.fillRect(0,0,270,480);ctx.drawImage(view.canvas,0,0);const exported=await renderer.frame(t,270,480),a=ctx.getImageData(0,0,270,480).data,b=exported.getContext('2d')!.getImageData(0,0,270,480).data;let difference=0;for(let i=0;i<a.length;i++)difference+=Math.abs(a[i]-b[i]);frames.push({t,png:exported.toDataURL(),difference:difference/a.length});exported.width=0;exported.height=0;}return {errors,frames};}finally{view.dispose();renderer.dispose();media.dispose();}
 });
 expect(result.errors).toEqual([]);expect(result.frames[0].png).toBe(result.frames[5].png);expect(result.frames[3].png).toBe(result.frames[6].png);expect(new Set(result.frames.map(f=>f.png)).size).toBe(5);
 for(const frame of result.frames){expect(frame.difference).toBeLessThan(.5);if(frame.t>0)await info.attach('effect-'+frame.t,{body:Buffer.from(frame.png.split(',')[1],'base64'),contentType:'image/png'});}
});
