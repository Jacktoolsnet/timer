/** Asset-linked, static color textures. No URLs, executable materials or external dependencies. */
export const textureFaces3D=['right','left','top','bottom','front','back'] as const;
export type TextureFace3D=typeof textureFaces3D[number];
export type Texture3D={asset:string;repeat:{x:number;y:number};offset:{x:number;y:number};rotation:number;faces:Partial<Record<TextureFace3D,string>>};
const obj=(v:unknown,p:string)=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error(p+': expected object');return v as Record<string,unknown>;};
const keys=(v:Record<string,unknown>,allowed:readonly string[],p:string)=>{for(const k of Object.keys(v))if(!allowed.includes(k))throw new Error(p+'.'+k+': unknown field');};
const asset=(v:unknown,p:string)=>{if(typeof v!=='string'||v.length>100||v!==''&&!/^[a-zA-Z0-9_-]+$/.test(v))throw new Error(p+': expected asset ID');return v;};
const num=(v:unknown,p:string,min:number,max:number)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new Error(p+': expected number '+min+'–'+max);return v;};
export function parseTexture3D(value:unknown,shape:string,path:string):Texture3D|undefined{
 if(value===undefined||value===null)return undefined;const v=obj(value,path);keys(v,['asset','repeat','offset','rotation','faces'],path);if(shape==='group')throw new Error(path+': requires geometry');
 const pair=(value:unknown,key:string,fallback:number,min:number,max:number)=>{const v=value===undefined?{}:obj(value,path+'.'+key);keys(v,['x','y'],path+'.'+key);return {x:num(v.x===undefined?fallback:v.x,path+'.'+key+'.x',min,max),y:num(v.y===undefined?fallback:v.y,path+'.'+key+'.y',min,max)};};
 const faces:Texture3D['faces']={};if(v.faces!==undefined){if(shape!=='box')throw new Error(path+'.faces: requires box');const f=obj(v.faces,path+'.faces');keys(f,textureFaces3D,path+'.faces');for(const key of textureFaces3D)if(Object.hasOwn(f,key))faces[key]=asset(f[key],path+'.faces.'+key);}
 const result={asset:asset(v.asset===undefined?'':v.asset,path+'.asset'),repeat:pair(v.repeat,'repeat',1,.01,100),offset:pair(v.offset,'offset',0,-100,100),rotation:num(v.rotation===undefined?0:v.rotation,path+'.rotation',-3600,3600),faces};
 if(!textureAssetIDs3D(result).length)throw new Error(path+': missing image asset');return result;
}
export function textureAssetIDs3D(t?:Texture3D){return t?[...new Set([t.asset,...Object.values(t.faces)].filter(Boolean))]:[];}
export type TexturedModel3D={parts:{texture?:Texture3D}[]}|null|undefined;
export const modelTextureIDs3D=(model:TexturedModel3D)=>[...new Set(model?.parts.flatMap(p=>textureAssetIDs3D(p.texture))??[])];
export function validateTextureAssets3D(models:TexturedModel3D[],assets:Record<string,{data:string}>,path='3D textures'){
 for(const id of new Set(models.flatMap(modelTextureIDs3D))){if(!Object.hasOwn(assets,id))throw new Error(path+': missing asset '+id);if(!/^data:image\/(png|jpeg|webp);base64,/.test(assets[id].data))throw new Error(path+': '+id+' requires PNG, JPEG or WebP');}
}
export function remapTextureAssets3D<T extends TexturedModel3D>(model:T,mapping:Map<string,string>):T{
 if(!model)return model;return {...model,parts:model.parts.map(p=>p.texture?{...p,texture:{...p.texture,asset:mapping.get(p.texture.asset)??p.texture.asset,faces:Object.fromEntries(Object.entries(p.texture.faces).map(([k,v])=>[k,mapping.get(v)??v]))}}:p)};
}
export function removeTextureAsset3D(model:TexturedModel3D,id:string){
 for(const p of model?.parts??[]){if(!p.texture)continue;const t=p.texture;if(t.asset===id)t.asset='';for(const face of textureFaces3D)if(t.faces[face]===id)t.faces[face]='';if(!textureAssetIDs3D(t).length)delete p.texture;}
}
