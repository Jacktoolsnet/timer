import type {Project,Scene} from './model.ts';
import type {AudioAsset,Narration} from './audio.ts';
export type SpeechJob={scope:'project'|'scene';sceneId:string|null;name:string;text:string;instructions:string;speaker:string;stem:string;audioName:string;textName:string};
/** Content-sensitive identity. Rename/reorder/timing changes do not invalidate a recording. */
export async function speechJobs(p:Project):Promise<SpeechJob[]>{
 const items:{scope:'project'|'scene';sceneId:string|null;name:string;n:Narration}[]=[];
 if(p.narration?.text.trim())items.push({scope:'project',sceneId:null,name:p.title,n:p.narration});
 for(const s of p.scenes)if(s.narration?.text.trim())items.push({scope:'scene',sceneId:s.id,name:s.name,n:s.narration});
 return Promise.all(items.map(async({scope,sceneId,name,n})=>{
  const bytes=new TextEncoder().encode(JSON.stringify(['SceneScript-speech-v1',scope,sceneId,n.text,n.instructions,n.speaker]));
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,20);
  const stem='scenescript-'+(scope==='project'?'project':'scene-'+sceneId)+'-'+hash;
  return {scope,sceneId,name,text:n.text,instructions:n.instructions,speaker:n.speaker,stem,audioName:stem+'.mp3',textName:stem+'.txt'};
 }));
}
export function speechFileStem(name:string){
 if(!/\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(name))throw new Error('Speech: unsupported audio filename: '+name);
 return name.replace(/\.[^.]+$/,'').toLowerCase();
}
export function matchSpeechFiles(jobs:SpeechJob[],names:string[]){
 const known=new Map(jobs.map(j=>[j.stem.toLowerCase(),j])),seen=new Set<string>();
 return names.map(name=>{const stem=speechFileStem(name),job=known.get(stem);if(!job)throw new Error('Speech: unmatched or outdated filename: '+name);if(seen.has(stem))throw new Error('Speech: multiple files for the same assignment: '+name);seen.add(stem);return job;});
}
export type SpeechLabels={target:string;scope:string;project:string;scene:string;speaker:string;instructions:string;script:string;hint:string};
export function speechJobText(job:SpeechJob,labels:SpeechLabels){
 return ['SceneScript — Speech job',`${labels.target}: ${job.audioName}`,`${labels.scope}: ${job.scope==='project'?labels.project:labels.scene} — ${job.name}${job.sceneId?' ['+job.sceneId+']':''}`,labels.hint,'',`${labels.speaker}: ${job.speaker||'—'}`,`${labels.instructions}:`,job.instructions||'—','',`=== ${labels.script} ===`,job.text].join('\n');
}
export function narrationDuration(n:Narration|null,p:Pick<Project,'audios'>){if(!n?.asset)return 0;const a=p.audios[n.asset];if(!a)return 0;return Math.max(0,(n.end??a.duration)-n.start);}
export function sceneSpeechMinimum(s:Scene,p:Pick<Project,'audios'>){return s.narration?.asset?s.narration.at+narrationDuration(s.narration,p):0;}
/** Extend only. Do not stretch camera stations, explicit element ends or motion paths. */
export function fitSpeechDurations(p:Project){
 const durations=p.scenes.map(s=>Math.max(s.duration,sceneSpeechMinimum(s,p)));
 if(p.narration?.asset){const needed=p.narration.at+narrationDuration(p.narration,p),total=durations.reduce((n,d)=>n+d,0);durations[durations.length-1]+=Math.max(0,needed-total);}
 for(const d of durations)if(d>3600)throw new Error('Speech: scene duration would exceed 3600 seconds');
 const extended:string[]=[];p.scenes.forEach((s,i)=>{if(durations[i]>s.duration){s.duration=durations[i];extended.push(s.id);}});return extended;
}
/** Pure transactional plan; caller commits only after real audio decoding + project validation. */
export function attachSpeechFiles(p:Project,jobs:SpeechJob[],files:{name:string;asset:AudioAsset}[]){
 const matched=matchSpeechFiles(jobs,files.map(f=>f.name)),next=structuredClone(p);
 for(const [i,job] of matched.entries()){
  const n=job.scope==='project'?next.narration:next.scenes.find(s=>s.id===job.sceneId)?.narration;
  if(!n||n.text!==job.text||n.instructions!==job.instructions||n.speaker!==job.speaker)throw new Error('Speech: assignment changed; export again');
  const usage=[next.narration,...next.scenes.map(s=>s.narration)].filter(x=>x?.asset&&x.asset===n.asset).length;
  let id=n.asset&&next.audios[n.asset]&&usage===1?n.asset:'speech-'+job.stem.slice(-20);
  if(id!==n.asset){const base=id;let suffix=1;while(Object.hasOwn(next.audios,id))id=base+'-'+suffix++;}
  next.audios[id]=files[i].asset;n.asset=id;n.start=0;n.end=null;
 }
 if(Object.keys(next.audios).length>30)throw new Error('Speech: maximum 30 audio assets');
 const extended=fitSpeechDurations(next);return {project:next,extended,matched};
}
