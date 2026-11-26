import {createAdminToast} from './admin-toast';
import type {adminText} from '../lib/admin-text';
type User={id:string;username:string;displayName:string;email:string;role:'root'|'admin';active:boolean;mustChangePassword:boolean};
const root=document.getElementById('jt-admin')!;
const t=JSON.parse(root.dataset.text!) as typeof adminText.en;
const $=(id:string)=>document.getElementById(id)!;
const form=(id:string)=>$(id) as HTMLFormElement;
const field=(id:string,name:string)=>form(id).elements.namedItem(name) as HTMLInputElement;
const base=root.dataset.api!.replace(/\/$/,'');
let csrf='',user:User|null=null,busy=false,resetId='',deleteId='',blockId='';
const dialog=$('admin-reset-dialog') as HTMLDialogElement;
const createDialog=$('admin-create-dialog') as HTMLDialogElement;
const deleteDialog=$('admin-delete-dialog') as HTMLDialogElement;
const blockDialog=$('admin-block-dialog') as HTMLDialogElement;
const toast=createAdminToast($('admin-toast'),$('admin-status'),$('admin-toast-close') as HTMLButtonElement);
class RequestError extends Error{constructor(public code:string){super(code);}}
function message(error:unknown){return error instanceof RequestError?(error.code==='backend_unavailable'?t.unavailable:t.errors[error.code as keyof typeof t.errors]||t.errors.internal_error):t.unavailable;}
function status(text:string,error=false){toast.show(text,error);}
function signedOut(){$('admin-header-session').hidden=true;$('admin-identity').textContent='';$('admin-role').textContent='';root.dataset.state='signed-out';csrf='';user=null;$('admin-login-panel').hidden=false;$('admin-workspace').hidden=true;$('admin-users').replaceChildren();dialog.close();createDialog.close();deleteDialog.close();blockDialog.close();root.querySelectorAll<HTMLInputElement>('input[type=password]').forEach(input=>input.value='');}
async function api<T=Record<string,never>>(path:string,method='GET',body?:unknown,establishingSession=false):Promise<T>{
 const response=await fetch(base+'/api/v1/'+path,{method,credentials:'include',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{...(method==='GET'?{}:{'Content-Type':'application/json','X-CSRF-Token':csrf})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 if(!response.ok){
  const value=await response.json().catch(()=>({error:response.status>=500?'backend_unavailable':'internal_error'}));
  let code=value.error||'internal_error';
  if(code==='unauthenticated'){
   code=establishingSession?'session_not_established':user?'unauthenticated':'sign_in_required';signedOut();
  }
  throw new RequestError(code);
 }
 return response.status===204?undefined as T:await response.json() as T;
}
function showUser(next:User){
 $('admin-header-session').hidden=false;root.dataset.state='signed-in';user=next;$('admin-login-panel').hidden=true;$('admin-workspace').hidden=false;
 $('admin-identity').textContent=next.displayName||next.username;$('admin-role').textContent=next.role==='root'?t.root:t.admin;
 $('admin-password-required').hidden=!next.mustChangePassword;$('admin-profile-panel').hidden=next.mustChangePassword;
 const view=next.mustChangePassword?'profile':root.dataset.view;
 const canManage=next.role==='root'&&!next.mustChangePassword;
 $('admin-overview').hidden=view!=='overview'&&(view!=='users'||canManage);
 $('admin-profile-page').hidden=view!=='profile';
 $('admin-back').hidden=view==='overview'||next.mustChangePassword;
 $('admin-users-tile').hidden=!canManage;
 $('admin-users-panel').hidden=view!=='users'||!canManage;
 field('admin-profile-form','displayName').value=next.displayName;field('admin-profile-form','email').value=next.email;
}
const icons={
 block:'<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>',
 enable:'<path d="m5 12 4 4L19 6"/>',
 reset:'<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/><path d="M12 7v5l3 2"/>',
 delete:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>'
};
function button(text:string,icon:keyof typeof icons,action:()=>void){
 const b=document.createElement('button');b.type='button';b.className='secondary admin-icon-button'+(icon==='delete'?' admin-delete-action':'');
 b.setAttribute('aria-label',text);b.dataset.tooltip=text;
 // Icon markup is static; no account or API data is inserted as HTML.
 b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+icons[icon]+'</svg>';
 b.addEventListener('click',action);return b;
}
async function users(){
 if(user?.role!=='root'||user.mustChangePassword||root.dataset.view!=='users')return;
 const value=await api<{users:User[]}>('admin/users');const list=$('admin-users');list.replaceChildren();
 if(!value.users.length){list.textContent=t.noUsers;return;}
 for(const account of value.users){
  const row=document.createElement('div');row.className='admin-user';row.dataset.userId=account.id;
  const info=document.createElement('div');info.className='admin-user-info';
  const name=document.createElement('strong');name.textContent=account.displayName||account.username;
  const details=document.createElement('small');details.textContent=`${account.username} · ${account.role==='root'?t.root:t.admin} · ${account.active?t.active:t.blocked}`;
  info.append(name,details);row.append(info);
  if(account.role!=='root'){
   const actions=document.createElement('div');actions.className='admin-user-actions';
   actions.append(button(account.active?t.disable:t.enable,account.active?'block':'enable',()=>{
    if(account.active){blockId=account.id;toast.hide();$('admin-block-username').textContent=account.username;blockDialog.showModal();return;}
    void perform(async()=>{await api('admin/users/'+account.id,'PATCH',{active:true});await users();status(t.saved);});
   }),button(t.reset,'reset',()=>{
    resetId=account.id;toast.hide();form('admin-reset-form').reset();$('admin-reset-username').textContent=account.username;dialog.showModal();
   }),button(t.deleteAccount,'delete',()=>{
    deleteId=account.id;toast.hide();$('admin-delete-username').textContent=account.username;deleteDialog.showModal();
   }));row.append(actions);
  }
  list.append(row);
 }
}
async function perform(work:()=>Promise<void>){
 if(busy)return;busy=true;root.setAttribute('aria-busy','true');($('admin-logout') as HTMLButtonElement).disabled=true;
 root.querySelectorAll<HTMLButtonElement>('button').forEach(b=>{if(b.id!=='admin-toast-close')b.disabled=true;});
 try{await work();}catch(error){status(message(error),true);}
 finally{busy=false;($('admin-logout') as HTMLButtonElement).disabled=false;root.removeAttribute('aria-busy');root.querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.disabled=false);}
}
form('admin-login-form').addEventListener('submit',event=>{event.preventDefault();void perform(async()=>{
 const value=await api<{user:User;csrfToken:string}>('auth/login','POST',{username:field('admin-login-form','username').value,password:field('admin-login-form','password').value});
 field('admin-login-form','password').value='';csrf=value.csrfToken;
 // A successful password check is not enough: verify that the browser retained its cookie.
 const verified=await api<{user:User;csrfToken:string}>('auth/me','GET',undefined,true);
 csrf=verified.csrfToken;showUser(verified.user);await users();status(verified.user.mustChangePassword?t.required:t.signedIn);
});});
$('admin-logout').addEventListener('click',()=>void perform(async()=>{await api('auth/logout','POST',{});signedOut();field('admin-login-form','username').focus();status(t.signedOut);}));
form('admin-profile-form').addEventListener('submit',event=>{event.preventDefault();void perform(async()=>{
 const value=await api<{user:User}>('auth/profile','PATCH',{displayName:field('admin-profile-form','displayName').value,email:field('admin-profile-form','email').value});showUser(value.user);status(t.saved);await users();
});});
form('admin-password-form').addEventListener('submit',event=>{event.preventDefault();void perform(async()=>{
 await api('auth/password','PUT',{currentPassword:field('admin-password-form','currentPassword').value,newPassword:field('admin-password-form','newPassword').value});form('admin-password-form').reset();signedOut();status(t.passwordChanged);
});});
form('admin-create-form').addEventListener('submit',event=>{event.preventDefault();void perform(async()=>{
 await api('admin/users','POST',Object.fromEntries(new FormData(form('admin-create-form'))));createDialog.close();form('admin-create-form').reset();await users();status(t.created);
});});
form('admin-reset-form').addEventListener('submit',event=>{event.preventDefault();void perform(async()=>{
 await api('admin/users/'+resetId+'/password','POST',{password:field('admin-reset-form','password').value});form('admin-reset-form').reset();dialog.close();status(t.saved);await users();
});});
[dialog,createDialog,deleteDialog,blockDialog].forEach(modal=>modal.addEventListener('cancel',event=>{if(busy)event.preventDefault();}));
$('admin-create-open').addEventListener('click',()=>{toast.hide();form('admin-create-form').reset();createDialog.showModal();});
$('admin-create-cancel').addEventListener('click',()=>createDialog.close());
createDialog.addEventListener('close',()=>form('admin-create-form').reset());
$('admin-block-cancel').addEventListener('click',()=>blockDialog.close());
$('admin-block-confirm').addEventListener('click',()=>void perform(async()=>{
 await api('admin/users/'+blockId,'PATCH',{active:false});blockDialog.close();await users();$('admin-create-open').focus();status(t.saved);
}));
blockDialog.addEventListener('close',()=>{blockId='';$('admin-block-username').textContent='';});
$('admin-delete-cancel').addEventListener('click',()=>deleteDialog.close());
$('admin-delete-confirm').addEventListener('click',()=>void perform(async()=>{
 await api('admin/users/'+deleteId,'DELETE',{});deleteDialog.close();await users();$('admin-create-open').focus();status(t.deleted);
}));
deleteDialog.addEventListener('close',()=>{deleteId='';$('admin-delete-username').textContent='';});
$('admin-reset-cancel').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>form('admin-reset-form').reset());
void perform(async()=>{
 try{const value=await api<{user:User;csrfToken:string}>('auth/me');csrf=value.csrfToken;showUser(value.user);status('');await users();}
 catch(error){if(error instanceof RequestError&&error.code==='sign_in_required'){signedOut();status('');}else throw error;}
});
