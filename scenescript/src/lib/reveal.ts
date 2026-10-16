export const revealTypes=['left-to-right','right-to-left','top-to-bottom','bottom-to-top','circle','brush'] as const;
export type Reveal={enabled:boolean;type:typeof revealTypes[number];delay:number;duration:number;easing:'linear'|'ease-in-out';originX:number;originY:number;strokes:number;roughness:number;seed:number};
export function defaultReveal():Reveal{return {enabled:false,type:'left-to-right',delay:0,duration:1.5,easing:'ease-in-out',originX:50,originY:50,strokes:5,roughness:20,seed:17};}
export function parseReveal(value:unknown,path:string):Reveal{
 const d=defaultReveal();if(value===undefined)return d;
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(path+': expected object');
 const o=value as Record<string,unknown>;for(const key of Object.keys(o))if(!Object.hasOwn(d,key))throw new Error(path+'.'+key+': unknown field');
 const v={...d,...o};if(typeof v.enabled!=='boolean')throw new Error(path+'.enabled: expected boolean');
 if(!(revealTypes as readonly unknown[]).includes(v.type))throw new Error(path+'.type: expected '+revealTypes.join(', '));
 if(v.easing!=='linear'&&v.easing!=='ease-in-out')throw new Error(path+'.easing: expected linear or ease-in-out');
 const num=(key:'delay'|'duration'|'originX'|'originY'|'strokes'|'roughness'|'seed',min:number,max:number,integer=false)=>{
  const n=v[key];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw new Error(path+'.'+key+': expected '+(integer?'integer':'number')+' '+min+'–'+max);return n;
 };
 return {enabled:v.enabled,type:v.type as Reveal['type'],easing:v.easing,delay:num('delay',0,3600),duration:num('duration',.01,3600),originX:num('originX',0,100),originY:num('originY',0,100),strokes:num('strokes',1,12,true),roughness:num('roughness',0,80),seed:num('seed',0,65535,true)};
}
export function revealProgress(e:Reveal,time:number,at:number){
 const p=Math.max(0,Math.min(1,(time-at-e.delay)/e.duration));
 return e.easing==='ease-in-out'?p*p*(3-2*p):p;
}
/** In element-local project pixels; no asset fetch, SVG IDs or playback clock. */
export function revealClip(e:Reveal,time:number,at:number,width:number,height:number){
 if(!e.enabled)return 'none';
 const p=revealProgress(e,time,at);if(p<=0)return 'inset(100%)';if(p>=1)return 'none';
 const hidden=(1-p)*100;
 if(e.type==='left-to-right')return `inset(0 ${hidden}% 0 0)`;
 if(e.type==='right-to-left')return `inset(0 0 0 ${hidden}%)`;
 if(e.type==='top-to-bottom')return `inset(0 0 ${hidden}% 0)`;
 if(e.type==='bottom-to-top')return `inset(${hidden}% 0 0 0)`;
 if(e.type==='circle'){
  const x=e.originX/100*width,y=e.originY/100*height;
  const radius=Math.hypot(Math.max(x,width-x),Math.max(y,height-y))*p;
  return `circle(${radius}px at ${e.originX}% ${e.originY}%)`;
 }
 // Alternating horizontal brush passes. Completed bands stay painted; the
 // active stroke has a seeded bristle edge, then the next pass reverses direction.
 const row=Math.min(e.strokes-1,Math.floor(p*e.strokes)),u=p*e.strokes-row,top=row*height/e.strokes,bottom=(row+1)*height/e.strokes;
 const depth=Math.min(e.roughness,width/4);
 let seed=(e.seed^Math.imul(row+1,374761393))>>>0;
 const edge:number[][]=[];
 for(let i=0;i<=16;i++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const front=Math.max(0,Math.min(width,u*(width+2*depth)-depth+(seed/4294967296*2-1)*depth));
  edge.push([row%2?width-front:front,top+(bottom-top)*i/16]);
 }
 const points=row%2?[[0,0],[width,0],[width,bottom],...edge.reverse(),[0,top]]:[[0,0],[width,0],[width,top],...edge,[0,bottom]];
 return 'polygon('+points.map(([x,y])=>(x/width*100).toFixed(5)+'% '+(y/height*100).toFixed(5)+'%').join(',')+')';
}
