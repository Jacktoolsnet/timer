/** Minimal PCM view, also usable without browser AudioBuffer objects in tests. */
export type PcmBuffer={sampleRate:number;duration:number;numberOfChannels:number;getChannelData:(channel:number)=>Float32Array};

// Packet timestamps expressed in seconds can land a few ULPs above an exact
// sample boundary. Plain ceil then skips a sample and inserts an audible click.
function sampleCeil(value:number){const nearest=Math.round(value);return Math.abs(value-nearest)<1e-5?nearest:Math.ceil(value);}

/** Add PCM to a stereo planar output block without dropping packet-edge samples. */
export function mixAudioBuffer(data:Float32Array,rate:number,start:number,buffer:PcmBuffer,at:number,gain:(time:number)=>number,from=start,to=start+data.length/2/rate){
 const n=data.length/2,a=Math.max(0,sampleCeil((Math.max(start,at,from)-start)*rate)),b=Math.min(n,sampleCeil((Math.min(to,at+buffer.duration)-start)*rate));
 for(let c=0;c<2;c++){
  const src=buffer.getChannelData(Math.min(c,buffer.numberOfChannels-1));
  for(let j=a;j<b;j++){
   const t=start+j/rate,pos=(t-at)*buffer.sampleRate,k=Math.floor(pos),f=pos-k;
   data[c*n+j]+=((src[k]||0)*(1-f)+(src[k+1]||0)*f)*gain(t);
  }
 }
}
