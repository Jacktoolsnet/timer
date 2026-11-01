/** Bounded changes keep neighbouring evolution cycles musically connected. */
export function approach(value:number,target:number,maximum:number):number{
 return value+Math.max(-maximum,Math.min(maximum,target-value));
}
export function journeyLength(random=Math.random):number{return 4+Math.floor(random()*3);}
export function morphWeights(progress:number):[number,number]{
 const t=Math.max(0,Math.min(1,progress));
 // Smoothstep, with constant total gain to avoid a loudness hump.
 const mix=t*t*(3-2*t);return [1-mix,mix];
}
