import {developmentGain,type DevelopmentPlan,type DevelopmentTrack} from './development';
import {dialogueInstrument} from './expression';
const available=(track:DevelopmentTrack)=>track.enabled&&!track.mute&&track.volume>0&&track.points.some(Boolean);
/** Performance faders only attenuate: manual track volumes remain ceilings. */
export function mixLevels(tracks:readonly DevelopmentTrack[],plan:DevelopmentPlan|null,step:number,chorus:number,drawnUntil:readonly number[]):number[]{
 const focus=tracks.map((track,i)=>available(track)?Math.max(0,Math.min(1,((drawnUntil[i]||0)-step)/16)):0);
 const attention=Math.max(0,...focus);
 return tracks.map((track,i)=>{
  if(!available(track))return 0;
  const id=track.instrument,foundation=['kick','bass','synthbass','doublebass'].includes(id);
  const wave=(1+Math.sin(step/16*Math.PI/16+i*1.7))/2;
  let gain=(dialogueInstrument(id)||id==='strings')&&plan?developmentGain(plan,i,step,chorus)
   :id==='kick'?.8+.14*wave
   :foundation?.58+.27*wave
   :['pad','organ','strings','choir','vocalpad'].includes(id)?.28+.14*wave
   :.48+.2*wave;
  // Drawing briefly brings the touched part forward, while making space around it.
  if(attention>0){
   gain*=1-(foundation?.15:.4)*attention*(1-focus[i]);
   gain+=(1-gain)*focus[i];
  }
  return Math.max(0,Math.min(1,gain));
 });
}
