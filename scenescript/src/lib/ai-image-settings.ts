import {modelProfile} from './ai-models.ts';
export type ImageFormat='landscape'|'portrait'|'square';
/** Small drafts vs. cover assets; exact project ratios, within GPT Image 2 constraints. */
export function imageSettings(model:string,format:ImageFormat,cover:boolean){
 const size=format==='square'?(cover?'1024x1024':'816x816'):format==='portrait'?(cover?'864x1536':'720x1280'):(cover?'1536x864':'1280x720');
 const custom=modelProfile(model)?.id==='gpt-image-2';
 return {size,requestSize:custom?size:format==='square'?'1024x1024':format==='portrait'?'1024x1536':'1536x1024',quality:cover?'high':'low'};
}
export function validImageSize(model:string,size:string){
 if(['1024x1024','1536x1024','1024x1536'].includes(size))return true;
 if(modelProfile(model)?.id!=='gpt-image-2'||!/^\d{3,4}x\d{3,4}$/.test(size))return false;
 const [w,h]=size.split('x').map(Number);
 return w%16===0&&h%16===0&&Math.max(w,h)<=3840&&Math.max(w,h)/Math.min(w,h)<=3&&w*h>=655360&&w*h<=8294400;
}
