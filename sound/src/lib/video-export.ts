import {videoTopInfoHeight,videoInfoSize,paintVideoInfo,type VideoInfoSettings,type VideoInfoContent} from './video-info';
import {recordingSeconds} from './recording-duration';
/** Native MP4 only: never rename a WebM recording to .mp4. No microphone/screen permissions. */
export const MP4_TYPES=[
 'video/mp4;codecs=avc1.42001f,mp4a.40.2',
 'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
 'video/mp4;codecs=avc1,mp4a.40.2',
 'video/mp4'
];
export function mp4Type(){
 if(typeof MediaRecorder==='undefined'||typeof MediaRecorder.isTypeSupported!=='function'||typeof HTMLCanvasElement.prototype.captureStream!=='function')return null;
 return MP4_TYPES.find(type=>MediaRecorder.isTypeSupported(type))??null;
}
export type VideoFormat='landscape'|'portrait';
export function videoDimensions(format:VideoFormat='landscape'){return format==='portrait'?{width:720,height:1280}:{width:1280,height:720};}
export function createMp4Recording(options:{
 audio:AudioContext;output:AudioNode;durationSeconds?:number;format?:VideoFormat;paint:(ctx:CanvasRenderingContext2D)=>void;
 ready:(blob:Blob,limited:boolean)=>void;error:()=>void;
}){
 const mimeType=mp4Type();if(!mimeType)throw Error('MP4 unsupported');
 const canvas=document.createElement('canvas'),dimensions=videoDimensions(options.format);canvas.width=dimensions.width;canvas.height=dimensions.height;
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('Canvas unavailable');
 options.paint(ctx);
 const stream=canvas.captureStream(30);
 let destination:MediaStreamAudioDestinationNode;
 try{destination=options.audio.createMediaStreamDestination();}
 catch(error){stream.getTracks().forEach(track=>track.stop());throw error;}
 const combined=new MediaStream([...stream.getVideoTracks(),...destination.stream.getAudioTracks()]);
 let recorder:MediaRecorder;
 try{
  recorder=new MediaRecorder(combined,{mimeType,videoBitsPerSecond:4_000_000,audioBitsPerSecond:192_000});
  if(!recorder.mimeType.startsWith('video/mp4'))throw Error('Not MP4');
 }catch(error){combined.getTracks().forEach(track=>track.stop());destination.disconnect();throw error;}
 const chunks:Blob[]=[];let bytes=0,failed=false,limited=false,cleaned=false,connected=false;
 let timeout:ReturnType<typeof setTimeout>|undefined;
 const cleanup=()=>{
  if(cleaned)return;cleaned=true;
  if(timeout)clearTimeout(timeout);
  if(connected)options.output.disconnect(destination);
  combined.getTracks().forEach(track=>track.stop());destination.disconnect();
 };
 const stop=()=>{if(recorder.state!=='inactive')recorder.stop();};
 recorder.ondataavailable=event=>{
  if(event.data.size){chunks.push(event.data);bytes+=event.data.size;}
  if(bytes>=256*1024*1024){limited=true;stop();}
 };
 recorder.onerror=()=>{failed=true;stop();};
 recorder.onstop=()=>{
  cleanup();
  if(failed||!bytes){chunks.length=0;options.error();return;}
  const blob=new Blob(chunks,{type:recorder.mimeType});chunks.length=0;
  options.ready(blob,limited);
 };
 try{options.output.connect(destination);connected=true;recorder.start(1000);}catch(error){cleanup();throw error;}
 timeout=setTimeout(()=>{limited=true;stop();},recordingSeconds(options.durationSeconds)*1000);
 let lastFrame=-Infinity;
 return {
  stop,
  frame(now:number){if(recorder.state==='recording'&&now-lastFrame>=1000/30){try{options.paint(ctx);lastFrame=now;}catch{failed=true;stop();}}},
  get state(){return recorder.state;}
 };
}
export function videoPadLayout(width:number,height:number,header=0){
 const portrait=height>width,gap=16,padding=20,available=height-header-padding*2;
 const size=Math.max(1,Math.min(portrait?width-padding*2:(width-padding*2-gap)/2,portrait?(available-gap)/2:available));
 const top=header+padding+(available-(portrait?size*2+gap:size))/2;
 return portrait?{orbit:{x:(width-size)/2,y:top,size},pad:{x:(width-size)/2,y:top+size+gap,size}}:
  {orbit:{x:(width-gap)/2-size,y:top,size},pad:{x:(width+gap)/2,y:top,size}};
}
/** Same canvases as the live view, reframed around the orbit; no DOM or user controls. */
export function paintVideo(ctx:CanvasRenderingContext2D,orbit:HTMLCanvasElement,background:HTMLCanvasElement,showBackground:boolean,info?:{settings:VideoInfoSettings;content:VideoInfoContent},pad?:HTMLCanvasElement){
 const style=getComputedStyle(document.documentElement);
 const width=ctx.canvas.width,height=ctx.canvas.height,layout=pad?videoPadLayout(width,height,info?videoTopInfoHeight(info.settings,info.content,height>width):0):null;
 const size=layout?.orbit.size??videoInfoSize(width,height,info?.settings.enabled),cx=layout?layout.orbit.x+size/2:width/2,cy=layout?layout.orbit.y+size/2:height/2;
 ctx.fillStyle=style.getPropertyValue('--surface').trim()||'#080e16';ctx.fillRect(0,0,width,height);
 if(showBackground){
  const o=orbit.getBoundingClientRect(),b=background.getBoundingClientRect();
  if(o.width&&b.width&&b.height){
   const ox=o.left+o.width/2,oy=o.top+o.height/2;
   // Cover the frame while keeping the background's orbit centre aligned with the video.
   const scale=Math.max(size/o.width,cx/Math.max(1,ox-b.left),(width-cx)/Math.max(1,b.right-ox),cy/Math.max(1,oy-b.top),(height-cy)/Math.max(1,b.bottom-oy));
   ctx.save();ctx.globalAlpha=Number(getComputedStyle(background).opacity);
   ctx.drawImage(background,cx+(b.left-ox)*scale,cy+(b.top-oy)*scale,b.width*scale,b.height*scale);
   ctx.restore();
  }else{
   // The note editor may temporarily hide the on-page orbit. Capture continues.
   const scale=Math.max(width/background.width,height/background.height);
   ctx.save();ctx.globalAlpha=Number(getComputedStyle(background).opacity);
   ctx.drawImage(background,(width-background.width*scale)/2,(height-background.height*scale)/2,background.width*scale,background.height*scale);ctx.restore();
  }
 }
 ctx.drawImage(orbit,cx-size/2,cy-size/2,size,size);
 if(pad&&layout)ctx.drawImage(pad,layout.pad.x,layout.pad.y,layout.pad.size,layout.pad.size);
 if(info)paintVideoInfo(ctx,info.settings,info.content,pad?'top':'split');
}
