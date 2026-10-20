import {BLOB_COUNT,blobShape} from './rainbow.ts';
/** Approximate the wax footprint, including portrait scale and interaction offsets. */
export function hitBlob(x:number,y:number,time:number,aspect:number,viscosity:number,offsets:Float32Array){
 const scale=Math.min(aspect,1);
 let selected=-1,best=1.35;
 for(let i=0;i<BLOB_COUNT;i++){
  const s=blobShape(i,time,viscosity);
  const distance=Math.hypot((x-s.x-offsets[i*2])*aspect/(s.rx*scale),(y-s.y-offsets[i*2+1])/(s.ry*scale));
  if(distance<best){selected=i;best=distance;}
 }
 return selected;
}
export function sheddingPoint(index:number,time:number,aspect:number,viscosity:number,offsets:Float32Array,dx:number,dy:number){
 const s=blobShape(index,time,viscosity),scale=Math.min(aspect,1);
 const length=Math.hypot(dx*aspect,dy);
 if(length<.00001)return null;
 const nx=dx*aspect/length,ny=dy/length;
 // Detach from the trailing edge of the parent, not from the pointer position.
 return {x:s.x+offsets[index*2]-nx*s.rx*scale/aspect,
  y:s.y+offsets[index*2+1]-ny*s.ry*scale};
}

/** Pick one effect at gesture start; never switch modes while crossing a blob. */
export function strokeEffect(blob:number,trail:boolean,shedding:boolean):'trail'|'shedding'|null{
 if(blob>=0&&shedding)return 'shedding';
 return trail?'trail':null;
}
