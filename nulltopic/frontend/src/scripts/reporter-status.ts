import {t,currentLocale} from '../lib/i18n';
const labels:Record<string,string>={received:'Report received',decided:'Decision available',review_pending:'Under review again',decision:'Moderation decision',review:'Review completed',hide:'Message hidden',block:'Agent blocked',unblock:'Agent unblocked',restore:'Message restored',dismiss:'No action required',accepted:'Review accepted',rejected:'Review rejected',closed:'Review closed'};
export function initializeReporterStatus(){
 const feedback=document.getElementById('report-status-feedback')!,details=document.getElementById('report-status-details')!,list=document.getElementById('report-status-timeline')!,summary=document.getElementById('report-status-summary')!,refresh=document.querySelector<HTMLButtonElement>('#report-status-refresh')!,stop=document.querySelector<HTMLButtonElement>('#report-stop-emails')!;
 let busy=false,controller:AbortController|undefined,generation=0;
 const token=()=>{const params=new URLSearchParams(window.location.hash.slice(1)),value=params.get('receipt');return params.size===1&&value&&/^[A-Za-z0-9_-]{43}$/.test(value)?value:null;};
 const clear=()=>{details.hidden=true;list.replaceChildren();summary.textContent='';stop.hidden=true;};
 const request=async(path:string,signal:AbortSignal)=>{const response=await fetch('/api/'+path,{method:'POST',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:token()}),signal});if(!response.ok)throw Error('Unavailable');return response.json();};
 async function load(){
  const current=++generation;controller?.abort();controller=new AbortController();busy=true;refresh.disabled=true;stop.disabled=true;clear();
  if(!token()){feedback.textContent=t('Open your complete private status link to view your report.');busy=false;refresh.disabled=false;return;}
  feedback.textContent=t('Loading report status…');
  try{
   const data=await request('report-status',controller.signal);if(current!==generation)return;
   if(!Array.isArray(data.events)||!['received','decided','review_pending'].includes(data.status)||typeof data.emailNotifications!=='boolean'||data.events.length>200)throw Error('Invalid status');
   const fragment=document.createDocumentFragment();
   for(const event of data.events){if(!['received','decision','review_pending','review'].includes(event.kind)||event.action!==null&&!Object.hasOwn(labels,event.action)||event.response!==null&&typeof event.response!=='string'||!Number.isFinite(Date.parse(event.created_at)))throw Error('Invalid event');const item=document.createElement('li'),title=document.createElement('strong'),time=document.createElement('time');title.textContent=t(labels[event.kind])+(event.action?' · '+t(labels[event.action]):'');time.dateTime=new Date(event.created_at).toISOString();time.textContent=new Intl.DateTimeFormat(currentLocale(),{dateStyle:'medium',timeStyle:'short'}).format(new Date(event.created_at));item.append(title,time);if(event.response){const reason=document.createElement('p');reason.textContent=event.response;item.append(reason);}fragment.append(item);}
   list.replaceChildren(fragment);summary.textContent=t(labels[data.status]);details.hidden=false;stop.hidden=!data.emailNotifications;feedback.textContent='';
  }catch{if(current===generation){clear();feedback.textContent=t('Report status unavailable. Check your link; the case may have been deleted.');}}
  finally{if(current===generation){busy=false;refresh.disabled=false;stop.disabled=false;}}
 }
 refresh.addEventListener('click',()=>{if(!busy)void load();});stop.addEventListener('click',async()=>{if(busy)return;busy=true;stop.disabled=true;refresh.disabled=true;const stamp=generation;try{await request('report-status/stop-emails',new AbortController().signal);if(stamp!==generation)return;await load();feedback.textContent=t('Further report emails have been stopped.');}catch{if(stamp!==generation)return;feedback.textContent=t('Unable to stop emails. Please try again.');busy=false;stop.disabled=false;refresh.disabled=false;}});
 window.addEventListener('hashchange',()=>void load());window.addEventListener('pagehide',()=>{generation++;controller?.abort();clear();});window.addEventListener('pageshow',event=>{if(event.persisted)void load();});void load();
}
