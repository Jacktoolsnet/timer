export const MAX_AUDIO_BYTES=32*1024*1024;
export type AudioAsset={name:string;data:string;duration:number};
export type Narration={asset:string;at:number;start:number;end:number|null;volume:number;muted:boolean;fadeIn:number;fadeOut:number;text:string;instructions:string;speaker:string};
export function defaultNarration():Narration{return {asset:'',at:0,start:0,end:null,volume:1,muted:false,fadeIn:0,fadeOut:0,text:'',instructions:'',speaker:''};}
export function validateAudioData(v:unknown,path='audio.data'):string{
 if(typeof v!=='string'||v.length>Math.ceil(MAX_AUDIO_BYTES/3)*4+100||!/^data:audio\/[a-z0-9.+-]+;base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/i.test(v)||!v.split(',')[1])throw new Error(path+': expected base64 audio data URL (max 32 MiB)');
 if(/mpegurl|playlist/i.test(v.slice(0,v.indexOf(','))))throw new Error(path+': external playlists not supported');const b=v.split(',')[1];if(b.length/4*3-(b.endsWith('==')?2:b.endsWith('=')?1:0)>MAX_AUDIO_BYTES)throw new Error(path+': maximum 32 MiB');return v;
}
export function parseNarration(value:unknown,assets:Record<string,AudioAsset>,scope:number,path='narration'):Narration|null{
 if(value===undefined||value===null)return null;if(typeof value!=='object'||Array.isArray(value))throw new Error(path+': expected object');const d=defaultNarration();for(const key of Object.keys(value))if(!Object.hasOwn(d,key))throw new Error(path+'.'+key+': unknown field');const v={...d,...value} as Narration;
 if(typeof v.asset!=='string'||v.asset.length>100||v.asset&&!Object.hasOwn(assets,v.asset))throw new Error(path+'.asset: missing audio');const duration=v.asset?assets[v.asset].duration:3600;
 for(const k of ['at','start','volume','fadeIn','fadeOut'] as const)if(typeof v[k]!=='number'||!Number.isFinite(v[k])||v[k]<0)throw new Error(path+'.'+k+': invalid number');
 if(v.at>scope||v.start>=duration||v.volume>1||v.fadeIn>3600||v.fadeOut>3600||v.end!==null&&(typeof v.end!=='number'||!Number.isFinite(v.end)||v.end<=v.start||v.end>duration)||typeof v.muted!=='boolean'||typeof v.text!=='string'||v.text.length>10000||typeof v.instructions!=='string'||v.instructions.length>5000||typeof v.speaker!=='string'||v.speaker.length>200)throw new Error(path+': invalid narration settings');return v;
}
export type AudioTimeline={audios:Record<string,AudioAsset>;narration:Narration|null;audioDucking:boolean;scenes:{duration:number;narration:Narration|null}[]};
export function narrationClips(p:AudioTimeline){const clips:{settings:Narration;at:number;duration:number}[]=[];const add=(n:Narration|null,origin:number,scope:number)=>{if(!n?.asset||n.muted||!n.volume)return;const duration=Math.min((n.end??p.audios[n.asset].duration)-n.start,scope-n.at);if(duration>0)clips.push({settings:n,at:origin+n.at,duration});};const total=p.scenes.reduce((n,s)=>n+s.duration,0);add(p.narration,0,total);let origin=0;for(const s of p.scenes){add(s.narration,origin,s.duration);origin+=s.duration;}return clips;}
export function narrationGain(n:Narration,elapsed:number,duration:number){if(elapsed<0||elapsed>=duration||n.muted)return 0;return n.volume*Math.min(1,n.fadeIn?elapsed/n.fadeIn:1,n.fadeOut?(duration-elapsed)/n.fadeOut:1);}
export function duckGain(p:AudioTimeline,time:number,clips=narrationClips(p)){if(!p.audioDucking)return 1;let factor=1;for(const c of clips){const lead=.15,tail=.3;if(time<c.at-lead||time>c.at+c.duration+tail)continue;const amount=Math.min(1,(time-c.at+lead)/lead,(c.at+c.duration+tail-time)/tail);factor=Math.min(factor,1-.7*Math.max(0,amount));}return factor;}
