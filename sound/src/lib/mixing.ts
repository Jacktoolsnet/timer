import {developmentGain,type DevelopmentPlan,type DevelopmentTrack} from './development';
import {dialogueInstrument} from './expression';
const available=(track:DevelopmentTrack)=>track.enabled&&!track.mute&&track.volume>0&&track.points.some(Boolean);
/** Performance faders only attenuate: manual track volumes remain ceilings. */
export function mixLevels(tracks:readonly DevelopmentTrack[],plan:DevelopmentPlan|null,step:number,chorus:number,drawnUntil:readonly number[]):number[]{
 const focus=tracks.map((track,i)=>available(track)?Math.max(0,Math.min(1,((drawnUntil[i]||0)-step)/16)):0);
 const attention=Math.max(0,...focus);
 return tracks.map((track,i)=>{
  if(!available(track))return 0;
  const id=track.instrument,foundation=['kick','bass','synthbass','doublebass','acidbass','bowedbass'].includes(id);
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

/** Preserve relative performance levels without making the whole Random Play mix quieter.
 * Weights follow user volumes and note density, not the number of enabled rows alone.
 * This is feed-forward mix balancing, not AGC: silence and the user's master volume are untouched.
 */
export function balancedMix(tracks:readonly (DevelopmentTrack&{slots?:number})[],levels:readonly number[]):number[]{
 let reference=0,performed=0;
 tracks.forEach((track,i)=>{
  if(!available(track))return;
  const slots=track.slots??16,density=track.points.slice(0,slots).filter(Boolean).length/slots;
  const weight=track.volume**2*density;
  reference+=weight;performed+=weight*(levels[i]??0)**2;
 });
 if(reference===0||performed<1e-12)return levels.map(()=>0);
 const trim=Math.sqrt(reference/performed);
 return tracks.map((track,i)=>available(track)?Math.max(0,levels[i]??0)*trim:0);
}
/** Random automatic touches vary around unity, rather than having a built-in downward bias. */
export function performanceVelocity(previous:number,random=Math.random){
 const target=.85+random()*.3;
 return previous+Math.max(-.06,Math.min(.06,target-previous));
}
