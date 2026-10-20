import {resolveStartupProject,setStartupProject} from '../lib/startup-project';
import {storageAllowed} from '../lib/storage';
import {STORAGE_KEY} from '../lib/engine';
async function start(){
 const host=document.getElementById('editor')!;host.inert=true;host.setAttribute('aria-busy','true');document.getElementById('editor-status')!.textContent=JSON.parse(host.dataset.words!).startupLoading;
 try{let saved:string|null=null,storageError=false;try{if(storageAllowed())saved=localStorage.getItem(STORAGE_KEY);}catch{storageError=true;}
  const state=await resolveStartupProject(saved);setStartupProject({...state,error:state.error||storageError});await import('./editor');host.dataset.ready='true';
 }catch(error){const status=document.getElementById('editor-status');if(status)status.textContent=String(error);}
 finally{host.inert=false;host.removeAttribute('aria-busy');}
}
void start();
