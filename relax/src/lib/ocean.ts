export type SurfWave={time:number;strength:number;duration:number;crest:number};
/** Broad, irregular surf surges with a soft wash back, without isolated drops. */
export function oceanSurf(sampleRate:number,seconds=30,random=Math.random,activity=5,onWave?:(wave:SurfWave)=>void):Float32Array{
 const data=new Float32Array(Math.round(sampleRate*seconds));
 const amount=(Math.max(1,Math.min(10,activity))-1)/9;
 let time=.12,texture=0;
 while(time<seconds){
  const duration=5.5+random()*3.5-amount;
  const strength=(.19+amount*.13)*(.8+random()*.2);
  const start=Math.floor(time*sampleRate),count=Math.floor(duration*sampleRate);
  const crest=.32+random()*.10;
  onWave?.({time:start/sampleRate,strength,duration,crest});
  for(let j=0;j<count&&start+j<data.length;j++){
   const p=j/count;
   // A slow arrival followed by a longer, softer retreat.
   const phase=p<crest?p/crest:(1-p)/(1-crest);
   const envelope=Math.sin(Math.PI*.5*phase)**2;
   const smoothing=1-Math.exp(-2*Math.PI*(800+envelope*2000)/sampleRate);
   texture+=smoothing*((random()*2-1)-texture);
   const ripple=.94+.06*Math.sin(j/sampleRate*2.3);
   data[start+j]+=texture*strength*envelope*ripple;
  }
  // The next swell arrives during the soft retreat of the previous one.
  time+=duration*(.62+random()*.12-amount*.06);
 }
 const edge=Math.min(data.length,Math.round(sampleRate*1.5));
 for(let i=0;i<edge;i++)data[data.length-edge+i]*=((edge-i)/edge)**2;
 data[data.length-1]=0;
 return data;
}
