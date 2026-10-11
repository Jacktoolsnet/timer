import {animationState,newElement,type Element,type Scene, type Group} from './model.ts';
import {elementMatrix,multiplyMatrix,type Matrix} from './comic.ts';
export const identity:Matrix={a:1,b:0,c:0,d:1,e:0,f:0};
export function parsePlacement(v:unknown,p:string):Matrix|null{
 if(v===null||v===undefined)return null;
 if(typeof v!=='object'||Array.isArray(v))throw new Error(p+': expected matrix');
 const o=v as Record<string,unknown>;if(Object.keys(o).length!==6||Object.keys(o).some(k=>!['a','b','c','d','e','f'].includes(k)))throw new Error(p+': expected a,b,c,d,e,f');
 for(const k of ['a','b','c','d','e','f'])if(typeof o[k]!=='number'||!Number.isFinite(o[k])||Math.abs(o[k] as number)>1000000)throw new Error(p+': invalid matrix');
 const m=o as Matrix;if(Math.abs(m.a*m.d-m.b*m.c)<1e-8)throw new Error(p+': singular matrix');return {...m};
}
export function groupController(g:Group):Element{return {...newElement('shape',g.id),...g,width:0,height:0,x:g.pivot.x,y:g.pivot.y,placement:null};}
export function groupState(g:Group,time:number,w:number,h:number,duration:number){
 const e=groupController(g),state=animationState(e,time,w,h,duration),m=elementMatrix(e,time,w,h,duration);
 // Controller rotates/scales about its pivot. x/y are additional project-percentage offsets.
 m.e+=g.x*w/100-m.a*g.pivot.x*w/100-m.c*g.pivot.y*h/100;
 m.f+=g.y*h/100-m.b*g.pivot.x*w/100-m.d*g.pivot.y*h/100;
 return {...state,matrix:m};
}
export function parentMatrix(e:Element,s:Scene,time:number,w:number,h:number):Matrix{
 const g=s.groups?.find(g=>g.members.includes(e.id));return multiplyMatrix(g?groupState(g,time,w,h,s.duration).matrix:identity,e.placement??identity);
}
export function sceneElementMatrix(e:Element,s:Scene,time:number,w:number,h:number):Matrix{return multiplyMatrix(parentMatrix(e,s,time,w,h),elementMatrix(e,time,w,h,s.duration));}
export function sceneElementState(e:Element,s:Scene,time:number,w:number,h:number){
 const state=animationState(e,time,w,h,s.duration),g=s.groups?.find(g=>g.members.includes(e.id)),gs=g?groupState(g,time,w,h,s.duration):null;
 const matrix=sceneElementMatrix(e,s,time,w,h);
 // Matrix maps local element pixels to world pixels; CSS left/top are still applied outside it.
 const transform=`matrix(${matrix.a},${matrix.b},${matrix.c},${matrix.d},${matrix.e-e.x*w/100},${matrix.f-e.y*h/100})`;
 return {...state,visible:state.visible&&(!gs||gs.visible),opacity:state.opacity*(gs?.opacity??1),transform};
}
export function newGroup(s:Scene,members:string[],id:string):Group{
 const items=s.elements.filter(e=>members.includes(e.id));
 return {id,name:'Group',members:[...members],pivot:{x:(Math.min(...items.map(e=>e.x))+Math.max(...items.map(e=>e.x+e.width)))/2,y:(Math.min(...items.map(e=>e.y))+Math.max(...items.map(e=>e.y+e.height)))/2},x:0,y:0,rotation:0,opacity:1,at:0,until:null,animation:'none',animationDuration:1,exitAnimation:'none',exitDuration:.5,motionPath:null};
}
/** Dissolve at the current playhead without changing the visible member geometry. */
export function dissolveGroup(s:Scene,g:Group,time:number,w:number,h:number){
 const state=groupState(g,time,w,h,s.duration);if(!state.visible||state.opacity<=0)throw new Error('groupHidden');
 for(const e of s.elements)if(g.members.includes(e.id)){const matrix=multiplyMatrix(state.matrix,e.placement??identity);parsePlacement(matrix,'placement');}
 for(const e of s.elements)if(g.members.includes(e.id)){e.placement=multiplyMatrix(state.matrix,e.placement??identity);e.opacity*=state.opacity;}
 s.groups=s.groups.filter(v=>v.id!==g.id);
}
