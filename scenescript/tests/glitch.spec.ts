import {test,expect} from '@playwright/test';
import {demoProject,newElement} from '../src/lib/model';
import {defaultGlitch} from '../src/lib/glitch';
import {defaultPaper} from '../src/lib/paper';
import {defaultReveal} from '../src/lib/reveal';
import {defaultAfterimages} from '../src/lib/afterimages';
import {defaultStopMotion} from '../src/lib/stop-motion';
test('glitch controls, pattern holding, backwards scrubbing, freezing and JSON round trip',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as any).glitchJSON=text;}}}));
 await page.goto('/en/');await page.locator('#element-add-menu summary').click();await page.locator('[data-add=shape]').click();
 await page.locator('#element-form [name=glitchEnabled]').check();await page.locator('#element-form [name=glitchRate]').fill('4');await page.locator('#element-form [name=glitchRate]').press('Tab');
 const offsets=page.locator('.scene-element.selected .glitch-svg feOffset');
 await page.locator('#timeline').fill('0.26');const first=await offsets.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('dx')));
 await page.locator('#timeline').fill('0.49');expect(await offsets.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('dx')))).toEqual(first);
 await page.locator('#timeline').fill('0.5');expect(await offsets.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('dx')))).not.toEqual(first);
 await page.locator('#timeline').fill('0.26');expect(await offsets.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('dx')))).toEqual(first);
 await page.locator('#element-form [name=glitchRate]').fill('0');await page.locator('#element-form [name=glitchRate]').press('Tab');
 await page.locator('#timeline').fill('1');const frozen=await offsets.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('dx')));
 await page.locator('#timeline').fill('2');expect(await offsets.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('dx')))).toEqual(frozen);
 await page.locator('#copy-project-json').click();const json=await page.evaluate(()=>(window as any).glitchJSON as string);expect(JSON.parse(json).scenes[0].elements.at(-1).glitch).toMatchObject({enabled:true,rate:0});
 await page.locator('#open-json').click();await page.locator('#json-input').fill(json);page.on('dialog',d=>d.accept());await page.locator('#import-json').click();await page.locator('#element-list button').last().click();
 await expect(page.locator('#element-form [name=glitchEnabled]')).toBeChecked();await page.locator('#element-form [name=glitchEnabled]').uncheck();await expect(page.locator('.glitch-svg')).toHaveCount(0);
});

test('band displacement, RGB splitting and exact zero/disabled bypass render in export',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);const s=p.scenes[0];s.transition='none';s.background='#000000';
 const e=newElement('shape');Object.assign(e,{x:25,y:25,width:50,height:50,animation:'none',fillColor:'#ffffff',glitch:{...defaultGlitch(),enabled:true,strength:60,channelShift:0,bands:6,rate:4}});s.elements=[e];
 const result=await page.evaluate(async(p)=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
  async function frame(time:number){const c:HTMLCanvasElement=await renderer.frame(time,480,270);return c.getContext('2d')!.getImageData(0,0,480,270).data;}
  try{
   const bands=await frame(.26),held=await frame(.49),next=await frame(.5),again=await frame(.26);
   const starts=[];for(let row=0;row<6;row++){const y=Math.floor(67.5+(row+.5)*135/6);let first=-1;for(let x=80;x<400;x++)if(bands[(y*480+x)*4]>100){first=x;break;}starts.push(first);}
   p.scenes[0].elements[0].glitch.strength=0;p.scenes[0].elements[0].glitch.channelShift=30;const rgb=await frame(.26);
   let red=0,blue=0;for(let i=0;i<rgb.length;i+=4){if(rgb[i]>100&&rgb[i+1]<50&&rgb[i+2]<50)red++;if(rgb[i+2]>100&&rgb[i]<50&&rgb[i+1]<50)blue++;}
   p.scenes[0].elements[0].glitch.channelShift=0;const zero=await frame(.26);p.scenes[0].elements[0].glitch.enabled=false;const off=await frame(.26);
   const diff=(a:Uint8ClampedArray,b:Uint8ClampedArray)=>a.reduce((n,v,i)=>n+(v!==b[i]?1:0),0);
   return {starts,red,blue,held:diff(bands,held),next:diff(bands,next),again:diff(bands,again),zero:diff(zero,off),visible:diff(bands,off)};
  }finally{renderer.dispose();media.dispose();}
 },p);
 expect(new Set(result.starts).size).toBeGreaterThan(2);expect(result.starts.every(x=>x>80)).toBe(true);expect(result.red).toBeGreaterThan(100);expect(result.blue).toBeGreaterThan(100);
 expect(result.held).toBe(0);expect(result.next).toBeGreaterThan(100);expect(result.again).toBe(0);expect(result.zero).toBe(0);expect(result.visible).toBeGreaterThan(100);
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();await page.locator('#timeline').fill('0.26');
 const png=await page.locator('#stage-frame').screenshot();
 const preview=await page.evaluate(async(b64)=>{
  const image=new Image();image.src='data:image/png;base64,'+b64;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0);
  const data=ctx.getImageData(0,0,canvas.width,canvas.height).data,starts=[];
  for(let row=0;row<6;row++){const y=Math.floor(canvas.height*(.25+(row+.5)*.5/6));let first=-1;for(let x=Math.floor(canvas.width*.17);x<canvas.width*.83;x++)if(data[(y*canvas.width+x)*4]>100){first=x;break;}starts.push(first/canvas.width*480);}
  // Allow two screenshot pixels for responsive scaling and edge antialiasing.
  return {starts,tolerance:2*480/canvas.width};
 },png.toString('base64'));
 preview.starts.forEach((x,i)=>expect(Math.abs(x-result.starts[i])).toBeLessThanOrEqual(preview.tolerance));
});

