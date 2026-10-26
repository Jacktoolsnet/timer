import type {ApiProvider} from './api-vault.ts';
export type ApiKeyTestState='ok'|'auth'|'permission'|'rate'|'unavailable'|'network'|'timeout'|'cancelled'|'input';
export type ApiKeyTestResult={state:ApiKeyTestState;status?:number};
// Deliberately no configurable URLs, generation endpoints, SDK retries or request bodies.
const endpoints={openai:{url:'https://api.openai.com/v1/models',header:'Authorization'},elevenlabs:{url:'https://api.elevenlabs.io/v1/user',header:'xi-api-key'}} as const;
async function permissionFailure(response:Response){
 const reader=response.body?.getReader();if(!reader)return false;
 let size=0;const chunks:Uint8Array[]=[];
 try{while(true){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>16_384)return false;chunks.push(next.value);}
  const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
  const body=JSON.parse(new TextDecoder().decode(data));
  const codes=[body?.error?.code,body?.error?.type,body?.detail?.status,body?.detail?.code];
  if(codes.some(c=>['missing_permissions','insufficient_permissions','permission_denied','insufficient_scope'].includes(c)))return true;
  // Some OpenAI restricted-key errors describe missing scopes without a code.
  return typeof body?.error?.message==='string'&&/missing scopes:|insufficient permissions/i.test(body.error.message);
 }catch{return false;}finally{try{await reader.cancel();}catch{}reader.releaseLock();}
}
/** Read-only validation, only after an explicit user click. Never returns response bodies. */
export async function testApiKey(provider:ApiProvider,key:string,signal?:AbortSignal,fetcher:typeof fetch=globalThis.fetch):Promise<ApiKeyTestResult>{
 if(!Object.hasOwn(endpoints,provider)||typeof key!=='string'||!key.length||key.length>1024||!/^[\x21-\x7e]+$/.test(key))return {state:'input'};
 if(signal?.aborted)return {state:'cancelled'};
 const controller=new AbortController();let timedOut=false;
 const cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});
 const timer=setTimeout(()=>{timedOut=true;controller.abort();},15_000);
 try{
  const endpoint=endpoints[provider],response=await fetcher(endpoint.url,{method:'GET',headers:{[endpoint.header]:provider==='openai'?'Bearer '+key:key,Accept:'application/json'},mode:'cors',credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal:controller.signal});
  const status=response.status;
  if(status===401)return {state:await permissionFailure(response)?'permission':'auth',status};
  try{await response.body?.cancel();}catch{}
  if(response.ok)return {state:response.headers.get('content-type')?.toLowerCase().includes('application/json')?'ok':'unavailable',status};
  if(status===403)return {state:'permission',status};
  if(status===429)return {state:'rate',status};
  return {state:'unavailable',status};
 }catch{return {state:timedOut?'timeout':signal?.aborted?'cancelled':'network'};}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}
