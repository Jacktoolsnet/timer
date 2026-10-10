import {Input,ALL_FORMATS,BlobSource,CanvasSink,AudioBufferSink,type WrappedCanvas} from 'mediabunny';
import {videoURL} from './video';
import type {Project} from '../lib/model';
export class ExportMedia{
 private inputs=new Map<string,Input>();private canvases=new Map<string,CanvasSink>();private audio=new Map<string,AudioBufferSink|null>();private first=new Map<string,number>();
 constructor(private project:Project,private signal:AbortSignal){signal.addEventListener('abort',()=>this.dispose(),{once:true});}
 check(){this.signal.throwIfAborted();}
 async input(id:string){this.check();let i=this.inputs.get(id);if(!i){const response=await fetch(videoURL(this.project.videos[id]),{signal:this.signal});i=new Input({formats:ALL_FORMATS,source:new BlobSource(await response.blob())});this.inputs.set(id,i);}return i;}
 async frame(id:string,time:number):Promise<WrappedCanvas>{this.check();let sink=this.canvases.get(id);if(!sink){const track=await (await this.input(id)).getPrimaryVideoTrack();if(!track||!await track.canDecode())throw new Error('Video codec cannot be decoded for export: '+this.project.videos[id].name);sink=new CanvasSink(track,{alpha:true,poolSize:2});this.canvases.set(id,sink);this.first.set(id,await track.getFirstTimestamp());}const frame=await sink.getCanvas(Math.max(time,this.first.get(id)!));this.check();if(!frame)throw new Error('Video frame unavailable: '+this.project.videos[id].name);return frame;}
 async audioSink(id:string){this.check();if(this.audio.has(id))return this.audio.get(id)!;const track=await (await this.input(id)).getPrimaryAudioTrack();if(track&&!await track.canDecode())throw new Error('Audio codec cannot be decoded for export: '+this.project.videos[id].name);const sink=track?new AudioBufferSink(track):null;this.audio.set(id,sink);return sink;}
 dispose(){for(const i of this.inputs.values())i.dispose();this.inputs.clear();this.canvases.clear();this.audio.clear();}
}
