import {validateImage} from '../lib/image-assets';
import type {ImageReference} from '../lib/storyboard-image-references';
const MAX_BYTES=6*1024*1024;
/** Keep originals untouched; preserve aspect and transparency, fit every upload into the shared budget. */
export async function prepareImageReferences(refs:ImageReference[],signal:AbortSignal){
 if(refs.length>8)throw new Error('Reference images: maximum 8 images');
 if(!refs.length)return [];
 const result:string[]=[],budget=Math.floor(MAX_BYTES/refs.length)-64;
 for(const ref of refs){
  signal.throwIfAborted();const original=validateImage(ref.data),svg=original.startsWith('data:image/svg+xml;');
  const img=new Image();img.src=original;await img.decode();signal.throwIfAborted();
  if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>40000000)throw new Error('Reference image: maximum 40 megapixels');
  if(!svg&&original.length<=budget&&Math.max(img.naturalWidth,img.naturalHeight)<=1024){result.push(original);continue;}
  const canvas=document.createElement('canvas'),context=canvas.getContext('2d');if(!context)throw new Error('Reference image could not be prepared');
  let data='';
  for(const edge of [1024,768,512,384,256,128,64]){
   signal.throwIfAborted();
   const scale=Math.min(svg?Infinity:1,edge/Math.max(img.naturalWidth,img.naturalHeight));
   canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
   context.drawImage(img,0,0,canvas.width,canvas.height);
   // Preserve SVG/PNG fidelity when it already fits, otherwise use transparent-capable WebP.
   data=canvas.toDataURL('image/png');
   if(data.length<=budget)break;
   data=canvas.toDataURL('image/webp',.84);
   if(data.length<=budget)break;
  }
  if(data.length>budget||!/^data:image\/(png|jpeg|webp);base64,/.test(data))throw new Error('Reference image could not be fitted into the upload budget');
  result.push(data);
 }
 signal.throwIfAborted();
 if(result.reduce((n,data)=>n+data.length,0)>MAX_BYTES)throw new Error('Reference images: maximum 6 MiB');
 return result;
}
