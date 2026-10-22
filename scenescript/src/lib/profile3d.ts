/** Bounded, evenly spaced height controls for a closed extruded area, not arbitrary meshes. */
export type Profile3D={heights:number[];target:number[]};
export function parseProfile3D(value:unknown,shape:string,path:string):Profile3D|undefined{
 if(shape!=='profile'){if(value!==undefined)throw new Error(path+': requires profile shape');return undefined;}
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(path+': expected height profile');const v=value as Record<string,unknown>;
 for(const key of Object.keys(v))if(!['heights','target'].includes(key))throw new Error(path+'.'+key+': unknown field');
 const heights=(raw:unknown,key:string)=>{if(!Array.isArray(raw)||raw.length<2||raw.length>32)throw new Error(path+'.'+key+': expected 2–32 heights');return raw.map((n,i)=>{if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>1)throw new Error(path+'.'+key+'['+i+']: expected number 0–1');return n;});};
 const start=heights(v.heights,'heights'),target=v.target===undefined?[...start]:heights(v.target,'target');if(target.length!==start.length)throw new Error(path+'.target: must match heights length');return {heights:start,target};
}
/** Shape-preserving C1 Hermite interpolation: smooth waves without Catmull-Rom overshoot. */
export function profileSample3D(profile:Profile3D,x:number,morph=0){
 const q=Math.max(0,Math.min(1,morph)),n=profile.heights.length-1,u=Math.max(0,Math.min(1,x))*n,i=Math.min(n-1,Math.floor(u)),t=u-i;
 const at=(i:number)=>profile.heights[i]+(profile.target[i]-profile.heights[i])*q;
 const slope=(i:number)=>{if(i===0)return at(1)-at(0);if(i===n)return at(n)-at(n-1);const a=at(i)-at(i-1),b=at(i+1)-at(i);return a*b<=0?0:2*a*b/(a+b);};
 const a=at(i),b=at(i+1),m0=slope(i),m1=slope(i+1),t2=t*t,t3=t2*t;
 return {height:(2*t3-3*t2+1)*a+(t3-2*t2+t)*m0+(-2*t3+3*t2)*b+(t3-t2)*m1,derivative:n*((6*t2-6*t)*a+(3*t2-4*t+1)*m0+(-6*t2+6*t)*b+(3*t2-2*t)*m1)};
}
