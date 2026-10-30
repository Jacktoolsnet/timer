import {defaultMusic,presetInstrument,type Music,type Note,type Instrument} from './music.ts';
import {defaultSound2D,type Sound2D} from './sound2d.ts';

/** Names also bind the storyboard's SFX tasks to audible native score instruments. */
export const LIGHT_COLLECTOR_SFX={
 steps:'Weiche Roboter-Schritte',air:'Luftiger Sprung und Sternenstaub',
 sparkle:'Helles Sternenfunkeln',wings:'Zarter Schmetterlingsflug',bloom:'Sanfte Blütenlandung'
} as const;
/** Original, deterministic sound design: no downloads, paid API or embedded recordings. */
function soundInstruments(){
 const pad={...presetInstrument('pad'),name:'Musik · Warme Gartenflächen',volume:.45,attack:.45,release:1.1,reverb:.18};
 const harp={...presetInstrument('harp'),name:'Musik · Die Melodie des Lichtsammlers',volume:.65,release:.65,reverb:.22,echo:{delay:.3,feedback:.22,mix:.12}};
 const bass={...presetInstrument('bass'),name:'Musik · Sanfter Grundton',volume:.3,attack:.12,release:.6};
 const sparkle={...presetInstrument('bell','sfx-sparkle'),name:LIGHT_COLLECTOR_SFX.sparkle,volume:.72,release:1.1,reverb:.26,echo:{delay:.19,feedback:.22,mix:.15}};
 const steps={...presetInstrument('bass','sfx-steps'),name:LIGHT_COLLECTOR_SFX.steps,volume:.75,attack:.003,decay:.065,sustain:.03,release:.09,cutoff:600};
 const air={...presetInstrument('pad','sfx-air'),name:LIGHT_COLLECTOR_SFX.air,wave:'noise' as const,volume:.45,attack:.09,decay:.18,sustain:.12,release:.35,filter:'bandpass' as const,cutoff:1400,resonance:.8,reverb:.12};
 const wings={...air,id:'sfx-wings',name:LIGHT_COLLECTOR_SFX.wings,volume:.17,attack:.018,decay:.035,sustain:.02,release:.045,filter:'highpass' as const,cutoff:3600,reverb:0};
 const bloom={...presetInstrument('kalimba','sfx-bloom'),name:LIGHT_COLLECTOR_SFX.bloom,volume:.65,cutoff:3800,release:.55,reverb:.18};
 return {pad,harp,bass,sparkle,steps,air,wings,bloom};
}
export function lightCollectorSounds2D():Record<string,Sound2D[]>{
 const {sparkle,steps,air,wings,bloom}=soundInstruments();
 const cue=(id:string,instrument:Instrument,action:Sound2D['action'],phase:number,notes:Sound2D['notes'],extra:Partial<Sound2D>={}):Sound2D=>({...defaultSound2D(id),name:instrument.name,instrument:structuredClone(instrument),action,phase,notes,...extra});
 const note=(pitch:number,duration:number,velocity:number,at=0)=>({at,pitch,duration,velocity});
 return {
  collector:[cue('steps',steps,'walk',0,[note(43,.075,.6)],{trigger:'steps',stride:35}),cue('crouch',steps,'jump',.35/3,[note(43,.12,.38)]),cue('takeoff',air,'jump',.7/3,[note(60,.32,.65)]),cue('landing',steps,'jump',2/3,[note(36,.16,.8)])],
  spark:[cue('glimmer',sparkle,'float',0,[note(84,.12,.22)],{trigger:'repeat',interval:1.1}),cue('burst-air',air,'fade',0,[note(60,.24,.82)]),cue('burst-light',sparkle,'fade',0,[84,88,91,96,93,88].map((pitch,i)=>note(pitch,.13,i===0?.95:.65,i*.095)))],
  butterfly:[cue('wings',wings,'play',0,[note(72,.055,.42)],{clip:'fly',trigger:'repeat',interval:.46})],
  flower:[cue('landing',bloom,'play',0,[note(76,.15,.8),note(72,.1,.32,.22)],{clip:'landing'})]
 };
}
export function lightCollectorMusic():Music{
 const {pad,harp,bass,sparkle,air}=soundInstruments(),notes:Note[]=[];
 const add=(instrument:string,at:number,pitch:number,duration:number,velocity:number)=>notes.push({instrument,at,duration,pitch,velocity});
 // C(add9) – Am7 – Fmaj7 – G(sus) – C: an unhurried little story, not a looping stock cue.
 for(const [at,chord,duration] of [[.15,[48,55,64],3],[4.1,[45,55,60],2.6],[8.05,[41,57,64],3.2],[12.4,[43,55,62],3],[17,[48,55,64],2],[19.3,[48,55,62],1.35]] as const){
  for(const pitch of chord)add('pad',at,pitch,duration,.42);
  add('bass',at,chord[0]-12,duration*.8,.5);
 }
 for(const [at,pitch] of [[.6,72],[1.35,76],[2.1,79],[3,76],[4.3,74],[5.15,76],[6,79],[8.3,81],[9.1,79],[10,76],[10.9,74],[11.7,72],[12.65,74],[13.4,79],[14.2,76],[15.1,74],[16,71],[17.2,72],[18.15,76],[19.3,79],[20.1,76],[20.75,72]])add('harp',at,pitch,.36,.55);
 add(air.id,17,60,.85,.36);add(sparkle.id,17.35,84,.2,.42);
 for(const [i,pitch]of [79,84,88].entries())add(sparkle.id,19.3+i*.16,pitch,.18,.48);
 return {...defaultMusic(),mode:'score',tempo:80,seed:2407,volume:.7,fadeIn:.5,fadeOut:1.25,instruments:[pad,harp,bass,sparkle,air],notes:notes.sort((a,b)=>a.at-b.at)};
}
