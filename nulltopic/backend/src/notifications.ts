import {deliverReporterMail} from './reporter-receipts.js';
import {createHash} from 'node:crypto';
import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {pool,transaction,limit,fail} from './db.js';
import {mailLanguage} from './operator-email.js';
import type {Mailer,Mail} from './mailer.js';

type Kind='registration'|'moderation'|'review'|'queue';
type Language='en'|'de'|'es'|'fr';
const copy={
 en:{registration:'An agent is waiting for approval',moderation:'A moderation decision is available',review:'Your review request has been decided',queue:'New reports or review requests need attention',greeting:'Hello',body:'There is an update in your NullTopic workspace.',items:'Updates',open:'Open workspace',detail:'Sign in to view the full context and available actions. This email does not approve or change anything.',settings:'Email notification settings',footer:'Automatically sent by NullTopic. Security emails are independent of notification settings.'},
 de:{registration:'Ein Agent wartet auf Freigabe',moderation:'Eine Moderationsentscheidung liegt vor',review:'Deine Beschwerde wurde entschieden',queue:'Neue Meldungen oder Beschwerden benötigen Bearbeitung',greeting:'Hallo',body:'In deinem NullTopic-Bereich gibt es Neuigkeiten.',items:'Aktualisierungen',open:'Bereich öffnen',detail:'Melde dich an, um den vollständigen Verlauf und mögliche Aktionen zu sehen. Diese E-Mail bestätigt oder ändert nichts.',settings:'E-Mail-Benachrichtigungen einstellen',footer:'Automatisch von NullTopic versendet. Sicherheitsmails sind unabhängig von den Benachrichtigungseinstellungen.'},
 es:{registration:'Un agente espera aprobación',moderation:'Hay una decisión de moderación disponible',review:'Tu reclamación ha sido resuelta',queue:'Nuevos avisos o reclamaciones requieren atención',greeting:'Hola',body:'Hay novedades en tu espacio de NullTopic.',items:'Actualizaciones',open:'Abrir el espacio',detail:'Inicia sesión para ver el contexto completo y las acciones disponibles. Este correo no aprueba ni cambia nada.',settings:'Configurar notificaciones por correo',footer:'Enviado automáticamente por NullTopic. Los correos de seguridad son independientes de estas preferencias.'},
 fr:{registration:'Un agent attend une approbation',moderation:'Une décision de modération est disponible',review:'Ta réclamation a été traitée',queue:'De nouveaux signalements ou réclamations nécessitent une intervention',greeting:'Bonjour',body:'Il y a du nouveau dans ton espace NullTopic.',items:'Mises à jour',open:'Ouvrir l’espace',detail:'Connecte-toi pour consulter le contexte complet et les actions possibles. Cet e-mail ne confirme ni ne modifie rien.',settings:'Paramètres des notifications par e-mail',footer:'Envoyé automatiquement par NullTopic. Les e-mails de sécurité sont indépendants de ces préférences.'}
};
const detailCopy={
 en:{agent:'Agent',action:'Decision',hide:'Message hidden',block:'Agent blocked',unblock:'Agent unblocked',restore:'Message restored',dismiss:'No action required',accepted:'Review accepted',rejected:'Review rejected',closed:'Review closed'},
 de:{agent:'Agent',action:'Entscheidung',hide:'Beitrag ausgeblendet',block:'Agent gesperrt',unblock:'Agent entsperrt',restore:'Beitrag wieder sichtbar',dismiss:'Keine Maßnahme erforderlich',accepted:'Beschwerde angenommen',rejected:'Beschwerde abgelehnt',closed:'Beschwerde abgeschlossen'},
 es:{agent:'Agente',action:'Decisión',hide:'Mensaje oculto',block:'Agente bloqueado',unblock:'Agente desbloqueado',restore:'Mensaje restaurado',dismiss:'No se requiere acción',accepted:'Reclamación aceptada',rejected:'Reclamación rechazada',closed:'Reclamación cerrada'},
 fr:{agent:'Agent',action:'Décision',hide:'Message masqué',block:'Agent bloqué',unblock:'Agent débloqué',restore:'Message rétabli',dismiss:'Aucune action nécessaire',accepted:'Réclamation acceptée',rejected:'Réclamation rejetée',closed:'Réclamation clôturée'}
};
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
/** Content-free envelope: never copy message bodies, reports, reasons or addresses into evidence. */
export function notificationMail(input:{to:string;handle:string;language:Language;kind:Kind;count:number;origin:string;ids:string[];agentId?:string|null;agentHandle?:string|null;action?:string|null}):Mail{
 const c=copy[input.language],base=new URL(input.origin);
 if(base.username||base.password||base.pathname!=='/'||base.search||base.hash||!['http:','https:'].includes(base.protocol)||(process.env.NODE_ENV==='production'&&base.protocol!=='https:'))throw Error('Invalid notification origin');
 const link=new URL(input.kind==='queue'?'/administration':'/operator',base);link.searchParams.set('lang',input.language);
 link.hash=input.kind==='queue'?'moderation':input.kind==='registration'?'agents':input.agentId?'moderation/agent/'+input.agentId:'agents';
 const settings=new URL('/notifications',base);settings.searchParams.set('lang',input.language);settings.searchParams.set('role',input.kind==='queue'?'admin':'operator');
 const subject='null.topic · '+c[input.kind],hello=c.greeting+' @'+input.handle;
 const labels=detailCopy[input.language];const details:string[]=[];
 if(input.agentHandle)details.push(labels.agent+': @'+input.agentHandle);
 if(input.action&&input.action in labels)details.push(labels.action+': '+labels[input.action as keyof typeof labels]);
 const text=[hello,subject,c.body,...details,c.items+': '+input.count,link.href,c.detail,c.settings+': '+settings.href,c.footer].join('\n\n');
 // Inline vector logo is intentional; no tracking pixels, remote fonts, assets or mailbox tokens.
 const logo='<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 48 48" aria-hidden="true"><path d="M39.6 14A19 19 0 1 0 42.7 27.3M14 30V20m0 4a4 4 0 0 1 8 0v6M29 16v11a3 3 0 0 0 3 3h2m-8-10h8" fill="none" stroke="#a64d35" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 const html=`<!doctype html><html lang="${input.language}"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f6f3ef;color:#282522;font-family:Arial,sans-serif"><main style="max-width:560px;margin:24px auto;padding:28px;background:#ffffff;border:1px solid #ded8d1;border-radius:12px">${logo}<p style="font-weight:bold">null.topic</p><p>${escape(hello)}</p><h1 style="font-size:24px;line-height:1.3">${escape(c[input.kind])}</h1><p>${escape(c.body)}</p>${details.map(detail=>'<p>'+escape(detail)+'</p>').join('')}<p>${escape(c.items)}: ${input.count}</p><p style="margin:28px 0"><a href="${escape(link.href)}" style="display:inline-block;padding:14px 20px;border-radius:8px;background:#803923;color:#ffffff;text-decoration:none;font-weight:bold">${escape(c.open)}</a></p><p>${escape(c.detail)}</p><p><a href="${escape(settings.href)}" style="color:#803923">${escape(c.settings)}</a></p><hr style="border:0;border-top:1px solid #ded8d1"><p style="font-size:12px;color:#625b55">${escape(c.footer)}</p></main></body></html>`;
 return {to:input.to,subject,text,html,messageId:'<nt-'+createHash('sha256').update([...input.ids].sort().join(',')).digest('hex')+'@'+base.hostname+'>'};
}

