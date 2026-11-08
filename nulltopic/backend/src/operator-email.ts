import {randomBytes,createHash,createHmac} from 'node:crypto';
import argon2 from 'argon2';
import {z} from 'zod';
import {pool,transaction,limit,Fault,fail} from './db.js';
import type {Mailer,Mail} from './mailer.js';
export const emailAddress=z.string().trim().max(254).pipe(z.email()).transform(value=>value.toLowerCase());
export const mailLanguage=z.enum(['en','de','es','fr']).default('en');
export const emailRequest=z.object({email:emailAddress,language:mailLanguage}).strict();
export const emailToken=z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const verifyEmailBody=z.object({token:emailToken}).strict();
export const resetPasswordBody=z.object({token:emailToken,password:z.string().min(12).max(256),language:mailLanguage}).strict();
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
const copy={
 en:{verify:'Confirm your NullTopic email',reset:'Reset your NullTopic password',changed:'Your NullTopic password was changed',verifyBody:'Confirm your email address to finish setting up your operator account. This link is valid for 24 hours.',resetBody:'Use this link to choose a new operator password. This link is valid for 30 minutes.',ignore:'If you did not request this, ignore this email. Never share the link.',changedBody:'Your operator password was changed and previous operator sessions were invalidated. If this was not you, request another password reset immediately.',open:'Open the link and confirm the action on the page. Opening the link alone changes nothing.'},
 de:{verify:'Bestätige deine NullTopic-E-Mail-Adresse',reset:'NullTopic-Passwort zurücksetzen',changed:'Dein NullTopic-Passwort wurde geändert',verifyBody:'Bestätige deine E-Mail-Adresse, um dein Operator-Konto einzurichten. Dieser Link ist 24 Stunden gültig.',resetBody:'Wähle über diesen Link ein neues Operator-Passwort. Dieser Link ist 30 Minuten gültig.',ignore:'Falls du dies nicht angefordert hast, ignoriere diese E-Mail. Gib den Link niemals weiter.',changedBody:'Dein Operator-Passwort wurde geändert und bisherige Operator-Sitzungen wurden ungültig gemacht. Falls du das nicht warst, fordere sofort erneut das Zurücksetzen deines Passworts an.',open:'Öffne den Link und bestätige die Aktion auf der Seite. Allein das Öffnen ändert nichts.'},
 es:{verify:'Confirma tu correo de NullTopic',reset:'Restablece tu contraseña de NullTopic',changed:'Tu contraseña de NullTopic ha cambiado',verifyBody:'Confirma tu correo para completar tu cuenta de operador. Este enlace es válido durante 24 horas.',resetBody:'Usa este enlace para elegir una nueva contraseña de operador. Es válido durante 30 minutos.',ignore:'Si no lo has solicitado, ignora este correo. No compartas el enlace.',changedBody:'Tu contraseña de operador ha cambiado y las sesiones anteriores han sido invalidadas. Si no has sido tú, solicita otro restablecimiento de inmediato.',open:'Abre el enlace y confirma la acción en la página. Abrirlo no cambia nada.'},
 fr:{verify:'Confirme ton adresse e-mail NullTopic',reset:'Réinitialise ton mot de passe NullTopic',changed:'Ton mot de passe NullTopic a été modifié',verifyBody:'Confirme ton adresse e-mail pour terminer la création de ton compte opérateur. Ce lien est valable 24 heures.',resetBody:'Utilise ce lien pour choisir un nouveau mot de passe opérateur. Il est valable 30 minutes.',ignore:'Si tu n’as rien demandé, ignore cet e-mail. Ne partage jamais le lien.',changedBody:'Ton mot de passe opérateur a été modifié et tes anciennes sessions ont été invalidées. Si ce n’était pas toi, demande immédiatement une nouvelle réinitialisation.',open:'Ouvre le lien et confirme l’action sur la page. Ouvrir le lien seul ne change rien.'}
};
type Language=keyof typeof copy;
export function operatorEmail(mailer:Mailer,origin:string){
 const base=new URL(origin);
 if(base.username||base.password||base.pathname!=='/'||base.search||base.hash||!['http:','https:'].includes(base.protocol)||(process.env.NODE_ENV==='production'&&base.protocol!=='https:'))throw Error('PUBLIC_ORIGIN must be a plain HTTP(S) origin (HTTPS in production)');
 const pending=new Set<Promise<void>>();
 function enqueue(task:()=>Promise<void>){
  // Account lookup, token writes and SMTP all run outside the HTTP response path.
  const work=new Promise<void>(resolve=>setImmediate(resolve)).then(task).catch(()=>{console.error('NullTopic account email delivery failed; retry delivery through the recovery form.');}).finally(()=>pending.delete(work));pending.add(work);
 }
 const deliver=(message:Mail)=>enqueue(()=>mailer.send(message));
 const available=()=>{if(!mailer.available)fail(503,'MAIL_UNAVAILABLE','Account email delivery is not configured');};
 async function request(email:string,purpose:'verify'|'reset',language:Language,ip:string){
  available();
  await transaction(c=>limit(c,ip,'email_request',10,3600));
  const addressKey=createHmac('sha256',process.env.SESSION_SECRET!).update(email).digest('hex');
  try{await transaction(c=>limit(c,addressKey,'email_'+purpose,3,3600));}catch(error){if(error instanceof Fault&&error.statusCode===429)return{ok:true};throw error;}
  enqueue(async()=>{
  const token=randomBytes(32).toString('base64url');
  const recipient=await transaction(async c=>{
   const o=(await c.query('SELECT id,email,email_verified_at,auth_version FROM operators WHERE email=$1 FOR UPDATE',[email])).rows[0];
   if(!o||(purpose==='verify'?!!o.email_verified_at:!o.email_verified_at))return null;
   await c.query('DELETE FROM operator_email_tokens WHERE operator_id=$1 AND (purpose=$2 OR expires_at<=now())',[o.id,purpose]);
   await c.query(`INSERT INTO operator_email_tokens(token_hash,operator_id,purpose,auth_version,expires_at) VALUES($1,$2,$3,$4,now()+CASE WHEN $3='verify' THEN interval '24 hours' ELSE interval '30 minutes' END)`,[digest(token),o.id,purpose,o.auth_version]);return o.email as string;
  });
  if(recipient){const text=copy[language],link=new URL('/operator-access',base);link.searchParams.set('lang',language);link.hash=purpose+'='+token;await mailer.send({to:recipient,subject:text[purpose],text:[purpose==='verify'?text.verifyBody:text.resetBody,link.href,text.open,text.ignore].join('\n\n')});}
  });
  return{ok:true};
 }
 async function consume(token:string,purpose:'verify'|'reset',password?:string){
  // Read the owner without a token-row lock, then serialize all operations on that owner.
  const tokenHash=digest(token);
  const target=(await pool.query('SELECT operator_id FROM operator_email_tokens WHERE token_hash=$1 AND purpose=$2',[tokenHash,purpose])).rows[0];
  if(!target)fail(400,'EMAIL_LINK_INVALID','This link is invalid, expired or already used');
  const passwordHash=password===undefined?undefined:await argon2.hash(password);
  return transaction(async c=>{
   const o=(await c.query('SELECT id,email,email_verified_at,auth_version FROM operators WHERE id=$1 FOR UPDATE',[target.operator_id])).rows[0];
   if(!o)fail(400,'EMAIL_LINK_INVALID','This link is invalid, expired or already used');
   const evidence=(await c.query('SELECT token_hash FROM operator_email_tokens WHERE token_hash=$1 AND purpose=$2 AND operator_id=$3 AND auth_version=$4 AND expires_at>now() FOR UPDATE',[tokenHash,purpose,o.id,o.auth_version])).rowCount;
   if(!evidence||(purpose==='verify'?!!o.email_verified_at:!o.email_verified_at))fail(400,'EMAIL_LINK_INVALID','This link is invalid, expired or already used');
   if(purpose==='verify')await c.query('UPDATE operators SET email_verified_at=now() WHERE id=$1',[o.id]);
   else{
    await c.query('UPDATE operators SET password=$2,auth_version=gen_random_uuid() WHERE id=$1',[o.id,passwordHash]);
    await c.query("DELETE FROM sessions WHERE data->>'operatorId'=$1",[o.id]);
   }
   await c.query('DELETE FROM operator_email_tokens WHERE operator_id=$1'+(purpose==='verify'?" AND purpose='verify'":''),[o.id]);
   return o.email as string;
  });
 }
 return{available,request,verify:async(token:string)=>{await consume(token,'verify');return{ok:true};},reset:async(token:string,password:string,language:Language)=>{const to=await consume(token,'reset',password);const text=copy[language];deliver({to,subject:text.changed,text:text.changedBody});return{ok:true};},drain:async()=>{await Promise.all(pending);}};
}
