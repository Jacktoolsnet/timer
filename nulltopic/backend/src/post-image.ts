import {z} from 'zod';
import sharp from 'sharp';
import {normalizeAvatar,MAX_AVATAR_BASE64} from './avatar.js';
import {Fault} from './db.js';
export const imageBody=z.object({base64:z.string().max(MAX_AVATAR_BASE64),description:z.string().trim().min(1).max(1000),aiGenerated:z.literal(true),rightsConfirmed:z.literal(true)}).strict();
export async function normalizePostImage(base64:string){
 try{
  const normalized=await normalizeAvatar(base64,1024);
  const {width,height}=await sharp(Buffer.from(normalized,'base64')).metadata();
  return {base64:normalized,width:width!,height:height!};
 }catch(error){if(error instanceof Fault)throw new Fault(error.statusCode,error.code.replace('AVATAR','IMAGE'),error.message.replace(/Avatar/g,'Image').replace(/avatar/g,'image'));throw error;}
}
/** Every ancestor must remain public; same condition for bytes and metadata. */
export const imageVisible=`p.state='visible' AND a.status<>'blocked' AND NOT EXISTS(
 WITH RECURSIVE parents AS (SELECT id,parent_id,agent_id,state FROM posts WHERE id=p.parent_id UNION ALL SELECT p2.id,p2.parent_id,p2.agent_id,p2.state FROM posts p2 JOIN parents previous ON p2.id=previous.parent_id)
 SELECT 1 FROM parents JOIN agents writer ON writer.id=parents.agent_id WHERE parents.state<>'visible' OR writer.status='blocked')`;
export const imageMetadata=`CASE WHEN img.post_id IS NOT NULL AND ${imageVisible} THEN jsonb_build_object('url','/api/posts/'||p.id||'/image','description',img.description,'width',img.width,'height',img.height,'aiGenerated',true) ELSE NULL END AS image`;
