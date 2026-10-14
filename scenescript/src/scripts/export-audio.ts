import {mixAudioBuffer} from '../lib/audio-mix';
import {narrationClips,narrationGain,duckGain} from '../lib/audio';
import {decodeAudio} from './audio';
import type {Project} from '../lib/model';
import {musicEvents,musicGainAt} from '../lib/music';
import type {VideoSettings} from '../lib/video';
import {renderNote} from './music-audio';
import type {ExportMedia} from './export-media';
export class ExportAudio{
 private clips;private narrationBuffers=new Map<string,AudioBuffer>();
 private cache=new Map<string,AudioBuffer>();
 constructor(private p:Project,private media:ExportMedia,private total:number){this.clips=narrationClips(p);}
 async chunk(start:number,end:number){
  const rate=48000,n=Math.round(end*rate)-Math.round(start*rate),data=new Float32Array(n*2);
  const mix=(buffer:AudioBuffer,at:number,gain:(t:number)=>number,from=start,to=end)=>mixAudioBuffer(data,rate,start,buffer,at,gain,from,to);
  const m=this.p.music;
  if(m?.enabled)for(const note of musicEvents(m,this.total,start,end)){
   this.media.check();const instrument=m.instruments.find(i=>i.id===note.instrument)!;const key=JSON.stringify([instrument,note.pitch,note.duration,m.seed]);let buffer=this.cache.get(key);
   if(!buffer){buffer=await renderNote(instrument,note,m.seed);this.cache.set(key,buffer);while([...this.cache.values()].reduce((s,b)=>s+b.length*b.numberOfChannels*4,0)>32*1024*1024&&this.cache.size>1)this.cache.delete(this.cache.keys().next().value!);}
   mix(buffer,note.at,t=>note.velocity*musicGainAt(m,t,this.total)*duckGain(this.p,t,this.clips));
  }
  for(const clip of this.clips){if(clip.at>=end||clip.at+clip.duration<=start)continue;this.media.check();let buffer=this.narrationBuffers.get(clip.settings.asset);if(!buffer){buffer=await decodeAudio(this.p.audios[clip.settings.asset]);this.media.check();this.narrationBuffers.set(clip.settings.asset,buffer);while([...this.narrationBuffers.values()].reduce((n,b)=>n+b.length*b.numberOfChannels*4,0)>128*1024*1024&&this.narrationBuffers.size>1)this.narrationBuffers.delete(this.narrationBuffers.keys().next().value!);}mix(buffer,clip.at-clip.settings.start,t=>narrationGain(clip.settings,t-clip.at,clip.duration),clip.at,clip.at+clip.duration);}
  const video=async(scope:string,c:VideoSettings|null,origin:number,limit:number,from=origin)=>{
   if(!c?.asset||c.muted||!c.volume)return;const lo=Math.max(start,origin,from),hi=Math.min(end,limit);if(hi<=lo)return;
   const sink=await this.media.audioSink(c.asset);if(!sink)return;const duration=(c.end??this.p.videos[c.asset].duration)-c.start;
   let cursor=lo;
   while(cursor<hi){this.media.check();const elapsed=cursor-origin;if(!c.loop&&elapsed>=duration)break;const cycle=c.loop?Math.floor(elapsed/duration):0;const base=origin+cycle*duration,stop=Math.min(hi,base+duration);
    for await(const item of this.media.audioBuffers(c.asset,c.start+cursor-base,c.start+stop-base,scope)){this.media.check();mix(item.buffer,base+item.timestamp-c.start,()=>c.volume,cursor,stop);}
    cursor=stop;
   }
  };
  await video('background',this.p.backgroundVideo,0,this.total);let offset=0;
  for(const scene of this.p.scenes){if(offset<end&&offset+scene.duration>start)for(const e of scene.elements)if(e.type==='video'){const g=scene.groups.find(g=>g.members.includes(e.id));await video(JSON.stringify([scene.id,e.id]),e.video,offset+e.at,offset+Math.min(e.until??scene.duration,g?.until??scene.duration),offset+Math.max(e.at,g?.at??0));}offset+=scene.duration;}
  for(let j=0;j<data.length;j++)data[j]=Math.max(-1,Math.min(1,data[j]));return data;
 }
}
