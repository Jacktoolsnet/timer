/** First reusable 2D puppet scene. Data only: imported projects never execute code. */
export type Stage2D={preset:'light-collector';bodyColor:string;accentColor:string;endingTitle:string;endingSubtitle:string;walk:boolean;wave:boolean;jump:boolean;night:boolean;cameraMotion:boolean;jumpHeight:number};
export function defaultStage2D():Stage2D{return {preset:'light-collector',bodyColor:'#f28b70',accentColor:'#fff5c0',endingTitle:'Manchmal genügt',endingSubtitle:'ein kleiner Funke.',walk:true,wave:true,jump:true,night:true,cameraMotion:true,jumpHeight:100};}
export function parseStage2D(value:unknown,path='stage2d'):Stage2D|null{
 if(value==null)return null;
 if(typeof value!=='object'||Array.isArray(value))throw new Error(path+': expected object');
 const raw=value as Record<string,unknown>,defaults=defaultStage2D();
 for(const key of Object.keys(raw))if(!Object.hasOwn(defaults,key))throw new Error(path+'.'+key+': unknown field');
 const out={...defaults,...raw};
 if(out.preset!=='light-collector')throw new Error(path+'.preset: expected light-collector');
 for(const key of ['bodyColor','accentColor'] as const)if(typeof out[key]!=='string'||!/^#[a-f\d]{6}$/i.test(out[key]))throw new Error(path+'.'+key+': expected #RRGGBB');
 for(const key of ['endingTitle','endingSubtitle'] as const)if(typeof out[key]!=='string'||out[key].length>80)throw new Error(path+'.'+key+': expected text (max 80)');
 for(const key of ['walk','wave','jump','night','cameraMotion'] as const)if(typeof out[key]!=='boolean')throw new Error(path+'.'+key+': expected boolean');
 if(typeof out.jumpHeight!=='number'||!Number.isFinite(out.jumpHeight)||out.jumpHeight<0||out.jumpHeight>110)throw new Error(path+'.jumpHeight: expected number 0–110');
 return out as Stage2D;
}
