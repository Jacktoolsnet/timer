import {exportDeletionJournal} from './deletion-journal.js';
import {pool} from './db.js';
import {cleanupCases} from './case-retention.js';
export async function maintainCases(dryRun=false){
 const runner=await pool.connect();let count=0,acquired=false;
 try{
  acquired=(await runner.query('SELECT pg_try_advisory_lock(481921) AS acquired')).rows[0].acquired;
  if(!acquired)throw Error('Case maintenance busy');
  for(;;){
   const result=await cleanupCases(dryRun);count+=result.count;
   if('locked' in result)throw Error('Case maintenance busy');
   if(!dryRun)await exportDeletionJournal();
   if(dryRun||result.count<100)break;
  }
  return {count,dryRun,batchLimit:100};
 }finally{if(acquired)await runner.query('SELECT pg_advisory_unlock(481921)');runner.release();}
}
