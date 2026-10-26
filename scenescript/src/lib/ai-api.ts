import {providerErrorDetails} from './ai-error-details.ts';
import {validImageSize} from './ai-image-settings.ts';
import {modelProfile,supportsReasoning,type ReasoningEffort,type ModelEntry} from './ai-models.ts';
import {voiceGender,type CatalogueVoice} from './voices.ts';
import {videoLanguageCode} from './video-languages.ts';
/** Browser-only provider calls. Never persist keys, log responses or retry paid requests. */
export type AiErrorCode='auth'|'permission'|'limit'|'request'|'network'|'timeout'|'cancelled'|'response'|'size'|'incomplete';
export class AiApiError extends Error{readonly code:AiErrorCode;readonly details:string;constructor(code:AiErrorCode,details=''){super('AI: '+code+(details?'\n'+details:''));this.code=code;this.details=details;}}
const id=(s:string)=>{if(!/^[a-zA-Z0-9_.:/-]{1,150}$/.test(s))throw new AiApiError('request');return s;};
const MiB=1024*1024;
async function bytes(response:Response,max:number,signal:AbortSignal){
 if(Number(response.headers.get('content-length'))>max){await response.body?.cancel();throw new AiApiError('size');}
 const reader=response.body?.getReader();if(!reader)throw new AiApiError('response');
 const chunks:Uint8Array[]=[];let length=0;
 try{while(true){signal.throwIfAborted();const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>max)throw new AiApiError('size');chunks.push(value);}}
 catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}
 const all=new Uint8Array(length);let at=0;for(const chunk of chunks){all.set(chunk,at);at+=chunk.length;}return all;
}
async function call(provider:'openai'|'elevenlabs',path:string,key:string,body:unknown,signal:AbortSignal,max:number,fetcher:typeof fetch){
 if(!key||key.length>1024||/\s/.test(key))throw new AiApiError('auth');
 const timeout=AbortSignal.timeout(600000),combined=AbortSignal.any([signal,timeout]);
 try{
  combined.throwIfAborted();
  const response=await fetcher((provider==='openai'?'https://api.openai.com':'https://api.elevenlabs.io')+path,{method:body===undefined?'GET':'POST',headers:{...(provider==='openai'?{Authorization:'Bearer '+key}:{'xi-api-key':key}),...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),signal:combined,mode:'cors',credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer'});
  if(!response.ok){
   let payload:unknown;
   try{const text=new TextDecoder().decode(await bytes(response,16*1024,combined));try{payload=JSON.parse(text);}catch{if(!/^\s*</.test(text))payload={error:{message:text}};}}catch{/* Oversized / unreadable diagnostics must not hide the HTTP error. */}
   throw new AiApiError(response.status===401?'auth':response.status===403?'permission':response.status===429||response.status===402?'limit':'request',providerErrorDetails(provider,key,payload,response.status,response.headers.get('x-request-id')));
  }
  return await bytes(response,max,combined);
 }catch(e){if(signal.aborted)throw new AiApiError('cancelled');if(timeout.aborted)throw new AiApiError('timeout');if(e instanceof AiApiError)throw e;throw new AiApiError('network');}
}
function json(data:Uint8Array):any{try{return JSON.parse(new TextDecoder().decode(data));}catch{throw new AiApiError('response');}}
export type TextRequest={model:string;instructions:string;input:string;images?:string[];reasoning?:ReasoningEffort};
export async function generateText(key:string,request:TextRequest,signal:AbortSignal,fetcher:typeof fetch=fetch){
 if(modelProfile(request.model)&&modelProfile(request.model)!.task!=='text')throw new AiApiError('request');
 if(request.reasoning!==undefined&&!supportsReasoning(request.model,request.reasoning))throw new AiApiError('request');
 // JSON mode validates input messages, not just the top-level instructions.
 // Keep the structured project payload unchanged and add a separate format cue.
 const content:unknown[]=[{type:'input_text',text:request.input},{type:'input_text',text:'Return exactly one valid JSON object following the supplied instructions. Do not use Markdown or add text outside the JSON object.'}];
 for(const image of request.images??[]){if(!/^data:image\/(png|jpeg|webp);base64,/.test(image))throw new AiApiError('request');content.push({type:'input_image',image_url:image,detail:'low'});}
 // Do not impose a separate application output-token ceiling; use provider defaults.
 const body={model:id(request.model),instructions:request.instructions,input:[{role:'user',content}],text:{format:{type:'json_object'}},store:false,...(request.reasoning?{reasoning:{effort:request.reasoning}}:{})};
 if(new TextEncoder().encode(JSON.stringify(body)).length>10*MiB)throw new AiApiError('size');
 const r=json(await call('openai','/v1/responses',key,body,signal,12*MiB,fetcher));
 if(r?.status!=='completed')throw new AiApiError(r?.status==='failed'?'response':'incomplete',providerErrorDetails('openai',key,r));
 let text='';if(!Array.isArray(r.output))throw new AiApiError('response');
 for(const item of r.output)if(item&&item.type==='message'&&Array.isArray(item.content))for(const c of item.content){if(!c||typeof c!=='object')throw new AiApiError('response');if(c.type==='refusal')throw new AiApiError('response',providerErrorDetails('openai',key,{error:{message:c.refusal}}));if(c.type==='output_text'&&typeof c.text==='string')text+=c.text;}
 if(!text||text.length>8*MiB)throw new AiApiError('response');
 try{JSON.parse(text);}catch{throw new AiApiError('response');}return text;
}
export async function generateImage(key:string,request:{model:string;prompt:string;size:string;quality:string;images?:string[]},signal:AbortSignal,fetcher:typeof fetch=fetch){
 if(!validImageSize(request.model,request.size)||!['low','medium','high'].includes(request.quality)||!request.prompt.trim()||request.prompt.length>32000)throw new AiApiError('request');
 const {images=[],...options}=request;
 if(images.length>8||images.reduce((n,x)=>n+x.length,0)>6*MiB||images.some(x=>!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(x)))throw new AiApiError('size');
 const body={...options,model:id(request.model),n:1,output_format:'png',...(images.length?{images:images.map(image_url=>({image_url}))}:{})};
 if(new TextEncoder().encode(JSON.stringify(body)).length>10*MiB)throw new AiApiError('size');
 const r=json(await call('openai',images.length?'/v1/images/edits':'/v1/images/generations',key,body,signal,12*MiB,fetcher));
 const data=r?.data?.[0]?.b64_json;if(typeof data!=='string'||!data||data.length>Math.ceil(8*MiB/3)*4||!/^[A-Za-z0-9+/]*={0,2}$/.test(data))throw new AiApiError('response');return 'data:image/png;base64,'+data;
}
export async function generateSpeech(key:string,request:{voice:string;model:string;text:string},signal:AbortSignal,fetcher:typeof fetch=fetch){
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(request.voice)||!request.text.trim()||request.text.length>10000)throw new AiApiError('request');
 const data=await call('elevenlabs','/v1/text-to-speech/'+request.voice+'?output_format=mp3_44100_128',key,{text:request.text,model_id:id(request.model)},signal,32*MiB,fetcher);
 if(!data.length)throw new AiApiError('response');return new Blob([data.buffer as ArrayBuffer],{type:'audio/mpeg'});
}
export async function listAiVoices(key:string,signal:AbortSignal,fetcher:typeof fetch=fetch):Promise<{id:string;name:string}[]>{
 const r=json(await call('elevenlabs','/v2/voices?page_size=100',key,undefined,signal,2*MiB,fetcher));
 if(!Array.isArray(r?.voices))throw new AiApiError('response');
 return r.voices.filter((v:any)=>v&&typeof v.voice_id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v.voice_id)&&typeof v.name==='string').slice(0,100).map((v:any)=>({id:v.voice_id,name:v.name.slice(0,200)}));
}


