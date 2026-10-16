import {test,expect} from '@playwright/test';
import {demoProject,newElement} from '../src/lib/model';
import {defaultKaleidoscope} from '../src/lib/kaleidoscope';
import {defaultStopMotion} from '../src/lib/stop-motion';
import {defaultPaper} from '../src/lib/paper';
import {defaultGlitch} from '../src/lib/glitch';
import {defaultPrint} from '../src/lib/print';
import {defaultReveal} from '../src/lib/reveal';
import {defaultAfterimages} from '../src/lib/afterimages';
function fixture(){
 const p=demoProject();p.format='square';p.scenes=p.scenes.slice(0,1);p.scenes[0].background='#111111';p.scenes[0].transition='none';
 p.assets.art={name:'motif.svg',data:'data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="50" y="50" width="50" height="50" fill="#ff4010"/><circle cx="80" cy="63" r="10" fill="#2070ff"/><rect x="55" y="65" width="18" height="12" fill="#20ff40"/></svg>').toString('base64')};
 const e=newElement('image');Object.assign(e,{asset:'art',x:5,y:5,width:90,height:90,animation:'none',kaleidoscope:{...defaultKaleidoscope(),enabled:true,speed:0,zoom:1}});p.scenes[0].elements=[e];return p;
}
async function importProject(page:any,p:unknown){await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();}

test('kaleidoscope controls, backwards scrub, freeze, JSON and disable',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as any).kaleidoJSON=text;}}}));
 await page.goto('/en/');page.on('dialog',d=>d.accept());await importProject(page,fixture());await page.locator('#element-list button').last().click();
 await page.locator('#element-form [name=kaleidoscopeSegments]').selectOption('6');await expect(page.locator('.kaleidoscope-wedge')).toHaveCount(6);
 await page.locator('#element-form [name=kaleidoscopeSpeed]').fill('-20');await page.locator('#element-form [name=kaleidoscopeSpeed]').press('Tab');
 const transform=()=>page.locator('.kaleidoscope-wedge').first().evaluate(n=>(n.firstElementChild as HTMLElement).style.transform);
 await page.locator('#timeline').fill('1');const first=await transform();await page.locator('#timeline').fill('2');expect(await transform()).not.toBe(first);await page.locator('#timeline').fill('1');expect(await transform()).toBe(first);
 await page.locator('#element-form [name=kaleidoscopeSpeed]').fill('0');await page.locator('#element-form [name=kaleidoscopeSpeed]').press('Tab');await page.locator('#timeline').fill('1');const frozen=await transform();await page.locator('#timeline').fill('2');expect(await transform()).toBe(frozen);
 await page.locator('#copy-project-json').click();const json=await page.evaluate(()=>(window as any).kaleidoJSON as string);expect(JSON.parse(json).scenes[0].elements[0].kaleidoscope).toMatchObject({enabled:true,segments:6,speed:0});await importProject(page,JSON.parse(json));await page.locator('#element-list button').last().click();await expect(page.locator('#element-form [name=kaleidoscopeEnabled]')).toBeChecked();await page.locator('#element-form [name=kaleidoscopeEnabled]').uncheck();await expect(page.locator('.kaleidoscope-view')).toHaveCount(0);await expect(page.locator('.scene-svg-image')).toHaveCount(1);
});

