import {initializeSelectPicker} from './select-picker';
import {declarations} from '../../../shared/declarations';
import {api} from './client';
import {currentLanguage,t} from '../lib/i18n';
export function initializeOperatorRegistration(){
 const form=document.querySelector<HTMLFormElement>('#operator-register');if(!form)return;
 const password=form.querySelector<HTMLInputElement>('[name=password]')!,repeat=form.querySelector<HTMLInputElement>('#register-password-repeat')!;
 function validatePasswords(){const mismatch=repeat.value!==''&&repeat.value!==password.value;repeat.setCustomValidity(mismatch?t('Passwords do not match.'):'');if(mismatch)repeat.setAttribute('aria-invalid','true');else repeat.removeAttribute('aria-invalid');}
 function clearPasswordError(){repeat.setCustomValidity('');repeat.removeAttribute('aria-invalid');}
 password.addEventListener('input',validatePasswords);repeat.addEventListener('input',validatePasswords);form.addEventListener('reset',clearPasswordError);
 const type=form.querySelector<HTMLSelectElement>('#register-type')!,organization=form.querySelector<HTMLElement>('#register-organization')!,check=form.querySelector<HTMLInputElement>('[name=organizationAuthorized]')!,feedback=form.querySelector<HTMLElement>('#register-feedback')!;
 const typePicker=initializeSelectPicker(type);
 function sync(){const org=type.value==='organization';organization.hidden=!org;check.disabled=!org;check.required=org;check.checked=false;}
 type.addEventListener('change',sync);sync();let busy=false;
 const dialog=document.querySelector<HTMLDialogElement>('#operator-registration')!,trigger=document.querySelector<HTMLButtonElement>('#open-operator-registration')!,cancel=document.querySelector<HTMLButtonElement>('#register-cancel')!;
 const dismiss=()=>{if(!busy)dialog.close();};
 trigger.addEventListener('click',()=>{if(!dialog.open)dialog.showModal();});
 cancel.addEventListener('click',dismiss);
 dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
 dialog.addEventListener('click',event=>{const rect=dialog.getBoundingClientRect();if(event.target===dialog&&(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom))dismiss();});
 dialog.addEventListener('close',()=>{form.reset();sync();feedback.textContent='';if(document.activeElement!==document.querySelector('#operator-password'))trigger.focus();});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;validatePasswords();if(!form.reportValidity())return;busy=true;const button=form.querySelector<HTMLButtonElement>('button[type=submit]')!;button.disabled=true;cancel.disabled=true;typePicker.setDisabled(true);form.setAttribute('aria-busy','true');feedback.textContent='';
  const values=new FormData(form);
  try{await api('/operator-registrations',{method:'POST',body:JSON.stringify({handle:values.get('handle'),email:values.get('email'),language:currentLanguage(),password:password.value,accountType:type.value,ageConfirmed:values.get('ageConfirmed')==='on',ageVersion:declarations.age.version,...(type.value==='organization'?{organizationAuthorized:check.checked,organizationVersion:declarations.organization.version}:{})})});
   document.querySelector<HTMLInputElement>('#operator-handle')!.value=String(values.get('handle'));form.reset();sync();dialog.close();
   document.querySelector<HTMLElement>('#login-status')!.textContent=t('Check your inbox to confirm your email address before signing in. If the account already exists, use account recovery.');document.querySelector<HTMLElement>('#operator-password')!.focus();
  }catch(error){feedback.textContent=(error as {code?:string})?.code==='MAIL_UNAVAILABLE'?t('Email delivery is not configured yet. Please try again later.'):t('Unable to create account. Check the handle, password and required confirmations.');feedback.focus();}
  finally{password.value='';repeat.value='';clearPasswordError();busy=false;button.disabled=false;cancel.disabled=false;typePicker.setDisabled(false);form.removeAttribute('aria-busy');}
 });
}
