import type {Project} from '../lib/model';
import type {Shot3D} from '../lib/stage3d';
import {speech3DClip,type SpeechEnvelopes} from '../lib/stage3d-speech';
import {speechEnvelope} from './audio';
/** Decode only referenced speech assets, sequentially. Preview/export share the same envelope. */
export async function prepareStage3DSpeech(project:Project,shot:Shot3D,check:()=>void=()=>{}):Promise<SpeechEnvelopes>{
 const ids=new Set(shot.actors.map(a=>speech3DClip(project,shot,a)?.settings.asset).filter((id):id is string=>Boolean(id)));
 const result=new Map();for(const id of ids){check();const envelope=await speechEnvelope(project.audios[id]);check();result.set(id,envelope);}return result;
}
