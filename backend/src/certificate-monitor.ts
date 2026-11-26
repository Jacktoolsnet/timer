import {randomUUID} from 'node:crypto';
import cron from 'node-cron';
import type {Database} from './database.js';
import type {CertificateConfig} from './certificate-config.js';
import {inspectCertificate,emptyCertificate,certificateRank,type CertificateResult,type CertificateStatus} from './certificate-probe.js';
import {sendCertificateMail,certificateMessage,type CertificateMail} from './certificate-mail.js';
import {ApiError} from './http.js';

export function createCertificateMonitor(config:CertificateConfig,db:Database,dependencies:{inspect?:typeof inspectCertificate;send?:(config:CertificateConfig,message:CertificateMail)=>Promise<void>}={}){
 const inspect=dependencies.inspect||inspectCertificate,send=dependencies.send||sendCertificateMail;
 const pending=new Set<Promise<unknown>>(),shutdown=new AbortController();
 let task:ReturnType<typeof cron.schedule>|undefined,closing=false;
 const track=<T>(promise:Promise<T>)=>{pending.add(promise);void promise.finally(()=>pending.delete(promise)).catch(()=>{});return promise;};
 async function overview(){
  const stored=await db.query('SELECT target_key,result FROM jt_certificate_results');
  const byKey=new Map(stored.rows.map(row=>[row.target_key,row.result as CertificateResult]));
  const targets=config.targets.map(target=>({...emptyCertificate(target),...byKey.get(target.targetKey),...target})).sort((a,b)=>certificateRank[a.status]-certificateRank[b.status]||a.origin.localeCompare(b.origin));
  const state=(await db.query("SELECT *,lock_until>now() AS running FROM jt_certificate_monitor WHERE id=true")).rows[0];
  return {targets,summary:Object.fromEntries(['ok','warning','critical','expired','error','unchecked'].map(status=>[status,targets.filter(row=>row.status===status).length])),
   configuration:{enabled:config.enabled,cron:config.scheduler?config.schedule:null,timezone:config.timezone,warningDays:config.warningDays,criticalDays:config.criticalDays,mailConfigured:!!config.mail&&!!config.recipient,recipient:config.recipient||null,from:config.mail?.from||null},
   monitor:{running:!!state.running,lastStartedAt:state.last_started_at,lastFinishedAt:state.last_finished_at,lastError:state.last_error||(!state.running&&state.owner?'check_interrupted':null),lastMailAt:state.last_mail_at,lastMailError:state.last_mail_error,nextRunAt:task?.getNextRun()?.toISOString()||null}};
 }
 async function claim(reason:string){
  if(!config.enabled||closing)throw new ApiError(409,'certificates_disabled');
  if(!config.targets.length)throw new ApiError(409,'certificates_no_targets');
  const owner=randomUUID();
  const row=await db.query(`UPDATE jt_certificate_monitor SET owner=$1,lock_until=now()+interval '15 minutes',last_started_at=now(),last_error=NULL,reason=$2
   WHERE id=true AND (lock_until IS NULL OR lock_until<=now()) AND (last_started_at IS NULL OR last_started_at<=now()-interval '60 seconds') RETURNING id`,[owner,reason]);
  if(!row.rowCount){
   const state=(await db.query('SELECT lock_until>now() AS running FROM jt_certificate_monitor WHERE id=true')).rows[0];
   throw new ApiError(state.running?409:429,state.running?'certificates_running':'certificates_limited');
  }
  return owner;
 }
 async function execute(owner:string){
  try{
   const previous=await db.query('SELECT target_key,notified_status FROM jt_certificate_results');
   const notified=new Map(previous.rows.map(row=>[row.target_key,row.notified_status as CertificateStatus|null]));
   const results:CertificateResult[]=[];let index=0;
   // Bounded parallelism + 50 targets + 30s deadline remain well within the 15-minute lease.
   const workers=await Promise.allSettled(Array.from({length:Math.min(4,config.targets.length)},async()=>{
    while(index<config.targets.length&&!closing){
     const target=config.targets[index++];
     let row:CertificateResult;
     try{row=await inspect(target,{...config,signal:shutdown.signal});}catch{row={...emptyCertificate(target),status:'error',error:'TLS_INSPECTION_FAILED',lastCheckedAt:new Date().toISOString()};}
     if(closing)throw new Error('stopping');
     await db.query('INSERT INTO jt_certificate_results(target_key,result) VALUES($1,$2) ON CONFLICT(target_key) DO UPDATE SET result=$2,updated_at=now()',[target.targetKey,JSON.stringify(row)]);
     results.push(row);
    }
   }));
   if(workers.some(worker=>worker.status==='rejected')||closing)throw new Error('check_failed');
   await db.query('DELETE FROM jt_certificate_results WHERE NOT(target_key=ANY($1::text[]))',[config.targets.map(target=>target.targetKey)]);
   const changes=results.filter(row=>row.status==='ok'?config.notifyRecovery&&!!notified.get(row.targetKey)&&notified.get(row.targetKey)!=='ok':notified.get(row.targetKey)!==row.status);
   for(const row of results)if(row.status==='ok'&&(!notified.get(row.targetKey)||!config.notifyRecovery))await db.query("UPDATE jt_certificate_results SET notified_status='ok' WHERE target_key=$1",[row.targetKey]);
   if(changes.length){
    if(config.mail&&config.recipient){
     try{
      await send(config,certificateMessage(changes));
      // Only acknowledge notifications after successful SMTP delivery; failures retry next run.
      await db.transaction(async client=>{
       for(const row of changes)await client.query('UPDATE jt_certificate_results SET notified_status=$2 WHERE target_key=$1',[row.targetKey,row.status]);
       await client.query('UPDATE jt_certificate_monitor SET last_mail_at=now(),last_mail_error=NULL WHERE id=true AND owner=$1',[owner]);
      });
     }catch{await db.query("UPDATE jt_certificate_monitor SET last_mail_error='mail_failed' WHERE id=true AND owner=$1",[owner]);}
    }else await db.query("UPDATE jt_certificate_monitor SET last_mail_error='mail_not_configured' WHERE id=true AND owner=$1",[owner]);
   }
   await db.query('UPDATE jt_certificate_monitor SET last_finished_at=now(),last_error=NULL,owner=NULL,lock_until=NULL WHERE id=true AND owner=$1',[owner]);
  }catch(error){
   await db.query("UPDATE jt_certificate_monitor SET last_finished_at=now(),last_error='check_failed',owner=NULL,lock_until=NULL WHERE id=true AND owner=$1",[owner]);
   throw error;
  }
 }
 async function run(reason='cli'){const owner=await claim(reason);await track(execute(owner));}
 async function launch(reason='manual'){
  const owner=await claim(reason);
  void track(execute(owner)).catch(()=>console.error(JSON.stringify({event:'certificate_check_failed'})));
 }
 async function testEmail(){
  if(!config.mail||!config.recipient)throw new ApiError(409,'mail_not_configured');
  const slot=await db.query("UPDATE jt_certificate_monitor SET last_test_at=now() WHERE id=true AND (last_test_at IS NULL OR last_test_at<=now()-interval '60 seconds') RETURNING id");
  if(!slot.rowCount)throw new ApiError(429,'certificates_limited');
  try{
   await track(send(config,{subject:'[JackTools] Testmail Zertifikatsprüfung',text:'Die SMTP-Konfiguration der JackTools-Zertifikatsprüfung funktioniert.',html:'<h1>JackTools</h1><p>Die SMTP-Konfiguration der Zertifikatsprüfung funktioniert.</p>'}));
   await db.query('UPDATE jt_certificate_monitor SET last_mail_at=now(),last_mail_error=NULL WHERE id=true');
  }catch{await db.query("UPDATE jt_certificate_monitor SET last_mail_error='mail_failed' WHERE id=true");throw new ApiError(502,'mail_failed');}
 }
 function startScheduler(){
  if(task||!config.enabled||!config.scheduler)return;
  const scheduled=async(reason:string)=>{try{await run(reason);}catch(error){if(!(error instanceof ApiError&&['certificates_running','certificates_limited'].includes(error.code)))console.error(JSON.stringify({event:'certificate_check_failed'}));}};
  task=cron.schedule(config.schedule,()=>scheduled('cron'),{timezone:config.timezone,noOverlap:true});
  if(config.checkOnStart)void scheduled('startup');
 }
 async function close(){closing=true;shutdown.abort();await task?.destroy();await Promise.allSettled([...pending]);}
 return {overview,launch,run,testEmail,startScheduler,close};
}
export type CertificateMonitor=ReturnType<typeof createCertificateMonitor>;
