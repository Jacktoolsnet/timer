import {DEFAULT_PROJECT_URL} from '../src/lib/startup-project';
import {test,expect} from '@playwright/test';
test('native portrait default fills frames, matches preview and exports portrait video',async({page},info)=>{
 test.setTimeout(120000);await page.route('**'+DEFAULT_PROJECT_URL,r=>r.fulfill({contentType:'application/json',path:'public/examples/mila-halloween.scenescript.json'}));await page.goto('/de/');await expect(page.locator('#editor')).toHaveAttribute('data-ready','true');await expect(page.locator('#project-title')).toHaveValue('Das Monster unter dem Bett hat auch Angst');
 const result=await page.evaluate(async()=>{
  const {parseProject}=await import(/* @vite-ignore */ '/src/lib/model.ts' as string),{ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string),{exportVideo}=await import(/* @vite-ignore */ '/src/scripts/video-export.ts' as string),{retimeStage2D}=await import(/* @vite-ignore */ '/src/lib/stage2d.ts' as string);
  const p=parseProject(await(await fetch('/examples/mila-halloween.scenescript.json')).text()),m=new ExportMedia(p,new AbortController().signal),r=new ExportRenderer(p,m),collage=document.createElement('canvas');collage.width=7*270;collage.height=480;let time=0,matches=false;const corners:number[][]=[];
  try{const preview=document.querySelector<HTMLCanvasElement>('#stage .stage2d-canvas')!,native=await r.frame(0,preview.width,preview.height);matches=native.toDataURL()===preview.toDataURL();native.width=0;native.height=0;
   for(let i=0;i<7;i++){const c=await r.frame(time+1,270,480),ctx=c.getContext('2d')!;collage.getContext('2d')!.drawImage(c,i*270,0);for(const [x,y]of [[2,2],[267,477]])corners.push([...ctx.getImageData(x,y,1,1).data]);time+=p.scenes[i].duration;c.width=0;c.height=0;}
  }finally{r.dispose();m.dispose();}
  p.scenes=p.scenes.slice(0,1);retimeStage2D(p.scenes[0].stage2d!,.5/p.scenes[0].duration);p.scenes[0].duration=.5;p.scenes[0].elements=[];p.music=null;
  const blob=await exportVideo(p,{format:'webm',resolution:480,fps:24,audio:false},new AbortController().signal,()=>{}),video=document.createElement('video');video.src=URL.createObjectURL(blob);await new Promise<void>((resolve,reject)=>{video.onloadedmetadata=()=>resolve();video.onerror=reject;});const size=[video.videoWidth,video.videoHeight];URL.revokeObjectURL(video.src);return{matches,corners,size,bytes:blob.size,png:collage.toDataURL()};
 });
 expect(result.matches).toBe(true);expect(result.corners).toHaveLength(14);for(const pixel of result.corners){expect(pixel[3]).toBe(255);expect(pixel.slice(0,3)).not.toEqual([18,60,55]);}expect(result.size).toEqual([480,854]);expect(result.bytes).toBeGreaterThan(1000);
 await info.attach('Seven native portrait scenes',{body:Buffer.from(result.png.split(',')[1],'base64'),contentType:'image/png'});
});
