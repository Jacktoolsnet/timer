import {narrationClips,narrationGain,validateAudioData,MAX_AUDIO_BYTES,type AudioAsset} from '../lib/audio';
import type {Project} from '../lib/model';
let decoder:OfflineAudioContext|undefined;
export function audioBlob(a:AudioAsset){const raw=atob(a.data.split(',')[1]);return new Blob([Uint8Array.from(raw,c=>c.charCodeAt(0))],{type:a.data.slice(5,a.data.indexOf(';'))});}
export async function decodeAudio(a:AudioAsset){decoder??=new OfflineAudioContext(2,1,48000);let b:AudioBuffer;try{b=await decoder.decodeAudioData(await audioBlob(a).arrayBuffer());}catch{throw new Error('Audio: unsupported format or codec');}if(b.numberOfChannels>2)throw new Error('Audio: mono or stereo required');if(!Number.isFinite(b.duration)||b.duration<=0||b.duration>3600||b.length*b.numberOfChannels*4>64*1024*1024)throw new Error('Audio: maximum 3600 seconds / 64 MiB decoded');return b;}
export async function readAudioFile(file:File):Promise<AudioAsset>{
 if(file.size>MAX_AUDIO_BYTES)throw new Error('Audio: maximum 32 MiB');
 const fallback=({'mp3':'audio/mpeg','wav':'audio/wav','ogg':'audio/ogg','m4a':'audio/mp4','aac':'audio/aac','flac':'audio/flac','webm':'audio/webm'} as Record<string,string>)[file.name.split('.').pop()!.toLowerCase()];
 const data=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error('Audio read failed'));r.readAsDataURL(!file.type.startsWith('audio/')&&fallback?new Blob([file],{type:fallback}):file);});
 validateAudioData(data);const asset={name:file.name.slice(0,200),data,duration:0};asset.duration=(await decodeAudio(asset)).duration;return asset;
}
export class NarrationPlayer{
 private context:AudioContext|undefined;private sources:AudioBufferSourceNode[]=[];private gains:GainNode[]=[];private base=0;private anchor=0;private active=false;
 async unlock(){this.context??=new AudioContext();await this.context.resume();if(this.context.state!=='running')throw new Error('Audio unavailable');}
 async prepare(p:Project){await this.unlock();const ids=[...new Set(narrationClips(p).map(c=>c.settings.asset))],buffers=new Map<string,AudioBuffer>();let bytes=0;for(const id of ids){const b=await decodeAudio(p.audios[id]);bytes+=b.length*b.numberOfChannels*4;if(bytes>128*1024*1024)throw new Error('Audio: maximum 128 MiB active decoded audio');buffers.set(id,b);}return buffers;}
 start(p:Project,time:number,buffers:Map<string,AudioBuffer>){this.stop();const c=this.context!;this.base=time;this.anchor=c.currentTime+.03;this.active=true;
  for(const clip of narrationClips(p)){if(clip.at+clip.duration<=time)continue;const elapsed=Math.max(0,time-clip.at),when=this.anchor+Math.max(0,clip.at-time),buffer=buffers.get(clip.settings.asset)!,length=Math.min(clip.duration-elapsed,buffer.duration-clip.settings.start-elapsed);if(length<=0)continue;const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;source.connect(gain).connect(c.destination);const n=clip.settings,D=clip.duration;gain.gain.setValueAtTime(narrationGain(n,elapsed,D),when);const points=[D,n.fadeIn,D-n.fadeOut,n.fadeIn+n.fadeOut?D*n.fadeIn/(n.fadeIn+n.fadeOut):D].filter(t=>t>elapsed&&t<=D).sort((a,b)=>a-b);for(const t of new Set(points)){const value=t===D&&!n.fadeOut?n.volume*Math.min(1,n.fadeIn?D/n.fadeIn:1):narrationGain(n,t,D);gain.gain.linearRampToValueAtTime(value,when+t-elapsed);}source.start(when,clip.settings.start+elapsed,length);this.sources.push(source);this.gains.push(gain);}
 }
 playhead(){return this.active&&this.context?this.base+Math.max(0,this.context.currentTime-this.anchor):null;}
 stop(){this.active=false;for(const s of this.sources){try{s.stop();}catch{}s.disconnect();}for(const g of this.gains)g.disconnect();this.sources=[];this.gains=[];}
}
