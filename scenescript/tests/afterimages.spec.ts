import {test,expect} from '@playwright/test';
import {demoProject,newElement} from '../src/lib/model';
import {defaultAfterimages} from '../src/lib/afterimages';
import {defaultMotionPath} from '../src/lib/motion-path';
import {defaultPaper} from '../src/lib/paper';
import {defaultStopMotion} from '../src/lib/stop-motion';
test('afterimage controls, reverse scrubbing, disabling and JSON round trip',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as any).trailJSON=text;}}}));
 await page.goto('/en/');const p=demoProject(),e=newElement('shape');e.animation='none';e.motionPath=defaultMotionPath();p.scenes=p.scenes.slice(0,1);p.scenes[0].elements=[e];
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();await page.locator('#element-list button').click();
 await page.locator('#element-form [name=afterimagesEnabled]').check();
 await page.locator('#element-form [name=afterimagesCount]').fill('3');await page.locator('#element-form [name=afterimagesCount]').press('Tab');
 await page.locator('#element-form [name=afterimagesSpacing]').fill('0.2');await page.locator('#element-form [name=afterimagesSpacing]').press('Tab');
 await page.locator('#element-form [name=afterimagesTint]').check();
 await page.locator('#timeline').fill('1');await expect(page.locator('[data-afterimage-index]')).toHaveCount(3);
 const transforms=await page.locator('[data-afterimage-index]').evaluateAll(nodes=>nodes.map(n=>(n as HTMLElement).style.transform));expect(new Set(transforms).size).toBe(3);
 await page.locator('#timeline').fill('0');await expect(page.locator('[data-afterimages]')).toHaveCount(0);
 await page.locator('#timeline').fill('1');expect(await page.locator('[data-afterimage-index]').evaluateAll(nodes=>nodes.map(n=>(n as HTMLElement).style.transform))).toEqual(transforms);
 await expect(page.locator('[data-afterimages]')).toHaveAttribute('aria-hidden','true');await expect(page.locator('[data-afterimages]')).toHaveAttribute('inert','');
 await page.locator('#copy-project-json').click();const json=await page.evaluate(()=>(window as any).trailJSON as string);
 expect(JSON.parse(json).scenes[0].elements[0].afterimages).toMatchObject({enabled:true,count:3,spacing:.2,tint:true});
 await page.locator('#open-json').click();await page.locator('#json-input').fill(json);page.on('dialog',d=>d.accept());await page.locator('#import-json').click();
 await page.locator('#element-list button').click();await expect(page.locator('#element-form [name=afterimagesEnabled]')).toBeChecked();
 await page.locator('#element-form [name=afterimagesEnabled]').uncheck();await expect(page.locator('[data-afterimages]')).toHaveCount(0);
});

test('true historical poses, tint and opacity agree in preview and export',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);const s=p.scenes[0];s.transition='none';s.background='#000000';
 const e=newElement('shape');Object.assign(e,{x:10,y:40,width:5,height:10,animation:'none',fillColor:'#ff0000',motionPath:{...defaultMotionPath(),duration:2,to:{x:60,y:0}},afterimages:{...defaultAfterimages(),enabled:true,count:3,spacing:.2,opacity:1,tint:true,color:'#00ff00'}});s.elements=[e];
 const exported=await page.evaluate(async(p)=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
  try{const canvas:HTMLCanvasElement=await renderer.frame(1,480,270),ctx=canvas.getContext('2d')!;return [118,146,175,204].map(x=>Array.from(ctx.getImageData(x,122,1,1).data).slice(0,3));}finally{renderer.dispose();media.dispose();}
 },p);
 const expected=[[0,64,0],[0,128,0],[0,191,0],[255,0,0]];
 exported.forEach((pixel,i)=>pixel.forEach((v,j)=>expect(Math.abs(v-expected[i][j])).toBeLessThanOrEqual(2)));
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();await page.locator('#timeline').fill('1');
 const png=await page.locator('#stage-frame').screenshot();
 const preview=await page.evaluate(async(b64)=>{
  const image=new Image();image.src='data:image/png;base64,'+b64;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0);
  return [.245,.305,.365,.425].map(x=>Array.from(ctx.getImageData(Math.floor(x*image.width),Math.floor(.45*image.height),1,1).data).slice(0,3));
 },png.toString('base64'));
 preview.forEach((pixel,i)=>pixel.forEach((v,j)=>expect(Math.abs(v-expected[i][j])).toBeLessThanOrEqual(2)));
});