test('glitch combines with all previous effects and historical ghosts use earlier patterns',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].transition='none';p.scenes[0].background='#000000';
 const e=newElement('shape');Object.assign(e,{width:25,height:25,shapeType:'star',animation:'draw',exitAnimation:'particles-confetti',exitDuration:2,paper:{...defaultPaper(),enabled:true},liquid:{enabled:true,style:'water',strength:35,wavelength:100,speed:1},stopMotion:{...defaultStopMotion(),enabled:true,fps:4},afterimages:{...defaultAfterimages(),enabled:true,count:2,spacing:.25,tint:true},exposure:{enabled:true,mode:'screen',strength:.8},reveal:{...defaultReveal(),enabled:true,type:'brush',duration:2},glitch:{...defaultGlitch(),enabled:true,rate:4}});p.scenes[0].elements=[e];
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();await page.locator('#timeline').fill('1.26');
 const main=await page.locator('.scene-element[data-element-id] .glitch-svg feOffset').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('dx')));
 const ghost=await page.locator('[data-afterimage-index="1"] .glitch-svg feOffset').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('dx')));expect(ghost).not.toEqual(main);
 const ids=await page.locator('#stage [id]').evaluateAll(nodes=>nodes.map(n=>n.id));expect(new Set(ids).size).toBe(ids.length);
 const result=await page.evaluate(async(p)=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
  try{const frames:Uint8ClampedArray[]=[];for(const time of [1.26,1.49,1.26,3.5,5]){const c:HTMLCanvasElement=await renderer.frame(time,480,270);frames.push(c.getContext('2d')!.getImageData(0,0,480,270).data);}
   const diff=(a:Uint8ClampedArray,b:Uint8ClampedArray)=>a.reduce((n,v,i)=>n+(v!==b[i]?1:0),0);
   let lit=0,end=0;for(let i=0;i<frames[3].length;i+=4){if(frames[3][i]+frames[3][i+1]+frames[3][i+2]>10)lit++;if(frames[4][i]+frames[4][i+1]+frames[4][i+2]>10)end++;}
   return {held:diff(frames[0],frames[1]),repeat:diff(frames[0],frames[2]),lit,end};
  }finally{renderer.dispose();media.dispose();}
 },p);expect(result.held).toBe(0);expect(result.repeat).toBe(0);expect(result.lit).toBeGreaterThan(100);expect(result.end).toBe(0);
});

test('glitch filters image and text content without painting transparent corners',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);p.scenes[0].transition='none';p.scenes[0].background='#000000';
 p.assets.art={name:'white.svg',data:'data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="25" y="10" width="50" height="80" fill="#ffffff"/></svg>').toString('base64')};
 const elements=[newElement('image'),newElement('text')];for(const e of elements)Object.assign(e,{x:10,y:10,width:80,height:80,animation:'none',fontSize:180,text:'Glitch',asset:e.type==='image'?'art':'',glitch:{...defaultGlitch(),enabled:true,strength:30,channelShift:20,rate:0}});
 const results=await page.evaluate(async({p,elements})=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);const results=[];
  for(const e of elements){p.scenes[0].elements=[e];const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
   try{const canvas:HTMLCanvasElement=await renderer.frame(1,480,270),data=canvas.getContext('2d')!.getImageData(0,0,480,270).data;let lit=0,colored=0;for(let i=0;i<data.length;i+=4){if(data[i]+data[i+1]+data[i+2]>50)lit++;if(Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2])>80)colored++;}results.push({lit,colored,corner:Array.from(data.slice(0,3))});}finally{renderer.dispose();media.dispose();}
  }return results;
 },{p,elements});
 for(const result of results){expect(result.lit).toBeGreaterThan(1000);expect(result.colored).toBeGreaterThan(50);expect(result.corner).toEqual([0,0,0]);}
});
