import {AudioPacketStream} from '../lib/audio-packet-stream';
import {Input,ALL_FORMATS,BlobSource,CanvasSink,AudioBufferSink,type WrappedCanvas} from 'mediabunny';
import {videoURL} from './video';
import type {Project} from '../lib/model';
export class ExportMedia{
 private audioStreams=new Map<string,AudioPacketStream<NonNullable<Awaited<ReturnType<AudioBufferSink['getBuffer']>>>>>();
 private decoding=new Map<string,{iterator:AsyncGenerator<WrappedCanvas,void,unknown>;current:WrappedCanvas|null;next:WrappedCanvas|null;time:number}>();
 private inputs=new Map<string,Input>();private canvases=new Map<string,CanvasSink>();private audio=new Map<string,AudioBufferSink|null>();private first=new Map<string,number>();
 constructor(private project:Project,private signal:AbortSignal){signal.addEventListener('abort',()=>this.dispose(),{once:true});}
 check(){this.signal.throwIfAborted();}
 async input(id:string){this.check();let i=this.inputs.get(id);if(!i){const response=await fetch(videoURL(this.project.videos[id]),{signal:this.signal});i=new Input({formats:ALL_FORMATS,source:new BlobSource(await response.blob())});this.inputs.set(id,i);}return i;}
 async frame(id:string,time:number):Promise<WrappedCanvas>{this.check();let sink=this.canvases.get(id);if(!sink){const track=await (await this.input(id)).getPrimaryVideoTrack();if(!track||!await track.canDecode())throw new Error('Video codec cannot be decoded for export: '+this.project.videos[id].name);sink=new CanvasSink(track,{alpha:true,poolSize:3});this.canvases.set(id,sink);this.first.set(id,await track.getFirstTimestamp());}const timestamp=Math.max(time,this.first.get(id)!);
 // Keep one sequential decoder alive instead of seeking from a keyframe for
 // every output frame. Restart on loops, trims or large timeline jumps.
 let state=this.decoding.get(id);
 if(state&&(timestamp<state.time||timestamp-state.time>2)){await state.iterator.return();this.decoding.delete(id);state=undefined;}
 if(!state){const iterator=sink.canvases(timestamp);state={iterator,current:null,next:null,time:timestamp};this.decoding.set(id,state);state.next=(await iterator.next()).value??null;}
 while(state.next&&state.next.timestamp<=timestamp){this.check();state.current=state.next;state.next=(await state.iterator.next()).value??null;}
 state.time=timestamp;this.check();
 if(!state.current)throw new Error('Video frame unavailable: '+this.project.videos[id].name);return state.current;}

 async audioSink(id:string){this.check();if(this.audio.has(id))return this.audio.get(id)!;const track=await (await this.input(id)).getPrimaryAudioTrack();if(track&&!await track.canDecode())throw new Error('Audio codec cannot be decoded for export: '+this.project.videos[id].name);const sink=track?new AudioBufferSink(track):null;this.audio.set(id,sink);return sink;}
 async *audioBuffers(id:string,start:number,end:number,scope:string){
  this.check();const sink=await this.audioSink(id);if(!sink)return;
  const key=JSON.stringify([id,scope]);let stream=this.audioStreams.get(key);
  if(!stream){stream=new AudioPacketStream(time=>sink.buffers(time));this.audioStreams.set(key,stream);}
  for await(const item of stream.range(start,end)){this.check();yield item;}
 }
 dispose(){for(const stream of this.audioStreams.values())void stream.dispose().catch(()=>{});this.audioStreams.clear();for(const state of this.decoding.values()){void state.iterator.return().catch(()=>{});for(const frame of [state.current,state.next])if(frame){frame.canvas.width=0;frame.canvas.height=0;}}this.decoding.clear();for(const i of this.inputs.values())i.dispose();this.inputs.clear();this.canvases.clear();this.audio.clear();}
}
