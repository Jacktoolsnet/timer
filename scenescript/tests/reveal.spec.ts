import {test,expect} from '@playwright/test';
import {demoProject,newElement} from '../src/lib/model';
import {defaultReveal,revealTypes} from '../src/lib/reveal';
import {defaultAfterimages} from '../src/lib/afterimages';
import {defaultPaper} from '../src/lib/paper';
import {defaultStopMotion} from '../src/lib/stop-motion';
test('reveal controls, circle origin, reverse scrubbing, disabling and JSON round trip',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as any).revealJSON=text;}}}));
 await page.goto('/en/');await page.locator('#element-add-menu summary').click();await page.locator('[data-add=shape]').click();await page.locator('#element-form [name=animation]').selectOption('none');
 await page.locator('#element-form [name=revealEnabled]').check();await page.locator('#element-form [name=revealType]').selectOption('circle');
 for(const [key,value] of [['revealOriginX','25'],['revealDuration','2'],['revealDelay','0.25']]){await page.locator('#element-form [name='+key+']').fill(value);await page.locator('#element-form [name='+key+']').press('Tab');}
 const selected=page.locator('.scene-element.selected');
 await page.locator('#timeline').fill('0.25');await expect(selected).toHaveCSS('clip-path','inset(100%)');
 await page.locator('#timeline').fill('1.25');const middle=await selected.evaluate(n=>(n as HTMLElement).style.clipPath);expect(middle).toContain('25% 50%');
 await page.locator('#timeline').fill('2.25');await expect(selected).toHaveCSS('clip-path','none');
 await page.locator('#timeline').fill('1.25');expect(await selected.evaluate(n=>(n as HTMLElement).style.clipPath)).toBe(middle);
 await page.locator('#copy-project-json').click();const json=await page.evaluate(()=>(window as any).revealJSON as string);
 expect(JSON.parse(json).scenes[0].elements.at(-1).reveal).toMatchObject({enabled:true,type:'circle',originX:25,duration:2,delay:.25});
 await page.locator('#open-json').click();await page.locator('#json-input').fill(json);page.on('dialog',d=>d.accept());await page.locator('#import-json').click();
 await page.locator('#element-list button').last().click();await expect(page.locator('#element-form [name=revealEnabled]')).toBeChecked();
 await page.locator('#element-form [name=revealEnabled]').uncheck();await expect(selected).toHaveCSS('clip-path','none');
});

test('all reveal masks export hidden, partially revealed and complete frames',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);const s=p.scenes[0];s.transition='none';s.background='#000000';
 const e=newElement('shape');Object.assign(e,{x:0,y:0,width:100,height:100,animation:'none',fillColor:'#00ff00',reveal:{...defaultReveal(),enabled:true,duration:2,delay:.25,easing:'linear'}});s.elements=[e];
 const results=await page.evaluate(async({p,types})=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);const results=[];
  for(const type of types){
   p.scenes[0].elements[0].reveal.type=type;const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
   try{const frames:Uint8ClampedArray[]=[];for(const time of [.25,1.25,2.25]){
    const canvas:HTMLCanvasElement=await renderer.frame(time,480,270);frames.push(canvas.getContext('2d')!.getImageData(0,0,480,270).data);
   }
   const count=(d:Uint8ClampedArray)=>{let n=0;for(let i=0;i<d.length;i+=4)if(d[i+1]>200&&d[i]<5)n++;return n;};
   const pixel=(x:number,y:number)=>frames[1][(Math.floor(y*270)*480+Math.floor(x*480))*4+1];
   const checks=type==='left-to-right'?[pixel(.25,.5),pixel(.75,.5)]:type==='right-to-left'?[pixel(.75,.5),pixel(.25,.5)]:type==='top-to-bottom'?[pixel(.5,.25),pixel(.5,.75)]:type==='bottom-to-top'?[pixel(.5,.75),pixel(.5,.25)]:type==='circle'?[pixel(.5,.5),pixel(.05,.05)]:[pixel(.25,.1),pixel(.75,.9)];
   results.push({type,counts:frames.map(count),checks});
   }finally{renderer.dispose();media.dispose();}
  }return results;
 },{p,types:revealTypes});
 for(const result of results){expect(result.counts[0]).toBe(0);expect(result.counts[1]).toBeGreaterThan(10000);expect(result.counts[1]).toBeLessThan(120000);expect(result.counts[2]).toBe(480*270);expect(result.checks).toEqual([255,0]);}
 // Check actual preview pixels, not just mask attributes.
 e.reveal.type='left-to-right';await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();await page.locator('#timeline').fill('1.25');
 const png=await page.locator('#stage-frame').screenshot();
 const preview=await page.evaluate(async(b64)=>{
  const image=new Image();image.src='data:image/png;base64,'+b64;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0);
  return [.25,.75].map(x=>Array.from(ctx.getImageData(Math.floor(x*image.width),Math.floor(.5*image.height),1,1).data).slice(0,3));
 },png.toString('base64'));expect(preview).toEqual([[0,255,0],[0,0,0]]);
});

