import {test,expect} from '@playwright/test';
import {demoProject,newElement} from '../src/lib/model';
import {defaultPrint} from '../src/lib/print';
import {defaultGlitch} from '../src/lib/glitch';
import {defaultPaper} from '../src/lib/paper';
import {defaultAfterimages} from '../src/lib/afterimages';
import {defaultReveal} from '../src/lib/reveal';
import {defaultStopMotion} from '../src/lib/stop-motion';
test('print controls, JSON round trip and disable restore original nodes',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as any).printJSON=text;}}}));
 await page.goto('/en/');await page.locator('#element-add-menu summary').click();await page.locator('[data-add=shape]').click();
 await page.locator('#element-form [name=printEnabled]').check();await expect(page.locator('.selected .print-svg')).toHaveCount(1);
 await page.locator('#element-form [name=printStyle]').selectOption('lines');await page.locator('#element-form [name=printSize]').fill('32');await page.locator('#element-form [name=printSize]').press('Tab');
 await page.locator('#element-form [name=printAngle]').fill('-30');await page.locator('#element-form [name=printAngle]').press('Tab');
 await page.locator('#copy-project-json').click();const json=await page.evaluate(()=>(window as any).printJSON as string);expect(JSON.parse(json).scenes[0].elements.at(-1).print).toMatchObject({enabled:true,style:'lines',size:32,angle:-30});
 await page.locator('#open-json').click();await page.locator('#json-input').fill(json);page.on('dialog',d=>d.accept());await page.locator('#import-json').click();await page.locator('#element-list button').last().click();
 await expect(page.locator('#element-form [name=printEnabled]')).toBeChecked();await expect(page.locator('#element-form [name=printStyle]')).toHaveValue('lines');
 await page.locator('#element-form [name=printStrength]').fill('0');await page.locator('#element-form [name=printStrength]').press('Tab');await expect(page.locator('.print-svg')).toHaveCount(0);
 await page.locator('#element-form [name=printStrength]').fill('1');await page.locator('#element-form [name=printStrength]').press('Tab');await page.locator('#element-form [name=printEnabled]').uncheck();await expect(page.locator('.print-svg')).toHaveCount(0);await expect(page.locator('.scene-element.selected')).toHaveCount(1);
});

test('print exports luminance-dependent ink coverage, both styles, colors and exact bypass',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);const s=p.scenes[0];s.transition='none';s.background='#335577';
 s.elements=['#222222','#888888','#dddddd'].map((fillColor,i)=>Object.assign(newElement('shape'),{id:'tone'+i,x:5+i*30,y:20,width:25,height:60,animation:'none',fillColor,print:{...defaultPrint(),enabled:true,size:64,angle:0,ink:'#ff0000',paper:'#ffff00'}}));
 const result=await page.evaluate(async(p)=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
  async function frame(){const c:HTMLCanvasElement=await renderer.frame(1,480,270);return c.getContext('2d')!.getImageData(0,0,480,270).data;}
  const diff=(a:Uint8ClampedArray,b:Uint8ClampedArray)=>a.reduce((n,v,i)=>n+(v!==b[i]?1:0),0);
  try{const dots=await frame(),again=await frame();const coverage=p.scenes[0].elements.map((_,i)=>{let ink=0,paper=0;for(let y=65;y<205;y++)for(let x=30+i*144;x<135+i*144;x++){const j=(y*480+x)*4;if(dots[j]>240&&dots[j+1]<20&&dots[j+2]<20)ink++;if(dots[j]>240&&dots[j+1]>240&&dots[j+2]<20)paper++;}return {ink,paper};});
   p.scenes[0].elements.forEach(e=>e.print.style='lines');const lines=await frame();p.scenes[0].elements.forEach(e=>e.print.size=32);const small=await frame();p.scenes[0].elements.forEach(e=>e.print.size=64);p.scenes[0].elements.forEach(e=>e.print.angle=45);const angled=await frame();p.scenes[0].elements.forEach(e=>e.print.strength=0);const zero=await frame();p.scenes[0].elements.forEach(e=>e.print.enabled=false);const off=await frame();p.scenes[0].elements.forEach(e=>Object.assign(e.print,{enabled:true,strength:.5,style:'dots',angle:0}));const half=await frame();let blendError=0;for(let y=65;y<205;y++)for(let x=30;x<135;x++){const j=(y*480+x)*4;for(let k=0;k<3;k++)blendError=Math.max(blendError,Math.abs(half[j+k]-(dots[j+k]+off[j+k])/2));}
   return {coverage,repeat:diff(dots,again),style:diff(dots,lines),size:diff(lines,small),blendError,angle:diff(lines,angled),zero:diff(zero,off),corner:Array.from(dots.slice(0,3))};
  }finally{renderer.dispose();media.dispose();}
 },p);
 expect(result.coverage[0].ink).toBeGreaterThan(result.coverage[1].ink);expect(result.coverage[1].ink).toBeGreaterThan(result.coverage[2].ink);for(const c of result.coverage){expect(c.ink).toBeGreaterThan(100);expect(c.paper).toBeGreaterThan(100);}
 expect(result.size).toBeGreaterThan(1000);expect(result.blendError).toBeLessThanOrEqual(1);expect(result.repeat).toBe(0);expect(result.style).toBeGreaterThan(1000);expect(result.angle).toBeGreaterThan(1000);expect(result.zero).toBe(0);expect(result.corner).toEqual([51,85,119]);
 // Compare the same fixture in the responsive preview (allow edge antialiasing).
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();await page.locator('#timeline').fill('1');
 const png=await page.locator('#stage-frame').screenshot();const coverage=await page.evaluate(async(b64)=>{const image=new Image();image.src='data:image/png;base64,'+b64;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d')!;ctx.drawImage(image,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data;return [0,1,2].map(i=>{let ink=0,total=0;for(let y=Math.ceil(c.height*65/270);y<c.height*205/270;y++)for(let x=Math.ceil(c.width*(30+i*144)/480);x<c.width*(135+i*144)/480;x++){const j=(y*c.width+x)*4;if(d[j]>180&&d[j+1]<80&&d[j+2]<40)ink++;total++;}return ink/total;});},png.toString('base64'));
 coverage.forEach((v,i)=>expect(Math.abs(v-result.coverage[i].ink/(140*105))).toBeLessThan(.1));
});

