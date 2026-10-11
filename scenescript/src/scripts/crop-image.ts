import {createSvgImage} from './svg-image';
import type {Crop} from '../lib/crop';
/** Clip the intrinsic image first, then fit that rectangle. Nested SVG clocks remain intact. */
export function createCropImage(data:string,fit:'contain'|'cover',crop:Crop){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),clip=document.createElementNS(ns,'clipPath'),rect=document.createElementNS(ns,'rect'),defs=document.createElementNS(ns,'defs'),group=document.createElementNS(ns,'g');
 const id='crop-'+crypto.randomUUID();clip.id=id;clip.setAttribute('clipPathUnits','userSpaceOnUse');clip.append(rect);defs.append(clip);group.setAttribute('clip-path',`url(#${id})`);svg.append(defs,group);svg.setAttribute('preserveAspectRatio',fit==='cover'?'xMidYMid slice':'xMidYMid meet');svg.setAttribute('aria-hidden','true');svg.classList.add('scene-crop-image');Object.assign(svg.style,{width:'100%',height:'100%',overflow:'hidden',pointerEvents:'none',fill:'none',stroke:'none'});
 const setup=(w:number,h:number)=>{const x=w*crop.x/100,y=h*crop.y/100,cw=w*crop.width/100,ch=h*crop.height/100;svg.setAttribute('viewBox',`${x} ${y} ${cw} ${ch}`);for(const [key,value] of Object.entries({x,y,width:cw,height:ch}))rect.setAttribute(key,String(value));};
 let ready:Promise<void>;
 if(data.startsWith('data:image/svg+xml;')){
  const inner=createSvgImage(data,'contain'),box=inner.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);const length=(name:string)=>{const v=inner.getAttribute(name)||'';return /^\d+(?:\.\d+)?(?:px)?$/.test(v)?parseFloat(v):0;};const w=length('width')||box?.[2]||300,h=length('height')||box?.[3]||150;
  inner.setAttribute('x','0');inner.setAttribute('y','0');inner.setAttribute('width',String(w));inner.setAttribute('height',String(h));inner.style.width=w+'px';inner.style.height=h+'px';inner.style.overflow='hidden';group.append(inner);setup(w,h);ready=Promise.resolve();
 }else{
  const img=document.createElementNS(ns,'image');img.setAttribute('href',data);img.setAttribute('x','0');img.setAttribute('y','0');group.append(img);
  ready=new Promise<void>((resolve,reject)=>{const probe=new Image();probe.onload=()=>{img.setAttribute('width',String(probe.naturalWidth));img.setAttribute('height',String(probe.naturalHeight));setup(probe.naturalWidth,probe.naturalHeight);resolve();};probe.onerror=()=>reject(new Error('Image: decode failed'));probe.src=data;});
 }
 return {svg,ready};
}
