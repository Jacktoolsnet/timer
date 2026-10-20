import {test,expect} from './helpers/editor-test';
import {demoProject,newElement} from '../src/lib/model';
import {defaultPaper} from '../src/lib/paper';
test('paper controls persist and seeded edges remain unchanged while scrubbing',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as any).paperJSON=text;}}}));
 await page.goto('/en/');await page.locator('#element-add-menu summary').click();await page.locator('[data-add=shape]').click();
 await page.locator('#element-form [name=paperEnabled]').check();
 await page.locator('#element-form [name=paperEdge]').selectOption('cut');
 await page.locator('#element-form [name=paperPadding]').fill('30');await page.locator('#element-form [name=paperPadding]').press('Tab');
 await page.locator('#element-form [name=paperSeed]').fill('123');await page.locator('#element-form [name=paperSeed]').press('Tab');
 await expect(page.locator('.scene-element.selected [data-paper-content] > div')).toHaveCSS('display','flex');
 const sheet=page.locator('.scene-element.selected [data-paper-sheet]'),clip=await sheet.evaluate(n=>(n as HTMLElement).style.clipPath);
 await page.locator('#timeline').fill('1');await expect(sheet).toHaveCSS('clip-path',clip);
 await page.locator('#timeline').fill('2');await expect(sheet).toHaveCSS('clip-path',clip);
 await page.locator('#copy-project-json').click();const json=await page.evaluate(()=>(window as any).paperJSON as string);
 expect(JSON.parse(json).scenes[0].elements.at(-1).paper).toMatchObject({enabled:true,edge:'cut',padding:30,seed:123});
 await page.locator('#open-json').click();await page.locator('#json-input').fill(json);page.on('dialog',d=>d.accept());await page.locator('#import-json').click();
 await page.locator('#element-list button').last().click();await expect(page.locator('#element-form [name=paperEnabled]')).toBeChecked();
 await page.locator('#element-form [name=paperEnabled]').uncheck();await expect(page.locator('[data-paper-sheet]')).toHaveCount(0);
 await expect(page.locator('.scene-element.selected')).toHaveCSS('filter','none');
});

test('paper export has a colored border, visible content, seeded edges, grain and outside shadow',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);const s=p.scenes[0];s.transition='none';s.background='#ffffff';
 const e=newElement('shape');Object.assign(e,{x:25,y:25,width:50,height:50,animation:'none',fillColor:'#00ff00',paper:{...defaultPaper(),enabled:true,edge:'straight',padding:60,roughness:0,texture:0,shadow:0,color:'#ff0000'}});s.elements=[e];
 const result=await page.evaluate(async(p)=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  async function frame(){
   const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
   try{const canvas:HTMLCanvasElement=await renderer.frame(1,480,270);return canvas.getContext('2d')!.getImageData(0,0,480,270).data;}finally{renderer.dispose();media.dispose();}
  }
  const flat=await frame(),sample=(data:Uint8ClampedArray,x:number,y:number)=>Array.from(data.slice((y*480+x)*4,(y*480+x)*4+3));
  p.scenes[0].elements[0].paper.shadow=24;const shadow=await frame();
  p.scenes[0].elements[0].paper.shadow=0;p.scenes[0].elements[0].paper.texture=1;const grain=await frame();
  p.scenes[0].elements[0].paper.texture=0;p.scenes[0].elements[0].paper.edge='torn';p.scenes[0].elements[0].paper.roughness=40;const torn=await frame(),again=await frame();
  p.scenes[0].elements[0].paper.seed=99;const other=await frame();
  const diff=(a:Uint8ClampedArray,b:Uint8ClampedArray)=>a.reduce((n,v,i)=>n+(v!==b[i]?1:0),0);
  return {border:sample(flat,240,72),center:sample(flat,240,135),outside:sample(flat,240,208),shadow:sample(shadow,240,208),grain:diff(flat,grain),torn:diff(flat,torn),repeat:diff(torn,again),seed:diff(torn,other)};
 },p);
 expect(result.border).toEqual([255,0,0]);expect(result.center).toEqual([0,255,0]);expect(result.outside).toEqual([255,255,255]);
 expect(result.shadow[0]).toBeLessThan(255);expect(result.grain).toBeGreaterThan(100);expect(result.torn).toBeGreaterThan(100);expect(result.repeat).toBe(0);expect(result.seed).toBeGreaterThan(100);
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();
 const png=await page.locator('#stage-frame').screenshot();
 const preview=await page.evaluate(async(base64)=>{
  const img=new Image();img.src='data:image/png;base64,'+base64;await img.decode();
  const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d')!;ctx.drawImage(img,0,0);
  const pixel=(x:number,y:number)=>Array.from(ctx.getImageData(Math.floor(x*img.width),Math.floor(y*img.height),1,1).data).slice(0,3);
  return {border:pixel(.5,.27),center:pixel(.5,.5)};
 },png.toString('base64'));
 expect(preview.border).toEqual(result.border);expect(preview.center).toEqual(result.center);

});

test('paper combines with previous art effects and keeps original nodes live',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].transition='none';
 const e=newElement('shape');Object.assign(e,{shapeType:'star',animation:'draw',exitAnimation:'particles-confetti',exitDuration:2,paper:{...defaultPaper(),enabled:true},liquid:{enabled:true,style:'water',strength:35,wavelength:100,speed:1},exposure:{enabled:true,mode:'screen',strength:.7}});p.scenes[0].elements=[e];
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();
 await page.locator('#timeline').fill('0.5');await expect(page.locator('[data-draw-stroke]')).toHaveAttribute('stroke-dashoffset','0.375');await expect(page.locator('[data-paper-sheet]')).toHaveCount(1);
 await page.locator('#timeline').fill('4');await expect(page.locator('[data-particle-overlay] > div')).toHaveCount(48);
 const ids=await page.locator('#stage [id]').evaluateAll(nodes=>nodes.map(n=>n.id));expect(new Set(ids).size).toBe(ids.length);
 const pixels=await page.evaluate(async(p)=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
  try{const canvas:HTMLCanvasElement=await renderer.frame(4,480,270),data=canvas.getContext('2d')!.getImageData(0,0,480,270).data;let light=0;for(let i=0;i<data.length;i+=4)if(data[i]>100)light++;return light;}finally{renderer.dispose();media.dispose();}
 },p);expect(pixels).toBeGreaterThan(100);
});