test('asymmetric art becomes mirrored radial sectors and preview matches export',async({page})=>{
 await page.goto('/en/');const p=fixture();
 const result=await page.evaluate(async(p)=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
  async function frame(){const c:HTMLCanvasElement=await renderer.frame(1,360,360);return c.getContext('2d')!.getImageData(0,0,360,360).data;}
  const diff=(a:Uint8ClampedArray,b:Uint8ClampedArray)=>a.reduce((n,v,i)=>n+(v!==b[i]?1:0),0);
  try{const a=await frame(),again=await frame();let lit=0;for(let i=0;i<a.length;i+=4)if(a[i]+a[i+1]+a[i+2]>100)lit++;
   const samples=[];for(const r of [45,75,110])for(const angle of [10,20,30]){const values=[];for(const degrees of [angle,-angle,90+angle,90-angle]){const t=degrees*Math.PI/180,x=Math.floor(180+r*Math.cos(t)),y=Math.floor(180+r*Math.sin(t)),i=(y*360+x)*4;values.push(Array.from(a.slice(i,i+3)));}samples.push(values);}
   let seamMin=255;for(let d=3;d<12;d++)seamMin=Math.min(seamMin,a[((180+d)*360+180+d)*4]);
   p.scenes[0].elements[0].kaleidoscope.rotation=20;const rotated=await frame();p.scenes[0].elements[0].kaleidoscope.zoom=2;const zoomed=await frame();p.scenes[0].elements[0].kaleidoscope.centerX=35;const centered=await frame();p.scenes[0].elements[0].kaleidoscope.segments=6;const six=await frame();p.scenes[0].elements[0].kaleidoscope.enabled=false;const off=await frame();
   return {lit,samples,seamMin,repeat:diff(a,again),rotation:diff(a,rotated),zoom:diff(rotated,zoomed),center:diff(zoomed,centered),segments:diff(centered,six),off:diff(a,off)};
  }finally{renderer.dispose();media.dispose();}
 },p);
 expect(result.seamMin).toBeGreaterThan(245);expect(result.lit).toBeGreaterThan(10000);expect(result.repeat).toBe(0);for(const values of result.samples)for(const color of values.slice(1))color.forEach((v,i)=>expect(Math.abs(v-values[0][i])).toBeLessThan(5));for(const key of ['rotation','zoom','center','segments','off'] as const)expect(result[key]).toBeGreaterThan(1000);
 await importProject(page,p);await page.locator('#timeline').fill('1');await page.locator('#stage-frame').evaluate(n=>{n.style.setProperty('width','360px','important');n.style.setProperty('height','360px','important');Object.assign(n.style,{position:'fixed',left:'20px',top:'20px',margin:'0',zIndex:'10000'});});await page.waitForTimeout(100);const png=await page.locator('#stage-frame').screenshot();
 const samples=await page.evaluate(async(b64)=>{const im=new Image();im.src='data:image/png;base64,'+b64;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d')!;ctx.drawImage(im,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data,result=[];for(const r of [45,75,110])for(const angle of [10,20,30]){const t=angle*Math.PI/180,x=Math.floor((180+r*Math.cos(t))*c.width/360),y=Math.floor((180+r*Math.sin(t))*c.height/360),i=(y*c.width+x)*4;result.push(Array.from(data.slice(i,i+3)));}return result;},png.toString('base64'));

 samples.forEach((color,j)=>color.forEach((v,i)=>expect(Math.abs(v-result.samples[j][0][i])).toBeLessThan(15)));
});

test('historical kaleidoscope clocks combine stop motion, drawing, print, reveal and particle exits',async({page})=>{
 await page.goto('/en/');const p=fixture(),e=newElement('shape');Object.assign(e,{x:10,y:10,width:80,height:80,shapeType:'star',animation:'draw',exitAnimation:'particles-confetti',exitDuration:2,kaleidoscope:{...defaultKaleidoscope(),enabled:true,segments:4,speed:30,zoom:1.5},stopMotion:{...defaultStopMotion(),enabled:true,fps:4},paper:{...defaultPaper(),enabled:true},glitch:{...defaultGlitch(),enabled:true},print:{...defaultPrint(),enabled:true},liquid:{enabled:true,style:'water',strength:20,wavelength:100,speed:1},reveal:{...defaultReveal(),enabled:true,type:'brush',duration:2},afterimages:{...defaultAfterimages(),enabled:true,count:1,spacing:.25,tint:true},exposure:{enabled:true,mode:'screen',strength:.8}});p.scenes[0].elements=[e];
 await importProject(page,p);await page.locator('#timeline').fill('1.26');await expect(page.locator('.kaleidoscope-view')).toHaveCount(2);
 const main=await page.locator('.scene-element[data-element-id] .kaleidoscope-wedge').first().evaluate(n=>(n.firstElementChild as HTMLElement).style.transform),past=await page.locator('[data-afterimage-index="1"] .kaleidoscope-wedge').first().evaluate(n=>(n.firstElementChild as HTMLElement).style.transform);expect(main).not.toBe(past);
 const ids=await page.locator('#stage [id]').evaluateAll(nodes=>nodes.map(n=>n.id));expect(new Set(ids).size).toBe(ids.length);
 const result=await page.evaluate(async(p)=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
  try{const frames=[];for(const t of [1.26,1.49,1.26,3.5,5]){const c:HTMLCanvasElement=await renderer.frame(t,360,360);frames.push(c.getContext('2d')!.getImageData(0,0,360,360).data);}const diff=(a:Uint8ClampedArray,b:Uint8ClampedArray)=>a.reduce((n,v,i)=>n+(v!==b[i]?1:0),0);let lit=0,end=0;for(let i=0;i<frames[3].length;i+=4){if(frames[3][i]+frames[3][i+1]+frames[3][i+2]>60)lit++;if(frames[4][i]+frames[4][i+1]+frames[4][i+2]>60)end++;}return {held:diff(frames[0],frames[1]),repeat:diff(frames[0],frames[2]),lit,end};}finally{renderer.dispose();media.dispose();}
 },p);expect(result.held).toBe(0);expect(result.repeat).toBe(0);expect(result.lit).toBeGreaterThan(100);expect(result.end).toBe(0);
});

