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
export function createMp4Recording(options:{
 audio:AudioContext;output:AudioNode;durationSeconds?:number;paint:(ctx:CanvasRenderingContext2D)=>void;
 ready:(blob:Blob,limited:boolean)=>void;error:()=>void;
}){
 const mimeType=mp4Type();if(!mimeType)throw Error('MP4 unsupported');
 const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;
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
/** Same canvases as the live view, reframed around the orbit; no DOM or user controls. */
export function paintVideo(ctx:CanvasRenderingContext2D,orbit:HTMLCanvasElement,background:HTMLCanvasElement,showBackground:boolean){
 const style=getComputedStyle(document.documentElement);
 ctx.fillStyle=style.getPropertyValue('--surface').trim()||'#080e16';ctx.fillRect(0,0,1280,720);
 if(showBackground){
  const o=orbit.getBoundingClientRect(),b=background.getBoundingClientRect();
  if(o.width&&b.width&&b.height){
   const scale=680/o.width;
   ctx.save();ctx.globalAlpha=Number(getComputedStyle(background).opacity);
   ctx.drawImage(background,640+(b.left-o.left-o.width/2)*scale,360+(b.top-o.top-o.height/2)*scale,b.width*scale,b.height*scale);
   ctx.restore();
  }
 }
 ctx.drawImage(orbit,300,20,680,680);
}
