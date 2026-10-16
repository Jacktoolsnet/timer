import {test,expect} from '@playwright/test';
import {demoProject,newElement} from '../src/lib/model';
import {defaultStopMotion} from '../src/lib/stop-motion';
import {defaultPaper} from '../src/lib/paper';
test('stop-motion controls, held jitter, backwards scrubbing and JSON round trip',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as any).stopJSON=text;}}}));
 await page.goto('/en/');await page.locator('#element-add-menu summary').click();await page.locator('[data-add=shape]').click();
 await page.locator('#element-form [name=stopMotionEnabled]').check();
 await page.locator('#element-form [name=stopMotionFps]').fill('4');await page.locator('#element-form [name=stopMotionFps]').press('Tab');
 const selected=page.locator('.scene-element.selected');
 await page.locator('#timeline').fill('1.01');const first=await selected.evaluate(n=>(n as HTMLElement).style.transform);
 await page.locator('#timeline').fill('1.2');expect(await selected.evaluate(n=>(n as HTMLElement).style.transform)).toBe(first);
 await page.locator('#timeline').fill('1.26');expect(await selected.evaluate(n=>(n as HTMLElement).style.transform)).not.toBe(first);
 await page.locator('#timeline').fill('1.01');expect(await selected.evaluate(n=>(n as HTMLElement).style.transform)).toBe(first);
 await page.locator('#copy-project-json').click();const json=await page.evaluate(()=>(window as any).stopJSON as string);
 expect(JSON.parse(json).scenes[0].elements.at(-1).stopMotion).toMatchObject({enabled:true,fps:4});
 await page.locator('#open-json').click();await page.locator('#json-input').fill(json);page.on('dialog',d=>d.accept());await page.locator('#import-json').click();
 await page.locator('#element-list button').last().click();await expect(page.locator('#element-form [name=stopMotionEnabled]')).toBeChecked();
 await page.locator('#element-form [name=stopMotionEnabled]').uncheck();
 await page.locator('#timeline').fill('1.01');const normal=await selected.evaluate(n=>(n as HTMLElement).style.transform);
 await page.locator('#timeline').fill('1.26');expect(await selected.evaluate(n=>(n as HTMLElement).style.transform)).toBe(normal);
});

test('stop-motion SVG content uses the same held element-local clock',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].transition='none';
 const source='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="10" cy="50" r="8" fill="#ff0000"><animate attributeName="cx" from="10" to="90" dur="2s" fill="freeze"/></circle></svg>';
 p.assets.svg={name:'animated.svg',data:'data:image/svg+xml;base64,'+Buffer.from(source).toString('base64')};
 const e=newElement('image');Object.assign(e,{asset:'svg',animation:'none',at:.13,stopMotion:{...defaultStopMotion(),enabled:true,fps:2,jitter:0,rotation:0}});p.scenes[0].elements=[e];
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();
 for(const [time,x] of [['0.2',10],['0.6',10],['0.7',30],['1.1',30],['0.2',10]] as const){
  await page.locator('#timeline').fill(time);await expect.poll(()=>page.locator('.scene-svg-image circle').evaluate(n=>(n as SVGCircleElement).cx.animVal.value)).toBeCloseTo(x,4);
 }
});

test('stop-motion export holds paper/liquid/drawing frames and completes particle exits exactly',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);const s=p.scenes[0];s.transition='none';s.background='#000000';s.duration=1.13;
 const e=newElement('shape');Object.assign(e,{x:25,y:25,width:50,height:50,shapeType:'star',animation:'draw',animationDuration:.7,exitAnimation:'particles-confetti',exitDuration:.5,stopMotion:{...defaultStopMotion(),enabled:true,fps:4},paper:{...defaultPaper(),enabled:true},liquid:{enabled:true,style:'water',strength:35,wavelength:100,speed:1},exposure:{enabled:true,mode:'screen',strength:.8}});s.elements=[e];
 const result=await page.evaluate(async(p)=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
  try{const frames=[];for(const time of [.26,.49,.5,.26,1.13]){
   const canvas:HTMLCanvasElement=await renderer.frame(time,480,270);frames.push(canvas.getContext('2d')!.getImageData(0,0,480,270).data);
  }
  const diff=(a:Uint8ClampedArray,b:Uint8ClampedArray)=>a.reduce((n,v,i)=>n+(v!==b[i]?1:0),0);
  let endLit=0;for(let i=0;i<frames[4].length;i+=4)if(frames[4][i]+frames[4][i+1]+frames[4][i+2]>10)endLit++;
  return {held:diff(frames[0],frames[1]),next:diff(frames[0],frames[2]),repeat:diff(frames[0],frames[3]),endLit};
  }finally{renderer.dispose();media.dispose();}
 },p);
 expect(result.held).toBe(0);expect(result.next).toBeGreaterThan(100);expect(result.repeat).toBe(0);expect(result.endLit).toBe(0);
});