test('print preserves transparent image/text edges and combines with all earlier effects',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].transition='none';p.scenes[0].background='#335577';
 p.assets.art={name:'gray.svg',data:'data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="25" y="25" width="50" height="50" fill="#888888"/></svg>').toString('base64')};
 const elements=[newElement('image'),newElement('text'),newElement('shape')];for(const e of elements)Object.assign(e,{x:20,y:20,width:60,height:60,animation:'none',fontSize:160,text:'Print',color:'#888888',fillColor:'#888888',asset:e.type==='image'?'art':'',print:{...defaultPrint(),enabled:true,size:60}});
 Object.assign(elements[2],{animation:'draw',shapeType:'star',exitAnimation:'particles-confetti',exitDuration:2,paper:{...defaultPaper(),enabled:true},liquid:{enabled:true,style:'water',strength:20,wavelength:100,speed:1},glitch:{...defaultGlitch(),enabled:true},stopMotion:{...defaultStopMotion(),enabled:true,fps:4},afterimages:{...defaultAfterimages(),enabled:true,count:2,tint:true},reveal:{...defaultReveal(),enabled:true,type:'brush',duration:2},exposure:{enabled:true,mode:'screen',strength:.8}});
 const result=await page.evaluate(async({p,elements})=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);const results=[];
  for(const e of elements){p.scenes[0].elements=[e];const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
   try{const frames=[];for(const time of [1.26,1.49,1.26,3.5,5]){const c:HTMLCanvasElement=await renderer.frame(time,480,270);frames.push(c.getContext('2d')!.getImageData(0,0,480,270).data);}const diff=(a:Uint8ClampedArray,b:Uint8ClampedArray)=>a.reduce((n,v,i)=>n+(v!==b[i]?1:0),0);let changed=0,end=0;for(let i=0;i<frames[3].length;i+=4){if(frames[3][i]!==51||frames[3][i+1]!==85||frames[3][i+2]!==119)changed++;if(frames[4][i]!==51||frames[4][i+1]!==85||frames[4][i+2]!==119)end++;}results.push({held:diff(frames[0],frames[1]),repeat:diff(frames[0],frames[2]),changed,end,corner:Array.from(frames[0].slice(0,3)),transparent:Array.from(frames[0].slice((60*480+100)*4,(60*480+100)*4+3))});}finally{renderer.dispose();media.dispose();}
  }return results;
 },{p,elements});
 for(const r of result){expect(r.held).toBe(0);expect(r.repeat).toBe(0);expect(r.changed).toBeGreaterThan(100);expect(r.corner).toEqual([51,85,119]);}expect(result[0].transparent).toEqual([51,85,119]);expect(result[2].end).toBe(0);
 p.scenes[0].elements=[elements[2]];await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();await page.locator('#timeline').fill('1.26');await expect(page.locator('.print-svg')).toHaveCount(3);const ids=await page.locator('#stage [id]').evaluateAll(nodes=>nodes.map(n=>n.id));expect(new Set(ids).size).toBe(ids.length);
});
