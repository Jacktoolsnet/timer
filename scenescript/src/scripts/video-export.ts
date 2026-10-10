import {Output,Mp4OutputFormat,WebMOutputFormat,BufferTarget,CanvasSource,AudioSampleSource,AudioSample,canEncodeVideo,canEncodeAudio} from 'mediabunny';
import {formats,type Project} from '../lib/model';
import {ExportMedia} from './export-media';
import {ExportRenderer} from './export-renderer';
import {ExportAudio} from './export-audio';
export type ExportOptions={format:'mp4'|'webm';resolution:number;fps:number;audio:boolean};
export function exportSize(p:Project,o:ExportOptions){const [w,h]=formats[p.format],scale=o.resolution/Math.min(w,h);return {width:Math.round(w*scale/2)*2,height:Math.round(h*scale/2)*2,bitrate:o.resolution<=480?2000000:o.resolution<=720?4000000:8000000};}
export function exportHasAudio(p:Project){return Boolean(p.music?.enabled&&p.music.volume>0||p.backgroundVideo?.asset&&!p.backgroundVideo.muted&&p.backgroundVideo.volume>0||p.scenes.some(s=>s.elements.some(e=>e.type==='video'&&e.video?.asset&&!e.video.muted&&e.video.volume>0)));}
export async function exportSupported(p:Project,o:ExportOptions){const size=exportSize(p,o);return await canEncodeVideo(o.format==='mp4'?'avc':'vp9',{...size,frameRate:o.fps})&&(!o.audio||!exportHasAudio(p)||await canEncodeAudio(o.format==='mp4'?'aac':'opus',{sampleRate:48000,numberOfChannels:2,bitrate:128000}));}
export async function exportVideo(p:Project,o:ExportOptions,signal:AbortSignal,progress:(fraction:number)=>void){
 const duration=p.scenes.reduce((n,s)=>n+s.duration,0),size=exportSize(p,o);
 if(duration*(size.bitrate+(o.audio?128000:0))/8>512*1024*1024)throw new Error('Export exceeds 512 MB. Reduce resolution or shorten the project.');
 if(!await exportSupported(p,o))throw new Error('Encoder unavailable. Try WebM or disable audio.');signal.throwIfAborted();
 const target=new BufferTarget(),output=new Output({target,format:o.format==='mp4'?new Mp4OutputFormat():new WebMOutputFormat()}),media=new ExportMedia(p,signal),renderer=new ExportRenderer(p,media);
 const canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;
 const video=new CanvasSource(canvas,{codec:o.format==='mp4'?'avc':'vp9',bitrate:size.bitrate});output.addVideoTrack(video,{frameRate:o.fps});
 const audio=o.audio&&exportHasAudio(p)?new AudioSampleSource({codec:o.format==='mp4'?'aac':'opus',bitrate:128000}):null;if(audio)output.addAudioTrack(audio);
 const mixer=new ExportAudio(p,media,duration);let audioEnd=0;
 const cancel=()=>{void output.cancel().catch(()=>{});};signal.addEventListener('abort',cancel,{once:true});
 try{
  await document.fonts.ready;await output.start();const frames=Math.ceil(duration*o.fps);
  for(let i=0;i<frames;i++){
   signal.throwIfAborted();const time=i/o.fps;
   if(audio&&time>=audioEnd){const end=Math.min(duration,audioEnd+1),data=await mixer.chunk(audioEnd,end);const sample=new AudioSample({data,format:'f32-planar',numberOfChannels:2,sampleRate:48000,timestamp:audioEnd});try{await audio.add(sample);}finally{sample.close();}audioEnd=end;}
   const image=await renderer.frame(time,size.width,size.height);canvas.getContext('2d')!.drawImage(image,0,0);await video.add(time,Math.min(1/o.fps,duration-time));progress((i+1)/frames*.98);
  }
  signal.throwIfAborted();await output.finalize();signal.throwIfAborted();progress(1);return new Blob([target.buffer!],{type:o.format==='mp4'?'video/mp4':'video/webm'});
 }finally{signal.removeEventListener('abort',cancel);if(output.state!=='finalized'&&output.state!=='canceled')await output.cancel().catch(()=>{});renderer.dispose();media.dispose();}
}
