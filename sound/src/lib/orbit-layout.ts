export const ORBIT_COUNT=9;
export const padNumbers=[7,8,9,4,5,6,1,2,3] as const;
export type OrbitPad=0|1|2|3|4|5|6|7|8;
export function padAt(x:number,y:number,width:number,height:number):OrbitPad{
 return (Math.max(0,Math.min(2,Math.floor(y/height*3)))*3+Math.max(0,Math.min(2,Math.floor(x/width*3)))) as OrbitPad;
}
export function padCenter(pad:OrbitPad,width:number,height:number){return {x:(pad%3+.5)*width/3,y:(Math.floor(pad/3)+.5)*height/3};}
/** Physical numpad codes also work with Num Lock off (End, ArrowDown, etc.). */
export function padForKey(code:string,key:string):OrbitPad|null{
 const digit=/^Numpad[1-9]$/.test(code)?Number(code.slice(-1)):/^[1-9]$/.test(key)?Number(key):0;
 const index=(padNumbers as readonly number[]).indexOf(digit);
 return index<0?null:index as OrbitPad;
}
