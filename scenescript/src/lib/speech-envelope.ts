/** Small deterministic 50 Hz envelope; PCM is not retained after analysis. */
export type SpeechEnvelope={levels:Float32Array;rate:number;duration:number};
type PCM={length:number;sampleRate:number;numberOfChannels:number;getChannelData:(channel:number)=>Float32Array};
export function analyseSpeechEnvelope(buffer:PCM):SpeechEnvelope{
 const rate=50,channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i)),duration=buffer.length/buffer.sampleRate;
 const levels=new Float32Array(Math.ceil(duration*rate));let smoothed=0;
 for(let bin=0;bin<levels.length;bin++){
  const start=Math.floor(bin*buffer.sampleRate/rate),end=Math.min(buffer.length,Math.floor((bin+1)*buffer.sampleRate/rate));let energy=0;
  for(const samples of channels)for(let i=start;i<end;i++)energy+=samples[i]*samples[i];
  const rms=Math.sqrt(energy/Math.max(1,(end-start)*channels.length));
  // Gate quiet background noise and compress the remaining speech dynamics.
  const target=Math.sqrt(Math.max(0,Math.min(1,(rms-.008)/.15)));
  smoothed+=(target-smoothed)*(target>smoothed?.75:.35);levels[bin]=smoothed<.015?0:smoothed;
 }
 return {levels,rate,duration};
}
export function speechEnvelopeAt(envelope:SpeechEnvelope,time:number):number{
 if(!Number.isFinite(time)||time<0||time>=envelope.duration||!envelope.levels.length)return 0;
 const position=Math.max(0,time*envelope.rate-.5),i=Math.floor(position),fraction=position-i;
 return (envelope.levels[Math.min(i,envelope.levels.length-1)]??0)*(1-fraction)+(envelope.levels[Math.min(i+1,envelope.levels.length-1)]??0)*fraction;
}
