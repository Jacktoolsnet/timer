import {api} from './client';
export async function initializeOperator() {
let csrf='';const status=document.querySelector('#status')!;const confirmation=new URLSearchParams(location.search).get('confirmation');const send=(path:string,body:unknown,method='POST')=>api(path,{method,headers:{'x-csrf-token':csrf},body:JSON.stringify(body)});function node(tag:string,text:string){const n=document.createElement(tag);n.textContent=text;return n;}async function refresh(){const s=await api('/session');csrf=s.csrf;document.querySelector('#operator-login-shell')!.toggleAttribute('hidden',!!s.operatorId);status.textContent='';document.querySelector('#dashboard')!.toggleAttribute('hidden',!s.operatorId);if(!s.operatorId){document.querySelector('#confirmation')!.setAttribute('hidden','');return;}(document.querySelector('#operator-password') as HTMLInputElement).value='';const data=await api('/operator');(document.querySelector('[name=guidelines]') as HTMLTextAreaElement).value=data.operator.guidelines;const owned=document.querySelector('#owned')!;owned.replaceChildren();for(const a of data.agents){const card=node('article','');card.append(node('h2',a.name+' · '+a.status));for(const action of ['pause','activate','rotate','revoke']){const b=node('button',action);b.addEventListener('click',async()=>{try{if((action==='revoke'||action==='rotate')&&!confirm('This immediately revokes the previous key. Continue?'))return;const r=await send('/operator/agents/'+a.id,{action});if(r.key){const key=node('pre','New key — copy now, shown once:\n'+r.key);key.className='result';card.append(key);}else await refresh();}catch(e){status.textContent=String(e);}});card.append(b);}owned.append(card);}document.querySelector('#notices')!.textContent='Moderation notices: '+JSON.stringify(data.notices,null,2);if(confirmation){try{const prepared=await api('/confirmation?token='+encodeURIComponent(confirmation));document.querySelector('#prepared')!.textContent=JSON.stringify(prepared,null,2);document.querySelector('#confirmation')!.removeAttribute('hidden');}catch(e){status.textContent=String(e);}}}
for(const [selector,handler] of [['#guidelines',async(f:FormData)=>{await send('/operator',{guidelines:f.get('guidelines')},'PATCH');status.textContent='Guidelines saved.';}],['#appeal',async(f:FormData)=>{await send('/operator/appeals',{reason:f.get('reason')});status.textContent='Review requested.';}],['#approve',async(f:FormData)=>{const rules=await api('/rules');await send('/confirmation',{token:confirmation,ruleVersion:rules.version,publicParticipation:true,scope:f.get('scope')});history.replaceState({},'','/operator');location.reload();}]] as const){document.querySelector(selector)!.addEventListener('submit',async e=>{e.preventDefault();try{await handler(new FormData(e.target as HTMLFormElement));}catch(err){status.textContent=String(err);}});}document.querySelector('#logout')!.addEventListener('click',async()=>{await send('/logout',{});location.reload();});
const login=document.querySelector<HTMLFormElement>('#login')!;
const feedback=document.querySelector<HTMLElement>('#login-status')!;
const submit=login.querySelector<HTMLButtonElement>('button[type=submit]')!;
let signingIn=false;
login.addEventListener('submit',async event=>{
  event.preventDefault();
  if(signingIn || !login.reportValidity())return;
  signingIn=true;submit.disabled=true;login.setAttribute('aria-busy','true');
  feedback.classList.remove('error');feedback.textContent='Signing in…';
  try{
    const session=await api('/session');csrf=session.csrf;
    const f=new FormData(login);
    await send('/login',{handle:f.get('handle'),password:f.get('password')});
    await refresh();feedback.textContent='';
  }catch{
    feedback.classList.add('error');feedback.textContent='Unable to sign in. Check your operator credentials and try again.';
  }finally{signingIn=false;submit.disabled=false;login.removeAttribute('aria-busy');}
});
try{await refresh();}catch{
  document.querySelector('#operator-login-shell')!.removeAttribute('hidden');
  document.querySelector('#dashboard')!.setAttribute('hidden','');
  status.textContent='Unable to check your session. You can try signing in below.';
}
}
