export type Kaleidoscope={enabled:boolean;segments:number;rotation:number;speed:number;zoom:number;centerX:number;centerY:number};
export const kaleidoscopeSegments=[4,6,8,10,12,14,16] as const;
export function defaultKaleidoscope():Kaleidoscope{return {enabled:false,segments:8,rotation:0,speed:15,zoom:1.5,centerX:50,centerY:50};}
export function parseKaleidoscope(value:unknown,path:string):Kaleidoscope{
 const d=defaultKaleidoscope();if(value===undefined)return d;
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(path+': expected object');
 const o=value as Record<string,unknown>;for(const key of Object.keys(o))if(!Object.hasOwn(d,key))throw new Error(path+'.'+key+': unknown field');
 const v={...d,...o};if(typeof v.enabled!=='boolean')throw new Error(path+'.enabled: expected boolean');
 const num=(key:Exclude<keyof Kaleidoscope,'enabled'>,min:number,max:number)=>{const n=v[key];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw new Error(path+'.'+key+': expected number '+min+'–'+max);return n;};
 const segments=num('segments',4,16);if(!Number.isInteger(segments)||segments%2)throw new Error(path+'.segments: expected even integer 4–16');
 return {enabled:v.enabled,segments,rotation:num('rotation',-180,180),speed:num('speed',-90,90),zoom:num('zoom',.25,4),centerX:num('centerX',0,100),centerY:num('centerY',0,100)};
}
/** Pure element-local geometry; alternating reflection makes adjacent sectors join. */
export function kaleidoscopeState(e:Kaleidoscope,elapsed:number,width:number,height:number){
 const x=width*e.centerX/100,y=height*e.centerY/100,radius=Math.hypot(width,height)*2,step=360/e.segments;
 const angle=((Math.max(0,elapsed)*e.speed)%360+360)%360;
 // Slightly overlapping clips avoid dark antialias seams between opaque mirrors.
 // Transparent artwork can accumulate alpha in this narrow two-project-pixel seam.
 const pad=2,half=step*Math.PI/360;
 const point=(degrees:number,side:number)=>{const a=degrees*Math.PI/180;return `${x+Math.cos(a)*radius+side*Math.sin(a)*pad}px ${y+Math.sin(a)*radius-side*Math.cos(a)*pad}px`;};
 return {angle,wedges:Array.from({length:e.segments},(_,i)=>{
  const middle=(e.rotation+(i+.5)*step)*Math.PI/180;
  const apex=`${x-Math.cos(middle)*pad/Math.sin(half)}px ${y-Math.sin(middle)*pad/Math.sin(half)}px`;
  return {
   clip:`polygon(${apex},${point(e.rotation+i*step,1)},${point(e.rotation+(i+1)*step,-1)})`,
   transform:`translate(${x}px,${y}px) rotate(${e.rotation+(i%2?i+1:i)*step}deg) scale(${e.zoom},${i%2?-e.zoom:e.zoom}) rotate(${angle}deg) translate(${-x}px,${-y}px)`
  };
 })};
}
