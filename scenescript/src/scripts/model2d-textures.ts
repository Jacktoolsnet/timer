import {Texture,ImageSource} from 'pixi.js';
import type {Resources2D,Stage2D} from '../lib/stage2d';
/** Embedded rasters only. Cache ownership is independent of scene/sprite lifetime. */
export class Model2DTextures{
 private cache=new Map<string,{texture:Texture;pixels:number}>();
 private disposed=false;
 constructor(private invalidateWorlds:()=>void){}
 get=(data:string)=>{const item=this.cache.get(data);if(!item)throw Error('2D image not prepared');return item.texture;};
 async prepare(resources:Resources2D,shot:Stage2D){
  if(this.disposed)throw Error('2D renderer disposed');
  const models=[resources.stages2d[shot.stage]?.model,...(shot.transition?[resources.stages2d[shot.transition.stage]?.model]:[]),...shot.actors.map(a=>resources.objects2d[a.object]?.model)],wanted=new Set<string>();
  for(const model of models)for(const part of model?.parts??[])if(part.shape==='sprite'){const data=model?.images?.[part.image!]?.data;if(!data)throw Error('2D sprite: missing embedded raster data');wanted.add(data);}
  if(wanted.size>32)throw Error('2D scene: maximum 32 distinct images');
  let pixels=[...wanted].reduce((n,data)=>n+(this.cache.get(data)?.pixels??0),0);if(pixels>16*1024*1024)throw Error('2D scene: decoded image budget exceeded');
  for(const data of wanted){
   const cached=this.cache.get(data);if(cached)continue;
   const image=new Image();image.src=data;await image.decode();if(this.disposed)throw Error('2D renderer disposed');
   const count=image.naturalWidth*image.naturalHeight;
   if(!count||image.naturalWidth>4096||image.naturalHeight>4096||count>4*1024*1024)throw Error('2D image: maximum 4096 per edge and 4 megapixels');
   pixels+=count;if(pixels>16*1024*1024)throw Error('2D scene: decoded image budget exceeded');
   const resident=[...this.cache.values()].reduce((n,v)=>n+v.pixels,0);
   if(this.cache.size>=32||resident+count>16*1024*1024){this.invalidateWorlds();for(const [key,item]of this.cache)if(!wanted.has(key)){item.texture.destroy(true);this.cache.delete(key);}}
   this.cache.set(data,{texture:new Texture({source:new ImageSource({resource:image})}),pixels:count});
  }
 }
 dispose(){this.disposed=true;for(const {texture}of this.cache.values())texture.destroy(true);this.cache.clear();}
}
