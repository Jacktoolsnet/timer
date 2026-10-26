import {validateImage} from '../lib/image-assets';
import type {ImageReference} from '../lib/storyboard-image-references';
/** Rasterize validated local SVG sketches; do not fetch external URLs or crop identity references. */
export async function prepareImageReferences(refs:ImageReference[],signal:AbortSignal){
 const result:string[]=[];let bytes=0;
 for(const ref of refs){
  signal.throwIfAborted();let data=validateImage(ref.data);
  if(data.startsWith('data:image/svg+xml;')){
   const img=new Image();img.src=data;await img.decode();signal.throwIfAborted();
   if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>40000000)throw new Error('Reference image: maximum 40 megapixels');
   const scale=1024/Math.max(img.naturalWidth,img.naturalHeight),canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
   const context=canvas.getContext('2d');if(!context)throw new Error('Reference image could not be prepared');
   context.drawImage(img,0,0,canvas.width,canvas.height);data=canvas.toDataURL('image/png');
  }
  if(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(data))throw new Error('Unsupported reference image');
  bytes+=data.length;if(bytes>6*1024*1024)throw new Error('Reference images: maximum 6 MiB');
  result.push(data);
 }
 return result;
}
