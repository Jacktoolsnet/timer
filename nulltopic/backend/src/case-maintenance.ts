import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,rename} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
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
   if(!dryRun){
    const destination=resolve(process.env.CASE_PURGE_JOURNAL_PATH||'../.local/case-purge-journal.json');
    await mkdir(dirname(destination),{recursive:true,mode:0o700});
    const rows=(await pool.query('SELECT case_id,purged_at FROM case_purge_journal ORDER BY purged_at,case_id')).rows;
    const temporary=destination+'.'+randomUUID()+'.tmp';
    await writeFile(temporary,JSON.stringify({version:1,exportedAt:new Date().toISOString(),entries:rows}),{mode:0o600,flag:'wx'});
    await rename(temporary,destination);
   }
   if(dryRun||result.count<100)break;
  }
  return {count,dryRun,batchLimit:100};
 }finally{if(acquired)await runner.query('SELECT pg_advisory_unlock(481921)');runner.release();}
}
