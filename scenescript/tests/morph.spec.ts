import {test,expect} from '@playwright/test';
test('shared mesh compositor preserves endpoints, warps landmarks and has no transparent cracks',async({page})=>{
 await page.goto('/en/');await expect(page.locator('#editor')).toHaveAttribute('data-ready','true');
 const result=await page.evaluate(async()=>{
  const {renderMorph}=await import(/* @vite-ignore */ '/src/scripts/morph.ts' as string),{morphMesh}=await import(/* @vite-ignore */ '/src/lib/morph.ts' as string);
  const image=(x:number,color:string)=>{const c=document.createElement('canvas');c.width=160;c.height=160;const ctx=c.getContext('2d')!;ctx.fillStyle='#102030';ctx.fillRect(0,0,160,160);ctx.fillStyle=color;ctx.fillRect(x,55,25,50);return c;};
  const a=image(35,'#ff3000'),b=image(65,'#0080ff'),mesh=morphMesh({points:[{from:{x:30,y:50},to:{x:48,y:50}}]}),pixels=(c:HTMLCanvasElement)=>Array.from(c.getContext('2d')!.getImageData(0,0,160,160).data);
  const first=pixels(renderMorph(a,b,mesh,0)),last=pixels(renderMorph(a,b,mesh,1)),middle=pixels(renderMorph(a,b,mesh,.5)),again=pixels(renderMorph(a,b,mesh,.5)),dissolve=pixels(renderMorph(a,b,morphMesh({points:[]}),.5));
  const ap=pixels(a),bp=pixels(b);return {first:first.every((n,i)=>n===ap[i]),last:last.every((n,i)=>n===bp[i]),stable:middle.every((n,i)=>n===again[i]),opaque:middle.filter((_,i)=>i%4===3).every(n=>n===255),different:middle.filter((n,i)=>Math.abs(n-dissolve[i])>10).length};
 });expect(result).toMatchObject({first:true,last:true,stable:true,opaque:true});expect(result.different).toBeGreaterThan(300);
});
test('inflation morph is selectable and preview matches the exported frame after reverse seeking',async({page})=>{
 test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/en/');await expect(page.locator('#editor')).toHaveAttribute('data-ready','true');
 await page.locator('#timeline').fill('1.15');const canvas=page.locator('#stage .morph-transition-canvas');await expect(canvas).toHaveAttribute('data-morph-time','1.15',{timeout:60000});
 const original=await canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL());
 const frame=await page.evaluate(async()=>{const {parseProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string),{ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string);const p=parseProject(await(await fetch('/examples/inflation-explained.scenescript.json')).text()),m=new ExportMedia(p,new AbortController().signal),r=new ExportRenderer(p,m);try{return(await r.frame(1.15,360,640)).toDataURL();}finally{r.dispose();m.dispose();}});expect(original).toBe(frame);
 await page.locator('#timeline').fill('1.3');await expect(canvas).toHaveCount(0);await page.locator('#timeline').fill('1.15');await expect(canvas).toHaveAttribute('data-morph-time','1.15',{timeout:20000});expect(await canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL())).toBe(original);
 expect(await page.locator('select').filter({has:page.locator('option[value="morph"]')}).count()).toBeGreaterThan(0);expect(errors).toEqual([]);
});
test('a morph transition produces a decodable MP4, not just preview frames',async({page})=>{
 test.setTimeout(90000);await page.goto('/en/');await expect(page.locator('#editor')).toHaveAttribute('data-ready','true');const result=await page.evaluate(async()=>{
  const {parseProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{exportVideo,exportSupported}=await import(/* @vite-ignore */ '/src/scripts/video-export.ts' as string);
  const p=parseProject(JSON.stringify({version:'1.0',title:'Morph export',format:'square',scenes:[{id:'a',duration:.2,transition:'none',background:'#103060',elements:[{id:'aBox',type:'shape',x:15,y:30,width:20,height:40,fillColor:'#ff8000',animation:'none'}]},{id:'b',duration:.3,transition:'morph',transitionDuration:.2,morph:{points:[{from:{x:25,y:50},to:{x:60,y:50}}]},background:'#205030',elements:[{id:'bBox',type:'shape',x:50,y:30,width:20,height:40,fillColor:'#80c0ff',animation:'none'}]}]})),options={format:'mp4',resolution:480,fps:30,audio:false};
  if(!await exportSupported(p,options))return null;const blob=await exportVideo(p,options,new AbortController().signal,()=>{}),src=URL.createObjectURL(blob),video=document.createElement('video');try{video.src=src;await new Promise((resolve,reject)=>{video.onloadedmetadata=resolve;video.onerror=reject;});return {size:blob.size,type:blob.type,duration:video.duration};}finally{URL.revokeObjectURL(src);}
 });test.skip(result===null,'No MP4 encoder');expect(result!.size).toBeGreaterThan(1000);expect(result!.type).toBe('video/mp4');expect(result!.duration).toBeCloseTo(.5,1);
});

test('morph endpoint cache is bounded and releases all retained pixels on dispose',async({page})=>{
 await page.goto('/en/');await expect(page.locator('#editor')).toHaveAttribute('data-ready','true');const result=await page.evaluate(async()=>{
  const {parseProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string),{ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string);
  const p=parseProject(JSON.stringify({version:'1.0',title:'Cache',format:'square',scenes:[{id:'a',duration:1,transition:'none',elements:[]},{id:'b',duration:1,transition:'morph',transitionDuration:.5,elements:[]}]})),m=new ExportMedia(p,new AbortController().signal),r=new ExportRenderer(p,m);
  try{const first=await r.prepareMorph(1,32,32);await r.frame(1.1,32,32);await r.frame(1.4,32,32);const reused=await r.prepareMorph(1,32,32)===first,second=await r.prepareMorph(1,48,48),third=await r.prepareMorph(1,64,64),count=(r as any).morphCache.size,evicted=first.incoming.width===0;r.dispose();await Promise.resolve();return {reused,count,evicted,released:[second,third].every(p=>p.incoming.width===0&&p.outgoing.width===0),roots:document.querySelectorAll('[data-export-renderer]').length};}finally{r.dispose();m.dispose();}
 });expect(result).toMatchObject({reused:true,count:2,evicted:true,released:true});
});
