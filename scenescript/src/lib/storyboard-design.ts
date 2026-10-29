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

/** Distinct silhouette/proportion requirements, not just alternative material colors. */
export const modelStyleBriefs:Record<BoardDesign['style'],string>={
 block:'BLOCK STYLE: use a distinctly angular, rectilinear silhouette: box/cuboid head, torso and limbs, flat surfaces, simple low-detail facial features. Do NOT keep an ellipsoid/rounded body or rounded human template. Small eye details may be curved.',
 rounded:'ROUNDED STYLIZATION: soft curved silhouettes, rounded head and limbs, readable facial features and clothing. Avoid block geometry and excessive balloon-like segmentation.',
 cartoon:'CARTOON: visibly exaggerated, expressive proportions, a deliberately enlarged head/eyes and a distinctive graphic silhouette. Redesign the proportions, not just colors; do not reuse the restrained rounded or natural body unchanged.',
 natural:'NATURAL PROPORTIONS: proportionate stylized anatomy, restrained eyes and facial features, believable torso/limb proportions and fitted clothing. Adults should have a head roughly 1/7 to 1/8 of total height unless age/species requires otherwise. Avoid oversized cartoon heads, bulging eyes and balloon-like limbs. Not photorealism; work within supported geometry.'
};
