import type {Project} from '../lib/model';
import {musicEvents,musicGainAt} from '../lib/music';
import type {VideoSettings} from '../lib/video';
import {renderNote} from './music-audio';
import type {ExportMedia} from './export-media';
export class ExportAudio{
 private cache=new Map<string,AudioBuffer>();
 constructor(private p:Project,private media:ExportMedia,private total:number){}
 async chunk(start:number,end:number){
  const rate=48000,n=Math.round(end*rate)-Math.round(start*rate),data=new Float32Array(n*2);
  const mix=(buffer:AudioBuffer,at:number,gain:(t:number)=>number,from=start,to=end)=>{
   const a=Math.max(0,Math.ceil((Math.max(start,at,from)-start)*rate)),b=Math.min(n,Math.ceil((Math.min(end,at+buffer.duration,to)-start)*rate));
   for(let c=0;c<2;c++){const src=buffer.getChannelData(Math.min(c,buffer.numberOfChannels-1));for(let j=a;j<b;j++){const t=start+j/rate,pos=(t-at)*buffer.sampleRate,k=Math.floor(pos),f=pos-k;data[c*n+j]+=((src[k]||0)*(1-f)+(src[k+1]||0)*f)*gain(t);}}
  };
  const m=this.p.music;
  if(m?.enabled)for(const note of musicEvents(m,this.total,start,end)){
   this.media.check();const instrument=m.instruments.find(i=>i.id===note.instrument)!;const key=JSON.stringify([instrument,note.pitch,note.duration,m.seed]);let buffer=this.cache.get(key);
   if(!buffer){buffer=await renderNote(instrument,note,m.seed);this.cache.set(key,buffer);while([...this.cache.values()].reduce((s,b)=>s+b.length*b.numberOfChannels*4,0)>32*1024*1024&&this.cache.size>1)this.cache.delete(this.cache.keys().next().value!);}
   mix(buffer,note.at,t=>note.velocity*musicGainAt(m,t,this.total));
  }
  const video=async(c:VideoSettings|null,origin:number,limit:number)=>{
   if(!c?.asset||c.muted||!c.volume)return;const lo=Math.max(start,origin),hi=Math.min(end,limit);if(hi<=lo)return;
   const sink=await this.media.audioSink(c.asset);if(!sink)return;const duration=(c.end??this.p.videos[c.asset].duration)-c.start;
   let cursor=lo;
   while(cursor<hi){this.media.check();const elapsed=cursor-origin;if(!c.loop&&elapsed>=duration)break;const cycle=c.loop?Math.floor(elapsed/duration):0;const base=origin+cycle*duration,stop=Math.min(hi,base+duration);
    for await(const item of sink.buffers(c.start+cursor-base,c.start+stop-base)){this.media.check();mix(item.buffer,base+item.timestamp-c.start,()=>c.volume,cursor,stop);}
    cursor=stop;
   }
  };
  await video(this.p.backgroundVideo,0,this.total);let offset=0;
  for(const scene of this.p.scenes){if(offset<end&&offset+scene.duration>start)for(const e of scene.elements)if(e.type==='video')await video(e.video,offset+e.at,offset+scene.duration);offset+=scene.duration;}
  for(let j=0;j<data.length;j++)data[j]=Math.max(-1,Math.min(1,data[j]));return data;
 }
}
