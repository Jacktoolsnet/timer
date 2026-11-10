import {t} from '../lib/i18n';
interface Challenge {twoFactorRequired?:boolean;csrf?:string;expiresAt?:string;resendAt?:string;}
export function initializeEmailLogin(options:{form:HTMLFormElement;send:(path:string,body:unknown)=>Promise<any>;csrf:(value:string)=>void;authenticated:()=>Promise<void>}){
 const form=options.form,doc=form.ownerDocument,win=doc.defaultView!,panel=form.querySelector<HTMLElement>('#email-login-challenge')!,credentials=form.querySelector<HTMLElement>('[data-password-login]')!,code=form.querySelector<HTMLInputElement>('#email-login-code')!,feedback=doc.getElementById('login-status')!;
 const verify=panel.querySelector<HTMLButtonElement>('[data-email-verify]')!,resend=panel.querySelector<HTMLButtonElement>('[data-email-resend]')!,cancel=panel.querySelector<HTMLButtonElement>('[data-email-cancel]')!;
 let active=false,busy=false,expires=0,resendAt=0,timer:number|undefined,generation=0;
 function controls(){const expired=Date.now()>=expires;verify.disabled=busy||expired||!/^\d{6}$/.test(code.value);resend.disabled=busy||expired||Date.now()<resendAt;cancel.disabled=busy;code.disabled=!active||busy||expired;}
 function schedule(){win.clearTimeout(timer);if(!active)return;const now=Date.now();const next=now<resendAt?Math.min(expires,resendAt):expires;if(next>now)timer=win.setTimeout(()=>{controls();if(Date.now()>=expires)feedback.textContent=t('This sign-in request expired. Start again.');schedule();},Math.min(next-now+25,2147483647));}
 function clear(){generation++;active=false;busy=false;win.clearTimeout(timer);code.value='';code.disabled=true;panel.hidden=true;credentials.hidden=false;credentials.querySelectorAll<HTMLInputElement>('input').forEach(input=>input.disabled=false);}
 function begin(value:Challenge,focus=true){if(!value.twoFactorRequired||!value.expiresAt||!value.resendAt)return false;if(value.csrf)options.csrf(value.csrf);active=true;expires=Date.parse(value.expiresAt);resendAt=Date.parse(value.resendAt);code.value='';const password=credentials.querySelector<HTMLInputElement>('[type=password]');if(password)password.value='';credentials.hidden=true;credentials.querySelectorAll<HTMLInputElement>('input').forEach(input=>input.disabled=true);panel.hidden=false;feedback.classList.remove('error');feedback.textContent='';controls();schedule();if(focus)code.focus();return true;}
 async function action(kind:'verify'|'resend'|'cancel'){
  if(!active||busy||(kind==='verify'&&verify.disabled)||(kind==='resend'&&resend.disabled))return;
  busy=true;controls();const current=generation,value=code.value;code.value='';feedback.textContent=t(kind==='verify'?'Checking sign-in code…':kind==='resend'?'Sending a new code…':'Cancelling sign-in…');
  try{const result=await options.send('/login/'+kind,kind==='verify'?{code:value}:{});if(current!==generation)return;if(result.csrf)options.csrf(result.csrf);
   if(kind==='verify'){clear();feedback.textContent='';await options.authenticated();}
   else if(kind==='cancel'){clear();feedback.textContent='';credentials.querySelector<HTMLInputElement>('input')?.focus();}
   else begin(result);
  }catch(error){if(current!==generation)return;const fault=error as {code?:string;status?:number;retryAt?:string};feedback.classList.add('error');if(fault.status===429&&fault.retryAt&&Number.isFinite(Date.parse(fault.retryAt))){resendAt=Math.max(resendAt,Date.parse(fault.retryAt));schedule();}if(fault.code==='LOGIN_CHALLENGE_INVALID'){clear();feedback.textContent=t('This sign-in request expired. Start again.');}else feedback.textContent=t(fault.status===429?'Too many attempts. Please wait before trying again.':fault.code==='LOGIN_CODE_INVALID'?'The code is incorrect. Please try again.':'Unable to complete email sign-in. Try again or start a new sign-in.');}
  finally{if(current===generation){busy=false;controls();if(active&&!code.disabled)code.focus();}}
 }
 code.addEventListener('input',controls);verify.addEventListener('click',()=>void action('verify'));resend.addEventListener('click',()=>void action('resend'));cancel.addEventListener('click',()=>void action('cancel'));
 form.addEventListener('submit',event=>{if(active){event.preventDefault();event.stopImmediatePropagation();void action('verify');}},true);
 win.addEventListener('pagehide',clear);
 return {begin,clear,pending:()=>active};
}
