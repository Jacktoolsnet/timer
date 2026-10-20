/** Offline asset authoring only: original procedural effects, embedded as PCM WAV in the project. */
export function raceEffectsWav(duration=61.5,rate=12000):Uint8Array{
 const count=Math.round(duration*rate),bytes=new Uint8Array(44+count*2),view=new DataView(bytes.buffer),word=(at:number,s:string)=>[...s].forEach((c,i)=>bytes[at+i]=c.charCodeAt(0));
 word(0,'RIFF');view.setUint32(4,bytes.length-8,true);word(8,'WAVE');word(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);word(36,'data');view.setUint32(40,count*2,true);
 let phaseA=0,phaseB=0,noise=73,filtered=0;
 for(let i=0;i<count;i++){
  const t=i/rate,race=t-7,active=race>=0&&race<48.5,lap=((race%12)+12)%12;
  noise=(Math.imul(noise,1664525)+1013904223)>>>0;const random=noise/4294967296*2-1;filtered+=.08*(random-filtered);
  phaseA+=2*Math.PI*(54+22*Math.sin(race*.8)+20*(lap/12))/rate;phaseB+=2*Math.PI*(61+16*Math.sin(race*.9+.5))/rate;
  let sample=active?(.12*Math.sin(phaseA)+.055*Math.sin(phaseA*3)+.1*Math.sin(phaseB)+.035*filtered)*Math.min(1,race/.4,(48.5-race)/.4):0;
  // A little broadband rush over the scripted jump, not a claim of real engine recordings.
  if(active&&lap>3&&lap<5)sample+=random*.045*Math.sin((lap-3)/2*Math.PI);
  for(const at of [4,5,6,7]){const elapsed=t-at;if(elapsed>=0&&elapsed<.16)sample+=.2*Math.sin(t*2*Math.PI*(at===7?1046:698))*Math.sin(elapsed/.16*Math.PI);}
  if(t>=54.8&&t<59.5){const env=Math.min(1,(t-54.8)/.2,(59.5-t)/1.5),clap=Math.max(0,Math.sin(t*32)+Math.sin(t*47+.4)-.65);sample+=env*(filtered*.12+random*clap*.08);}
  const fade=Math.min(1,t/.03,(duration-t)/.4);view.setInt16(44+i*2,Math.round(Math.max(-.9,Math.min(.9,sample*fade))*32767),true);
 }return bytes;
}
