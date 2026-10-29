import {aiGuide} from './guide.ts';
import {guideFieldCatalog} from './guide-fields.ts';
/** Reuse canonical semantics/schema, but do not send unrelated video, music or 2D docs per model edit. */
export function storyboardModelGuide(){
 const blocks=new Map(guideFieldCatalog.split('\n\n').map(block=>[block.split('\n')[0],block])),needed=new Set<string>();
 const visit=(name:string)=>{if(needed.has(name))return;const block=blocks.get(name);if(!block)throw new Error('Missing model guide type: '+name);needed.add(name);for(const token of block.match(/[A-Za-z][A-Za-z0-9]*/g)??[])if(blocks.has(token)&&token!==name)visit(token);};visit('Model3D');
 const section=(start:string,end:string)=>{const a=aiGuide.indexOf(start),b=aiGuide.indexOf(end,a);if(a<0||b<a)throw new Error('Missing model guide semantics');return aiGuide.slice(a,b);};
 return 'SceneScript reusable model authoring. Field catalog below is specification notation, NOT JSON syntax: ! means required; = gives omission defaults; num/int bounds and str lengths are inclusive; Array/Map limits apply. ID = 1–100 ASCII letters/digits/_/-. Color = #RRGGBB. Unknown fields, nonfinite numbers, arbitrary code, external URLs and custom mesh formats are rejected. Emit only actual JSON values, not type notation.\n'+section('FREE CONSTRUCTION:','Object-neutral destruction:')+section('Walk/wave still move/turn the root;','Minimal independent example')+'\n'+[...needed].map(name=>blocks.get(name)).join('\n\n');
}