test('animated SVG, text and canvas artwork survive mirrored copies',async({page})=>{
 await page.goto('/en/');const p=fixture();p.assets.art.data='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#ff0000"><animate attributeName="fill" values="#ff0000;#0000ff;#ff0000" dur="4s" repeatCount="indefinite"/></rect></svg>').toString('base64');
 const elements=[newElement('image'),newElement('text'),newElement('simulation')];for(const e of elements)Object.assign(e,{asset:e.type==='image'?'art':'',text:'Kaleidoscope',fontSize:180,x:10,y:10,width:80,height:80,animation:'none',kaleidoscope:{...defaultKaleidoscope(),enabled:true,segments:4,speed:0,zoom:2},stopMotion:{...defaultStopMotion(),enabled:true,fps:4}});
 elements[2].exitAnimation='particles-confetti';elements[2].exitDuration=2;
 const result=await page.evaluate(async({p,elements})=>{const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);const results=[];for(const e of elements){p.scenes[0].elements=[e];const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);try{const frames=[];for(const t of [1.26,1.49,2.26,1.26,3.5,5]){const c:HTMLCanvasElement=await renderer.frame(t,360,360);frames.push(c.getContext('2d')!.getImageData(0,0,360,360).data);}const diff=(a:Uint8ClampedArray,b:Uint8ClampedArray)=>a.reduce((n,v,i)=>n+(v!==b[i]?1:0),0);let lit=0;for(let i=0;i<frames[0].length;i+=4)if(frames[0][i]+frames[0][i+1]+frames[0][i+2]>60)lit++;let particles=0,end=0;for(let i=0;i<frames[4].length;i+=4){if(frames[4][i]+frames[4][i+1]+frames[4][i+2]>60)particles++;if(frames[5][i]+frames[5][i+1]+frames[5][i+2]>60)end++;}results.push({lit,particles,end,held:diff(frames[0],frames[1]),next:diff(frames[0],frames[2]),repeat:diff(frames[0],frames[3])});}finally{renderer.dispose();media.dispose();}}return results;},{p,elements});
 for(const r of result){expect(r.lit).toBeGreaterThan(100);expect(r.held).toBe(0);expect(r.repeat).toBe(0);}expect(result[0].next).toBeGreaterThan(1000);expect(result[2].next).toBeGreaterThan(100);expect(result[2].particles).toBeGreaterThan(100);expect(result[2].end).toBe(0);
});

test('visual media snapshots share pixels and handle decoded or not-yet-ready video',async({page})=>{
 await page.goto('/en/');const result=await page.evaluate(async()=>{
  const {copyMediaPixels}=await import(/* @vite-ignore */ '/src/scripts/visual-media.ts' as string);
  const art=document.createElement('canvas');art.width=32;art.height=32;const ctx=art.getContext('2d')!;ctx.fillStyle='#ff0000';ctx.fillRect(0,0,32,32);
  const stream=art.captureStream(10),rec=new MediaRecorder(stream,{mimeType:'video/webm'}),chunks:Blob[]=[];
  const blob=await new Promise<Blob>(resolve=>{rec.ondataavailable=e=>chunks.push(e.data);rec.onstop=()=>resolve(new Blob(chunks,{type:'video/webm'}));rec.start();const timer=setInterval(()=>ctx.fillRect(0,0,32,32),30);setTimeout(()=>{clearInterval(timer);rec.stop();},350);});stream.getTracks().forEach(t=>t.stop());
  const url=URL.createObjectURL(blob),video=document.createElement('video');video.muted=true;video.src=url;await new Promise<void>((resolve,reject)=>{video.onloadeddata=()=>resolve();video.onerror=()=>reject(new Error('fixture video'));});
  await new Promise<void>(resolve=>{video.onseeked=()=>resolve();video.currentTime=.15;});
  ctx.fillStyle='#3366ff';ctx.fillRect(0,0,32,32);const source=document.createElement('div');source.append(art,video,document.createElement('video'));
  const cache=new Map(),a=source.cloneNode(true) as HTMLElement,b=source.cloneNode(true) as HTMLElement;copyMediaPixels(source,a,cache);copyMediaPixels(source,b,cache);
  const pixels=[];for(const img of a.querySelectorAll('img')){await img.decode();const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;canvas.getContext('2d')!.drawImage(img,0,0,32,32);pixels.push(Array.from(canvas.getContext('2d')!.getImageData(16,16,1,1).data));}
  video.removeAttribute('src');video.load();URL.revokeObjectURL(url);return {pixels,cache:cache.size,same:[...a.querySelectorAll('img')].map(i=>i.src).join('|')===[...b.querySelectorAll('img')].map(i=>i.src).join('|')};
 });expect(result.cache).toBe(3);expect(result.same).toBe(true);expect(result.pixels[0]).toEqual([51,102,255,255]);expect(result.pixels[1][0]).toBeGreaterThan(240);expect(result.pixels[1][2]).toBeLessThan(20);expect(result.pixels[2][3]).toBe(0);
});
