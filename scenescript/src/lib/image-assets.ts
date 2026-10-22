import {base64ByteLength} from './data-size.ts';
import {validateSvg,svgSource} from './svg.ts';
export const MAX_IMAGE_BYTES=8*1024*1024;
function str(v:unknown,p:string,max:number):string{if(typeof v!=='string'||v.length>max)throw new Error(p+': expected text (max '+max+')');return v;}
export function validateImage(data:unknown,path='image'):string {
 const s=str(data,path,Math.ceil(MAX_IMAGE_BYTES/3)*4+100);
 if(s.startsWith('data:image/svg+xml;')){validateSvg(svgSource(s));return s;}
 const comma=s.indexOf(','),header=s.slice(0,comma+1),bytes=base64ByteLength(s.slice(comma+1));
 if(!/^data:image\/(png|jpeg|webp);base64,$/.test(header)||bytes<0)throw new Error(`${path}: expected PNG, JPEG or WebP base64 data URL`);
 if(bytes>MAX_IMAGE_BYTES)throw new Error(`${path}: maximum 8 MiB`);
 return s;
}
