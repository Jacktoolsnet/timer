export type Lighting={enabled:boolean;strength:number;color:string;ambient:number;centerX:number;centerY:number;radius:number;angle:number;speed:number;orbit:number;shadowColor:string;shadowOpacity:number;shadowDistance:number;shadowBlur:number};
export function defaultLighting():Lighting{return {enabled:false,strength:.85,color:'#fff1cf',ambient:.3,centerX:35,centerY:25,radius:70,angle:-135,speed:0,orbit:0,shadowColor:'#000000',shadowOpacity:.45,shadowDistance:24,shadowBlur:12};}
export function parseLighting(value:unknown,path:string):Lighting{
 const d=defaultLighting();if(value===undefined)return d;
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(path+': expected object');
 const o=value as Record<string,unknown>;for(const key of Object.keys(o))if(!Object.hasOwn(d,key))throw new Error(path+'.'+key+': unknown field');
 const v={...d,...o};if(typeof v.enabled!=='boolean')throw new Error(path+'.enabled: expected boolean');
 const num=(key:Exclude<keyof Lighting,'enabled'|'color'|'shadowColor'>,min:number,max:number)=>{const n=v[key];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw new Error(path+'.'+key+': expected number '+min+'–'+max);return n;};
 const color=(key:'color'|'shadowColor')=>{const c=v[key];if(typeof c!=='string'||!/^#[\da-f]{6}$/i.test(c))throw new Error(path+'.'+key+': expected #rrggbb');return c;};
 return {enabled:v.enabled,strength:num('strength',0,1),color:color('color'),ambient:num('ambient',0,1),centerX:num('centerX',0,100),centerY:num('centerY',0,100),radius:num('radius',10,200),angle:num('angle',-180,180),speed:num('speed',-90,90),orbit:num('orbit',0,50),shadowColor:color('shadowColor'),shadowOpacity:num('shadowOpacity',0,1),shadowDistance:num('shadowDistance',0,120),shadowBlur:num('shadowBlur',0,60)};
}
export function lightingState(e:Lighting,elapsed:number,width:number,height:number){
 const angle=((e.angle+Math.max(0,elapsed)*e.speed)%360+360)%360,radians=angle*Math.PI/180,radius=e.orbit*Math.min(width,height)/100;
 return {angle,x:width*e.centerX/100+Math.cos(radians)*radius,y:height*e.centerY/100+Math.sin(radians)*radius,dx:-Math.cos(radians)*e.shadowDistance,dy:-Math.sin(radians)*e.shadowDistance};
}
export function lightingShadowMargin(e:Lighting){return e.enabled&&e.strength>0&&e.shadowOpacity>0?e.shadowDistance+e.shadowBlur*3:0;}
/** Multiplicative 2D spotlight, not geometry-aware 3D lighting. */
export function lightingMap(e:Lighting,state:ReturnType<typeof lightingState>,width:number,height:number,margin:number){
 const center=[1,3,5].map(i=>Math.round(255*(1-e.strength)+e.strength*parseInt(e.color.slice(i,i+2),16))),edge=Math.round(255*(1-e.strength+e.strength*e.ambient));
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width+margin*2}" height="${height+margin*2}"><defs><radialGradient id="light" gradientUnits="userSpaceOnUse" cx="${state.x+margin}" cy="${state.y+margin}" r="${Math.max(width,height)*e.radius/100}"><stop stop-color="rgb(${center.join(',')})"/><stop offset="1" stop-color="rgb(${edge},${edge},${edge})"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#light)"/></svg>`;
}
