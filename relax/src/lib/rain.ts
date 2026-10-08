/** Non-resonant textures: fine splash, leaf tap, soft soil and scattered splash. */
const dropProfiles = [
 {duration:.055,cutoff:2300,attack:.0025,decay:.16,strength:.24,scatter:false},
 {duration:.085,cutoff:1400,attack:.004,decay:.22,strength:.29,scatter:false},
 {duration:.12,cutoff:650,attack:.007,decay:.24,strength:.32,scatter:false},
 {duration:.10,cutoff:1800,attack:.0035,decay:.17,strength:.25,scatter:true},
] as const;
export function randomDrop(random=Math.random){
 const index=Math.max(0,Math.min(3,Math.floor(random()*dropProfiles.length)));
 const profile=dropProfiles[index]!;
 return {...profile,index,duration:profile.duration*(.8+random()*.4),
  cutoff:profile.cutoff*(.8+random()*.4),strength:profile.strength*(.8+random()*.4)};
}
/** Soft rain on leaves: a subdued bed and sparse, rounded little impacts. */
export function summerRain(sampleRate:number,seconds=30,random=Math.random,density=5):Float32Array {
 const data=new Float32Array(Math.round(sampleRate*seconds));
 let soft=0;
 for(let i=0;i<data.length;i++){
  soft=.94*soft+.06*(random()*2-1);
  // Quiet, slowly breathing background rather than a wall of white noise.
  data[i]=soft*.07*(.8+.2*Math.sin(2*Math.PI*i/data.length));
 }
 let time=.1+random()*.25;
 while(time<seconds){
  const start=Math.floor(time*sampleRate);
  const drop=randomDrop(random),duration=drop.duration;
  // Damped broadband splashes instead of pitched, ringing impacts.
  const smoothing=1-Math.exp(-2*Math.PI*drop.cutoff/sampleRate);
  const strength=drop.strength;
  const scatterDelay=.012+random()*.015;
  let texture=0;
  for(let j=0;j<Math.floor(duration*sampleRate);j++){
   const t=j/sampleRate;
   // A rounded attack and quick soft decay; no sharp click or long whistle.
   let envelope=(1-Math.exp(-t/drop.attack))*Math.exp(-t/(duration*drop.decay));
   // Some impacts split into a couple of softer little splashes.
   if(drop.scatter && t>scatterDelay){
    const after=t-scatterDelay;
    envelope+=.35*(1-Math.exp(-after/.003))*Math.exp(-after/.008);
   }
   texture+=smoothing*((random()*2-1)-texture);
   const tap=texture*1.3;
   data[(start+j)%data.length]+=tap*envelope*strength;
  }
  // More little drops, still separated by irregular, quiet gaps.
  time+=(.10+random()*.30)*5/Math.max(1,Math.min(10,density));
 }
 return data;
}
