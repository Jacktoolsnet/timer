import {test,expect} from './helpers/editor-test';
import {readFile} from 'node:fs/promises';
import {stage3DExample} from '../src/lib/stage3d-example';
async function load(page:any,source:unknown=stage3DExample){await page.goto('/en/');await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(source));await page.locator('#import-json').click();await expect(page.locator('#json-dialog')).not.toBeVisible();await expect(page.locator('#stage .stage3d-canvas')).toHaveAttribute('data-stage3d-time','0');}
test('old projects save explicit editable figure and stage models without changing scene actions',async({page})=>{
 const old:any=structuredClone(stage3DExample);for(const c of Object.values(old.characters) as any[])delete c.model;delete old.stages.plaza.model;
 await load(page,old);const pending=page.waitForEvent('download');await page.locator('#save-project').click();const p=JSON.parse(await readFile((await (await pending).path())!,'utf8'));
 for(const id of ['mika','bo','lina']){expect(p.characters[id].model.parts.length).toBeGreaterThan(20);expect(p.characters[id].model.animations.walk).toBeTruthy();expect(p.characters[id].model.animations.wave).toBeTruthy();}
 expect(p.stages.plaza.model.parts.find((p:any)=>p.id==='studs').instances).toHaveLength(224);
 expect(p.scenes[0].stage3d.actors[0].actions[0].type).toBe('walk');expect(p.scenes[0].duration).toBe(7);expect(p.scenes[1].duration).toBe(6);
});
test('new figures and stages are created as construction resources, not renderer presets',async({page})=>{
 await page.goto('/en/');await page.locator('#open-stage3d').click();await page.locator('#stage3d-add').click();expect(JSON.parse(await page.locator('#stage3d-model').inputValue()).parts.length).toBeGreaterThan(20);
 await page.locator('#stage3d-model-animation').selectOption('wave');await page.locator('#stage3d-model-time').fill('0.5');await expect(page.locator('#stage3d-resource-preview canvas')).toHaveAttribute('data-stage3d-time','0.5');
 await page.locator('#stage3d-kind').selectOption('stage');await page.locator('#stage3d-add').click();expect(JSON.parse(await page.locator('#stage3d-model').inputValue()).parts.find((p:any)=>p.id==='studs').instances.length).toBe(224);
 await page.locator('#stage3d-apply').click();await expect(page.locator('#stage3d-dialog')).not.toBeVisible();
});
test('changing figure style does not overwrite custom part edits',async({page})=>{
 await load(page);await page.locator('#open-stage3d').click();const model=JSON.parse(await page.locator('#stage3d-model').inputValue());model.parts.find((p:any)=>p.id==='torso').size.x=1.8;await page.locator('#stage3d-model').fill(JSON.stringify(model));
 await page.locator('[data-resource-field=style]').selectOption('pixel');expect(JSON.parse(await page.locator('#stage3d-model').inputValue()).parts.find((p:any)=>p.id==='torso').size.x).toBe(1.8);
 await page.locator('#stage3d-apply').click();const pending=page.waitForEvent('download');await page.locator('#save-project').click();const p=JSON.parse(await readFile((await (await pending).path())!,'utf8'));expect(p.characters.mika.model.parts.find((p:any)=>p.id==='torso').size.x).toBe(1.8);
});
test('all migrated figures share the construction renderer and keep action-controlled joint movement',async({page})=>{
 await page.goto('/en/');const result=await page.evaluate(async raw=>{
  const {Stage3DRenderer}=await import(/* @vite-ignore */ '/src/scripts/stage3d.ts' as string),{validateProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{actor3DPose}=await import(/* @vite-ignore */ '/src/lib/stage3d.ts' as string);
  const p=validateProject(raw),shot=p.scenes[0].stage3d!,renderer=new Stage3DRenderer(),canvas=document.createElement('canvas');let maxError=0;const samples=[];
  try{for(const time of [.5,1.1,5,6.8]){
   renderer.render(p,shot,time,480,270,canvas);const world=Array.from((renderer as any).cache.values())[0] as any;samples.push(world.custom.length);
   for(const r of world.custom){const pose=actor3DPose(r.actor,time,shot.actors);for(const name of ['leftArm','rightArm','leftLeg','rightLeg'])maxError=Math.max(maxError,Math.abs(r.root.getObjectByName(name).children[0].rotation.x-(pose as any)[name]));}
  }}finally{renderer.dispose();}return {maxError,samples};
 },stage3DExample);
 expect(result.samples).toEqual([3,3,3,3]);expect(result.maxError).toBeLessThan(1e-9);
});
