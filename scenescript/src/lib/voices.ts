import type {Storyboard} from './storyboard.ts';
export type VoiceAssignment={provider:'elevenlabs';id:string;name:string};
export type VoiceGender='male'|'female'|'neutral'|'unknown';
export type CatalogueVoice={id:string;name:string;gender:VoiceGender;languages:string[];accent:string};
export function voiceGender(value:unknown):VoiceGender{if(typeof value!=='string')return 'unknown';const v=value.trim().toLowerCase();return v==='male'||v==='female'?v:['neutral','gender-neutral','non-binary','androgynous'].includes(v)?'neutral':'unknown';}
export class VoiceAssignmentError extends Error{readonly code:'missing'|'ambiguous';constructor(code:'missing'|'ambiguous'){super(code==='missing'?'Speech: assign a voice or select a fallback.':'Speech: ambiguous speaker; use a qualified storyboard ID.');this.code=code;}}
/** Match stable storyboard IDs first. Name matching is only a legacy convenience. */
export function assignedSpeakerVoice(board:Storyboard|null,speaker:string){
 if(!board||!speaker.trim())return undefined;const items=[...board.characters,...board.settings];
 const qualified=/^(characters|settings):(.+)$/.exec(speaker);if(qualified)return board[qualified[1] as 'characters'|'settings'].find(s=>s.id===qualified[2])?.voice;
 const byId=items.filter(s=>s.id===speaker);if(byId.length>1)throw new VoiceAssignmentError('ambiguous');if(byId.length===1)return byId[0].voice;
 const byName=items.filter(s=>s.name===speaker);if(byName.length>1)throw new VoiceAssignmentError('ambiguous');return byName[0]?.voice;
}
export function speechVoice(board:Storyboard|null,speaker:string,fallback:string){const assigned=assignedSpeakerVoice(board,speaker);const id=assigned?.id||fallback.trim();if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw new VoiceAssignmentError('missing');return id;}
