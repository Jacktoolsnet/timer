import {createHmac,createHash,randomInt,randomUUID,timingSafeEqual} from 'node:crypto';
import {transaction,pool,limit,fail,Fault,type DB} from './db.js';
import type {Mailer} from './mailer.js';
export type LoginRole='admin'|'operator';
export type LoginLanguage='en'|'de'|'es'|'fr';
export const bindingHash=(binding:string)=>createHash('sha256').update(binding).digest('hex');
const digest=(value:string)=>createHmac('sha256',process.env.SESSION_SECRET!).update(value).digest('hex');
const codeHash=(id:string,code:string)=>digest('login-code:'+id+':'+code);
const copies={
 en:['Your NullTopic sign-in code','Your sign-in code is:','Valid for five minutes. Never share this code. If you did not try to sign in, do not use it and change your password.','Administrator sign-in','Operator sign-in'],
 de:['Dein NullTopic-Anmeldecode','Dein Anmeldecode lautet:','Fünf Minuten gültig. Gib den Code niemals weiter. Falls du dich nicht anmelden wolltest, verwende ihn nicht und ändere dein Passwort.','Administrator-Anmeldung','Operator-Anmeldung'],
 es:['Tu código de acceso a NullTopic','Tu código de acceso es:','Válido durante cinco minutos. No compartas este código. Si no intentaste acceder, no lo uses y cambia tu contraseña.','Acceso de administrador','Acceso de operador'],
 fr:['Ton code de connexion NullTopic','Ton code de connexion :','Valable cinq minutes. Ne partage jamais ce code. Si tu n’as pas demandé de connexion, ne l’utilise pas et change ton mot de passe.','Connexion administrateur','Connexion opérateur']
};
function eligible(row:any,role:LoginRole){return row&&(role==='admin'?row.enabled:!row.suspended&&row.email_verified_at)&&row.email;}
async function actor(db:DB,role:LoginRole,id:string){return (await db.query(`SELECT * FROM ${role==='admin'?'admins':'operators'} WHERE id=$1 FOR UPDATE`,[id])).rows[0];}
const publicState=(row:any)=>({twoFactorRequired:true,expiresAt:new Date(row.expires_at).toISOString(),resendAt:new Date(row.resend_at).toISOString()});
export function emailLogin(mailer:Mailer){
 async function deliver(row:any,code:string){
  try{
   if(!mailer.available)throw Error('Unavailable');const c=copies[row.language as LoginLanguage];
   await mailer.send({to:row.email,subject:c[0],text:[c[row.role==='admin'?3:4],c[1],code,c[2]].join('\n\n')});
   const accepted=await pool.query('UPDATE login_challenges SET delivered=true WHERE id=$1 AND code_hash=$2 AND expires_at>now() RETURNING id',[row.id,row.code_hash]);
   if(!accepted.rowCount)fail(409,'LOGIN_CHALLENGE_INVALID','Sign-in request no longer available');
  }catch{
   await pool.query('DELETE FROM login_challenges WHERE id=$1 AND code_hash=$2',[row.id,row.code_hash]);
   fail(503,'LOGIN_MAIL_UNAVAILABLE','Unable to deliver sign-in email. Start again later');
  }
 }
 async function start(role:LoginRole,user:any,binding:string,language:LoginLanguage){
  if(!user.email)fail(503,'TWO_FACTOR_SETUP_REQUIRED','An email address must be configured for this account');
  if(!mailer.available)fail(503,'LOGIN_MAIL_UNAVAILABLE','Sign-in email delivery is unavailable');
  const id=randomUUID(),code=String(randomInt(1_000_000)).padStart(6,'0');
  // Budget is committed independently; failed delivery still consumes it.
  await transaction(async db=>{await limit(db,user.id,'login_mail_actor',5,900);await limit(db,digest(user.email),'login_mail_address',5,900);});
  const row=await transaction(async db=>{
   const current=await actor(db,role,user.id);
   if(!eligible(current,role)||current.auth_version!==user.auth_version||current.password!==user.password||current.email!==user.email)fail(401,'UNAUTHORIZED','Invalid credentials');
   await db.query('DELETE FROM login_challenges WHERE role=$1 AND actor_id=$2',[role,user.id]);
   return (await db.query(`INSERT INTO login_challenges(id,role,actor_id,auth_version,email,binding_hash,code_hash,expires_at,resend_at,language)
    VALUES($1,$2,$3,$4,$5,$6,$7,now()+interval '5 minutes',now()+interval '60 seconds',$8) RETURNING *`,[id,role,user.id,user.auth_version,user.email,bindingHash(binding),codeHash(id,code),language])).rows[0];
  });
  await deliver(row,code);return {id,...publicState(row)};
 }
 async function locked(db:DB,id:string,binding:string){
  const target=(await db.query('SELECT actor_id,role FROM login_challenges WHERE id=$1',[id])).rows[0];if(!target)return null;
  const user=await actor(db,target.role,target.actor_id);
  const row=(await db.query('SELECT * FROM login_challenges WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!row||row.binding_hash!==bindingHash(binding))return null;
  if(!eligible(user,row.role)||user.auth_version!==row.auth_version||user.email!==row.email||new Date(row.expires_at).getTime()<=Date.now()||row.attempts>=5){await db.query('DELETE FROM login_challenges WHERE id=$1',[id]);return null;}
  return {row,user};
 }
 async function verify(id:string,binding:string,code:string,ip:string){
  await transaction(db=>limit(db,ip,'login_code_ip',30,900));
  const target=(await pool.query('SELECT actor_id FROM login_challenges WHERE id=$1',[id])).rows[0];
  if(target)await transaction(db=>limit(db,target.actor_id,'login_code_actor',20,900));
  const result=await transaction(async db=>{
   const current=await locked(db,id,binding);if(!current)return null;const {row,user}=current;
   if(!row.delivered)return null;
   const valid=timingSafeEqual(Buffer.from(row.code_hash,'hex'),Buffer.from(codeHash(id,code),'hex'));
   if(!valid){await db.query('UPDATE login_challenges SET attempts=attempts+1 WHERE id=$1',[id]);if(row.attempts+1>=5)await db.query('DELETE FROM login_challenges WHERE id=$1',[id]);return row.attempts+1>=5?null:false;}
   await db.query('DELETE FROM login_challenges WHERE id=$1',[id]);
   if(row.role==='admin')await db.query('UPDATE admins SET email_verified_at=COALESCE(email_verified_at,now()) WHERE id=$1',[user.id]);
   await db.query(`UPDATE ${row.role==='admin'?'admins':'operators'} SET notification_language=$2 WHERE id=$1 AND NOT notification_language_saved`,[user.id,row.language]);
   return {id:user.id,role:row.role as LoginRole,version:user.auth_version};
  });
  if(result===false)return fail(400,'LOGIN_CODE_INVALID','Incorrect sign-in code');
  if(!result)return fail(401,'LOGIN_CHALLENGE_INVALID','Sign-in request expired or unavailable; start again');return result;
 }
 async function resend(id:string,binding:string,ip:string){
  await transaction(db=>limit(db,ip,'login_resend_ip',10,900));
  const target=(await pool.query('SELECT actor_id,email,resend_at,sends,binding_hash,expires_at FROM login_challenges WHERE id=$1',[id])).rows[0];
  if(!target||target.binding_hash!==bindingHash(binding)||new Date(target.expires_at).getTime()<=Date.now())fail(401,'LOGIN_CHALLENGE_INVALID','Start sign-in again');
  if(target.sends>=3)fail(429,'LOGIN_RESEND_LIMIT','Start sign-in again later');
  if(new Date(target.resend_at).getTime()>Date.now())throw new Fault(429,'LOGIN_RESEND_WAIT','Wait before requesting another code',new Date(target.resend_at).toISOString());
  await transaction(async db=>{await limit(db,target.actor_id,'login_mail_actor',5,900);await limit(db,digest(target.email),'login_mail_address',5,900);});
  let code=String(randomInt(1_000_000)).padStart(6,'0');
  const row=await transaction(async db=>{
   const current=await locked(db,id,binding);if(!current)return fail(401,'LOGIN_CHALLENGE_INVALID','Start sign-in again');
   if(current.row.sends>=3)fail(429,'LOGIN_RESEND_LIMIT','Start sign-in again later');
   if(new Date(current.row.resend_at).getTime()>Date.now())throw new Fault(429,'LOGIN_RESEND_WAIT','Wait before requesting another code',new Date(current.row.resend_at).toISOString());
   while(codeHash(id,code)===current.row.code_hash)code=String(randomInt(1_000_000)).padStart(6,'0');
   return (await db.query("UPDATE login_challenges SET code_hash=$2,delivered=false,sends=sends+1,resend_at=now()+interval '60 seconds' WHERE id=$1 RETURNING *",[id,codeHash(id,code)])).rows[0];
  });
  await deliver(row,code);return publicState(row);
 }
 async function pending(id?:string,binding?:string){
  if(!id||!binding)return null;
  const row=(await pool.query('SELECT expires_at,resend_at FROM login_challenges WHERE id=$1 AND binding_hash=$2 AND delivered AND expires_at>now() AND attempts<5',[id,bindingHash(binding)])).rows[0];return row?publicState(row):null;
 }
 async function cancel(id?:string,binding?:string){if(id&&binding)await pool.query('DELETE FROM login_challenges WHERE id=$1 AND binding_hash=$2',[id,bindingHash(binding)]);}
 return {start,verify,resend,pending,cancel};
}
