import {narrationGain,type AudioTimeline} from './audio.ts';
import type {Actor3D,Shot3D} from './stage3d.ts';
import {speechEnvelopeAt,type SpeechEnvelope} from './speech-envelope.ts';
export type SpeechEnvelopes=ReadonlyMap<string,SpeechEnvelope>;
export const emptySpeechEnvelopes:SpeechEnvelopes=new Map();
type SpeechProject=Omit<AudioTimeline,'scenes'>&{scenes:(AudioTimeline['scenes'][number]&{stage3d:Shot3D|null})[]};
/** Resolves the existing audible narration, never creates or plays a duplicate audio clip. */
export function speech3DClip(project:SpeechProject,shot:Shot3D,actor:Actor3D){
 if(!actor.speech)return null;
 const index=project.scenes.findIndex(s=>s.stage3d===shot);if(index<0)return null;
 const scene=project.scenes[index],isProject=actor.speech.source==='project',settings=isProject?project.narration:scene.narration;
 if(!settings?.asset||settings.muted||!settings.volume||!project.audios[settings.asset])return null;
 const origin=isProject?project.scenes.slice(0,index).reduce((sum,s)=>sum+s.duration,0):0;
 const scope=isProject?project.scenes.reduce((sum,s)=>sum+s.duration,0):scene.duration;
 const duration=Math.min((settings.end??project.audios[settings.asset].duration)-settings.start,scope-settings.at);
 return duration>0?{settings,origin,duration,sceneDuration:scene.duration}:null;
}
export function actor3DMouth(project:SpeechProject,shot:Shot3D,actor:Actor3D,time:number,envelopes:SpeechEnvelopes):number{
 const clip=speech3DClip(project,shot,actor);if(!clip||time<0||time>=clip.sceneDuration)return 0;
 const elapsed=clip.origin+time-clip.settings.at;
 const gain=narrationGain(clip.settings,elapsed,clip.duration);if(!gain)return 0;
 const envelope=envelopes.get(clip.settings.asset);if(!envelope)return 0;
 return Math.min(1,speechEnvelopeAt(envelope,clip.settings.start+elapsed)*gain*actor.speech!.strength);
}
