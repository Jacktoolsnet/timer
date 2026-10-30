import {objectSoundScore2D} from '../lib/sound2d';
import {narrationClips} from '../lib/audio';
import {Output,Mp4OutputFormat,WebMOutputFormat,StreamTarget,CanvasSource,AudioSampleSource,AudioSample,canEncodeVideo,canEncodeAudio} from 'mediabunny';
import type {Project} from '../lib/model';
import {exportSize,estimatedExportBytes,type ExportOptions} from '../lib/export-plan';
import {createVideoDestination,type VideoFileHandle,type VideoDestination} from './export-storage';
export {exportSize} from '../lib/export-plan';
export type {ExportOptions} from '../lib/export-plan';
import {ExportMedia} from './export-media';
import {ExportRenderer} from './export-renderer';
import {ExportAudio} from './export-audio';
export function exportHasAudio(p:Project){return Boolean(objectSoundScore2D(p)||narrationClips(p).length||p.music?.enabled&&p.music.volume>0||p.backgroundVideo?.asset&&!p.backgroundVideo.muted&&p.backgroundVideo.volume>0||p.scenes.some(s=>s.elements.some(e=>e.type==='video'&&e.video?.asset&&!e.video.muted&&e.video.volume>0)));}
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
async function renderVideo(p:Project,o:ExportOptions,signal:AbortSignal,progress:(fraction:number)=>void,onFrame:((canvas:HTMLCanvasElement,time:number)=>void)|undefined,handle?:VideoFileHandle){
 signal.throwIfAborted();
 const duration=p.scenes.reduce((n,s)=>n+s.duration,0),size=exportSize(p,o);
 if(!await exportSupported(p,o))throw new Error('Encoder unavailable. Try WebM or disable audio.');signal.throwIfAborted();
 const destination=await createVideoDestination(o.format==='mp4'?'video/mp4':'video/webm',estimatedExportBytes(p,o),signal,handle);
 try{return await encodeVideo(p,o,signal,progress,onFrame,destination,duration,size);}
 catch(error){await destination.abort();throw error;}
}
async function encodeVideo(p:Project,o:ExportOptions,signal:AbortSignal,progress:(fraction:number)=>void,onFrame:((canvas:HTMLCanvasElement,time:number)=>void)|undefined,destination:VideoDestination,duration:number,size:ReturnType<typeof exportSize>){
 const target=new StreamTarget(destination.stream,{chunked:true,chunkSize:1024*1024}),output=new Output({target,format:o.format==='mp4'?new Mp4OutputFormat({fastStart:false}):new WebMOutputFormat()}),media=new ExportMedia(p,signal),renderer=new ExportRenderer(p,media);
 const canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;
 const cancel=()=>{void output.cancel().catch(()=>{});};signal.addEventListener('abort',cancel,{once:true});
 try{
 const video=new CanvasSource(canvas,{codec:o.format==='mp4'?'avc':'vp9',bitrate:size.bitrate});output.addVideoTrack(video,{frameRate:o.fps});
 const audio=o.audio&&exportHasAudio(p)?new AudioSampleSource({codec:o.format==='mp4'?'aac':'opus',bitrate:128000}):null;if(audio)output.addAudioTrack(audio);
 const mixer=new ExportAudio(p,media,duration);let audioEnd=0;
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
  signal.throwIfAborted();await output.finalize();signal.throwIfAborted();const result=await destination.finish();progress(1);return result;
 }finally{signal.removeEventListener('abort',cancel);if(output.state!=='finalized'&&output.state!=='canceled')await output.cancel().catch(()=>{});renderer.dispose();media.dispose();canvas.width=0;canvas.height=0;}
}

/** Default downloads are backed by a temporary disk file whenever the browser supports OPFS. */
export async function exportVideo(p:Project,o:ExportOptions,signal:AbortSignal,progress:(fraction:number)=>void,onFrame?:(canvas:HTMLCanvasElement,time:number)=>void):Promise<Blob>{return (await renderVideo(p,o,signal,progress,onFrame))!;}
/** Native save-picker output: no complete video buffer or final download Blob is created. */
export async function exportVideoToFile(p:Project,o:ExportOptions,signal:AbortSignal,progress:(fraction:number)=>void,handle:VideoFileHandle,onFrame?:(canvas:HTMLCanvasElement,time:number)=>void):Promise<void>{await renderVideo(p,o,signal,progress,onFrame,handle);}
