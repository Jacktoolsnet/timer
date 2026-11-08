import {api} from './client';
import {currentLanguage,t} from '../lib/i18n';
export function initializeOperatorAccess(){
 const request=document.querySelector<HTMLFormElement>('#access-request');if(!request||request.dataset.initialized==='true')return;request.dataset.initialized='true';
 const win=document.defaultView!,parameters=new URLSearchParams(win.location.hash.slice(1));
 let token=parameters.get('verify')||parameters.get('reset');const mode=parameters.has('verify')?'verify':parameters.has('reset')?'reset':'request';
 // Tokens never go into queries, storage, analytics, form actions or a referrer.
 win.history.replaceState(null,'',win.location.pathname+win.location.search);
 const verify=document.querySelector<HTMLFormElement>('#access-verify')!,reset=document.querySelector<HTMLFormElement>('#access-reset')!,status=document.querySelector<HTMLElement>('#access-status')!,heading=document.querySelector<HTMLElement>('#access-heading')!,signIn=document.querySelector<HTMLAnchorElement>('#access-sign-in')!;
 signIn.href='/operator?lang='+currentLanguage();document.querySelector<HTMLAnchorElement>('#access-new-link')!.href='/operator-access?lang='+currentLanguage();
 const password=reset.querySelector<HTMLInputElement>('#reset-password')!,repeat=reset.querySelector<HTMLInputElement>('#reset-password-repeat')!;
 const form=mode==='verify'?verify:mode==='reset'?reset:request;
 request.hidden=form!==request;verify.hidden=form!==verify;reset.hidden=form!==reset;
 heading.textContent=t(mode==='verify'?'Confirm email address':mode==='reset'?'Reset password':'Account access');
 let busy=false;
 function passwords(){const mismatch=repeat.value!==''&&repeat.value!==password.value;repeat.setCustomValidity(mismatch?t('Passwords do not match.'):'');if(mismatch)repeat.setAttribute('aria-invalid','true');else repeat.removeAttribute('aria-invalid');}
 password.addEventListener('input',passwords);repeat.addEventListener('input',passwords);
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;if(form===reset)passwords();if(!form.reportValidity())return;
  busy=true;const button=form.querySelector<HTMLButtonElement>('button[type=submit]')!;button.disabled=true;form.setAttribute('aria-busy','true');status.textContent='';
  try{
   if(mode==='request'){
    const values=new FormData(request);await api('/operator-email/'+values.get('purpose'),{method:'POST',body:JSON.stringify({email:values.get('email'),language:currentLanguage()})});
    status.textContent=t('If an eligible account exists, an email will arrive shortly. Check your spam folder too.');
   }else{
    if(!token||!/^[A-Za-z0-9_-]{43}$/.test(token))throw Error('Invalid link');
    await api('/operator-email/'+mode,{method:'POST',body:JSON.stringify({token,...(mode==='reset'?{password:password.value,language:currentLanguage()}:{})})});
    token=null;form.hidden=true;signIn.hidden=false;status.textContent=t(mode==='verify'?'Email confirmed. You can now sign in.':'Password changed. Sign in with your new password.');
   }
  }catch(error){
   if(mode!=='request')document.querySelector<HTMLElement>('#access-new-link')!.hidden=false;
   status.textContent=(error as {code?:string})?.code==='MAIL_UNAVAILABLE'?t('Email delivery is not configured yet. Please try again later.'):mode==='request'?t('Unable to send the request. Please try again later.'):t('This link is invalid, expired or already used. Request a new email through account recovery.');
  }finally{if(mode==='reset'){password.value='';repeat.value='';passwords();}busy=false;button.disabled=false;form.removeAttribute('aria-busy');status.focus();}
 });
 // Pasting a mail link while this page is already open may be a same-document navigation.
 win.addEventListener('hashchange',()=>{const next=new URLSearchParams(win.location.hash.slice(1));if(next.has('verify')||next.has('reset'))win.location.reload();});
 win.addEventListener('pagehide',()=>{token=null;password.value='';repeat.value='';});
}