test('reveal clocks combine with stop motion, historical ghosts, paper, liquid and particles',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].transition='none';p.scenes[0].background='#000000';
 const e=newElement('shape');Object.assign(e,{width:25,height:25,shapeType:'star',animation:'draw',exitAnimation:'particles-confetti',exitDuration:2,paper:{...defaultPaper(),enabled:true},liquid:{enabled:true,style:'water',strength:35,wavelength:100,speed:1},stopMotion:{...defaultStopMotion(),enabled:true,fps:4},afterimages:{...defaultAfterimages(),enabled:true,count:2,spacing:.2,tint:true},exposure:{enabled:true,mode:'screen',strength:.8},reveal:{...defaultReveal(),enabled:true,type:'brush',duration:4,easing:'linear'}});p.scenes[0].elements=[e];
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();
 const main=page.locator('.scene-element[data-element-id]');
 await page.locator('#timeline').fill('1.26');const first=await main.evaluate(n=>(n as HTMLElement).style.clipPath);
 await page.locator('#timeline').fill('1.49');expect(await main.evaluate(n=>(n as HTMLElement).style.clipPath)).toBe(first);
 const ghosts=await page.locator('[data-afterimage-element]').evaluateAll(nodes=>nodes.map(n=>(n as HTMLElement).style.clipPath));expect(ghosts.every(clip=>clip!==first)).toBe(true);
 await page.locator('#timeline').fill('1.5');expect(await main.evaluate(n=>(n as HTMLElement).style.clipPath)).not.toBe(first);
 await page.locator('#timeline').fill('3.5');await expect(page.locator('[data-particle-overlay]').first()).toHaveCSS('clip-path','none');
 const result=await page.evaluate(async(p)=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
  try{const frames:Uint8ClampedArray[]=[];for(const time of [1.26,1.49,1.26,3.5,5]){const canvas:HTMLCanvasElement=await renderer.frame(time,480,270);frames.push(canvas.getContext('2d')!.getImageData(0,0,480,270).data);}
   const diff=(a:Uint8ClampedArray,b:Uint8ClampedArray)=>a.reduce((n,v,i)=>n+(v!==b[i]?1:0),0);
   let lit=0,end=0;for(let i=0;i<frames[3].length;i+=4){if(frames[3][i]+frames[3][i+1]+frames[3][i+2]>10)lit++;if(frames[4][i]+frames[4][i+1]+frames[4][i+2]>10)end++;}
   return {held:diff(frames[0],frames[1]),repeat:diff(frames[0],frames[2]),lit,end};
  }finally{renderer.dispose();media.dispose();}
 },p);expect(result.held).toBe(0);expect(result.repeat).toBe(0);expect(result.lit).toBeGreaterThan(100);expect(result.end).toBe(0);
});

test('image and text masks hide and restore the original artwork',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].transition='none';p.scenes[0].background='#000000';
 p.assets.art={name:'green.svg',data:'data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#00ff00"/></svg>').toString('base64')};
 const image=newElement('image');Object.assign(image,{asset:'art',x:10,y:10,width:80,height:80,fit:'cover',animation:'none',reveal:{...defaultReveal(),enabled:true,type:'brush',duration:1}});
 const text=newElement('text');Object.assign(text,{text:'Reveal',x:10,y:10,width:80,height:80,fontSize:180,animation:'none',reveal:{...defaultReveal(),enabled:true,type:'circle',duration:1}});
 const results=await page.evaluate(async({p,elements})=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);const results=[];
  for(const e of elements){p.scenes[0].elements=[e];const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
   try{const counts=[];for(const time of [0,1]){const canvas:HTMLCanvasElement=await renderer.frame(time,480,270),data=canvas.getContext('2d')!.getImageData(0,0,480,270).data;let n=0;for(let i=0;i<data.length;i+=4)if(data[i]+data[i+1]+data[i+2]>30)n++;counts.push(n);}results.push(counts);}finally{renderer.dispose();media.dispose();}
  }return results;
 },{p,elements:[image,text]});
 for(const [hidden,shown] of results){expect(hidden).toBe(0);expect(shown).toBeGreaterThan(1000);}
});
