import type {FastifyInstance} from 'fastify';
import {randomBytes,randomUUID,randomInt,createHash,createHmac,timingSafeEqual} from 'node:crypto';
import argon2 from 'argon2';
import {z} from 'zod';
import {pool,transaction,limit,fail,Fault,type DB} from './db.js';
import {emailAddress,mailLanguage} from './operator-email.js';
import type {Mailer} from './mailer.js';
declare module 'fastify' {interface Session {recoveryId?:string;recoveryBinding?:string;}}
const uuid=z.string().uuid(),password=z.string().min(1).max(256),handle=z.string().regex(/^[a-z0-9_]{3,32}$/),empty=z.object({}).strict();
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const digest=(value:string)=>createHmac('sha256',process.env.SESSION_SECRET!).update('operator-recovery:'+value).digest('hex');
const eligible=(a:any)=>a&&['active','paused'].includes(a.status)&&a.approved_at&&a.key_hash;
const text={
 en:{code:'Confirm your new NullTopic email',body:'Your email recovery code is below. Valid for five minutes. Never share it. Enter it only in the browser where you requested recovery.',started:'NullTopic account recovery requested',start:'Your password was used to request an email change with a previously authorized agent. Your email has not changed. If this was not you, sign in at /operator, cancel the request under Account recovery, and change your password.',changed:'NullTopic email changed',change:'Your operator email was changed using password, an authorized agent and new-mailbox confirmation. Previous sessions and pending login/reset links were invalidated. If this was not you, contact the service operator.'},
 de:{code:'Bestätige deine neue NullTopic-E-Mail-Adresse',body:'Dein Wiederherstellungscode steht unten. Fünf Minuten gültig. Gib ihn niemals weiter. Gib ihn nur in dem Browser ein, in dem du die Wiederherstellung angefordert hast.',started:'Wiederherstellung deines NullTopic-Kontos angefordert',start:'Mit deinem Passwort wurde ein E-Mail-Wechsel mit einem zuvor freigegebenen Agenten angefordert. Deine Adresse wurde noch nicht geändert. Falls du das nicht warst, melde dich unter /operator an, brich die Anfrage unter Kontowiederherstellung ab und ändere dein Passwort.',changed:'NullTopic-E-Mail-Adresse geändert',change:'Deine Operator-E-Mail-Adresse wurde mit Passwort, freigegebenem Agenten und Bestätigung des neuen Postfachs geändert. Bisherige Sitzungen und ausstehende Anmelde- und Passwortlinks sind ungültig. Falls du das nicht warst, kontaktiere den Plattformbetreiber.'},
 es:{code:'Confirma tu nuevo correo de NullTopic',body:'Tu código de recuperación aparece abajo. Válido cinco minutos. No lo compartas. Introdúcelo solo en el navegador donde solicitaste la recuperación.',started:'Recuperación de cuenta NullTopic solicitada',start:'Se usó tu contraseña para solicitar un cambio de correo con un agente autorizado previamente. Tu correo no ha cambiado. Si no fuiste tú, accede en /operator, cancela la solicitud en Recuperación de cuenta y cambia tu contraseña.',changed:'Correo de NullTopic cambiado',change:'Tu correo de operador se cambió con contraseña, agente autorizado y confirmación del nuevo buzón. Las sesiones anteriores y enlaces pendientes ya no son válidos. Si no fuiste tú, contacta con el responsable del servicio.'},
 fr:{code:'Confirme ta nouvelle adresse NullTopic',body:'Ton code de récupération figure ci-dessous. Valable cinq minutes. Ne le partage jamais. Saisis-le uniquement dans le navigateur où tu as demandé la récupération.',started:'Récupération de compte NullTopic demandée',start:'Ton mot de passe a été utilisé pour demander un changement d’adresse avec un agent préalablement autorisé. Ton adresse n’a pas changé. Sinon, connecte-toi sur /operator, annule la demande dans Récupération du compte et change ton mot de passe.',changed:'Adresse NullTopic modifiée',change:'Ton adresse opérateur a été modifiée avec le mot de passe, un agent autorisé et la confirmation de la nouvelle messagerie. Les anciennes sessions et liens en attente ont été invalidés. Sinon, contacte le responsable du service.'}
};
/** No public permission is conferred by this protocol, including successful completion. */
export function registerAgentRecovery(app:FastifyInstance,mailer:Mailer,origin:string){
 const owner=(req:any)=>req.session.operatorId||fail(401,'UNAUTHORIZED','Operator login required');
 const csrf=(req:any)=>{if(!req.session.csrf||req.headers.origin!==origin||req.headers['x-csrf-token']!==req.session.csrf)fail(403,'CSRF','Same-origin CSRF token required');};
 function notice(to:string,language:keyof typeof text,kind:'started'|'changed'){
  const copy=text[language];void mailer.send({to,subject:copy[kind],text:(kind==='started'?copy.start:copy.change)+'\n\n'+origin+'/operator-recovery'}).catch(()=>console.error('NullTopic recovery notification delivery failed.'));
 }
 async function operator(db:DB,id:string,version:string){
  const o=(await db.query('SELECT * FROM operators WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!o||o.suspended||!o.email_verified_at||o.auth_version!==version)fail(401,'RECOVERY_INVALID','Recovery is unavailable or expired');return o;
 }
 // All paths needing both rows use agent -> operator -> request locks, matching public writes.
 async function locked(db:DB,id:string){
  const target=(await db.query('SELECT agent_id,operator_id FROM operator_recovery_requests WHERE id=$1',[id])).rows[0];if(!target)return null;
  const a=(await db.query('SELECT * FROM agents WHERE id=$1 FOR UPDATE',[target.agent_id])).rows[0];
  const o=(await db.query('SELECT * FROM operators WHERE id=$1 FOR UPDATE',[target.operator_id])).rows[0];
  const r=(await db.query('SELECT * FROM operator_recovery_requests WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!r||!eligible(a)||!o||o.suspended||!o.email_verified_at||a.operator_id!==o.id||a.key_hash!==r.key_hash||o.auth_version!==r.auth_version||o.email!==r.old_email||new Date(r.expires_at).getTime()<=Date.now())return null;
  const enrollment=(await db.query('SELECT 1 FROM operator_recovery_agents WHERE agent_id=$1 AND operator_id=$2 AND key_hash=$3',[a.id,o.id,a.key_hash])).rowCount;
  return enrollment?{a,o,r}:null;
 }
 const state=(r:any)=>({requestId:r.id,agentHandle:r.agent_handle,newEmail:r.new_email,expiresAt:new Date(r.expires_at).toISOString(),state:r.approved_at?'awaiting_email':'awaiting_agent',delivered:r.delivered,resendAt:r.sent_at?new Date(new Date(r.sent_at).getTime()+60_000).toISOString():null});
 app.get('/api/operator/recovery',async req=>{
  const id=owner(req);empty.parse(req.query);
  return {agents:(await pool.query(`SELECT a.id,a.handle,a.name,(a.avatar_base64 IS NOT NULL) AS has_avatar,(e.agent_id IS NOT NULL AND e.key_hash=a.key_hash) AS enabled FROM agents a LEFT JOIN operator_recovery_agents e ON e.agent_id=a.id AND e.operator_id=a.operator_id WHERE a.operator_id=$1 AND a.status IN ('active','paused') AND a.approved_at IS NOT NULL AND a.key_hash IS NOT NULL ORDER BY a.handle`,[id])).rows,pending:!!(await pool.query('SELECT 1 FROM operator_recovery_requests WHERE operator_id=$1 AND expires_at>now()',[id])).rowCount};
 });
 app.put('/api/operator/recovery/agents/:id',async req=>{
  csrf(req);const id=owner(req),agentId=uuid.parse((req.params as any).id),b=z.object({password,enabled:z.boolean()}).strict().parse(req.body);
  await transaction(db=>limit(db,id,'recovery_config',5,900));
  const saved=(await pool.query('SELECT password FROM operators WHERE id=$1',[id])).rows[0];
  if(!saved||!await argon2.verify(saved.password,b.password))fail(401,'UNAUTHORIZED','Invalid credentials');
  return transaction(async db=>{
   const a=(await db.query('SELECT * FROM agents WHERE id=$1 FOR UPDATE',[agentId])).rows[0];
   const o=await operator(db,id,req.session.operatorVersion!);
   if(o.password!==saved.password||!a||a.operator_id!==id||b.enabled&&!eligible(a))fail(409,'RECOVERY_UNAVAILABLE','Owned approved agent required');
   await db.query('DELETE FROM operator_recovery_requests WHERE operator_id=$1',[id]);
   if(b.enabled)await db.query('INSERT INTO operator_recovery_agents(agent_id,operator_id,key_hash) VALUES($1,$2,$3) ON CONFLICT(agent_id) DO UPDATE SET key_hash=EXCLUDED.key_hash,created_at=now()',[agentId,id,a.key_hash]);
   else await db.query('DELETE FROM operator_recovery_agents WHERE agent_id=$1 AND operator_id=$2',[agentId,id]);
   return {ok:true};
  });
 });
 app.delete('/api/operator/recovery/request',async req=>{csrf(req);const id=owner(req);empty.parse(req.body);return transaction(async db=>{await operator(db,id,req.session.operatorVersion!);await db.query('DELETE FROM operator_recovery_requests WHERE operator_id=$1',[id]);return {ok:true};});});
 app.post('/api/operator-recovery/start',async req=>{
  csrf(req);if(req.session.operatorId||req.session.adminId)fail(409,'SIGN_OUT_REQUIRED','Sign out before starting recovery');
  const b=z.object({handle,password,newEmail:emailAddress,agentHandle:handle,language:mailLanguage}).strict().parse(req.body);
  await transaction(db=>limit(db,req.ip,'recovery_start_ip',5,900));
  if(!mailer.available)fail(503,'MAIL_UNAVAILABLE','Email delivery is unavailable');
  const saved=(await pool.query('SELECT * FROM operators WHERE handle=$1',[b.handle])).rows[0];
  if(!saved||!await argon2.verify(saved.password,b.password))fail(401,'UNAUTHORIZED','Invalid credentials');
  await transaction(async db=>{await limit(db,saved.id,'recovery_start_owner',3,3600);await limit(db,digest(b.newEmail),'recovery_address',3,3600);});
  const binding=randomBytes(32).toString('base64url');
  const result=await transaction(async db=>{
   const a=(await db.query('SELECT * FROM agents WHERE handle=$1 FOR UPDATE',[b.agentHandle])).rows[0];
   const o=await operator(db,saved.id,saved.auth_version);
   if(o.password!==saved.password||!eligible(a)||a.operator_id!==o.id||b.newEmail===o.email||!(await db.query('SELECT 1 FROM operator_recovery_agents WHERE agent_id=$1 AND operator_id=$2 AND key_hash=$3',[a.id,o.id,a.key_hash])).rowCount)fail(409,'RECOVERY_UNAVAILABLE','A previously authorized recovery agent and a different email are required');
   if((await db.query('SELECT 1 FROM operators WHERE email=$1',[b.newEmail])).rowCount)fail(409,'RECOVERY_UNAVAILABLE','New email is unavailable');
   await db.query('DELETE FROM operator_recovery_requests WHERE operator_id=$1',[o.id]);
   const r=(await db.query('INSERT INTO operator_recovery_requests(id,operator_id,agent_id,auth_version,key_hash,binding_hash,old_email,new_email,language) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[randomUUID(),o.id,a.id,o.auth_version,a.key_hash,hash(binding),o.email,b.newEmail,b.language])).rows[0];
   return {...r,agent_handle:a.handle};
  });
  await req.session.regenerate();req.session.recoveryId=result.id;req.session.recoveryBinding=binding;req.session.csrf=randomBytes(32).toString('base64url');
  notice(result.old_email,b.language,'started');return {...state(result),csrf:req.session.csrf};
 });
 async function bound(req:any,db:DB){
  if(!req.session.recoveryId||!req.session.recoveryBinding)return null;
  const current=await locked(db,req.session.recoveryId);return current&&current.r.binding_hash===hash(req.session.recoveryBinding)?current:null;
 }
 app.get('/api/operator-recovery/status',async req=>{empty.parse(req.query);return transaction(async db=>{const current=await bound(req,db);return current?{...state(current.r),agentHandle:current.a.handle}:null;});});
 app.post('/api/operator-recovery/cancel',async req=>{csrf(req);empty.parse(req.body);await transaction(async db=>{const current=await bound(req,db);if(current)await db.query('DELETE FROM operator_recovery_requests WHERE id=$1',[current.r.id]);});await req.session.regenerate();req.session.csrf=randomBytes(32).toString('base64url');return {csrf:req.session.csrf};});
 async function agentKey(req:any){
  const key=req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];if(!key)fail(401,'UNAUTHORIZED','Agent key required');return hash(key);
 }
 app.get('/api/me/operator-recovery',async req=>{
  empty.parse(req.query);const key=await agentKey(req);
  return transaction(async db=>{const a=(await db.query('SELECT * FROM agents WHERE key_hash=$1 FOR UPDATE',[key])).rows[0];if(!eligible(a))fail(403,'RECOVERY_UNAVAILABLE','Approved agent required');await limit(db,a.id,'recovery_agent_read',30,60);
   const requests=(await db.query('SELECT id FROM operator_recovery_requests WHERE agent_id=$1 AND key_hash=$2 AND expires_at>now()',[a.id,key])).rows;
   const result=[];for(const r of requests){const current=await locked(db,r.id);if(current)result.push({...state(current.r),operatorHandle:current.o.handle});}return result;
  });
 });
 async function sendCode(id:string){
  let code=String(randomInt(1_000_000)).padStart(6,'0');
  const r=await transaction(async db=>{
   const current=await locked(db,id);if(!current||!current.r.approved_at)return fail(401,'RECOVERY_INVALID','Recovery is unavailable or expired');
   const row=current.r;if(row.sends>=3||row.attempts>=5)fail(429,'RECOVERY_LIMIT','Start again later');
   if(row.sent_at&&Date.now()<new Date(row.sent_at).getTime()+60_000)throw new Fault(429,'RECOVERY_WAIT','Wait before requesting another code',new Date(new Date(row.sent_at).getTime()+60_000).toISOString());
   while(digest(id+':'+code)===row.code_hash)code=String(randomInt(1_000_000)).padStart(6,'0');
   // Budgets are committed by the caller; no network operations hold these row locks.
   return (await db.query("UPDATE operator_recovery_requests SET code_hash=$2,code_expires_at=LEAST(expires_at,now()+interval '5 minutes'),sent_at=now(),sends=sends+1,delivered=false WHERE id=$1 RETURNING *",[id,digest(id+':'+code)])).rows[0];
  });
  try{await mailer.send({to:r.new_email,subject:text[r.language as keyof typeof text].code,text:text[r.language as keyof typeof text].body+'\n\n'+code});}
  catch{fail(503,'MAIL_UNAVAILABLE','Unable to deliver recovery email. Request another code later');}
  await pool.query('UPDATE operator_recovery_requests SET delivered=true WHERE id=$1 AND code_hash=$2',[id,r.code_hash]);
 }
 app.post('/api/me/operator-recovery/:id/approve',async req=>{
  const id=uuid.parse((req.params as any).id),b=z.object({confirmEmailChange:z.literal(true),newEmail:emailAddress}).strict().parse(req.body),key=await agentKey(req);
  await transaction(db=>limit(db,key,'recovery_approve',5,900));
  const changed=await transaction(async db=>{const current=await locked(db,id);if(!current||current.a.key_hash!==key||current.r.new_email!==b.newEmail)fail(403,'RECOVERY_UNAVAILABLE','Matching authorized recovery request required');if(current!.r.approved_at)return false;await db.query('UPDATE operator_recovery_requests SET approved_at=now() WHERE id=$1',[id]);return true;});
  if(changed)await sendCode(id);return {ok:true};
 });
 app.post('/api/operator-recovery/resend',async req=>{
  csrf(req);empty.parse(req.body);await transaction(db=>limit(db,req.ip,'recovery_resend_ip',5,900));
  const current=await transaction(db=>bound(req,db));if(!current||!current.r.approved_at)fail(401,'RECOVERY_INVALID','Agent confirmation required');
  await sendCode(current!.r.id);return {ok:true};
 });
 app.post('/api/operator-recovery/verify',async req=>{
  csrf(req);const b=z.object({code:z.string().regex(/^\d{6}$/)}).strict().parse(req.body);
  await transaction(db=>limit(db,req.ip,'recovery_verify_ip',20,900));
  const result=await transaction(async db=>{
   const current=await bound(req,db);if(!current)return null;const {r,o}=current;
   if(!r.approved_at||r.attempts>=5)return null;
   if(!r.delivered||!r.code_hash||new Date(r.code_expires_at).getTime()<=Date.now())return 'code_unavailable';
   if(!timingSafeEqual(Buffer.from(r.code_hash,'hex'),Buffer.from(digest(r.id+':'+b.code),'hex'))){await db.query('UPDATE operator_recovery_requests SET attempts=attempts+1 WHERE id=$1',[r.id]);if(r.attempts+1>=5)await db.query('DELETE FROM operator_recovery_requests WHERE id=$1',[r.id]);return r.attempts+1>=5?null:false;}
   if((await db.query('SELECT 1 FROM operators WHERE email=$1 AND id<>$2',[r.new_email,o.id])).rowCount)fail(409,'RECOVERY_UNAVAILABLE','New email is unavailable');
   await db.query('UPDATE operators SET email=$2,email_verified_at=now(),auth_version=gen_random_uuid() WHERE id=$1',[o.id,r.new_email]);
   await db.query("DELETE FROM sessions WHERE data->>'operatorId'=$1 OR data->>'loginChallengeId' IN (SELECT id::text FROM login_challenges WHERE role='operator' AND actor_id::text=$1)",[o.id]);
   await db.query("DELETE FROM login_challenges WHERE role='operator' AND actor_id=$1",[o.id]);
   await db.query('DELETE FROM operator_email_tokens WHERE operator_id=$1',[o.id]);
   await db.query('DELETE FROM operator_recovery_requests WHERE operator_id=$1',[o.id]);
   return r;
  });
  if(result==='code_unavailable')fail(400,'RECOVERY_CODE_UNAVAILABLE','Email code expired or was not delivered. Request a new code');
  if(result===false)fail(400,'RECOVERY_CODE_INVALID','Incorrect code');if(!result)fail(401,'RECOVERY_INVALID','Recovery is unavailable or expired');
  await req.session.regenerate();req.session.csrf=randomBytes(32).toString('base64url');
  notice(result.old_email,result.language,'changed');notice(result.new_email,result.language,'changed');return {ok:true,csrf:req.session.csrf};
 });
}
