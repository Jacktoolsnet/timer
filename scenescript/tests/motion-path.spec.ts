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
 await page.locator('#close-preview').click();await expect(page.locator('.motion-path-overlay')).toHaveCount(0);expect(Number(await page.locator('[name="path-x"]').first().inputValue())).toBeGreaterThan(0);
 await page.locator('[name=pathType]').selectOption('none');await expect(page.locator('[name=pathDuration]')).toHaveCount(0);expect(errors).toEqual([]);
});
test('export pixels follow the same path at requested times',async({page})=>{
 await page.goto('/en/');const result=await page.evaluate(async()=>{
  const {demoProject,newElement}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string);
  const {defaultMotionPath}=await import(/* @vite-ignore */ '/src/lib/motion-path.ts' as string);
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string);
  const {ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].transition='none';p.scenes[0].background='#000000';const e=newElement('shape');Object.assign(e,{x:0,y:0,width:10,height:10,animation:'none',fillColor:'#00ff00',borderWidth:0,motionPath:defaultMotionPath()});e.motionPath.type='segments';e.motionPath.segments=[{type:'line',to:{x:30,y:0},control1:{x:0,y:0},control2:{x:0,y:0},duration:1,pause:0,easing:'linear'},{type:'line',to:{x:60,y:0},control1:{x:0,y:0},control2:{x:0,y:0},duration:1,pause:0,easing:'linear'}];p.scenes[0].elements=[e];
  const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
  try{const a=await renderer.frame(0,480,270),b=await renderer.frame(1,480,270);return [a,b].map(c=>[10,154].map(x=>Array.from(c.getContext('2d')!.getImageData(x,10,1,1).data).slice(0,3)));}finally{renderer.dispose();media.dispose();}
 });expect(result).toEqual([[[0,255,0],[0,0,0]],[[0,0,0],[0,255,0]]]);
});
test('point tiles keep X before Y and connected routes edit, copy and round trip',async({page})=>{
 await page.goto('/en/');await page.locator('#element-list button').first().click();await page.locator('[name=pathType]').selectOption('segments');
 const start=page.locator('.path-settings>.text-settings-fields>.path-point-tile');const x=start.locator('[name=path-x]'),y=start.locator('[name=path-y]');const xb=(await x.boundingBox())!,yb=(await y.boundingBox())!;expect(xb.x).toBeLessThan(yb.x);expect(xb.y).toBeCloseTo(yb.y,0);
 await x.fill('5');await y.fill('7');await y.blur();await expect(x).toHaveValue('5');await expect(y).toHaveValue('7');
 await page.getByRole('button',{name:'Add segment',exact:true}).click();await expect(page.locator('[data-path-segment]')).toHaveCount(2);
 const second=page.locator('[data-path-segment="1"]');await second.locator('[name=pathSegmentType]').selectOption('bezier');await second.locator('[name=pathPause]').fill('1.5');await second.locator('[name=pathPause]').blur();await expect(second.locator('.path-point-tile')).toHaveCount(3);
 await page.getByRole('button',{name:'Copy path',exact:true}).click();await page.locator('#element-add-menu summary').click();await page.locator('[data-add=shape]').click();await page.getByRole('button',{name:'Paste path',exact:true}).click();await expect(page.locator('[name=pathType]')).toHaveValue('segments');await expect(page.locator('[data-path-segment="1"] [name=pathPause]')).toHaveValue('1.5');
 const pending=page.waitForEvent('download');await page.locator('#save-project').click();const file=await pending;await page.locator('#project-file').setInputFiles((await file.path())!);await page.locator('#element-list button').last().click();await expect(page.locator('[name=pathType]')).toHaveValue('segments');await expect(page.locator('[data-path-segment]')).toHaveCount(2);
 await page.getByRole('button',{name:'Edit path in expanded preview',exact:true}).click();await expect(page.locator('.motion-path-overlay circle')).toHaveCount(5);const box=(await page.locator('[data-path-point=segment-0-to]').boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+20,box.y+box.height/2+10,{steps:3});await page.mouse.up();await page.locator('#close-preview').click();expect(Number(await page.locator('[data-path-segment="0"] [name=path-x]').inputValue())).toBeGreaterThan(20);
 await page.locator('[name=pathTemplate]').selectOption('wave');await expect(page.locator('[data-path-segment]')).toHaveCount(4);await page.locator('[data-path-segment="1"]').getByRole('button',{name:'Move segment up',exact:true}).click();await page.locator('[data-path-segment="0"]').getByRole('button',{name:'Delete segment',exact:true}).click();await expect(page.locator('[data-path-segment]')).toHaveCount(3);
});