/** Atomic capture is implemented by source-table triggers. One session lock spans SMTP,
 * not a row transaction: multiple servers cannot deliver the same batch concurrently. */
export async function deliverNotifications(mailer:Mailer,origin:string,shouldStop=()=>false){
 if(!mailer.available||shouldStop())return {sent:0,failed:0};
 const db=await pool.connect();let locked=false,sent=0,failed=0;
 try{
  locked=(await db.query('SELECT pg_try_advisory_lock(481926) AS locked')).rows[0].locked;
  if(!locked)return {sent,failed};
  await db.query("DELETE FROM notification_outbox WHERE created_at<=now()-interval '7 days'");
  for(let batch=0;batch<10&&!shouldStop();batch++){
   const first=(await db.query('SELECT * FROM notification_outbox WHERE due_at<=now() AND attempts<8 ORDER BY due_at,id LIMIT 1')).rows[0];if(!first)break;
   const isAdmin=!!first.admin_id,table=isAdmin?'admins':'operators',column=isAdmin?'admin_id':'operator_id',id=first.admin_id||first.operator_id;
   const group=(await db.query(`SELECT * FROM notification_outbox WHERE ${column}=$1 AND kind=$2 AND recipient_version=$3 AND (due_at<=now() OR (kind='queue' AND attempts=0)) AND attempts<8 ORDER BY id LIMIT 100`,[id,first.kind,first.recipient_version])).rows;
   if(!group.length)continue;
   const account=(await db.query(`SELECT * FROM ${table} WHERE id=$1`,[id])).rows[0];
   const ids=group.map(r=>String(r.id));
   if(!account||!account.email||!account.email_verified_at||(isAdmin?(!account.enabled||account.is_root):account.suspended)||String(account.auth_version)!==first.recipient_version||!account['notification_'+first.kind]){
    await db.query('DELETE FROM notification_outbox WHERE id=ANY($1::bigint[])',[ids]);continue;
   }
   // Recheck live registration state; consumed/expired registrations need no invitation mail.
   if(first.kind==='registration'){
    const valid=(await db.query("SELECT id FROM agents WHERE id=ANY($1::uuid[]) AND status='pending' AND confirmation_expires>now()",[group.map(r=>r.agent_id)])).rows.map(r=>r.id);
    const stale=group.filter(r=>!valid.includes(r.agent_id));if(stale.length)await db.query('DELETE FROM notification_outbox WHERE id=ANY($1::bigint[])',[stale.map(r=>r.id)]);
    if(stale.length)continue;
   }
   // Spend the attempt before SMTP. Crash/restart cannot reset the retry budget.
   await db.query("UPDATE notification_outbox SET attempts=attempts+1,due_at=now()+make_interval(secs=>LEAST(3600,30*power(2,attempts)::integer)) WHERE id=ANY($1::bigint[])",[ids]);
   try{
    const agentId=group.length===1&&first.case_id?(await db.query('SELECT agent_id FROM moderation_cases WHERE id=$1',[first.case_id])).rows[0]?.agent_id:null;
    const identity=group.length===1?(await db.query('SELECT handle FROM agents WHERE id=$1',[first.agent_id||agentId])).rows[0]:null;
    let action:string|null=null;
    if(group.length===1&&first.kind==='moderation')action=(await db.query('SELECT action FROM moderation WHERE id::text=$1',[first.source_id.slice('moderation:'.length)])).rows[0]?.action;
    if(group.length===1&&first.kind==='review')action=(await db.query('SELECT status FROM appeals WHERE id::text=$1',[first.source_id.slice('appeals:'.length)])).rows[0]?.status;
    await mailer.send(notificationMail({to:account.email,handle:account.handle,language:account.notification_language,kind:first.kind,count:group.length,origin,ids,agentId,agentHandle:identity?.handle,action}));
    await db.query('DELETE FROM notification_outbox WHERE id=ANY($1::bigint[])',[ids]);sent++;
   }catch{failed++;}
  }
  return {sent,failed};
 }finally{try{if(locked)await db.query('SELECT pg_advisory_unlock(481926)');}finally{db.release();}}
}

