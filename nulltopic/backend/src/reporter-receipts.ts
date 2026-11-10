import {createHash,createHmac,randomBytes} from 'node:crypto';
import {z} from 'zod';
import {pool,transaction,limit,fail,type DB} from './db.js';
import {emailAddress,mailLanguage} from './operator-email.js';
import type {Mailer,Mail} from './mailer.js';
export const reportBody=z.object({postId:z.uuid().optional(),agentId:z.uuid().optional(),reason:z.string().trim().min(1).max(1000),reporterName:z.string().trim().min(1).max(120).regex(/^[^\r\n\x00-\x1f]+$/).optional(),reporterEmail:emailAddress.optional(),language:mailLanguage,goodFaith:z.boolean().default(false)}).strict().refine(b=>!!b.postId!==!!b.agentId,'Choose exactly one report target');
export const reporterToken=z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
const tokenFor=(id:string,nonce:string,secret:string)=>createHmac('sha256',secret).update('nulltopic:reporter-receipt:v1:'+id+':'+nonce).digest('base64url');
export function reporterLink(origin:string,token:string,language:string){const base=new URL(origin);if(base.username||base.password||base.pathname!=='/'||base.search||base.hash||!['http:','https:'].includes(base.protocol)||(process.env.NODE_ENV==='production'&&base.protocol!=='https:'))throw Error('Invalid reporter origin');const link=new URL('/dsa',base);link.searchParams.set('lang',language);link.hash='receipt='+token;return link.href;}
export async function createReporterReceipt(db:DB,id:string,body:z.infer<typeof reportBody>,secret:string,origin:string){
 const nonce=randomBytes(32).toString('base64url'),token=tokenFor(id,nonce,secret);
 await db.query('INSERT INTO reporter_receipts(report_id,token_hash,nonce,reporter_name,reporter_email,language,good_faith) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,hash(token),nonce,body.reporterName||null,body.reporterEmail||null,body.language,body.goodFaith]);
 await db.query("INSERT INTO reporter_events(report_id,kind,source) VALUES($1,'received','receipt')",[id]);
 return {ok:true,statusUrl:reporterLink(origin,token,body.language),emailQueued:!!body.reporterEmail};
}
/** A bearer receipt grants only this allowlisted reporter view, never private case serializers. */
export async function readReporterStatus(token:string){return transaction(async db=>{
 const receipt=(await db.query(`SELECT rr.report_id,rr.created_at,rr.reporter_email IS NOT NULL AS email_enabled,r.resolved,EXISTS(SELECT 1 FROM appeals ap WHERE ap.case_id=r.case_id AND ap.status='pending') AS review_pending FROM reporter_receipts rr JOIN reports r ON r.id=rr.report_id WHERE token_hash=$1`,[hash(token)])).rows[0];
 if(!receipt)fail(404,'RECEIPT_UNAVAILABLE','Report status unavailable');
 const rows=(await db.query('SELECT kind,action,public_response AS response,created_at FROM reporter_events WHERE report_id=$1 ORDER BY id DESC LIMIT 200',[receipt.report_id])).rows.reverse();
 const status=receipt.review_pending?'review_pending':receipt.resolved?'decided':'received';
 return {createdAt:receipt.created_at,status,emailNotifications:receipt.email_enabled,events:rows};
 },'REPEATABLE READ');}
export async function stopReporterEmails(token:string){return transaction(async db=>{
 const row=(await db.query('UPDATE reporter_receipts SET reporter_email=NULL WHERE token_hash=$1 RETURNING report_id',[hash(token)])).rows[0];if(!row)fail(404,'RECEIPT_UNAVAILABLE','Report status unavailable');
 await db.query('DELETE FROM reporter_mail_outbox o USING reporter_events e WHERE e.id=o.event_id AND e.report_id=$1',[row.report_id]);return {ok:true};
 });}
export async function reporterEmailBudget(ip:string,email:string,secret:string){await transaction(async db=>{await limit(db,ip,'report_contact',5,3600);await limit(db,createHmac('sha256',secret).update('report-contact:'+email).digest('hex'),'report_contact_address',3,86400);});}
const copy={
 en:{received:'Your report has been received',updated:'There is an update to your report',open:'View report status',intro:'Use your private link to view receipt, status and decisions.',secret:'Keep this link private. Anyone with it can view this report status. No account is required.',stop:'You can stop further emails on the status page. If you did not submit a report, use that option.',remedies:'For questions or a challenge to a decision, contact jacktoolsnet@gmail.com and refer to your receipt. Statutory remedies remain unaffected.'},
 de:{received:'Deine Meldung ist eingegangen',updated:'Es gibt Neuigkeiten zu deiner Meldung',open:'Meldungsstatus ansehen',intro:'Über deinen privaten Link siehst du Eingang, Status und Entscheidungen.',secret:'Bewahre diesen Link privat auf. Wer ihn besitzt, kann diesen Meldungsstatus lesen. Ein Konto ist nicht erforderlich.',stop:'Weitere E-Mails kannst du auf der Statusseite abbestellen. Falls du keine Meldung abgegeben hast, nutze diese Möglichkeit.',remedies:'Bei Fragen oder Einwänden gegen eine Entscheidung wende dich mit Bezug auf deinen Meldungszugang an jacktoolsnet@gmail.com. Gesetzliche Rechtsbehelfe bleiben unberührt.'},
 es:{received:'Hemos recibido tu aviso',updated:'Hay novedades sobre tu aviso',open:'Ver el estado del aviso',intro:'Tu enlace privado permite consultar la recepción, el estado y las decisiones.',secret:'Guarda este enlace en privado. Cualquiera que lo tenga puede consultar este estado. No se necesita una cuenta.',stop:'Puedes cancelar futuros correos en la página de estado. Si no enviaste un aviso, usa esa opción.',remedies:'Para preguntas o impugnar una decisión, contacta con jacktoolsnet@gmail.com e indica tu acceso al aviso. Los recursos legales no se ven afectados.'},
 fr:{received:'Ton signalement a été reçu',updated:'Ton signalement a été mis à jour',open:'Voir le statut du signalement',intro:'Ton lien privé permet de consulter la réception, le statut et les décisions.',secret:'Garde ce lien privé. Toute personne qui le possède peut consulter ce statut. Aucun compte n’est nécessaire.',stop:'Tu peux arrêter les prochains e-mails sur la page de statut. Si tu n’as pas envoyé de signalement, utilise cette option.',remedies:'Pour toute question ou contestation, contacte jacktoolsnet@gmail.com en faisant référence à ton accès au signalement. Les recours légaux restent inchangés.'}
};
const escape=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function reporterMail(to:string,language:keyof typeof copy,url:string,received:boolean,ids:string[]):Mail{const c=copy[language],subject='null.topic · '+(received?c.received:c.updated);return {to,subject,text:[subject,c.intro,url,c.secret,c.stop,c.remedies].join('\n\n'),html:`<!doctype html><html lang="${language}"><body style="font-family:Arial,sans-serif;background:#f6f3ef;color:#282522"><main style="max-width:560px;margin:24px auto;padding:28px;background:#fff;border:1px solid #ded8d1;border-radius:12px"><p><strong>null.topic</strong></p><h1 style="font-size:24px">${escape(subject)}</h1><p>${escape(c.intro)}</p><p><a style="color:#803923;font-weight:bold" href="${escape(url)}">${escape(c.open)}</a></p><p>${escape(c.secret)}</p><p>${escape(c.stop)}</p><p>${escape(c.remedies)}</p></main></body></html>`,messageId:'<nt-reporter-'+hash(new URL(url).hash+':'+ids.join(','))+'@nulltopic.invalid>'};}
/** Purpose-bound re-derivation avoids persisting raw bearer links or copying contacts into outbox rows. */
export async function deliverReporterMail(mailer:Mailer,origin:string,secret:string,shouldStop=()=>false){
 if(!mailer.available||shouldStop())return {sent:0,failed:0};const db=await pool.connect();let locked=false,sent=0,failed=0;
 try{
  locked=(await db.query('SELECT pg_try_advisory_lock(481927) AS locked')).rows[0].locked;if(!locked)return {sent,failed};
  await db.query("DELETE FROM reporter_mail_outbox o USING reporter_events e WHERE e.id=o.event_id AND e.created_at<now()-interval '7 days'");
  for(let n=0;n<10&&!shouldStop();n++){
   const r=(await db.query('SELECT rr.* FROM reporter_mail_outbox o JOIN reporter_events e ON e.id=o.event_id JOIN reporter_receipts rr ON rr.report_id=e.report_id WHERE o.attempts<8 AND o.due_at<=now() AND NOT EXISTS(SELECT 1 FROM reporter_mail_outbox older JOIN reporter_events prior ON prior.id=older.event_id WHERE prior.report_id=rr.report_id AND older.event_id<o.event_id AND older.attempts<8) ORDER BY o.due_at,o.event_id LIMIT 1')).rows[0];if(!r)break;
   const events=(await db.query('SELECT e.id::text,e.kind FROM reporter_mail_outbox o JOIN reporter_events e ON e.id=o.event_id WHERE e.report_id=$1 AND o.attempts<8 AND o.due_at<=now() ORDER BY e.id LIMIT 100',[r.report_id])).rows;const ids=events.map(e=>e.id);
   await db.query('UPDATE reporter_mail_outbox SET attempts=attempts+1,due_at=now()+make_interval(secs=>LEAST(3600,30*power(2,attempts)::integer)) WHERE event_id=ANY($1::bigint[])',[ids]);
   try{
    // Recheck contact immediately before delivery; an in-flight SMTP message cannot be recalled.
    const current=(await db.query('SELECT reporter_email FROM reporter_receipts WHERE report_id=$1',[r.report_id])).rows[0];
    if(current?.reporter_email){const token=tokenFor(r.report_id,r.nonce,secret);if(hash(token)!==r.token_hash)throw Error('Receipt key changed');await mailer.send(reporterMail(current.reporter_email,r.language,reporterLink(origin,token,r.language),events.some(e=>e.kind==='received'),ids));sent++;}
    await db.query('DELETE FROM reporter_mail_outbox WHERE event_id=ANY($1::bigint[])',[ids]);
   }catch{failed++;}
  }
  return {sent,failed};
 }finally{try{if(locked)await db.query('SELECT pg_advisory_unlock(481927)');}finally{db.release();}}
}
