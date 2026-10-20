import {test,expect} from './helpers/editor-test';
import {demoProject,newElement} from '../src/lib/model';
test('liquid controls, reversible scrubbing, disabling and JSON round trip',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as any).liquidJSON=text;}}}));
 await page.goto('/en/');await page.locator('#element-add-menu summary').click();await page.locator('[data-add=shape]').click();
 await page.locator('#element-form [name=liquidEnabled]').check();
 await page.locator('#element-form [name=liquidStrength]').fill('50');await page.locator('#element-form [name=liquidStrength]').press('Tab');
 await page.locator('#element-form [name=liquidStyle]').selectOption('melt');
 const noise=page.locator('.scene-element.selected feTurbulence');
 await page.locator('#timeline').fill('1');const first=await noise.getAttribute('baseFrequency');
 await page.locator('#timeline').fill('2');expect(await noise.getAttribute('baseFrequency')).not.toBe(first);
 await page.locator('#timeline').fill('1');await expect(noise).toHaveAttribute('baseFrequency',first!);
 await page.locator('#copy-project-json').click();const json=await page.evaluate(()=>(window as any).liquidJSON as string);
 expect(JSON.parse(json).scenes[0].elements.at(-1).liquid).toMatchObject({enabled:true,strength:50,style:'melt'});
 await page.locator('#open-json').click();await page.locator('#json-input').fill(json);page.on('dialog',d=>d.accept());await page.locator('#import-json').click();
 await page.locator('#element-list button').last().click();await expect(page.locator('#element-form [name=liquidEnabled]')).toBeChecked();
 await page.locator('#element-form [name=liquidEnabled]').uncheck();await expect(page.locator('.liquid-svg')).toHaveCount(0);
});

test('liquid export changes pixels deterministically, supports both styles and zero strength',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);const s=p.scenes[0];s.transition='none';s.background='#000000';
 const e=newElement('shape');Object.assign(e,{x:25,y:25,width:50,height:50,shapeType:'star',animation:'none',fillColor:'#00ff00',liquid:{enabled:true,style:'water',strength:80,wavelength:90,speed:1}});s.elements=[e];
 const result=await page.evaluate(async(p)=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  async function pixels(time:number){
   const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
   try{const canvas:HTMLCanvasElement=await renderer.frame(time,480,270);return Array.from(canvas.getContext('2d')!.getImageData(0,0,480,270).data);}finally{renderer.dispose();media.dispose();}
  }
  const a=await pixels(1),b=await pixels(2),again=await pixels(1);
  p.scenes[0].elements[0].liquid.style='melt';const melt=await pixels(1);
  p.scenes[0].elements[0].liquid.strength=0;const zero=await pixels(1);
  p.scenes[0].elements[0].liquid.enabled=false;const off=await pixels(1);
  const diff=(a:number[],b:number[])=>a.reduce((sum,n,i)=>sum+(n!==b[i]?1:0),0);
  return {time:diff(a,b),repeat:diff(a,again),style:diff(a,melt),effect:diff(a,off),zero:diff(zero,off),green:a.filter((n,i)=>i%4===1&&n>20).length};
 },p);
 expect(result.green).toBeGreaterThan(1000);expect(result.time).toBeGreaterThan(100);expect(result.repeat).toBe(0);expect(result.style).toBeGreaterThan(100);expect(result.effect).toBeGreaterThan(100);expect(result.zero).toBe(0);
});

test('liquid combines with line drawing and particles without duplicate SVG IDs',async({page})=>{
 await page.goto('/en/');const p=demoProject(),e=newElement('shape');p.scenes=p.scenes.slice(0,1);p.scenes[0].transition='none';p.scenes[0].elements=[e];
 Object.assign(e,{shapeType:'star',animation:'draw',exitAnimation:'particles-confetti',exitDuration:2,liquid:{enabled:true,style:'water',strength:35,wavelength:100,speed:1}});
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();await page.locator('#timeline').fill('4');
 await expect(page.locator('[data-particle-overlay] > div')).toHaveCount(48);
 const ids=await page.locator('#stage [id]').evaluateAll(nodes=>nodes.map(n=>n.id));expect(new Set(ids).size).toBe(ids.length);
 await page.locator('#timeline').fill('0.5');await expect(page.locator('[data-particle-overlay]')).toHaveCount(0);
 await expect(page.locator('[data-draw-stroke]')).toHaveAttribute('stroke-dashoffset','0.375');
 const pixels=await page.evaluate(async(p)=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
  try{const canvas:HTMLCanvasElement=await renderer.frame(4,480,270),data=canvas.getContext('2d')!.getImageData(0,0,480,270).data;let colored=0;for(let i=0;i<data.length;i+=4)if(data[i]>data[i+1])colored++;return colored;}finally{renderer.dispose();media.dispose();}
 },p);expect(pixels).toBeGreaterThan(100);
});
