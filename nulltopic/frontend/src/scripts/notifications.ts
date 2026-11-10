import {api} from './client';
import {t,currentLanguage} from '../lib/i18n';
import {initializeUnsavedSettings} from './unsaved-settings';
import {showErrorToast} from './toast';

type Preferences={language:string;registration?:boolean;moderation?:boolean;review?:boolean;queue?:boolean};
export async function initializeNotifications(options:{navigate?:(url:string)=>void}={}){
 const d=document,w=d.defaultView!,navigate=options.navigate||((url:string)=>w.location.assign(url));
 const form=d.querySelector<HTMLFormElement>('#notification-config')!,content=d.getElementById('notification-content')!,status=d.getElementById('notification-status')!;
 const header=d.getElementById('notification-header-actions')!,save=d.querySelector<HTMLButtonElement>('#notification-header-save')!,cancel=d.querySelector<HTMLButtonElement>('#notification-header-cancel')!,back=d.querySelector<HTMLAnchorElement>('#notification-return')!;
 let csrf='',role:'operator'|'admin'=new URL(w.location.href).searchParams.get('role')==='admin'?'admin':'operator',baseline='',busy=false,ready=false,closed=false,returnUrl='/operator?lang='+currentLanguage()+'#account';
 const values=():Preferences=>{const result:Preferences={language:(form.elements.namedItem('language') as HTMLSelectElement).value};for(const key of role==='operator'?['registration','moderation','review']:['queue'])(result as any)[key]=(form.elements.namedItem(key) as HTMLInputElement).checked;return result;};
 const dirty=()=>ready&&JSON.stringify(values())!==baseline;
 function controls(){save.hidden=!dirty();save.disabled=busy||!dirty();cancel.disabled=busy;form.querySelectorAll<HTMLInputElement|HTMLSelectElement>('input,select').forEach(i=>i.disabled=busy||i.closest<HTMLElement>('[data-notification-role]')?.dataset.notificationRole!==undefined&&i.closest<HTMLElement>('[data-notification-role]')!.dataset.notificationRole!==role);}
 function discard(){if(!baseline)return;const before:Preferences=JSON.parse(baseline);for(const [key,value] of Object.entries(before)){const field=form.elements.namedItem(key) as HTMLInputElement|HTMLSelectElement;if(typeof value==='boolean')(field as HTMLInputElement).checked=value;else field.value=value;}controls();}
 const unsaved=initializeUnsavedSettings({dirty,busy:()=>busy,save:saveChanges,discard});
 function expired(){for(const link of d.querySelectorAll<HTMLElement>('body > header nav a.header-action'))link.hidden=false;ready=false;baseline='';unsaved.clear();content.hidden=header.hidden=true;form.reset();status.textContent=t('Your session could not be verified. Please sign in again.');back.href=(role==='admin'?'/administration':'/operator')+'?lang='+currentLanguage();back.hidden=false;}
 async function saveChanges(){
  if(closed||busy||!dirty())return false;busy=true;controls();form.setAttribute('aria-busy','true');
  try{await api('/'+role+'/notifications',{method:'PUT',headers:{'x-csrf-token':csrf},body:JSON.stringify(values())});if(closed)return false;baseline=JSON.stringify(values());return true;}
  catch(error){if(closed)return false;if([401,403].includes((error as {status?:number}).status||0))expired();else showErrorToast(t('Unable to save your changes. Keep editing or try again.'),d);return false;}
  finally{busy=false;if(!closed){form.removeAttribute('aria-busy');controls();}}
 }
 form.addEventListener('input',controls);form.addEventListener('change',controls);
 form.addEventListener('submit',async event=>{event.preventDefault();if(await saveChanges()&&!closed)navigate(returnUrl);});
 cancel.addEventListener('click',()=>{if(busy)return;discard();navigate(returnUrl);});
 w.addEventListener('pagehide',()=>{closed=true;ready=false;baseline='';form.reset();header.hidden=content.hidden=true;unsaved.clear();});
 w.addEventListener('pageshow',event=>{if(event.persisted)w.location.reload();});
 try{
  const session=await api('/session');if(closed)return;
  if(session.operatorId)role='operator';else if(session.adminId)role='admin';csrf=session.csrf;
  if(!session.operatorId&&(!session.adminId||session.adminRole==='root')){expired();return;}
  returnUrl=(role==='operator'?'/operator':'/administration')+'?lang='+currentLanguage()+(role==='operator'?'#account':'#overview');
  const preferences:Preferences=await api('/'+role+'/notifications');if(closed)return;
  for(const element of form.querySelectorAll<HTMLElement>('[data-notification-role]'))element.hidden=element.dataset.notificationRole!==role;
  for(const [key,value] of Object.entries(preferences)){const input=form.elements.namedItem(key) as HTMLInputElement|HTMLSelectElement|null;if(!input)continue;if(typeof value==='boolean')(input as HTMLInputElement).checked=value;else input.value=value;}
  baseline=JSON.stringify(values());ready=true;content.hidden=header.hidden=false;controls();
  for(const link of d.querySelectorAll<HTMLElement>('body > header nav a.header-action'))link.hidden=true;
 }catch{if(!closed)expired();}
}
