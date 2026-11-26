import {randomUUID} from 'node:crypto';
import type {Database} from './database.js';
import type {Config} from './config.js';
import {hashPassword} from './security.js';
export async function bootstrapRoot(db:Database,config:Config,reset=false){
 const hash=await hashPassword(config.rootPassword);
 return db.transaction(async client=>{
  await client.query('SELECT pg_advisory_xact_lock(173620,2)');
  const row=await client.query("SELECT id,username FROM jt_users WHERE role='root' FOR UPDATE");
  if(row.rowCount){
   const root=row.rows[0];
   if(!reset)return false;
   await client.query('UPDATE jt_users SET username=$1,password_hash=$2,active=true,must_change_password=false,updated_at=now() WHERE id=$3',[config.rootUsername,hash,root.id]);
   await client.query('DELETE FROM jt_admin_sessions WHERE user_id=$1',[root.id]);
   await client.query("INSERT INTO jt_audit_events(actor_id,target_id,action) VALUES($1,$1,'root_recovered')",[root.id]);
   return true;
  }
  const id=randomUUID();
  await client.query("INSERT INTO jt_users(id,username,email,display_name,role,password_hash) VALUES($1,$2,$3,$2,'root',$4)",[id,config.rootUsername,config.rootEmail,hash]);
  await client.query("INSERT INTO jt_audit_events(actor_id,target_id,action) VALUES($1,$1,'root_bootstrapped')",[id]);
  return true;
 });
}
