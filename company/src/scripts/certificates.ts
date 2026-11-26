import type {certificateText} from '../lib/certificate-text';
type Status='ok'|'warning'|'critical'|'expired'|'error'|'unchecked';
type Result={targetKey:string;origin:string;label:string;host:string;status:Status;validFrom:string|null;validTo:string|null;daysRemaining:number|null;subject:string|null;issuer:string|null;subjectAltName:string|null;fingerprint:string|null;error:string|null;lastCheckedAt:string|null};
type Overview={targets:Result[];summary:Record<Status,number>;configuration:{enabled:boolean;cron:string|null;timezone:string;warningDays:number;criticalDays:number;mailConfigured:boolean;recipient:string|null;from:string|null};monitor:{running:boolean;lastFinishedAt:string|null;lastStartedAt:string|null;lastError:string|null;lastMailAt:string|null;lastMailError:string|null;nextRunAt:string|null}};
export function createCertificateAdmin(options:{api:<T>(path:string,method?:string,body?:unknown)=>Promise<T>;perform:(work:()=>Promise<void>)=>Promise<void>;status:(text:string,error?:boolean)=>void;failure:(error:unknown)=>string}){
 const $=(id:string)=>document.getElementById(id)!;
 const panel=$('admin-certificates-panel'),t=JSON.parse(panel.dataset.text!) as typeof certificateText.en;
 const dialog=$('cert-detail-dialog') as HTMLDialogElement;
 let data:Overview|undefined,timer:number|undefined,wasRunning=false;
 const date=(value:string|null)=>value?new Intl.DateTimeFormat(document.documentElement.lang,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'—';
 const errorText=(code:string|null)=>code?t.errors[code as keyof typeof t.errors]||code:'—';
 function definition(list:HTMLElement,label:string,value:string){
  const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;list.append(dt,dd);
 }
 function details(row:Result){
  $('cert-detail-host').textContent=row.origin;const list=$('cert-details');list.replaceChildren();
  for(const [label,value] of [[t.status,t.statuses[row.status]],[t.validFrom,date(row.validFrom)],[t.validTo,date(row.validTo)],[t.days,String(row.daysRemaining??'—')],[t.subject,row.subject||'—'],[t.issuer,row.issuer||'—'],[t.names,row.subjectAltName||'—'],[t.fingerprint,row.fingerprint||'—'],[t.tlsError,row.error||'—'],[t.lastCheck,date(row.lastCheckedAt)]])definition(list,label,value);
  dialog.showModal();
 }
 function refreshButtons(){
  ($('cert-check') as HTMLButtonElement).disabled=!data?.configuration.enabled||!data.targets.length||data.monitor.running;
  ($('cert-test-mail') as HTMLButtonElement).disabled=!data?.configuration.mailConfigured;
 }
 function render(value:Overview){
  data=value;$('cert-disabled').hidden=value.configuration.enabled;$('cert-running').hidden=!value.monitor.running;
  const summary=$('cert-summary');summary.replaceChildren();
  for(const [label,count] of [[t.total,value.targets.length],[t.healthy,value.summary.ok],[t.attention,value.summary.warning+value.summary.critical+value.summary.expired+value.summary.error],[t.unchecked,value.summary.unchecked]]){
   const card=document.createElement('div'),number=document.createElement('strong'),caption=document.createElement('span');number.textContent=String(count);caption.textContent=String(label);card.append(number,caption);summary.append(card);
  }
  const list=$('cert-list');list.replaceChildren();
  if(!value.targets.length){const empty=document.createElement('p');empty.className='admin-hint';empty.textContent=t.empty;list.append(empty);}
  for(const row of value.targets){
   const button=document.createElement('button');button.type='button';button.className='cert-row';button.dataset.status=row.status;
   const name=document.createElement('span'),title=document.createElement('strong'),host=document.createElement('small');title.textContent=row.label;host.textContent=row.origin;name.append(title,host);
   const meta=document.createElement('span');meta.className='cert-row-meta';
   const badge=document.createElement('span');badge.className='cert-badge';badge.dataset.status=row.status;badge.textContent=t.statuses[row.status];
   const expiry=document.createElement('small');expiry.textContent=row.daysRemaining===null?'—':t.days+': '+row.daysRemaining;meta.append(badge,expiry);button.append(name,meta);button.addEventListener('click',()=>details(row));list.append(button);
  }
  const config=$('cert-configuration');config.replaceChildren();
  for(const [label,text] of [[t.schedule,value.configuration.cron||t.external],[t.timezone,value.configuration.timezone],[t.thresholds,value.configuration.warningDays+' / '+value.configuration.criticalDays],[t.configuration,value.configuration.mailConfigured?t.mailReady:t.mailMissing],[t.recipient,value.configuration.recipient||'—'],[t.sender,value.configuration.from||'—'],[t.lastCheck,date(value.monitor.lastFinishedAt)],[t.nextCheck,date(value.monitor.nextRunAt)],[t.lastMail,date(value.monitor.lastMailAt)]] )definition(config,label,text);
  if(value.monitor.lastError)definition(config,t.attention,errorText(value.monitor.lastError));
  if(value.monitor.lastMailError)definition(config,t.configuration,errorText(value.monitor.lastMailError));
  refreshButtons();
 }
 async function load(){
  window.clearTimeout(timer);if(panel.hidden)return;
  const value=await options.api<Overview>('admin/certificates');if(panel.hidden)return;
  render(value);
  if(wasRunning&&!value.monitor.running)options.status(value.monitor.lastError?errorText(value.monitor.lastError):t.finished,!!value.monitor.lastError);
  wasRunning=value.monitor.running;
  if(value.monitor.running)timer=window.setTimeout(()=>void load().catch(error=>options.status(options.failure(error),true)),2000);
 }
 $('cert-check').addEventListener('click',()=>void options.perform(async()=>{await options.api('admin/certificates/check','POST',{});wasRunning=true;options.status(t.started);await load();}));
 $('cert-test-mail').addEventListener('click',()=>void options.perform(async()=>{await options.api('admin/certificates/test-email','POST',{});options.status(t.mailSent);await load();}));
 $('cert-detail-close').addEventListener('click',()=>dialog.close());
 window.addEventListener('pagehide',()=>window.clearTimeout(timer));
 return {load,refreshButtons,reset(){panel.hidden=true;window.clearTimeout(timer);data=undefined;wasRunning=false;dialog.close();$('cert-list').replaceChildren();}};
}
