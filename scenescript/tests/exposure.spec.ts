import {test,expect} from './helpers/editor-test';
import {demoProject,newElement} from '../src/lib/model';
test('double exposure controls, JSON round trip and disable restore normal rendering',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as any).exposureJSON=text;}}}));
 await page.goto('/en/');await page.locator('#element-add-menu summary').click();await page.locator('[data-add=shape]').click();
 await page.locator('#element-form [name=exposureEnabled]').check();
 await page.locator('#element-form [name=exposureMode]').selectOption('multiply');
 await page.locator('#element-form [name=exposureStrength]').fill('0.5');await page.locator('#element-form [name=exposureStrength]').press('Tab');
 const selected=page.locator('.scene-element.selected');await expect(selected).toHaveCSS('mix-blend-mode','multiply');await expect(selected).toHaveCSS('opacity','0.5');
 await page.locator('#copy-project-json').click();const json=await page.evaluate(()=>(window as any).exposureJSON as string);
 expect(JSON.parse(json).scenes[0].elements.at(-1).exposure).toEqual({enabled:true,mode:'multiply',strength:.5});
 await page.locator('#open-json').click();await page.locator('#json-input').fill(json);page.on('dialog',d=>d.accept());await page.locator('#import-json').click();
 await page.locator('#element-list button').last().click();await expect(page.locator('#element-form [name=exposureEnabled]')).toBeChecked();
 await page.locator('#element-form [name=exposureEnabled]').uncheck();await expect(selected).toHaveCSS('mix-blend-mode','normal');await expect(selected).toHaveCSS('opacity','1');
});

test('double exposure renders expected blend pixels in export and preview',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);const s=p.scenes[0];s.transition='none';s.background='#804020';
 const e=newElement('shape');Object.assign(e,{x:0,y:0,width:100,height:100,animation:'none',fillColor:'#4080c0',exposure:{enabled:true,mode:'screen',strength:1}});s.elements=[e];
 const cases=[
  {mode:'screen',strength:1,expected:[160,160,200]},
  {mode:'multiply',strength:1,expected:[32,32,24]},
  {mode:'overlay',strength:1,expected:[65,64,48]},
  {mode:'soft-light',strength:1,expected:[96,64,60]},
  {mode:'lighten',strength:1,expected:[128,128,192]},
  {mode:'screen',strength:.5,expected:[144,112,116]},
  {mode:'screen',strength:0,expected:[128,64,32]},
 ] as const;
 for(const c of cases){
  e.exposure.mode=c.mode;e.exposure.strength=c.strength;
  const pixel=await page.evaluate(async(p)=>{
   const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
   const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
   try{const canvas:HTMLCanvasElement=await renderer.frame(1,480,270);return Array.from(canvas.getContext('2d')!.getImageData(240,135,1,1).data).slice(0,3);}finally{renderer.dispose();media.dispose();}
  },p);
  pixel.forEach((v,i)=>expect(Math.abs(v-c.expected[i])).toBeLessThanOrEqual(2));
 }
 // An actual browser screenshot catches scene-background/stacking-context differences.
 e.exposure.mode='screen';e.exposure.strength=1;
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();
 const png=await page.locator('#stage-frame').screenshot();
 const preview=await page.evaluate(async(base64)=>{
  const img=new Image();img.src='data:image/png;base64,'+base64;await img.decode();
  const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d')!;ctx.drawImage(img,0,0);
  return Array.from(ctx.getImageData(Math.floor(img.width/2),Math.floor(img.height/2),1,1).data).slice(0,3);
 },png.toString('base64'));
 preview.forEach((v,i)=>expect(Math.abs(v-cases[0].expected[i])).toBeLessThanOrEqual(2));
});

test('two actual image layers blend with each other rather than the scene background',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);const s=p.scenes[0];s.transition='none';s.background='#ffffff';
 for(const [id,color] of [['blue','#0000ff'],['red','#ff0000']])p.assets[id]={name:id+'.svg',data:'data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="'+color+'"/></svg>').toString('base64')};
 const lower=newElement('image'),upper=newElement('image');for(const e of [lower,upper])Object.assign(e,{x:25,y:25,width:50,height:50,animation:'none',fit:'cover'});
 lower.asset='blue';upper.asset='red';upper.exposure={enabled:true,mode:'screen',strength:1};s.elements=[lower,upper];
 const pixel=await page.evaluate(async(p)=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
  try{const canvas:HTMLCanvasElement=await renderer.frame(1,480,270);return Array.from(canvas.getContext('2d')!.getImageData(240,135,1,1).data).slice(0,3);}finally{renderer.dispose();media.dispose();}
 },p);expect(pixel).toEqual([255,0,255]);
});

test('double exposure blends liquid and particle output only once',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);const s=p.scenes[0];s.transition='none';s.background='#0000ff';
 const e=newElement('shape');Object.assign(e,{x:25,y:25,width:50,height:50,shapeType:'star',animation:'draw',fillColor:'#ff0000',borderColor:'#ff0000',exitAnimation:'particles-confetti',exitDuration:2,liquid:{enabled:true,style:'water',strength:35,wavelength:100,speed:1},exposure:{enabled:true,mode:'screen',strength:.5}});s.elements=[e];
 const result=await page.evaluate(async(p)=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
  try{const results=[];for(const time of [1,4]){
   const canvas:HTMLCanvasElement=await renderer.frame(time,480,270),data=canvas.getContext('2d')!.getImageData(0,0,480,270).data;
   let minBlue=255,red=0;for(let i=0;i<data.length;i+=4){minBlue=Math.min(minBlue,data[i+2]);if(data[i]>10)red++;}
   results.push({minBlue,red});
  }return results;}finally{renderer.dispose();media.dispose();}
 },p);
 for(const frame of result){expect(frame.minBlue).toBeGreaterThanOrEqual(253);expect(frame.red).toBeGreaterThan(100);}
});
