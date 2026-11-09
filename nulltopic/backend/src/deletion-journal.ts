import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,rename,unlink} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {pool} from './db.js';
/** One mutex for every journal writer; query after locking, never replace with an older snapshot. */
export async function exportDeletionJournal(){
 const db=await pool.connect();let locked=false,temporary:string|undefined;
 try{
  await db.query('SELECT pg_advisory_lock(481925)');locked=true;
  const destination=resolve(process.env.CASE_PURGE_JOURNAL_PATH||'../.local/case-purge-journal.json');
  await mkdir(dirname(destination),{recursive:true,mode:0o700});
  const entries=(await db.query('SELECT case_id,purged_at FROM case_purge_journal ORDER BY purged_at,case_id')).rows;
  const postEntries=(await db.query('SELECT post_id,conversation_id,was_root,deleted_at FROM post_deletion_journal ORDER BY deleted_at,post_id')).rows;
  const identityEntries=(await db.query('SELECT kind,identity_id,deleted_at FROM identity_deletion_journal ORDER BY deleted_at,kind,identity_id')).rows;
  temporary=destination+'.'+randomUUID()+'.tmp';
  await writeFile(temporary,JSON.stringify({version:3,exportedAt:new Date().toISOString(),entries,postEntries,identityEntries}),{mode:0o600,flag:'wx'});
  await rename(temporary,destination);temporary=undefined;
 }finally{if(temporary)await unlink(temporary).catch(()=>{});if(locked)await db.query('SELECT pg_advisory_unlock(481925)');db.release();}
}
