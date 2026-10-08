/** Aperiodic gusts with actual lulls, not a repeating volume oscillator. */
export function randomWindGust(activity:number,random=Math.random){
 const amount=(Math.max(1,Math.min(10,activity))-1)/9;
 return {
  duration:5+random()*9,
  pause:(.8+random()*5)*(1+(1-amount)*2),
  strength:(.35+amount*.55)*(.65+random()*.35),
  flutter:.04+random()*.10,
 };
}
export function naturalWind(sampleRate:number,seconds=60,random=Math.random,activity=5):Float32Array {
 const data=new Float32Array(Math.round(sampleRate*seconds));
 let time=0,soft=0;
 while(time<seconds){
  const gust=randomWindGust(activity,random),start=Math.floor(time*sampleRate);
  const count=Math.round(gust.duration*sampleRate);
  const flutterRate=.4+random()*.7,phase=random()*Math.PI*2;
  for(let j=0;j<count && start+j<data.length;j++){
   const position=j/count,t=j/sampleRate;
   // Rounded rise and fall, with smaller irregular swells inside each gust.
   const envelope=Math.sin(Math.PI*position)**2;
   const swell=1-gust.flutter+gust.flutter*Math.sin(t*flutterRate*Math.PI*2+phase);
   const cutoff=220+envelope*650+swell*120;
   const smoothing=1-Math.exp(-2*Math.PI*cutoff/sampleRate);
   soft+=smoothing*((random()*2-1)-soft);
   data[start+j]=soft*envelope*swell*gust.strength*1.4;
  }
  time+=gust.duration+gust.pause;
 }
 // Ensure that the long buffer loops without a clipped final gust.
 const fade=Math.min(data.length,Math.round(sampleRate*1.5));
 for(let i=0;i<fade;i++)data[data.length-fade+i]*=(1-i/fade)**2;
 return data;
}
