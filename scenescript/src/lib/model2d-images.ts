import type {Model2D} from './model2d.ts';
/** Text/feedback transports contain image manifests, never duplicate embedded raster payloads. */
export function model2DManifest(model:Model2D):Model2D{
 return model.images?{...model,images:Object.fromEntries(Object.entries(model.images).map(([id,image])=>[id,{name:image.name}]))}:model;
}
/** Restore only explicitly known local images. Never fetch generated URLs or accept invented manifests. */
export function restoreModel2DImages(value:unknown,source?:Model2D){
 if(!value||typeof value!=='object'||Array.isArray(value))return value;
 const model=value as Record<string,unknown>,known=source?.images;
 if(model.images===undefined&&known)return {...model,images:structuredClone(known)};
 if(!model.images||typeof model.images!=='object'||Array.isArray(model.images))return value;
 const images:Record<string,unknown>=Object.create(null);
 for(const [id,value]of Object.entries(model.images)){
  if(!value||typeof value!=='object'||Array.isArray(value)){images[id]=value;continue;}
  const image=value as {name?:unknown;data?:unknown};
  if(image.data===undefined){if(!known||!Object.hasOwn(known,id)||!known[id].data||known[id].name!==image.name)throw Error('2D image '+id+': unknown image manifest');images[id]={...value,data:known[id].data};}
  else images[id]=value;
 }
 return {...model,images};
}
