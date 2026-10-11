import {test,expect} from '@playwright/test';
import {demoProject} from '../src/lib/model';
import {defaultMotionPath} from '../src/lib/motion-path';
test('motion settings, circle preset and editable preview handles',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/en/');
 const p=demoProject();p.scenes[0].elements[0].motionPath=defaultMotionPath();p.scenes[0].elements[0].animation='none';
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();await page.locator('#element-list button').first().click();
 await expect(page.locator('[name=pathType]')).toHaveValue('line');await page.locator('[name=pathType]').selectOption('ellipse');await page.getByRole('button',{name:'Set circle',exact:true}).click();
 const rx=Number(await page.locator('[name="path-radiusX"]').inputValue()),ry=Number(await page.locator('[name="path-radiusY"]').inputValue());expect(rx*1920).toBeCloseTo(ry*1080);
 await page.locator('[name=pathType]').selectOption('bezier');await page.getByRole('button',{name:'Edit path in expanded preview',exact:true}).click();
 await expect(page.locator('.motion-path-overlay circle')).toHaveCount(4);
 const handle=page.locator('[data-path-point=from]');const b=(await handle.boundingBox())!;await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+20,b.y+b.height/2+10,{steps:3});await page.mouse.up();
 await page.locator('#close-preview').click();await expect(page.locator('.motion-path-overlay')).toHaveCount(0);expect(Number(await page.locator('[name="path-from-x"]').inputValue())).toBeGreaterThan(0);
 await page.locator('[name=pathType]').selectOption('none');await expect(page.locator('[name=pathDuration]')).toHaveCount(0);expect(errors).toEqual([]);
});
test('export pixels follow the same path at requested times',async({page})=>{
 await page.goto('/en/');const result=await page.evaluate(async()=>{
  const {demoProject,newElement}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string);
  const {defaultMotionPath}=await import(/* @vite-ignore */ '/src/lib/motion-path.ts' as string);
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string);
  const {ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].transition='none';p.scenes[0].background='#000000';const e=newElement('shape');Object.assign(e,{x:0,y:0,width:10,height:10,animation:'none',fillColor:'#00ff00',borderWidth:0,motionPath:defaultMotionPath()});e.motionPath.duration=2;e.motionPath.to={x:60,y:0};p.scenes[0].elements=[e];
  const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
  try{const a=await renderer.frame(0,480,270),b=await renderer.frame(1,480,270);return [a,b].map(c=>[10,154].map(x=>Array.from(c.getContext('2d')!.getImageData(x,10,1,1).data).slice(0,3)));}finally{renderer.dispose();media.dispose();}
 });expect(result).toEqual([[[0,255,0],[0,0,0]],[[0,0,0],[0,255,0]]]);
});
