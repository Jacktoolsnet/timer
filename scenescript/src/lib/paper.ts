export const paperEdges=['torn','cut','straight'] as const;
export type Paper={enabled:boolean;edge:typeof paperEdges[number];color:string;padding:number;roughness:number;texture:number;shadow:number;seed:number};
export function defaultPaper():Paper{return {enabled:false,edge:'torn',color:'#f4ecd8',padding:16,roughness:8,texture:.18,shadow:12,seed:17};}
export function parsePaper(value:unknown,path:string):Paper{
 const d=defaultPaper();if(value===undefined)return d;
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(path+': expected object');
 const o=value as Record<string,unknown>;for(const key of Object.keys(o))if(!Object.hasOwn(d,key))throw new Error(path+'.'+key+': unknown field');
 const v={...d,...o};
 if(typeof v.enabled!=='boolean')throw new Error(path+'.enabled: expected boolean');
 if(!(paperEdges as readonly unknown[]).includes(v.edge))throw new Error(path+'.edge: expected '+paperEdges.join(', '));
 if(typeof v.color!=='string'||!/^#[0-9a-f]{6}$/i.test(v.color))throw new Error(path+'.color: expected #RRGGBB');
 const num=(key:'padding'|'roughness'|'texture'|'shadow'|'seed',min:number,max:number)=>{
  const n=v[key];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max||(key==='seed'&&!Number.isInteger(n)))throw new Error(path+'.'+key+': expected '+(key==='seed'?'integer':'number')+' '+min+'–'+max);return n;
 };
 return {enabled:v.enabled,edge:v.edge as Paper['edge'],color:v.color,padding:num('padding',0,100),roughness:num('roughness',0,40),texture:num('texture',0,1),shadow:num('shadow',0,40),seed:num('seed',0,65535)};
}
function generator(seed:number){let state=seed>>>0;return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
/** Inward-only polygon, stable across frames, IDs and export resolutions. */
export function paperPolygon(p:Paper,width:number,height:number){
 if(p.edge==='straight'||p.roughness===0)return 'polygon(0% 0%,100% 0%,100% 100%,0% 100%)';
 const random=generator(p.seed),segments=p.edge==='torn'?32:4;
 const depth=Math.min(p.roughness,width/4,height/4),points:number[][]=[];
 for(let side=0;side<4;side++)for(let i=0;i<segments;i++){
  const t=i/segments,d=i===0?0:depth*(.2+random()*.8);
  points.push(side===0?[t*width,d]:side===1?[width-d,t*height]:side===2?[(1-t)*width,height-d]:[d,(1-t)*height]);
 }
 return 'polygon('+points.map(([x,y])=>(x/width*100).toFixed(4)+'% '+(y/height*100).toFixed(4)+'%').join(',')+')';
}
/** Keep a visible content area, even for tiny elements or a very wide paper border. */
export function paperInset(p:Paper,width:number,height:number){return Math.min(p.padding,Math.max(0,(Math.min(width,height)-1)/2));}
const grainCache=new Map<number,string>();
export function paperGrain(seed:number){
 const cached=grainCache.get(seed);if(cached)return cached;
 const random=generator(seed);let fibers='';
 for(let i=0;i<120;i++){
  const x=(random()*64).toFixed(2),y=(random()*64).toFixed(2),length=(.4+random()*2).toFixed(2);
  fibers+='<path d="M'+x+' '+y+'h'+length+'" stroke="'+(i%2?'#ffffff':'#000000')+'" stroke-opacity=".55"/>';
 }
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">'+fibers+'</svg>';
 const url='url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';
 if(grainCache.size>=64)grainCache.clear();grainCache.set(seed,url);return url;
}