test('histories combine previous art effects deterministically without recursive copies or duplicate IDs',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].transition='none';p.scenes[0].background='#000000';
 const e=newElement('shape');Object.assign(e,{width:25,height:25,shapeType:'star',animation:'draw',exitAnimation:'particles-confetti',exitDuration:2,motionPath:defaultMotionPath(),paper:{...defaultPaper(),enabled:true},liquid:{enabled:true,style:'water',strength:35,wavelength:100,speed:1},stopMotion:{...defaultStopMotion(),enabled:true,fps:4},afterimages:{...defaultAfterimages(),enabled:true,count:2,spacing:.2,tint:true}});p.scenes[0].elements=[e];
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();await page.locator('#timeline').fill('4');
 await expect(page.locator('[data-afterimages]')).toHaveCount(1);await expect(page.locator('[data-afterimage-index]')).toHaveCount(2);
 const ids=await page.locator('#stage [id]').evaluateAll(nodes=>nodes.map(n=>n.id));expect(new Set(ids).size).toBe(ids.length);
 await page.locator('#timeline').fill('5');await expect(page.locator('[data-afterimages]')).toHaveCount(0);
 const result=await page.evaluate(async(p)=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
  try{const frames=[];for(const t of [4,4.1,4,5]){const canvas:HTMLCanvasElement=await renderer.frame(t,480,270);frames.push(canvas.getContext('2d')!.getImageData(0,0,480,270).data);}
   const diff=(a:Uint8ClampedArray,b:Uint8ClampedArray)=>a.reduce((n,v,i)=>n+(v!==b[i]?1:0),0);
   let lit=0,end=0;for(let i=0;i<frames[0].length;i+=4){if(frames[0][i]>10||frames[0][i+1]>10)lit++;if(frames[3][i]+frames[3][i+1]+frames[3][i+2]>10)end++;}
   return {held:diff(frames[0],frames[1]),repeat:diff(frames[0],frames[2]),lit,end};
  }finally{renderer.dispose();media.dispose();}
 },p);expect(result.held).toBe(0);expect(result.repeat).toBe(0);expect(result.lit).toBeGreaterThan(100);expect(result.end).toBe(0);
});

test('historical SVG animations are sampled at their own earlier times',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].transition='none';
 const source='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="10" cy="50" r="8" fill="#ff0000"><animate attributeName="cx" from="10" to="90" dur="2s" fill="freeze"/></circle></svg>';
 p.assets.svg={name:'moving.svg',data:'data:image/svg+xml;base64,'+Buffer.from(source).toString('base64')};
 const e=newElement('image');Object.assign(e,{asset:'svg',animation:'none',afterimages:{...defaultAfterimages(),enabled:true,count:2,spacing:.25}});p.scenes[0].elements=[e];
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();await page.locator('#timeline').fill('1');
 await expect.poll(()=>page.locator('[data-afterimage-index="2"] circle').evaluate(n=>(n as SVGCircleElement).cx.animVal.value)).toBeCloseTo(30,4);
 await expect.poll(()=>page.locator('[data-afterimage-index="1"] circle').evaluate(n=>(n as SVGCircleElement).cx.animVal.value)).toBeCloseTo(40,4);
 await expect.poll(()=>page.locator('.scene-element[data-element-id] circle').evaluate(n=>(n as SVGCircleElement).cx.animVal.value)).toBeCloseTo(50,4);
 await page.locator('#timeline').fill('0.5');
 await expect.poll(()=>page.locator('[data-afterimage-index="2"] circle').evaluate(n=>(n as SVGCircleElement).cx.animVal.value)).toBeCloseTo(10,4);
});

test('cropped raster histories wait for image dimensions before capture',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);const s=p.scenes[0];s.transition='none';s.background='#000000';
 const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=2;const ctx=c.getContext('2d')!;ctx.fillStyle='#ff0000';ctx.fillRect(0,0,2,2);return c.toDataURL();});
 p.assets.raster={name:'red.png',data};
 const e=newElement('image');Object.assign(e,{x:10,y:40,width:5,height:10,asset:'raster',fit:'cover',crop:{x:0,y:0,width:100,height:100},animation:'none',motionPath:{...defaultMotionPath(),duration:2,to:{x:60,y:0}},afterimages:{...defaultAfterimages(),enabled:true,count:1,spacing:.2,opacity:1,tint:true,color:'#00ff00'}});s.elements=[e];
 const pixels=await page.evaluate(async(p)=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
  try{const canvas:HTMLCanvasElement=await renderer.frame(1,480,270),ctx=canvas.getContext('2d')!;return [175,204].map(x=>Array.from(ctx.getImageData(x,122,1,1).data).slice(0,3));}finally{renderer.dispose();media.dispose();}
 },p);
 expect(pixels[0][0]).toBe(0);expect(Math.abs(pixels[0][1]-128)).toBeLessThanOrEqual(2);expect(pixels[0][2]).toBe(0);expect(pixels[1]).toEqual([255,0,0]);
});
