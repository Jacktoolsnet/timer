import {formats,type Project} from '../lib/model';
import {CONTACT_PAGE_SIZE,contactLayout,type ContactFrame} from '../lib/still-plan';
import {binaryZip} from '../lib/text-zip';
import {ExportRenderer} from './export-renderer';
import {ExportMedia} from './export-media';
const release=(canvas:HTMLCanvasElement)=>{canvas.width=0;canvas.height=0;};
async function png(canvas:HTMLCanvasElement,signal:AbortSignal):Promise<Blob>{
 signal.throwIfAborted();const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG encoding failed')),'image/png'));signal.throwIfAborted();return blob;
}
export async function exportStill(project:Project,time:number,signal:AbortSignal):Promise<Blob>{
 const duration=project.scenes.reduce((n,s)=>n+s.duration,0);
 if(!Number.isFinite(time)||time<0||time>duration)throw new Error(`Choose a project time between 0 and ${duration} seconds`);
 signal.throwIfAborted();const media=new ExportMedia(project,signal),renderer=new ExportRenderer(project,media);let canvas:HTMLCanvasElement|undefined;
 try{const [width,height]=formats[project.format];canvas=await renderer.frame(time,width,height);return await png(canvas,signal);}
 finally{if(canvas)release(canvas);renderer.dispose();media.dispose();}
}
function fitText(ctx:CanvasRenderingContext2D,text:string,width:number){let shortened=text;while(shortened.length&&ctx.measureText(shortened).width>width)shortened=shortened.slice(0,-1);ctx.fillText(shortened===text?text:shortened.slice(0,-1)+'…',0,0,width);}
/** Bounded pages; all samples use the video export renderer and project clock. */
export async function exportContactSheets(project:Project,frames:ContactFrame[],signal:AbortSignal,progress:(done:number,total:number)=>void){
 if(!frames.length||frames.length>600)throw new Error('Contact sheet: choose 1–600 frames');
 signal.throwIfAborted();const media=new ExportMedia(project,signal),renderer=new ExportRenderer(project,media),files:{name:string;data:Uint8Array}[]=[];
 let done=0,bytes=0;let onlyBlob:Blob|undefined;
 try{
  for(let start=0;start<frames.length;start+=CONTACT_PAGE_SIZE){
   signal.throwIfAborted();const page=frames.slice(start,start+CONTACT_PAGE_SIZE),layout=contactLayout(project,page.length),canvas=document.createElement('canvas');canvas.width=layout.width;canvas.height=layout.height;
   try{
    const ctx=canvas.getContext('2d')!;ctx.fillStyle='#f4f4f4';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#151515';ctx.font='bold 22px Arial';ctx.save();ctx.translate(layout.gap,36);fitText(ctx,`${project.title} — ${Math.floor(start/CONTACT_PAGE_SIZE)+1}/${Math.ceil(frames.length/CONTACT_PAGE_SIZE)}`,layout.width-layout.gap*2);ctx.restore();
    for(const [i,item] of page.entries()){
     signal.throwIfAborted();const image=await renderer.frame(item.time,layout.frameWidth,layout.frameHeight),x=layout.gap+(i%layout.columns)*(layout.frameWidth+layout.gap),y=layout.header+Math.floor(i/layout.columns)*(layout.frameHeight+layout.caption+layout.gap);
     try{ctx.drawImage(image,x,y);}finally{release(image);}
     ctx.fillStyle='#151515';ctx.font='bold 18px Arial';ctx.save();ctx.translate(x,y+layout.frameHeight+24);fitText(ctx,`${item.sceneIndex+1}. ${item.sceneName}`,layout.frameWidth);ctx.restore();
     ctx.font='16px Arial';ctx.save();ctx.translate(x,y+layout.frameHeight+46);fitText(ctx,`ID: ${item.sceneId}`,layout.frameWidth);ctx.restore();ctx.fillText(`Scene: ${item.localTime.toFixed(3)} s  |  Project: ${item.time.toFixed(3)} s`,x,y+layout.frameHeight+68,layout.frameWidth);
     progress(++done,frames.length);
    }
    const blob=await png(canvas,signal);
    if(frames.length<=CONTACT_PAGE_SIZE)onlyBlob=blob;
    else{const data=new Uint8Array(await blob.arrayBuffer());bytes+=data.byteLength;if(bytes>30*1024*1024)throw new Error('Contact sheets exceed 30 MiB. Select fewer scenes or times.');files.push({name:`contact-${String(files.length+1).padStart(3,'0')}.png`,data});}
   }finally{release(canvas);}
  }
  signal.throwIfAborted();
  if(onlyBlob)return {blob:onlyBlob,extension:'png'};
  files.push({name:'frames.json',data:new TextEncoder().encode(JSON.stringify({title:project.title,frames:frames.map((f,i)=>({...f,page:Math.floor(i/CONTACT_PAGE_SIZE)+1,cell:i%CONTACT_PAGE_SIZE+1}))},null,2))});
  return {blob:new Blob([binaryZip(files)],{type:'application/zip'}),extension:'zip'};
 }finally{renderer.dispose();media.dispose();}
}
