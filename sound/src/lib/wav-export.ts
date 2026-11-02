import {recordingSeconds} from './recording-duration';
/** Original PCM/WAVE writer. No encoder dependency; stereo signed 16-bit little-endian. */
export function wavHeader(sampleRate:number,frames:number){
 const bytes=frames*4;
 if(!Number.isInteger(sampleRate)||sampleRate<1||sampleRate>384000||!Number.isInteger(frames)||frames<0||bytes>0xffffffff-36)throw Error('Invalid WAVE dimensions');
 const buffer=new ArrayBuffer(44),view=new DataView(buffer);
 const text=(at:number,value:string)=>{for(let i=0;i<value.length;i++)view.setUint8(at+i,value.charCodeAt(i));};
 text(0,'RIFF');view.setUint32(4,36+bytes,true);text(8,'WAVE');text(12,'fmt ');
 view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);
 view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*4,true);
 view.setUint16(32,4,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,bytes,true);
 return buffer;
}
// Loaded into the browser's audio thread, not evaluated on the UI thread.
export const WAV_PROCESSOR=`
class WavCapture extends AudioWorkletProcessor {
 constructor(options){
  super();
  this.maxFrames=options.processorOptions.maxFrames;
  this.frames=0;this.used=0;this.done=false;this.buffer=new ArrayBuffer(4096*4);this.view=new DataView(this.buffer);
  this.port.onmessage=event=>{if(event.data==='stop')this.finish(false);};
 }
 flush(){
  if(!this.used)return;
  const data=this.used===4096?this.buffer:this.buffer.slice(0,this.used*4);
  this.port.postMessage({type:'chunk',data},[data]);
  this.used=0;this.buffer=new ArrayBuffer(4096*4);this.view=new DataView(this.buffer);
 }
 finish(limited){
  if(this.done)return;this.done=true;this.flush();
  this.port.postMessage({type:'done',limited});
 }
 process(inputs,outputs){
  if(this.done)return false;
  const input=inputs[0],left=input[0],right=input[1]||left;
  const length=left?left.length:(outputs[0][0]?.length||128);
  for(let i=0;i<length;i++){
   if(this.frames>=this.maxFrames){this.finish(true);return false;}
   const l=Math.max(-1,Math.min(1,left?.[i]||0)),r=Math.max(-1,Math.min(1,right?.[i]||0));
   this.view.setInt16(this.used*4,Math.round(l*(l<0?32768:32767)),true);
   this.view.setInt16(this.used*4+2,Math.round(r*(r<0?32768:32767)),true);
   this.used++;this.frames++;
   if(this.used===4096)this.flush();
  }
  return true;
 }
}
registerProcessor('jacktools-wav-capture',WavCapture);
`;
const modules=new WeakMap<AudioContext,Promise<void>>();
export function wavSupported(){
 return typeof AudioContext!=='undefined'&&typeof AudioWorkletNode!=='undefined'&&'audioWorklet' in AudioContext.prototype&&globalThis.isSecureContext;
}
function loadModule(audio:AudioContext){
 let loaded=modules.get(audio);
 if(!loaded){
  const url=URL.createObjectURL(new Blob([WAV_PROCESSOR],{type:'application/javascript'}));
  loaded=audio.audioWorklet.addModule(url).finally(()=>URL.revokeObjectURL(url));
  modules.set(audio,loaded);
  loaded.catch(()=>modules.delete(audio));
 }
 return loaded;
}
export async function createWavRecording(options:{
 audio:AudioContext;output:AudioNode;durationSeconds?:number;signal?:AbortSignal;
 ready:(blob:Blob,limited:boolean)=>void;error:()=>void;
}){
 if(!wavSupported())throw Error('AudioWorklet unavailable');
 const checkAbort=()=>{if(options.signal?.aborted)throw Error('Recording cancelled');};
 checkAbort();await loadModule(options.audio);checkAbort();
 const node=new AudioWorkletNode(options.audio,'jacktools-wav-capture',{
  numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit',
  processorOptions:{maxFrames:Math.min(Math.floor(options.audio.sampleRate*recordingSeconds(options.durationSeconds)),Math.floor(256*1024*1024/4))}
 });
 const silent=options.audio.createGain();silent.gain.value=0;
 const chunks:ArrayBuffer[]=[];let bytes=0,connected=false,closed=false,stopping=false;
 let fallback:ReturnType<typeof setTimeout>|undefined;
 const cleanup=()=>{
  if(closed)return;closed=true;
  if(fallback)clearTimeout(fallback);
  node.port.postMessage('stop');node.port.onmessage=null;node.port.close();node.onprocessorerror=null;
  if(connected)options.output.disconnect(node);
  node.disconnect();silent.disconnect();
 };
 const finish=(limited=false)=>{
  if(closed)return;cleanup();
  if(!bytes){options.error();return;}
  const blob=new Blob([wavHeader(options.audio.sampleRate,bytes/4),...chunks],{type:'audio/wav'});
  chunks.length=0;options.ready(blob,limited);
 };
 const fail=()=>{if(closed)return;cleanup();chunks.length=0;options.error();};
 node.port.onmessage=event=>{
  if(closed)return;
  if(event.data.type==='chunk'){const data=event.data.data as ArrayBuffer;chunks.push(data);bytes+=data.byteLength;}
  if(event.data.type==='done')finish(event.data.limited);
 };
 node.onprocessorerror=fail;
 try{
  node.connect(silent);silent.connect(options.audio.destination);
  options.output.connect(node);connected=true;
 }catch(error){cleanup();throw error;}
 return {
  stop(){
   if(closed||stopping)return;stopping=true;node.port.postMessage('stop');
   // A suspended device may stop the audio thread before acknowledging the final partial block.
   // Preserve all received PCM instead of leaving the UI permanently stuck at "preparing".
   fallback=setTimeout(()=>finish(),3000);
  },
  get state(){return closed?'inactive':stopping?'stopping':'recording';}
 };
}
