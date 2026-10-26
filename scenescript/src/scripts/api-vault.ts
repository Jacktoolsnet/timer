import {testApiKey,type ApiKeyTestState} from '../lib/api-key-test';
import {ApiVault,API_VAULT_KEY,VaultError,apiProviders,validVaultPassword,type ApiProvider} from '../lib/api-vault';
import type {ApiVaultWords} from '../lib/api-vault-i18n';
let current:ApiVault|undefined;
/** Future provider integrations request a key here; provider generation is not implemented here. */
export function localApiVault(){if(!current)throw new VaultError('storage');return current;}
export function installApiVault(onOpen:()=>void=()=>{}){
 const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
 const dialog=$<HTMLDialogElement>('api-vault-dialog'),words=JSON.parse(dialog.dataset.words!) as ApiVaultWords,form=$<HTMLFormElement>('api-vault-form'),open=$<HTMLButtonElement>('open-api-vault');
 const password=$<HTMLInputElement>('api-vault-password'),repeat=$<HTMLInputElement>('api-vault-repeat'),consent=$<HTMLInputElement>('api-vault-consent'),error=$('api-vault-error'),submit=$<HTMLButtonElement>('api-vault-submit');
 const inputs=apiProviders.map(p=>$<HTMLInputElement>('api-vault-'+p));
 const testButtons=apiProviders.map(p=>$<HTMLButtonElement>('api-vault-test-'+p));
 const tests=new Map<ApiProvider,{controller:AbortController;session:number}>();
 const testResult=(provider:ApiProvider,state:string,text:string)=>{const node=$('api-vault-'+provider+'-test-result');node.textContent=text;node.dataset.state=state;node.hidden=!text;};
 const cancelTests=(provider?:ApiProvider)=>{for(const p of provider?[provider]:apiProviders){tests.get(p)?.controller.abort();tests.delete(p);testResult(p,'','');}};
 let state='empty',busy=false,confirming=false,operation=0,pending:AbortController|undefined;
 const clear=()=>{cancelTests();password.value='';repeat.value='';for(const input of inputs)input.value='';consent.checked=false;};
 const message=(text='')=>{error.textContent=text;error.hidden=!text;};
 const showError=(e:unknown)=>{
  const code=e instanceof VaultError?e.code:'storage',map={unsupported:words.unsupportedError,password:words.passwordError,keys:words.keysError,credentials:words.credentialsError,data:words.dataError,storage:words.storageError,locked:words.lockedError,changed:words.changedError,exists:words.changedError};
  message(map[code]);
 };
 const readState=()=>connect().state;
 const connect=()=>{if(!current)current=new ApiVault(localStorage);return current;};
 const paint=(notice?:string)=>{
  let ready=true;const previous=state;
  try{state=connect().state;}catch(e){ready=false;state='locked';showError(e);}
  if(previous==='unlocked'&&state!=='unlocked'){operation++;pending?.abort();pending=undefined;busy=false;clear();}
  const secure=window.isSecureContext&&!!globalThis.crypto?.subtle;
  if(!secure)message(words.unsupportedError);
  const setup=state==='empty',unlocked=state==='unlocked',corrupt=state==='corrupt';
  open.dataset.vaultState=state;open.title=words.title+' — '+(setup?words.empty:corrupt?words.corrupt:unlocked?words.unlocked:words.locked);open.setAttribute('aria-label',open.title);
  $('api-vault-state').textContent=notice??(busy?words.busy:setup?words.empty:corrupt?words.corrupt:unlocked?words.unlocked:words.locked);
  $('api-vault-passwords').hidden=unlocked;password.disabled=unlocked||busy;password.required=!unlocked;password.minLength=setup?12:1;password.autocomplete=setup?'new-password':'current-password';
  $('api-vault-repeat-label').hidden=!setup;repeat.disabled=!setup||busy;repeat.required=setup;
  $('api-vault-policy').hidden=!setup;$('api-vault-providers').hidden=!setup&&!unlocked;
  $('api-vault-consent-label').hidden=!setup;consent.disabled=!setup||busy;consent.required=setup;
  let configured:readonly ApiProvider[]=[];try{configured=current?.providers??[];}catch(e){ready=false;showError(e);}
  form.hidden=confirming||corrupt||!ready||!secure;
  for(const [i,provider]of apiProviders.entries()){
   inputs[i].disabled=(!setup&&!unlocked)||busy;
   testButtons[i].disabled=busy||!ready||!secure||(!setup&&!unlocked)||tests.has(provider)||(!inputs[i].value.trim()&&!configured.includes(provider));
   testButtons[i].setAttribute('aria-busy',String(tests.has(provider)));
   inputs[i].placeholder=unlocked&&configured.includes(provider)?words.keep:'';
   $('api-vault-'+provider+'-status').textContent=unlocked?(configured.includes(provider)?words.present:words.absent):'';
  }
  $('api-vault-reset-panel').hidden=!confirming;
  $('api-vault-reset').hidden=setup||confirming||!ready;
  $('api-vault-lock').hidden=!unlocked||confirming;
  submit.hidden=corrupt||confirming||!ready;submit.disabled=busy||!secure;submit.title=setup?words.create:unlocked?words.save:words.unlock;submit.setAttribute('aria-label',submit.title);
  $<HTMLButtonElement>('api-vault-confirm-reset').disabled=busy;
  dialog.setAttribute('aria-busy',String(busy));
 };
 const lock=()=>{operation++;pending?.abort();pending=undefined;busy=false;current?.lock();clear();message();paint();};
 // Serialize writers on modern browsers. The vault also checks its encrypted
 // snapshot before every commit, and invalidates sessions on cross-tab changes.
 const write=<T>(fn:()=>Promise<T>,signal:AbortSignal)=>{signal.throwIfAborted();return navigator.locks?navigator.locks.request(API_VAULT_KEY,{signal},fn):fn();};
 for(const [index,provider]of apiProviders.entries()){
  inputs[index].addEventListener('input',()=>{cancelTests(provider);paint();});
  testButtons[index].addEventListener('click',async()=>{
   if(busy||tests.has(provider))return;message();const entry={controller:new AbortController(),session:operation};tests.set(provider,entry);testResult(provider,'working',words.testWorking);paint();
   let key=inputs[index].value.trim();
   try{
    if(!key)key=await connect().getKey(provider)??'';
    if(entry.controller.signal.aborted||tests.get(provider)!==entry||entry.session!==operation)return;
    const result=await testApiKey(provider,key,entry.controller.signal);
    if(entry.controller.signal.aborted||tests.get(provider)!==entry||entry.session!==operation||!dialog.open)return;
    const messages:Record<ApiKeyTestState,string>={ok:words.testOk,auth:words.testAuth,permission:words.testPermission,rate:words.testRate,unavailable:words.testUnavailable,network:words.testNetwork,timeout:words.testTimeout,cancelled:words.testCancelled,input:words.testInput};
    testResult(provider,result.state,messages[result.state]);
   }catch(e){if(tests.get(provider)===entry&&entry.session===operation){showError(e);testResult(provider,'input',words.testInput);}}
   finally{key='';if(tests.get(provider)===entry){tests.delete(provider);paint();}}
  });
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;message();let vault:ApiVault,mode:ReturnType<typeof readState>;
  try{vault=connect();mode=readState();}catch(e){showError(e);return;}
  const patch:Partial<Record<ApiProvider,string>>={};for(const [i,p]of apiProviders.entries()){const value=inputs[i].value.trim();if(value)patch[p]=value;}
  let secret=password.value;
  if(mode==='empty'){
   if(!validVaultPassword(secret)){message(words.passwordError);password.focus();return;}
   if(secret!==repeat.value){message(words.matchError);repeat.focus();return;}
   if(!consent.checked){message(words.consent);return;}
   if(!Object.keys(patch).length){message(words.keysError);inputs[0].focus();return;}
  }
  const ticket=++operation,abort=new AbortController();pending=abort;busy=true;clear();paint();
  try{
   if(mode==='empty')await write(()=>{if(ticket!==operation)throw new VaultError('changed');return vault.create(secret,patch);},abort.signal);
   else if(mode==='locked')await vault.unlock(secret);
   else if(mode==='unlocked')await write(()=>{if(ticket!==operation)throw new VaultError('changed');return vault.update(patch);},abort.signal);
   else throw new VaultError('data');
   if(ticket===operation){busy=false;paint(mode==='locked'?words.opened:words.saved);if(mode==='locked')inputs[0].focus();}
  }catch(e){if(ticket===operation){busy=false;paint();showError(e);}}
  finally{secret='';for(const p of apiProviders)delete patch[p];if(ticket===operation){busy=false;pending=undefined;}}
 });
 open.addEventListener('click',()=>{onOpen();confirming=false;clear();message();paint();dialog.showModal();});
 $('api-vault-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{if(busy)lock();clear();message();confirming=false;});
 $('api-vault-lock').addEventListener('click',lock);
 $('api-vault-reset').addEventListener('click',()=>{lock();confirming=true;paint();$('api-vault-reset-back').focus();});
 $('api-vault-reset-back').addEventListener('click',()=>{confirming=false;paint();if(!password.disabled)password.focus();});
 $('api-vault-confirm-reset').addEventListener('click',async()=>{
  if(busy)return;const ticket=++operation,abort=new AbortController();pending=abort;busy=true;message();paint();
  try{await write(async()=>{if(ticket!==operation)throw new VaultError('changed');connect().reset();},abort.signal);if(ticket===operation){busy=false;confirming=false;clear();paint(words.resetDone);password.focus();}}
  catch(e){if(ticket===operation){busy=false;paint();showError(e);}}
 });
 window.addEventListener('pagehide',lock);
 document.addEventListener('preferences-cleared',lock);
 window.addEventListener('storage',event=>{if(event.key===API_VAULT_KEY||event.key===null){operation++;pending?.abort();pending=undefined;busy=false;try{current?.refresh();}catch{}clear();message();paint();}});
 const activity=(event:Event)=>{if(event.isTrusted&&!document.hidden)try{current?.touch();if(current&&current.state!==state){clear();message();paint();}}catch{lock();}};
 for(const name of ['pointerdown','keydown'])document.addEventListener(name,activity,{passive:true});
 const sync=()=>{try{const next=connect().state;if(next!==state){operation++;pending?.abort();pending=undefined;busy=false;clear();message();paint();}}catch{lock();}};
 // Copying keys from another tab must not discard a partially completed form.
 // Still enforce expiry immediately on return, even if background timers paused.
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
 setInterval(sync,15_000);
 paint();
}
