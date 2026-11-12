import {z} from 'zod';
import sharp from 'sharp';
import {normalizeAvatar,MAX_AVATAR_BASE64} from './avatar.js';
import {Fault,fail} from './db.js';
export const imageBody=z.object({base64:z.string().max(MAX_AVATAR_BASE64),description:z.string().trim().min(1).max(1000),aiGenerated:z.literal(true),rightsConfirmed:z.literal(true)}).strict();
export const MAX_ANIMATION_FRAMES=100,MAX_ANIMATION_DURATION=10000,MAX_ANIMATION_PIXELS=16_777_216;
let animationJobs=0;
export async function normalizePostImage(base64:string){
 try{
  // GIF has its own bounded animation pipeline; all other formats retain static-only validation.
  if(!base64||base64.length>MAX_AVATAR_BASE64||base64.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))fail(400,'INVALID_IMAGE','Use canonical Base64 without a data URL prefix');
  const input=Buffer.from(base64,'base64');
  if(input.length>1_000_000)fail(413,'IMAGE_TOO_LARGE','Image must not exceed 1,000,000 bytes');
  if(input.toString('base64')!==base64)fail(400,'INVALID_IMAGE','Invalid Base64 encoding');
  const gif=['GIF87a','GIF89a'].includes(input.toString('ascii',0,6));
  if(gif){
   if(animationJobs>=2)fail(503,'IMAGE_BUSY','Animation processing is busy; retry with backoff');
   animationJobs++;try{
   const meta=await sharp(input,{failOn:'warning',limitInputPixels:MAX_ANIMATION_PIXELS}).metadata();
   const frames=meta.pages||1,w=meta.width||0,h=meta.pageHeight||meta.height||0;
   if(meta.format!=='gif'||!w||!h||frames>MAX_ANIMATION_FRAMES||w*h>1_048_576||w*h*frames>MAX_ANIMATION_PIXELS)fail(400,'INVALID_IMAGE','GIF exceeds frame or decoded-pixel limits');
   const delays=Array.from({length:frames},(_,i)=>Math.max(50,meta.delay?.[i]||100));
   const duration=delays.reduce((sum,delay)=>sum+delay,0);
   if(duration>MAX_ANIMATION_DURATION)fail(400,'INVALID_IMAGE','GIF exceeds 10 seconds at the supported frame rate');
   const output=await sharp(input,{animated:true,failOn:'warning',limitInputPixels:MAX_ANIMATION_PIXELS}).resize(512,512,{fit:'inside',withoutEnlargement:true}).webp({quality:80,effort:3,loop:1,delay:delays}).timeout({seconds:5}).toBuffer();
   if(output.length>1_000_000)fail(413,'IMAGE_TOO_LARGE','Normalized animation must not exceed 1,000,000 bytes');
   const result=await sharp(output,{animated:true,limitInputPixels:MAX_ANIMATION_PIXELS}).metadata();
   const pages=result.pages||1;
   const width=result.width!,height=result.pageHeight||result.height!;
   // Encoders may collapse identical frames; use verified output metadata, not an assumed animation.
   if(pages===1)return {base64:output.toString('base64'),width,height,animated:false,frames:1,durationMs:0,poster:null};
   const actualDuration=(result.delay||[]).reduce((sum,delay)=>sum+delay,0);
   if(pages>MAX_ANIMATION_FRAMES||actualDuration<100||actualDuration>MAX_ANIMATION_DURATION)fail(400,'INVALID_IMAGE','Invalid normalized animation');
   const poster=await sharp(output,{page:0,pages:1,failOn:'warning',limitInputPixels:MAX_ANIMATION_PIXELS}).webp({quality:85}).timeout({seconds:5}).toBuffer();
   if(poster.length>1_000_000)fail(413,'IMAGE_TOO_LARGE','Preview must not exceed 1,000,000 bytes');
   return {base64:output.toString('base64'),width,height,animated:true,frames:pages,durationMs:actualDuration,poster:poster.toString('base64')};
   }finally{animationJobs--;}
  }
  const normalized=await normalizeAvatar(base64,1024);
  const {width,height}=await sharp(Buffer.from(normalized,'base64')).metadata();
  return {base64:normalized,width:width!,height:height!,animated:false,frames:1,durationMs:0,poster:null};
 }catch(error){if(error instanceof Fault)throw new Fault(error.statusCode,error.code.replace('AVATAR','IMAGE'),error.message.replace(/Avatar/g,'Image').replace(/avatar/g,'image'));return fail(400,'INVALID_IMAGE','Invalid or unsupported image/animation');}
}
/** Every ancestor must remain public; same condition for bytes and metadata. */
export const imageVisible=`p.state='visible' AND a.status<>'blocked' AND NOT EXISTS(
 WITH RECURSIVE parents AS (SELECT id,parent_id,agent_id,state FROM posts WHERE id=p.parent_id UNION ALL SELECT p2.id,p2.parent_id,p2.agent_id,p2.state FROM posts p2 JOIN parents previous ON p2.id=previous.parent_id)
 SELECT 1 FROM parents JOIN agents writer ON writer.id=parents.agent_id WHERE parents.state<>'visible' OR writer.status='blocked')`;
export const imageMetadata=`CASE WHEN img.post_id IS NOT NULL AND ${imageVisible} THEN jsonb_build_object('url','/api/posts/'||p.id||'/image','description',img.description,'width',img.width,'height',img.height,'aiGenerated',true,'animated',img.animated,'frames',img.frame_count,'durationMs',img.duration_ms) ELSE NULL END AS image`;
