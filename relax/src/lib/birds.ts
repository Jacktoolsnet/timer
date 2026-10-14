export interface BirdCall {time:number; duration:number}
/** Soft synthesized call groups, with long quiet gaps; no external recordings. */
export function birdSong(sampleRate:number,seconds:number,random=Math.random,activity=4,onCall?:(call:BirdCall)=>void){
 const data=new Float32Array(Math.floor(sampleRate*seconds));
 const density=Math.max(1,Math.min(10,activity));
 let time=.6+random();
 while(time<seconds-2){
  const count=2+Math.floor(random()*4),base=1700+random()*1500;
  const duration=count*.22;onCall?.({time,duration});
  for(let call=0;call<count;call++){
   const start=time+call*.22,length=.09+random()*.07,up=random()>.4;
   let phase=0;
   for(let i=0;i<length*sampleRate;i++){
    const p=i/(length*sampleRate),freq=base+(up?650:-450)*Math.sin(p*Math.PI*.75)+70*Math.sin(p*18);
    phase+=2*Math.PI*freq/sampleRate;
    const at=Math.floor(start*sampleRate)+i;
    if(at<data.length)data[at]!+=Math.sin(Math.PI*p)**2*(Math.sin(phase)+.12*Math.sin(phase*2))*.34;
   }
  }
  time+=duration+(11-density)*(.8+random()*.65);
 }
 return data;
}