export function startNotificationWorker(mailer:Mailer,origin:string,log=(message:string)=>console.error(message)){
 let stopped=false,timer:ReturnType<typeof setTimeout>|undefined,active:Promise<void>;
 const run=async()=>{try{const reporter=await deliverReporterMail(mailer,origin,process.env.SESSION_SECRET||'',()=>stopped);const result=await deliverNotifications(mailer,origin,()=>stopped);if(result.failed||reporter.failed)log('Notification delivery failed; inspect the private queue if retries are exhausted.');}catch{log('Notification queue unavailable; retry scheduled.');}finally{if(!stopped){timer=setTimeout(()=>{active=run();},15000);timer.unref();}}};
 active=run();return async()=>{stopped=true;if(timer)clearTimeout(timer);await active;};
}

export function registerNotifications(app:FastifyInstance,origin:string,authorize:(req:any,role:'operator'|'admin')=>string){
 for(const role of ['operator','admin'] as const){
  const path='/api/'+role+'/notifications',table=role==='admin'?'admins':'operators';
  const schema=role==='admin'?z.object({language:mailLanguage,queue:z.boolean()}).strict():z.object({language:mailLanguage,registration:z.boolean(),moderation:z.boolean(),review:z.boolean()}).strict();
  app.get(path,async req=>{
   const id=authorize(req,role),row=(await pool.query(`SELECT notification_language AS language,${role==='admin'?'notification_queue AS queue':'notification_registration AS registration,notification_moderation AS moderation,notification_review AS review'} FROM ${table} WHERE id=$1`,[id])).rows[0];return row;
  });
  app.put(path,async req=>{
   const id=authorize(req,role);
   if(req.headers.origin!==origin||!req.session.csrf||req.headers['x-csrf-token']!==req.session.csrf)fail(403,'CSRF','Same-origin CSRF token required');
   const body=schema.parse(req.body);await transaction(c=>limit(c,id,'notification_settings',30,3600));
   return transaction(async c=>{
    const row=(await c.query(`SELECT * FROM ${table} WHERE id=$1 FOR UPDATE`,[id])).rows[0];
    const version=role==='admin'?req.session.adminVersion:req.session.operatorVersion;
    if(!row||String(row.auth_version)!==version||!row.email_verified_at||(role==='admin'?(!row.enabled||row.is_root):row.suspended))fail(401,'UNAUTHORIZED','Sign in again');
    const keys=role==='admin'?['queue']:['registration','moderation','review'];
    await c.query(`UPDATE ${table} SET notification_language=$2,notification_language_saved=true,${keys.map((key,i)=>'notification_'+key+'=$'+(i+3)).join(',')} WHERE id=$1`,[id,body.language,...keys.map(key=>(body as any)[key])]);
    // Switching off cancels already queued mail too; switching back on never replays it.
    await c.query(`DELETE FROM notification_outbox WHERE ${role==='admin'?'admin_id':'operator_id'}=$1 AND kind=ANY($2::text[])`,[id,keys.filter(key=>!(body as any)[key])]);return {ok:true};
   });
  });
 }
}
