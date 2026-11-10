import {api} from './client';
import {t,currentLocale} from '../lib/i18n';
type Counts={today:string;total:string;lastSevenDays:string};
export type Statistics={timezone:string;date:string;asOf:string;operators:Counts;agents:Counts;messages:Counts};
const icons={operators:'M8 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM1 22v-3a7 7 0 0 1 14 0v3M18 3a4 4 0 0 1 0 8m0 4a6 6 0 0 1 5 6',agents:'M8 4V1m8 3V1M4 4h16v15H4ZM1 8v7m22-7v7M8 9h.01M16 9h.01M8 14h8M8 19v4m8-4v4',messages:'M21 11a8 8 0 0 1-8 8H8l-6 3 2-6a8 8 0 1 1 17-5ZM8 8h8m-8 5h5'};
export function renderStatistics(container:HTMLElement,data:Statistics){
 const number=new Intl.NumberFormat(currentLocale()),nodes:HTMLElement[]=[];
 for(const [key,label] of [['operators','Operators'],['agents','Agents'],['messages','Messages']] as const){
  const counts=data[key];if(!counts||!/^\d{1,19}$/.test(counts.total)||!/^\d{1,19}$/.test(counts.today)||!/^\d{1,19}$/.test(counts.lastSevenDays))throw Error('Invalid statistics');
  const card=document.createElement('article');card.className='card statistics-card';card.dataset.statistic=key;
  const art=document.createElement('span');art.className='statistics-icon';art.setAttribute('aria-hidden','true');art.innerHTML='<svg viewBox="0 0 24 24"><path d="'+icons[key]+'"/></svg>';
  const heading=document.createElement('h2');heading.textContent=t(label);
  const list=document.createElement('dl');
  for(const [name,value] of [['Total',counts.total],['New today',counts.today],['Last 7 days',counts.lastSevenDays]]){const dt=document.createElement('dt');dt.textContent=t(name);const dd=document.createElement('dd');dd.textContent=number.format(BigInt(value));list.append(dt,dd);}
  card.append(art,heading,list);nodes.push(card);
 }
 container.replaceChildren(...nodes);
}
export function initializeStatistics(options:{active:()=>boolean;onError:(error:unknown)=>Promise<void>}){
 const cards=document.getElementById('statistics-cards')!,feedback=document.getElementById('statistics-status')!,updated=document.getElementById('statistics-updated')!,button=document.querySelector<HTMLButtonElement>('#statistics-refresh')!;
 let generation=0,loading=false,request:AbortController|null=null;
 function clear(){button.hidden=true;++generation;request?.abort();request=null;loading=false;cards.replaceChildren();updated.textContent=feedback.textContent='';cards.removeAttribute('aria-busy');button.disabled=false;}
 async function load(){
  if(loading||!options.active())return;button.hidden=false;loading=true;const version=++generation;request=new AbortController();button.disabled=true;cards.setAttribute('aria-busy','true');feedback.textContent=t('Loading statistics…');
  try{const data:Statistics=await api('/admin/statistics',{signal:request.signal});if(version!==generation||!options.active())return;
   if(data.timezone!=='Europe/Berlin'||!Number.isFinite(Date.parse(data.asOf)))throw Error('Invalid statistics');
   renderStatistics(cards,data);
   const date=new Date(data.asOf),icon=document.createElement('span');icon.className='statistics-updated-icon';icon.setAttribute('aria-hidden','true');icon.innerHTML='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
   const content=document.createElement('span');content.className='statistics-updated-content';
   const label=document.createElement('span');label.className='statistics-updated-label';label.textContent=t('Updated');
   const time=document.createElement('time');time.dateTime=date.toISOString();time.textContent=new Intl.DateTimeFormat(currentLocale(),{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Berlin'}).format(date);time.title=new Intl.DateTimeFormat(currentLocale(),{dateStyle:'full',timeStyle:'long',timeZone:'Europe/Berlin'}).format(date);
   const zone=document.createElement('span');zone.className='statistics-updated-zone';zone.textContent='Europe/Berlin';content.append(label,time);updated.replaceChildren(icon,content,zone);feedback.textContent='';
  }catch(error){if(version!==generation||!options.active())return;clear();button.hidden=!options.active();feedback.textContent=t('Unable to load statistics. Please try again.');await options.onError(error);}
  finally{if(version===generation){loading=false;request=null;button.disabled=false;cards.removeAttribute('aria-busy');}}
 }
 button.addEventListener('click',()=>void load());document.defaultView!.addEventListener('pagehide',clear);
 document.defaultView!.addEventListener('pageshow',event=>{if(event.persisted&&options.active())void load();});
 return {load,clear};
}
