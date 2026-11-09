import {pool,type DB} from './db.js';

/** Call only with the exclusive maintenance lock, before removing any evidence. */
export async function purgeCase(db:DB,id:string,reference:Date){
 await db.query('INSERT INTO case_purge_journal(case_id,purged_at) VALUES($1,$2) ON CONFLICT(case_id) DO NOTHING',[id,reference]);
 // Children/acknowledgements cascade; audit/control metadata is case-owned.
 await db.query('DELETE FROM appeals WHERE case_id=$1',[id]);
 await db.query('DELETE FROM moderation WHERE case_id=$1',[id]);
 await db.query('DELETE FROM reports WHERE case_id=$1',[id]);
 await db.query('DELETE FROM moderation_cases WHERE id=$1',[id]);
}
export async function cleanupCases(dryRun=false,reference=new Date()){
 if(!Number.isFinite(reference.getTime()))throw Error('Invalid retention reference');
 const c=await pool.connect();let count=0;
 try{
  // One bounded batch per invocation; do not starve normal requests.
  await c.query('BEGIN');
  const lock=(await c.query('SELECT pg_try_advisory_xact_lock(481920) AS acquired')).rows[0].acquired;
  if(!lock){await c.query('ROLLBACK');return {count:0,dryRun,locked:true};}
  const due=(await c.query('SELECT case_id FROM case_retention WHERE delete_after <= $1 ORDER BY delete_after,case_id LIMIT 100',[reference])).rows;
  if(!dryRun){
   for(const row of due){await purgeCase(c,row.case_id,reference);count++;}
   // Journal mirrors must outlive all allowed server backups (30 days).
   await c.query("DELETE FROM case_purge_journal WHERE purged_at < $1::timestamptz-interval '35 days'",[reference]);
   await c.query("DELETE FROM identity_deletion_journal WHERE deleted_at < $1::timestamptz-interval '35 days'",[reference]);
   await c.query("DELETE FROM post_deletion_journal WHERE deleted_at < $1::timestamptz-interval '35 days'",[reference]);
  }else count=due.length;
  await c.query('COMMIT');return {count,dryRun,reference:reference.toISOString(),batchLimit:100};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
/** Trusted, out-of-band, post-backup ledger only. No public restore endpoint. */
export async function reconcileCases(entries:{case_id:string;purged_at:string}[]){
 const c=await pool.connect();let count=0;
 try{
  await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(481920)');
  for(const entry of entries){
   if((await c.query('SELECT id FROM moderation_cases WHERE id=$1',[entry.case_id])).rowCount){await purgeCase(c,entry.case_id,new Date(entry.purged_at));count++;}
  }
  await c.query('COMMIT');return {count};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
