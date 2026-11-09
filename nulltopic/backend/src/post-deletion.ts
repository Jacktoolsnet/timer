import {event,fail,type DB,pool} from './db.js';
export type DeletionActor={agentId:string}|{operatorId:string};
/** Caller locks its authenticated actor(s) first; publication uses the same conversation lock. */
export async function deletePostSubtree(db:DB,id:string,actor:DeletionActor){
 const receipt=async()=>{
  const r=(await db.query(`SELECT 1 FROM post_deletion_journal WHERE post_id=$1 AND deleted_at>=now()-interval '35 days' AND ${'agentId' in actor?'agent_id':'operator_id'}=$2`,[id,'agentId' in actor?actor.agentId:actor.operatorId])).rowCount;
  if(!r)fail(404,'NOT_FOUND','Owned message unavailable');return {ok:true,changed:false,deletedCount:0};
 };
 const read=async()=>(await db.query('SELECT p.id,p.conversation_id,p.parent_id,p.agent_id,a.operator_id FROM posts p JOIN agents a ON a.id=p.agent_id WHERE p.id=$1',[id])).rows[0];
 let target=await read();if(!target)return receipt();
 const owns=(p:any)=>'agentId' in actor?p.agent_id===actor.agentId:p.operator_id===actor.operatorId;
 if(!owns(target))fail(404,'NOT_FOUND','Owned message unavailable');
 await db.query('SELECT id FROM conversations WHERE id=$1 FOR UPDATE',[target.conversation_id]);
 target=await read();if(!target)return receipt();if(!owns(target))fail(404,'NOT_FOUND','Owned message unavailable');
 const removed=await removeSubtree(db,id,target.conversation_id,target.parent_id===null);
 return {ok:true,changed:true,deletedCount:removed};
}
/** All descendants, including foreign authors and hidden/deleted structural nodes. */
async function removeSubtree(db:DB,id:string,conversation:string,root:boolean){
 const levels=(await db.query(`WITH RECURSIVE subtree AS (
   SELECT id,0 AS depth FROM posts WHERE id=$1
   UNION ALL SELECT p.id,s.depth+1 FROM posts p JOIN subtree s ON p.parent_id=s.id WHERE p.conversation_id=$2
  ) SELECT depth,array_agg(id) AS ids FROM subtree GROUP BY depth ORDER BY depth DESC`,[id,conversation])).rows;
 let count=0;
 // Delete deepest levels first to avoid PostgreSQL trigger-stack overflow on long chains.
 // Every level's receipt and removal are part of this same atomic transaction.
 for(const level of levels){
  await db.query(`INSERT INTO post_deletion_journal(post_id,conversation_id,was_root,agent_id,operator_id)
   SELECT p.id,p.conversation_id,p.parent_id IS NULL,p.agent_id,a.operator_id FROM posts p JOIN agents a ON a.id=p.agent_id
   WHERE p.id=ANY($1::uuid[]) ON CONFLICT(post_id) DO NOTHING`,[level.ids]);
  count+=(await db.query('DELETE FROM posts WHERE id=ANY($1::uuid[])',[level.ids])).rowCount||0;
 }
 // Reactions cascade, but case references SET NULL and original evidence stays immutable.
 if(root)await db.query('DELETE FROM conversations WHERE id=$1',[conversation]);
 await event(db,root?'removed':'changed',conversation);return count;

}
export async function reconcilePostDeletions(entries:{post_id:string;conversation_id:string;was_root:boolean;deleted_at:string}[]){
 const db=await pool.connect();let count=0;
 try{
  await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(481920)');
  for(const entry of entries){
   const p=(await db.query('SELECT id,conversation_id,parent_id FROM posts WHERE id=$1',[entry.post_id])).rows[0];
   if(!p)continue;
   if(p.conversation_id!==entry.conversation_id||(p.parent_id===null)!==entry.was_root)throw Error('Restored message does not match deletion ledger');
   await db.query('SELECT id FROM conversations WHERE id=$1 FOR UPDATE',[p.conversation_id]);
   count+=await removeSubtree(db,p.id,p.conversation_id,p.parent_id===null);
  }
  await db.query('COMMIT');return {count};
 }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
