export const MAX_VIDEO_BYTES=32*1024*1024;
export type VideoAsset={name:string;data:string;duration:number};
export type VideoSettings={asset:string;start:number;end:number|null;loop:boolean;muted:boolean;volume:number;fit:'contain'|'cover'};
export function defaultVideo():VideoSettings{return {asset:'',start:0,end:null,loop:false,muted:true,volume:1,fit:'cover'};}
export function validateVideoData(value:unknown,path='video'):string{
 if(typeof value!=='string'||value.length>Math.ceil(MAX_VIDEO_BYTES/3)*4+100||!/^data:video\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/]+={0,2}$/i.test(value))throw new Error(path+': expected base64 video data URL (max 32 MiB)');
 if(/mpegurl|dash\+xml|playlist/i.test(value.slice(0,value.indexOf(','))))throw new Error(path+': playlists / external streams are not supported');
 const b=value.slice(value.indexOf(',')+1);if(b.length%4||b.length/4*3-(b.endsWith('==')?2:b.endsWith('=')?1:0)>MAX_VIDEO_BYTES)throw new Error(path+': maximum 32 MiB / invalid base64');return value;
}
export function parseVideo(value:unknown,assets:Record<string,VideoAsset>,path='video'):VideoSettings|null{
 if(value==null)return null;if(typeof value!=='object'||Array.isArray(value))throw new Error(path+': expected object');
 const v={...defaultVideo(),...value} as VideoSettings;for(const k of Object.keys(value))if(!Object.hasOwn(defaultVideo(),k))throw new Error(path+'.'+k+': unknown field');
 if(typeof v.asset!=='string'||v.asset.length>100||v.asset&&!Object.hasOwn(assets,v.asset))throw new Error(path+'.asset: missing video');
 const duration=v.asset?assets[v.asset].duration:86400;
 if(!Number.isFinite(v.start)||v.start<0||v.start>=duration||v.end!==null&&(!Number.isFinite(v.end)||v.end<=v.start||v.end>duration))throw new Error(path+': invalid start/end range');
 if(typeof v.loop!=='boolean'||typeof v.muted!=='boolean'||!Number.isFinite(v.volume)||v.volume<0||v.volume>1||!['contain','cover'].includes(v.fit))throw new Error(path+': invalid playback settings');return v;
}
export function videoTime(v:VideoSettings,duration:number,elapsed:number){const end=v.end??duration,length=end-v.start;return v.start+(v.loop?Math.max(0,elapsed)%length:Math.min(Math.max(0,elapsed),Math.max(0,length-.001)));}
