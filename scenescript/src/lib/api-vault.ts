/** Encrypted BYOK storage, deliberately independent of Project/history/export. */
export const API_VAULT_KEY='jacktools.scenescript.api-vault.v1';
export const VAULT_IDLE_MS=10*60*1000;
const ITERATIONS=600_000,MAX_RECORD=16_384;
const AAD=new TextEncoder().encode('SceneScript local API vault v1');
export const apiProviders=['openai','elevenlabs'] as const;
export type ApiProvider=typeof apiProviders[number];
type Keys=Partial<Record<ApiProvider,string>>;
type RecordV1={version:1;kdf:'PBKDF2-SHA256';iterations:number;cipher:'AES-GCM';salt:string;iv:string;data:string};
type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export type VaultErrorCode='unsupported'|'password'|'keys'|'credentials'|'data'|'storage'|'locked'|'changed'|'exists';
export class VaultError extends Error{readonly code:VaultErrorCode;constructor(code:VaultErrorCode){super('API vault: '+code);this.name='VaultError';this.code=code;}}
const fail=(code:VaultErrorCode):never=>{throw new VaultError(code);};
export function validVaultPassword(password:string){return [...password].length>=12&&[...password].length<=256&&/\p{Lu}/u.test(password)&&/\p{Ll}/u.test(password)&&/\p{N}/u.test(password)&&/[^\p{L}\p{N}\s]/u.test(password);}
function supported(){if(!globalThis.crypto?.subtle||!globalThis.crypto?.getRandomValues)fail('unsupported');}
function base64(bytes:Uint8Array){return btoa(String.fromCharCode(...bytes));}
function bytes(value:unknown,size?:number){
 if(typeof value!=='string'||value.length>MAX_RECORD||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))return fail('data');
 const data=Uint8Array.from(atob(value),c=>c.charCodeAt(0));if(size!==undefined&&data.length!==size)return fail('data');return data;
}
function record(raw:string):RecordV1{
 if(raw.length>MAX_RECORD)fail('data');let r:Record<string,unknown>;try{r=JSON.parse(raw);}catch{return fail('data');}
 if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).sort().join(',')!=='cipher,data,iterations,iv,kdf,salt,version'||r.version!==1||r.kdf!=='PBKDF2-SHA256'||r.iterations!==ITERATIONS||r.cipher!=='AES-GCM')return fail('data');
 bytes(r.salt,16);bytes(r.iv,12);const data=bytes(r.data);if(data.length<16||data.length>8192)fail('data');return r as RecordV1;
}
function keys(value:unknown):Keys{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!apiProviders.includes(k as ApiProvider)))return fail('keys');
 const out:Keys={};for(const provider of apiProviders){const key=(value as Keys)[provider];if(key===undefined)continue;if(typeof key!=='string'||key.length<1||key.length>1024||!/^[\x21-\x7e]+$/.test(key))return fail('keys');out[provider]=key;}
 if(!Object.keys(out).length)fail('keys');return out;
}
async function derive(password:string,salt:Uint8Array){
 supported();if(typeof password!=='string'||!password.length||[...password].length>256)return fail('credentials');
 const encoded=new TextEncoder().encode(password);try{
  const material=await crypto.subtle.importKey('raw',encoded,'PBKDF2',false,['deriveKey']);
  return await crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',iterations:ITERATIONS,salt:salt as Uint8Array<ArrayBuffer>},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 }finally{encoded.fill(0);}
}
async function decrypt(r:RecordV1,key:CryptoKey):Promise<Keys>{
 let plain:Uint8Array|undefined;try{
  plain=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(r.iv,12) as Uint8Array<ArrayBuffer>,additionalData:AAD,tagLength:128},key,bytes(r.data) as Uint8Array<ArrayBuffer>));
  return keys(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(plain)));
 }catch{return fail('credentials');}finally{plain?.fill(0);}
}
async function encrypt(value:Keys,key:CryptoKey,salt:string):Promise<RecordV1>{
 const iv=crypto.getRandomValues(new Uint8Array(12)),plain=new TextEncoder().encode(JSON.stringify(keys(value)));
 try{const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:AAD,tagLength:128},key,plain);return {version:1,kdf:'PBKDF2-SHA256',iterations:ITERATIONS,cipher:'AES-GCM',salt,iv:base64(iv),data:base64(new Uint8Array(data))};}finally{plain.fill(0);}
}
/** Only a non-extractable CryptoKey lives between operations. Secrets are decrypted on demand. */
export class ApiVault{
 #key:CryptoKey|null=null;#raw:string|null=null;#epoch=0;#deadline=0;#providers:ApiProvider[]=[];
 #store:Store;#now:()=>number;
 constructor(store:Store,now:()=>number=Date.now){this.#store=store;this.#now=now;this.#raw=this.read();}
 private read(){try{return this.#store.getItem(API_VAULT_KEY);}catch{this.lock();return fail('storage');}}
 refresh(){const raw=this.read();if(raw!==this.#raw){this.lock();this.#raw=raw;}if(this.#key&&this.#now()>=this.#deadline)this.lock();}
 get state():'empty'|'locked'|'unlocked'|'corrupt'{this.refresh();if(this.#raw===null)return 'empty';try{record(this.#raw);}catch{return 'corrupt';}return this.#key?'unlocked':'locked';}
 get providers():readonly ApiProvider[]{this.refresh();return [...this.#providers];}
 touch(){this.refresh();if(this.#key)this.#deadline=this.#now()+VAULT_IDLE_MS;}
 lock(){this.#epoch++;this.#key=null;this.#providers=[];this.#deadline=0;}
 private unchanged(epoch:number,raw:string|null){if(epoch!==this.#epoch)return fail('changed');if(this.read()!==raw){this.refresh();return fail('changed');}}
 private commit(epoch:number,raw:string|null,r:RecordV1,key:CryptoKey,value:Keys){
  this.refresh();this.unchanged(epoch,raw);const next=JSON.stringify(r);try{this.#store.setItem(API_VAULT_KEY,next);}catch{return fail('storage');}
  this.#raw=next;this.#key=key;this.#providers=apiProviders.filter(p=>!!value[p]);this.#deadline=this.#now()+VAULT_IDLE_MS;
 }
 async create(password:string,value:Keys){
  this.refresh();if(this.#raw!==null)return fail('exists');if(!validVaultPassword(password))return fail('password');const safe=keys(value);supported();
  this.lock();const epoch=this.#epoch,raw=this.#raw,salt=crypto.getRandomValues(new Uint8Array(16)),key=await derive(password,salt),r=await encrypt(safe,key,base64(salt));
  this.commit(epoch,raw,r,key,safe);
 }
 async unlock(password:string){
  this.refresh();if(!this.#raw)return fail('data');this.lock();const epoch=this.#epoch,raw=this.#raw,r=record(raw),key=await derive(password,bytes(r.salt,16)),value=await decrypt(r,key);
  this.unchanged(epoch,raw);this.#key=key;this.#providers=apiProviders.filter(p=>!!value[p]);this.#deadline=this.#now()+VAULT_IDLE_MS;
 }
 private unlocked(){this.refresh();if(!this.#key||!this.#raw)return fail('locked');return {key:this.#key,raw:this.#raw,epoch:this.#epoch,r:record(this.#raw)};}
 async update(patch:Partial<Record<ApiProvider,string|null>>){
  if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(k=>!apiProviders.includes(k as ApiProvider)))return fail('keys');
  const edits={...patch},{key,raw,epoch,r}=this.unlocked(),value=await decrypt(r,key);
  for(const provider of apiProviders)if(Object.hasOwn(edits,provider)&&edits[provider]!==undefined){if(edits[provider]===null)delete value[provider];else value[provider]=edits[provider]!;}
  keys(value);const next=await encrypt(value,key,r.salt);this.commit(epoch,raw,next,key,value);
 }
 async getKey(provider:ApiProvider):Promise<string|undefined>{
  if(!apiProviders.includes(provider))return fail('keys');const {key,raw,epoch,r}=this.unlocked(),value=await decrypt(r,key);this.unchanged(epoch,raw);
  this.refresh();if(!this.#key)return fail('locked');this.touch();return value[provider];
 }
 reset(){this.lock();try{this.#store.removeItem(API_VAULT_KEY);}catch{return fail('storage');}this.#raw=null;}
}
