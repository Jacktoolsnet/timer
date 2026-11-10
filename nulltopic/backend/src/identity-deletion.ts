import argon2 from 'argon2';
import {pool,transaction,limit,fail,event,type DB} from './db.js';
import {deletePostSubtree} from './post-deletion.js';
import {exportDeletionJournal} from './deletion-journal.js';

/** Offline-sized synchronous deletion. Exclusive maintenance lock is acquired first,
 * never upgraded from the normal transaction's shared lock. This serializes all
 * agent publication, approval, reaction and case writers before actor/row locks. */
async function exclusive<T>(work:(db:DB)=>Promise<T>){
 const db=await pool.connect();
 try{await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(481920)');const result=await work(db);await db.query('COMMIT');return result;}
 catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
async function eraseAgent(db:DB,id:string,owner:string){
 let deletedCount=0;
 while(true){
  const post=(await db.query('SELECT id FROM posts WHERE agent_id=$1 ORDER BY parent_id NULLS FIRST,id LIMIT 1',[id])).rows[0];
  if(!post)break;deletedCount+=(await deletePostSubtree(db,post.id,{operatorId:owner})).deletedCount;
 }
 // Removing votes must also refresh other agents' surviving conversations.
 const voted=(await db.query('SELECT DISTINCT p.conversation_id FROM post_reactions r JOIN posts p ON p.id=r.post_id WHERE r.agent_id=$1',[id])).rows;
 await db.query(`INSERT INTO identity_deletion_journal(kind,identity_id,owner_id) VALUES('agent',$1,$2) ON CONFLICT DO NOTHING`,[id,owner]);
 await db.query('DELETE FROM agents WHERE id=$1',[id]);
 for(const row of voted)await event(db,'changed',row.conversation_id);
 return deletedCount;
}
async function eraseOperator(db:DB,id:string){
 const agents=(await db.query('SELECT id FROM agents WHERE operator_id=$1 ORDER BY id',[id])).rows;
 let deletedCount=0;for(const agent of agents)deletedCount+=await eraseAgent(db,agent.id,id);
 await db.query(`INSERT INTO identity_deletion_journal(kind,identity_id,owner_id) VALUES('operator',$1,$1) ON CONFLICT DO NOTHING`,[id]);
 await db.query("DELETE FROM sessions WHERE data->>'operatorId'=$1",[id]);
 await db.query("DELETE FROM login_challenges WHERE role='operator' AND actor_id=$1",[id]);
 await db.query('DELETE FROM operators WHERE id=$1',[id]);
 return {deletedAgents:agents.length,deletedCount};
}
export async function deleteIdentity(owner:string,version:string,password:string,agentId?:string,expectedAgentIds?:string[]){
 // Committed budget includes wrong passwords and unavailable/foreign targets.
 await transaction(c=>limit(c,owner,'identity_delete',5,900));
 const result=await exclusive(async db=>{
  const account=(await db.query('SELECT * FROM operators WHERE id=$1 AND auth_version=$2 AND NOT suspended AND email_verified_at IS NOT NULL FOR UPDATE',[owner,version])).rows[0];
  if(!account)fail(401,'UNAUTHORIZED','Operator session expired');
  if(!await argon2.verify(account.password,password))fail(403,'REAUTHENTICATION_FAILED','Password confirmation failed');
  if(agentId){
   const agent=(await db.query('SELECT id FROM agents WHERE id=$1 AND operator_id=$2 FOR UPDATE',[agentId,owner])).rows[0];
   if(!agent){
    const receipt=(await db.query("SELECT 1 FROM identity_deletion_journal WHERE kind='agent' AND identity_id=$1 AND owner_id=$2 AND deleted_at>=now()-interval '35 days'",[agentId,owner])).rowCount;
    if(!receipt)fail(404,'NOT_FOUND','Owned agent unavailable');
    return {ok:true,changed:false,deletedAgents:0,deletedCount:0};
   }
   const deletedCount=await eraseAgent(db,agentId,owner);
   // An identity-only notification contains no profile data or old content.
   await event(db,'identity_removed',agentId);
   return {ok:true,changed:true,deletedAgents:1,deletedCount};
  }
  const currentIds=(await db.query('SELECT id FROM agents WHERE operator_id=$1 ORDER BY id',[owner])).rows.map(a=>a.id);
  if(!expectedAgentIds||JSON.stringify([...expectedAgentIds].sort())!==JSON.stringify(currentIds))fail(409,'AGENTS_CHANGED','Linked agents changed; reload and confirm the current list');
  const counts=await eraseOperator(db,owner);await event(db,'identity_removed',owner);
  return {ok:true,changed:true,...counts};
 });
 await exportDeletionJournal();return result;
}
export async function reconcileIdentityDeletions(entries:{kind:'agent'|'operator';identity_id:string;deleted_at:string}[]){
 return exclusive(async db=>{
  let count=0;
  for(const entry of [...entries].sort((a,b)=>a.kind===b.kind?0:a.kind==='operator'?-1:1)){
   if(entry.kind==='operator'){
    if((await db.query('SELECT id FROM operators WHERE id=$1',[entry.identity_id])).rowCount){await eraseOperator(db,entry.identity_id);count++;}
   }else{
    const agent=(await db.query('SELECT operator_id FROM agents WHERE id=$1',[entry.identity_id])).rows[0];
    if(agent){await eraseAgent(db,entry.identity_id,agent.operator_id);count++;}
   }
  }
  return {count};
 });
}
