import {AiApiError,listVoicePage} from '../lib/ai-api';
import type {CatalogueVoice,VoiceAssignment,VoiceGender} from '../lib/voices';
import {videoLanguageCode} from '../lib/video-languages';
import {voicePickerWords} from '../lib/voice-picker-i18n';
import {aiWorkflowWords} from '../lib/ai-workflow-i18n';
import type {Language} from '../lib/i18n';
import {requestApiKey} from './api-vault';
type Context={language:string;current?:VoiceAssignment;valid:()=>boolean};
let picker:((context:Context)=>Promise<VoiceAssignment|null|undefined>)|undefined;
export function chooseElevenVoice(context:Context){return picker?picker(context):Promise.resolve(undefined);}
export function installVoicePicker(){
 const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById('voice-picker-'+id) as T;
 const dialog=$<HTMLDialogElement>('dialog'),t=JSON.parse(dialog.dataset.words!) as ReturnType<typeof voicePickerWords>,errors=aiWorkflowWords(document.documentElement.lang as Language),filter=$<HTMLSelectElement>('filter'),search=$<HTMLInputElement>('search');
 let context:Context,voices:CatalogueVoice[]=[],next:string|null=null,selected:VoiceAssignment|null=null,done:((v:VoiceAssignment|null|undefined)=>void)|undefined,active:AbortController|undefined,session=0;
 const node=(tag:string,text?:string)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 const busy=(value:boolean)=>{for(const id of ['load','more','apply','clear'])$<HTMLButtonElement>(id).disabled=value;dialog.setAttribute('aria-busy',String(value));};
 const check=()=>{if(!dialog.open||!context.valid())throw new Error(t.stale);};
 function render(){
  $('selected').textContent=selected?selected.name+' · '+selected.id:t.none;const groups=$('groups');groups.replaceChildren();const code=videoLanguageCode(context.language),query=search.value.trim().toLocaleLowerCase();
  const matches=voices.filter(v=>(filter.value==='all'||(filter.value==='unknown'?!v.languages.length:!!code&&v.languages.includes(code)))&&(!query||(v.name+' '+v.id+' '+v.accent).toLocaleLowerCase().includes(query)));
  // Keep unknown metadata separate; never guess gender from names or descriptions.
  for(const gender of ['male','female','neutral','unknown'] as VoiceGender[]){const group=matches.filter(v=>v.gender===gender);if(!group.length)continue;const section=node('section'),heading=node('h3',t[gender]+' · '+group.length);section.dataset.voiceGender=gender;section.append(heading);for(const v of group){const button=node('button') as HTMLButtonElement;button.type='button';button.dataset.voiceId=v.id;button.setAttribute('aria-pressed',String(selected?.id===v.id));button.append(node('strong',v.name),node('small',v.id+' · '+(v.languages.join(', ')||t.unknownLanguage)+(v.accent?' · '+v.accent:'')));button.addEventListener('click',()=>{selected={provider:'elevenlabs',id:v.id,name:v.name};render();});section.append(button);}groups.append(section);}
  if(!matches.length)groups.append(node('p',t.empty));$('more').hidden=!next||voices.length>=1000;$('status').textContent=voices.length>=1000?t.limit:`${matches.length} / ${voices.length}`;
 }
 const finish=(value?:VoiceAssignment|null)=>{const resolve=done;done=undefined;session++;active?.abort();active=undefined;dialog.close();voices=[];next=null;resolve?.(value);};
 picker=ctx=>{if(dialog.open)return Promise.resolve(undefined);context=ctx;voices=[];next=null;selected=ctx.current??null;session++;search.value='';filter.value=videoLanguageCode(ctx.language)?'match':'all';$('language').textContent=t.languageHint.replace('{language}',ctx.language||'—');$('error-box').hidden=true;busy(false);render();dialog.showModal();return new Promise(resolve=>done=resolve);};
 async function load(more:boolean){
  if(active||more&&!next)return;const controller=new AbortController(),ticket=session;active=controller;busy(true);$('error-box').hidden=true;$('status').textContent=t.busy;let key='';
  try{check();key=await requestApiKey('elevenlabs',controller.signal);check();const page=await listVoicePage(key,controller.signal,more?next!:'');controller.signal.throwIfAborted();check();if(ticket!==session)return;voices=[...new Map([...(more?voices:[]),...page.voices].map(v=>[v.id,v])).values()].slice(0,1000);next=page.next;render();}
  catch(e){if(ticket===session&&!controller.signal.aborted){$('error-box').hidden=false;$<HTMLTextAreaElement>('error').value=e instanceof AiApiError?(e.code==='size'?errors.sizeError:errors[e.code]):e instanceof Error&&e.message===t.stale?t.stale:t.locked;}}
  finally{key='';if(ticket===session){active=undefined;busy(false);}}
 }
 $('load').addEventListener('click',()=>void load(false));$('more').addEventListener('click',()=>void load(true));filter.addEventListener('change',render);search.addEventListener('input',render);
 $('apply').addEventListener('click',()=>{try{check();finish(selected);}catch(e){$('error-box').hidden=false;$<HTMLTextAreaElement>('error').value=t.stale;}});
 $('clear').addEventListener('click',()=>{selected=null;render();});$('close').addEventListener('click',()=>finish());dialog.addEventListener('cancel',e=>{e.preventDefault();finish();});dialog.addEventListener('close',()=>{if(done)finish();});window.addEventListener('pagehide',()=>{if(done)finish();});
}
