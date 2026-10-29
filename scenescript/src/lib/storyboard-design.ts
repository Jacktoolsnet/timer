import {parseModel3D,type Model3D} from './model3d.ts';
export type BoardDesign={mode:'inherit'|'2d'|'3d';style:'rounded'|'block'|'cartoon'|'natural';surface:'colors'|'textures'|'mixed';details:string};
export const defaultBoardDesign=():BoardDesign=>({mode:'inherit',style:'rounded',surface:'colors',details:''});
export function parseBoardDesign(value:unknown,path:string):BoardDesign{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(path+': expected object');
 const v=value as Record<string,unknown>,d=defaultBoardDesign();for(const k of Object.keys(v))if(!(k in d)||!Object.hasOwn(d,k))throw new Error(path+'.'+k+': unknown field');
 for(const [k,choices]of Object.entries({mode:['inherit','2d','3d'],style:['rounded','block','cartoon','natural'],surface:['colors','textures','mixed']}))if(!choices.includes(v[k] as string))throw new Error(path+'.'+k+': '+choices.join(', '));
 if(typeof v.details!=='string'||v.details.length>10000)throw new Error(path+'.details: expected text (max 10000)');return {...v} as BoardDesign;
}
export function parseBoardModel(value:unknown,path:string):Model3D{const model=parseModel3D(value,path);if(!model||!model.parts.some(p=>p.shape!=='group'))throw new Error(path+': geometry required');return model;}
