export type Glitch={enabled:boolean;strength:number;channelShift:number;bands:number;rate:number;seed:number};
export function defaultGlitch():Glitch{return {enabled:false,strength:16,channelShift:5,bands:8,rate:6,seed:17};}
export function parseGlitch(value:unknown,path:string):Glitch{
 const d=defaultGlitch();if(value===undefined)return d;
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(path+': expected object');
 const o=value as Record<string,unknown>;for(const key of Object.keys(o))if(!Object.hasOwn(d,key))throw new Error(path+'.'+key+': unknown field');
 const v={...d,...o};if(typeof v.enabled!=='boolean')throw new Error(path+'.enabled: expected boolean');
 const num=(key:'strength'|'channelShift'|'bands'|'rate'|'seed',min:number,max:number,integer=false)=>{
  const n=v[key];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw new Error(path+'.'+key+': expected '+(integer?'integer':'number')+' '+min+'–'+max);return n;
 };
 return {enabled:v.enabled,strength:num('strength',0,60),channelShift:num('channelShift',0,30),bands:num('bands',1,16,true),rate:num('rate',0,12),seed:num('seed',0,65535,true)};
}
/** Bounded geometry changes only: no opacity toggling or full-frame color flashes. */
export function glitchState(e:Glitch,elapsed:number){
 if(!e.enabled)return {frame:0,shifts:Array<number>(e.bands).fill(0),red:0,blue:0};
 const frame=Math.floor(Math.max(0,elapsed)*e.rate+1e-9);
 let seed=(e.seed^Math.imul(frame+1,374761393))>>>0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const shifts=Array.from({length:e.bands},()=>{const amount=random()*2-1;return e.strength===0||Math.abs(amount)<.25?0:amount*e.strength;});
 if(e.strength>0&&shifts.every(n=>Math.abs(n)===0))shifts[Math.floor(e.bands/2)]=e.strength*.5;
 const sign=random()<.5?-1:1;
 return {frame,shifts,red:e.channelShift===0?0:-sign*e.channelShift*(.65+random()*.35),blue:e.channelShift===0?0:sign*e.channelShift*(.65+random()*.35)};
}
