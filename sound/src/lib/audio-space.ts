/** Shared, bounded effect returns before the master gain: stop/mute cannot bypass it. */
export function createAudioSpace(ctx:AudioContext,master:GainNode){
 const hall=ctx.createConvolver(),hallReturn=ctx.createGain();
 const length=Math.ceil(ctx.sampleRate*2),impulse=ctx.createBuffer(2,length,ctx.sampleRate);
 for(let channel=0;channel<2;channel++){
  const data=impulse.getChannelData(channel);
  // Fixed procedural room, generated once; no sample downloads or changing noise source.
  let state=12345+channel*6789;
  for(let i=0;i<length;i++){
   state=(Math.imul(state,1664525)+1013904223)|0;
   data[i]=(state/2147483648)*Math.pow(1-i/length,3)*.35;
  }
 }
 hall.buffer=impulse;hallReturn.gain.value=.7;hall.connect(hallReturn);hallReturn.connect(master);
 const delay=ctx.createDelay(2),feedback=ctx.createGain(),filter=ctx.createBiquadFilter(),echoReturn=ctx.createGain();
 feedback.gain.value=.22;filter.type='lowpass';filter.frequency.value=2400;echoReturn.gain.value=.65;
 delay.connect(filter);filter.connect(feedback);feedback.connect(delay);filter.connect(echoReturn);echoReturn.connect(master);
 return {hall,delay,dispose(){hall.disconnect();hallReturn.disconnect();delay.disconnect();filter.disconnect();feedback.disconnect();echoReturn.disconnect();}};
}
