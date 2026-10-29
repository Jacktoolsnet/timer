/** Reviewed against official OpenAI model pages, 2026-10-26. IDs alone do not report capabilities. */
export type ReasoningEffort='none'|'minimal'|'low'|'medium'|'high'|'xhigh'|'max';
export type ModelTask='text'|'image'|'speech';
export type ModelEntry={id:string;name:string};
export type ModelProfile=ModelEntry&{task:ModelTask;efforts:readonly ReasoningEffort[]};
const sol:ReasoningEffort[]=['low','medium','high','xhigh','max'],legacy:ReasoningEffort[]=['minimal','low','medium','high'];
export const modelProfiles:readonly ModelProfile[]=[
 {id:'gpt-6.1-sol',name:'GPT-6.1 Sol',task:'text',efforts:sol},
 {id:'gpt-6-astra',name:'GPT-6 Astra',task:'text',efforts:sol},
 {id:'gpt-6-luna',name:'GPT-6 Luna',task:'text',efforts:['none',...sol]},
 {id:'gpt-5.4',name:'GPT-5.4',task:'text',efforts:['none','low','medium','high','xhigh']},
 {id:'gpt-5-mini',name:'GPT-5 Mini',task:'text',efforts:legacy},
 {id:'gpt-5',name:'GPT-5',task:'text',efforts:legacy},
 {id:'gpt-image-2',name:'GPT Image 2',task:'image',efforts:[]},
 {id:'gpt-image-1.5',name:'GPT Image 1.5',task:'image',efforts:[]},
 {id:'eleven_multilingual_v2',name:'Eleven Multilingual v2',task:'speech',efforts:[]},
];
export function modelProfile(id:string){return modelProfiles.find(p=>p.id===id||id.startsWith(p.id+'-')&&/^\d{4}-\d{2}-\d{2}$/.test(id.slice(p.id.length+1)));}
export function modelTask(action:string):ModelTask{return action==='image'?'image':action==='speech'?'speech':'text';}
export function suggestedModel(action:string){return {id:'gpt-6.1-sol',effort:(action==='script'||action==='model'?'high':'medium') as ReasoningEffort};}
export function usableModel(entry:ModelEntry,task:ModelTask){const profile=modelProfile(entry.id);if(profile)return profile.task===task;if(task==='image')return /^gpt-image-/.test(entry.id)&&!/^gpt-image-1(?:-|$)/.test(entry.id);if(task==='speech')return true;const base=entry.id.startsWith('ft:')?entry.id.split(':')[1]:entry.id;return /^(gpt-|o[1-9])/.test(base)&&!/image|audio|realtime|transcribe|tts|search|deep-research|codex|chat-latest|instruct|(?:^|-)pro(?:-|$)/.test(base);}
export function supportsReasoning(model:string,effort:ReasoningEffort){return modelProfile(model)?.efforts.includes(effort)??false;}
