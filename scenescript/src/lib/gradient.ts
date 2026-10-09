export type Gradient={type:'linear'|'radial'|'conic';angle:number;x:number;y:number;stops:{color:string;position:number;opacity:number}[]};
export function defaultGradient(color='#263b42'):Gradient{return {type:'linear',angle:90,x:50,y:50,stops:[{color,position:0,opacity:1},{color:'#ffffff',position:100,opacity:1}]};}
export function parseGradient(value:unknown,path:string):Gradient|null{
 if(value===undefined||value===null)return null;
 const object=(v:unknown,p:string,allowed:string[])=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error(p+': expected object');const o=v as Record<string,unknown>;for(const key of Object.keys(o))if(!allowed.includes(key))throw new Error(p+'.'+key+': unknown field');return o;};
 const number=(v:unknown,p:string,min:number,max:number)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new Error(p+': expected number '+min+'–'+max);return v;};
 const g=object(value,path,['type','angle','x','y','stops']);
 if(!['linear','radial','conic'].includes(g.type as string))throw new Error(path+'.type: linear, radial, conic');
 if(!Array.isArray(g.stops)||g.stops.length<2||g.stops.length>16)throw new Error(path+'.stops: expected 2–16 stops');
 let previous=-1;
 const stops=g.stops.map((value,i)=>{const p=path+'.stops['+i+']',s=object(value,p,['color','position','opacity']);if(typeof s.color!=='string'||!/^#[0-9a-f]{6}$/i.test(s.color))throw new Error(p+'.color: expected #RRGGBB');const position=number(s.position,p+'.position',0,100);if(position<previous)throw new Error(p+'.position: stops must be sorted');previous=position;return {color:s.color,position,opacity:number(s.opacity??1,p+'.opacity',0,1)};});
 return {type:g.type as Gradient['type'],angle:number(g.angle??90,path+'.angle',-360,360),x:number(g.x??50,path+'.x',0,100),y:number(g.y??50,path+'.y',0,100),stops};
}
export function gradientCSS(g:Gradient|null,color:string):string{
 if(!g)return color==='none'?'transparent':color;
 const stops=g.stops.map(s=>{const channels=[1,3,5].map(i=>parseInt(s.color.slice(i,i+2),16));return `rgba(${channels.join(',')},${s.opacity}) ${s.position}%`;}).join(',');
 if(g.type==='linear')return `linear-gradient(${g.angle}deg,${stops})`;
 if(g.type==='radial')return `radial-gradient(ellipse farthest-corner at ${g.x}% ${g.y}%,${stops})`;
 return `conic-gradient(from ${g.angle}deg at ${g.x}% ${g.y}%,${stops})`;
}
