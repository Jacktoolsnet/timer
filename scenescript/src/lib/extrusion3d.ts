/** Bounded polygon extrusion, suitable for solid lettering and reusable construction parts. */
export type ContourPoint3D={x:number;y:number};
export type Extrusion3D={contour:ContourPoint3D[];holes:ContourPoint3D[][];bevel:number;sideColor:string};
export function parseExtrusion3D(value:unknown,shape:string,path:string):Extrusion3D|undefined{
 const fail=(message:string):never=>{throw new Error(path+': '+message);};
 if(shape!=='extrusion'){if(value!==undefined)return fail('requires extrusion shape');return undefined;}
 if(!value||typeof value!=='object'||Array.isArray(value))return fail('expected contour object');const v=value as Record<string,unknown>;
 if(Object.keys(v).some(k=>!['contour','holes','bevel','sideColor'].includes(k)))return fail('unknown field');
 const cross=(a:ContourPoint3D,b:ContourPoint3D,c:ContourPoint3D)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const on=(a:ContourPoint3D,b:ContourPoint3D,c:ContourPoint3D)=>Math.abs(cross(a,b,c))<1e-10&&c.x>=Math.min(a.x,b.x)-1e-10&&c.x<=Math.max(a.x,b.x)+1e-10&&c.y>=Math.min(a.y,b.y)-1e-10&&c.y<=Math.max(a.y,b.y)+1e-10;
 const intersects=(a:ContourPoint3D,b:ContourPoint3D,c:ContourPoint3D,d:ContourPoint3D)=>on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b)||(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0);
 const polygon=(raw:unknown)=>{
  if(!Array.isArray(raw)||raw.length<3||raw.length>128)return fail('contour rings require 3–128 points');
  const points=raw.map(p=>{if(!p||typeof p!=='object'||Object.keys(p).some(k=>!['x','y'].includes(k))||![p.x,p.y].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1))return fail('expected x/y coordinates 0–1');return {x:p.x as number,y:p.y as number};});
  let area=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if(Math.hypot(a.x-b.x,a.y-b.y)<1e-7)return fail('duplicate adjacent contour points');area+=a.x*b.y-b.x*a.y;for(let j=i+2;j<points.length;j++){if(i===0&&j===points.length-1)continue;if(intersects(a,b,points[j],points[(j+1)%points.length]))return fail('self-intersecting contour');}}
  if(Math.abs(area)<1e-7)return fail('degenerate contour');return points;
 };
 const contour=polygon(v.contour),rawHoles=v.holes===undefined?[]:v.holes;if(!Array.isArray(rawHoles)||rawHoles.length>4)return fail('maximum 4 holes');const holes=rawHoles.map(polygon),rings=[contour,...holes];
 if(rings.reduce((n,p)=>n+p.length,0)>192)return fail('maximum 192 contour points per part');
 const inside=(p:ContourPoint3D,ring:ContourPoint3D[])=>{let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;};
 for(let i=1;i<rings.length;i++){if(!inside(rings[i][0],contour))return fail('hole must be inside contour');for(let j=0;j<i;j++){for(let a=0;a<rings[i].length;a++)for(let b=0;b<rings[j].length;b++)if(intersects(rings[i][a],rings[i][(a+1)%rings[i].length],rings[j][b],rings[j][(b+1)%rings[j].length]))return fail('contours must not touch or intersect');if(j>0&&(inside(rings[i][0],rings[j])||inside(rings[j][0],rings[i])))return fail('holes must not overlap');}}
 const bevel=v.bevel===undefined?.012:v.bevel,sideColor=v.sideColor===undefined?'':v.sideColor;if(typeof bevel!=='number'||!Number.isFinite(bevel)||bevel<0||bevel>.03)return fail('bevel expected 0–0.03');if(typeof sideColor!=='string'||(sideColor!==''&&!/^#[a-f\d]{6}$/i.test(sideColor)))return fail('sideColor expected #RRGGBB or empty');
 return {contour,holes,bevel,sideColor};
}