/** One explicit page; do not silently stop at 100 or fetch an unbounded catalog. */
export async function listVoicePage(key:string,signal:AbortSignal,token='',fetcher:typeof fetch=fetch):Promise<{voices:CatalogueVoice[];next:string|null}>{
 if(token.length>2000||/[\x00-\x1f]/.test(token))throw new AiApiError('request');
 const path='/v2/voices?page_size=100'+(token?'&next_page_token='+encodeURIComponent(token):'');
 const r=json(await call('elevenlabs',path,key,undefined,signal,2*MiB,fetcher));if(!Array.isArray(r?.voices))throw new AiApiError('response');
 const voices:CatalogueVoice[]=r.voices.slice(0,100).filter((v:any)=>v&&typeof v.voice_id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v.voice_id)&&typeof v.name==='string').map((v:any)=>{
  const languageValues:unknown[]=[v.labels?.language,...(Array.isArray(v.verified_languages)?v.verified_languages.slice(0,100).map((x:any)=>x?.language):[])];
  const languages=[...new Set(languageValues.filter((x):x is string=>typeof x==='string'&&x.length<=100).map(x=>videoLanguageCode(x)||(/^[a-z]{2,3}(-[a-zA-Z]{2,4})?$/.test(x)?x.split('-')[0]:null)).filter((x):x is string=>!!x))];
  return {id:v.voice_id,name:v.name.slice(0,200),gender:voiceGender(v.labels?.gender),languages,accent:typeof v.labels?.accent==='string'?v.labels.accent.slice(0,200):''};
 });
 let next:string|null=null;if(r.has_more===true){if(typeof r.next_page_token!=='string'||!r.next_page_token||r.next_page_token.length>2000||r.next_page_token===token)throw new AiApiError('response');next=r.next_page_token;}return {voices,next};
}


/** Read-only account catalog. No prompts, tools, generation, or project payload. */
export async function listGenerationModels(provider:'openai'|'elevenlabs',key:string,signal:AbortSignal,fetcher:typeof fetch=fetch):Promise<ModelEntry[]>{
 const r=json(await call(provider,'/v1/models',key,undefined,signal,2*MiB,fetcher)),items=provider==='openai'?r?.data:r;
 if(!Array.isArray(items))throw new AiApiError('response');if(items.length>2000)throw new AiApiError('size');
 const entries:ModelEntry[]=[];for(const item of items){if(!item||typeof item!=='object')continue;if(provider==='elevenlabs'&&item.can_do_text_to_speech!==true)continue;const model=provider==='openai'?item.id:item.model_id;if(typeof model!=='string'||!/^[a-zA-Z0-9_.:/-]{1,150}$/.test(model))continue;entries.push({id:model,name:provider==='elevenlabs'&&typeof item.name==='string'?item.name.slice(0,200):model});}
 return [...new Map(entries.map(e=>[e.id,e])).values()].sort((a,b)=>a.id.localeCompare(b.id));
}
