/** Quiet audible hits still need a visible accent; silence never gets a fake hit. */
export function noteGlow(ageMs:number,level:number,audible:boolean,reduced:boolean,strength=1){
 if(!audible||reduced||ageMs<0||ageMs>=700)return 0;
 const energy=Math.max(0,Math.min(1,level));
 return Math.min(1,Math.pow(1-ageMs/700,1.15)*(.55+.45*energy)*Math.max(0,Math.min(1.5,strength)));
}
