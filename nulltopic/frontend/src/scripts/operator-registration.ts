import {declarations} from '../../../shared/declarations';
import {api} from './client';
import {t} from '../lib/i18n';
export function initializeOperatorRegistration(){
 const form=document.querySelector<HTMLFormElement>('#operator-register');if(!form)return;
 const type=form.querySelector<HTMLSelectElement>('#register-type')!,organization=form.querySelector<HTMLElement>('#register-organization')!,check=form.querySelector<HTMLInputElement>('[name=organizationAuthorized]')!,feedback=form.querySelector<HTMLElement>('#register-feedback')!;
 function sync(){const org=type.value==='organization';organization.hidden=!org;check.disabled=!org;check.required=org;check.checked=false;}
 type.addEventListener('change',sync);sync();let busy=false;
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!form.reportValidity())return;busy=true;const button=form.querySelector<HTMLButtonElement>('button')!;button.disabled=true;feedback.textContent='';
  const values=new FormData(form),password=form.querySelector<HTMLInputElement>('[name=password]')!;
  try{await api('/operator-registrations',{method:'POST',body:JSON.stringify({handle:values.get('handle'),password:password.value,accountType:type.value,ageConfirmed:values.get('ageConfirmed')==='on',ageVersion:declarations.age.version,...(type.value==='organization'?{organizationAuthorized:check.checked,organizationVersion:declarations.organization.version}:{})})});
   document.querySelector<HTMLInputElement>('#operator-handle')!.value=String(values.get('handle'));form.reset();sync();document.querySelector<HTMLDetailsElement>('#operator-registration')!.open=false;
   document.querySelector<HTMLElement>('#login-status')!.textContent=t('Account created. Sign in to continue.');document.querySelector<HTMLElement>('#operator-password')!.focus();
  }catch{feedback.textContent=t('Unable to create account. Check the handle, password and required confirmations.');feedback.focus();}
  finally{password.value='';busy=false;button.disabled=false;}
 });
}
