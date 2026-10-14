import {narrationClips} from '../lib/audio';
import {Output,Mp4OutputFormat,WebMOutputFormat,BufferTarget,CanvasSource,AudioSampleSource,AudioSample,canEncodeVideo,canEncodeAudio} from 'mediabunny';
import {formats,type Project} from '../lib/model';
import {ExportMedia} from './export-media';
import {ExportRenderer} from './export-renderer';
import {ExportAudio} from './export-audio';
export type ExportOptions={format:'mp4'|'webm';resolution:number;fps:number;audio:boolean};
export function exportSize(p:Project,o:ExportOptions){const [w,h]=formats[p.format],scale=o.resolution/Math.min(w,h);return {width:Math.round(w*scale/2)*2,height:Math.round(h*scale/2)*2,bitrate:o.resolution<=480?2000000:o.resolution<=720?4000000:8000000};}
export function exportHasAudio(p:Project){return Boolean(narrationClips(p).length||p.music?.enabled&&p.music.volume>0||p.backgroundVideo?.asset&&!p.backgroundVideo.muted&&p.backgroundVideo.volume>0||p.scenes.some(s=>s.elements.some(e=>e.type==='video'&&e.video?.asset&&!e.video.muted&&e.video.volume>0)));}
const audioConfig={sampleRate:48000,numberOfChannels:2,bitrate:128000};
let aacFallback:Promise<void>|undefined;
async function ensureAacEncoder(){
 if(await canEncodeAudio('aac',audioConfig))return;
 // Load the bundled, local WASM encoder only when native AAC is unavailable.
 aacFallback??=import('@mediabunny/aac-encoder').then(({registerAacEncoder})=>{registerAacEncoder();}).catch(error=>{aacFallback=undefined;throw error;});
 await aacFallback;
}
export async function exportSupported(p:Project,o:ExportOptions){
 const size=exportSize(p,o);
 if(!await canEncodeVideo(o.format==='mp4'?'avc':'vp9',{...size,frameRate:o.fps}))return false;
 if(!o.audio||!exportHasAudio(p))return true;
 if(o.format==='mp4')await ensureAacEncoder();
 return canEncodeAudio(o.format==='mp4'?'aac':'opus',audioConfig);
}
export async function exportVideo(p:Project,o:ExportOptions,signal:AbortSignal,progress:(fraction:number)=>void,onFrame?:(canvas:HTMLCanvasElement,time:number)=>void){
 const duration=p.scenes.reduce((n,s)=>n+s.duration,0),size=exportSize(p,o);
 if(!await exportSupported(p,o))throw new Error('Encoder unavailable. Try WebM or disable audio.');signal.throwIfAborted();
 const target=new BufferTarget(),output=new Output({target,format:o.format==='mp4'?new Mp4OutputFormat():new WebMOutputFormat()}),media=new ExportMedia(p,signal),renderer=new ExportRenderer(p,media);
 const canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;
 const video=new CanvasSource(canvas,{codec:o.format==='mp4'?'avc':'vp9',bitrate:size.bitrate});output.addVideoTrack(video,{frameRate:o.fps});
 const audio=o.audio&&exportHasAudio(p)?new AudioSampleSource({codec:o.format==='mp4'?'aac':'opus',bitrate:128000}):null;if(audio)output.addAudioTrack(audio);
 const mixer=new ExportAudio(p,media,duration);let audioEnd=0;
 const cancel=()=>{void output.cancel().catch(()=>{});};signal.addEventListener('abort',cancel,{once:true});
 try{
  await document.fonts.ready;await output.start();const frames=Math.ceil(duration*o.fps);let previewPercent=-1;
  for(let i=0;i<frames;i++){
   signal.throwIfAborted();const time=i/o.fps;
   if(audio&&time>=audioEnd){const end=Math.min(duration,audioEnd+1),data=await mixer.chunk(audioEnd,end);const sample=new AudioSample({data,format:'f32-planar',numberOfChannels:2,sampleRate:48000,timestamp:audioEnd});try{await audio.add(sample);}finally{sample.close();}audioEnd=end;}
   const image=await renderer.frame(time,size.width,size.height);
   try{canvas.getContext('2d')!.drawImage(image,0,0);}finally{image.width=0;image.height=0;}
   await video.add(time,Math.min(1/o.fps,duration-time));
   const fraction=(i+1)/frames*.98,percent=Math.floor(fraction*100);
   if(percent!==previewPercent){previewPercent=percent;onFrame?.(canvas,time);}
   progress(fraction);
  }
  signal.throwIfAborted();await output.finalize();signal.throwIfAborted();progress(1);return new Blob([target.buffer!],{type:o.format==='mp4'?'video/mp4':'video/webm'});
 }finally{signal.removeEventListener('abort',cancel);if(output.state!=='finalized'&&output.state!=='canceled')await output.cancel().catch(()=>{});renderer.dispose();media.dispose();canvas.width=0;canvas.height=0;}
}
