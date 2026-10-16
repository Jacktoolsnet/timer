export const printStyles=['dots','lines'] as const;
export type PrintEffect={enabled:boolean;style:typeof printStyles[number];size:number;angle:number;ink:string;paper:string;strength:number};
export function defaultPrint():PrintEffect{return {enabled:false,style:'dots',size:16,angle:45,ink:'#18232b',paper:'#fff2d6',strength:1};}
export function parsePrint(value:unknown,path:string):PrintEffect{
 const d=defaultPrint();if(value===undefined)return d;
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(path+': expected object');
 const o=value as Record<string,unknown>;for(const key of Object.keys(o))if(!Object.hasOwn(d,key))throw new Error(path+'.'+key+': unknown field');
 const v={...d,...o};if(typeof v.enabled!=='boolean')throw new Error(path+'.enabled: expected boolean');
 if(!printStyles.includes(v.style as any))throw new Error(path+'.style: expected dots or lines');
 const number=(key:'size'|'angle'|'strength',min:number,max:number)=>{const n=v[key];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw new Error(path+'.'+key+': expected number '+min+'–'+max);return n;};
 const color=(key:'ink'|'paper')=>{const c=v[key];if(typeof c!=='string'||!/^#[\da-f]{6}$/i.test(c))throw new Error(path+'.'+key+': expected #rrggbb');return c;};
 return {enabled:v.enabled,style:v.style as PrintEffect['style'],size:number('size',4,80),angle:number('angle',-180,180),ink:color('ink'),paper:color('paper'),strength:number('strength',0,1)};
}
/** Analytic SVG tile: bounded markup, independent of scene duration or output resolution. */
export function printPattern(e:PrintEffect,width:number,height:number){
 const gradient=e.style==='dots'?'<radialGradient id="g" r="70.711%"><stop stop-color="#000"/><stop offset="1" stop-color="#fff"/></radialGradient>':'<linearGradient id="g"><stop stop-color="#000"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${gradient}<pattern id="p" width="${e.size}" height="${e.size}" patternUnits="userSpaceOnUse" patternTransform="rotate(${e.angle})"><rect width="${e.size}" height="${e.size}" fill="url(#g)"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/></svg>`;
}
