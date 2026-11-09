import {pool,cleanup,fail} from './db.js';
import {maintainCases} from './case-maintenance.js';
export const jobIds=['conversations','cases'] as const;
export type JobId=typeof jobIds[number];
const times={conversations:[3,15],cases:[3,30]} as const;
const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
function parts(date:Date){return Object.fromEntries(formatter.formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));}
/** Berlin 03:15/03:30 exist exactly once even on DST transition days. */
export function jobSlots(id:JobId,now=new Date()){
 const p=parts(now),day=Date.UTC(p.year,p.month-1,p.day),[hour,minute]=times[id];
 function slot(day:number){const target=day+(hour*60+minute)*60000;let utc=target;for(let i=0;i<3;i++){const q=parts(new Date(utc));utc+=target-Date.UTC(q.year,q.month-1,q.day,q.hour,q.minute,q.second);}return new Date(utc);}
 const today=slot(day);return {due:today<=now?today:slot(day-86400000),next:today>now?today:slot(day+86400000)};
}
export async function jobList(now=new Date()){
 const rows=(await pool.query(`SELECT j.*,r.id AS run_id,r.started_at,r.finished_at,r.status AS last_status,r.affected_count,r.error_code
 FROM background_jobs j LEFT JOIN LATERAL(SELECT * FROM background_job_runs WHERE job_id=j.id ORDER BY started_at DESC,id DESC LIMIT 1) r ON true ORDER BY j.id`)).rows;
 return rows.map(row=>{
  const slots=jobSlots(row.id,now),due=!row.last_success_due||new Date(row.last_success_due)<slots.due;
  const running=row.last_status==='running';
  return {...row,next_run_at:slots.next.toISOString(),due_at:slots.due.toISOString(),time_zone:'Europe/Berlin',
   state:running?'running':row.last_status==='failed'?'failed':due?'overdue':'ready',manual_required:!running&&(due||row.last_status==='failed')};
 });
}
export async function previewJob(id:JobId,adminId:string){
 const state=(await jobList()).find(j=>j.id===id);
 if(!state?.manual_required)fail(409,'JOB_NOT_DUE','No manual run is required');
 // A non-mutating, complete count rather than a capped batch preview.
 const count=Number((await pool.query(id==='cases'?'SELECT count(*) FROM case_retention WHERE delete_after<=now()':"SELECT count(*) FROM conversations WHERE last_activity_at<=now()-interval '30 days'")).rows[0].count);
 const preview=(await pool.query('INSERT INTO background_job_previews(job_id,admin_id,affected_count) VALUES($1,$2,$3) RETURNING id,expires_at',[id,adminId,count])).rows[0];
 return {...preview,count,job_id:id};
}
export async function runJob(id:JobId,source:'scheduled'|'manual'|'cli',manual?:{adminId:string;version:string;previewId:string},work?:(id:JobId)=>Promise<{count:number}>,now=new Date()){
 if(source==='manual'&&!manual)fail(400,'PREVIEW_REQUIRED','Manual runs require confirmation');
 const connection=await pool.connect();let runId:string|undefined,acquired=false;const key=id==='cases'?481923:481924;
 try{
  acquired=(await connection.query('SELECT pg_try_advisory_lock($1) AS acquired',[key])).rows[0].acquired;
  if(!acquired){if(manual)fail(409,'JOB_RUNNING','Job already running');return {skipped:true};}
  await connection.query("DELETE FROM background_job_previews WHERE expires_at<now()");
  await connection.query("DELETE FROM background_job_runs WHERE finished_at<now()-interval '35 days'");
  // A running record without its advisory lock belongs to a crashed process.
  await connection.query("UPDATE background_job_runs SET status='failed',finished_at=now(),error_code='INTERRUPTED' WHERE job_id=$1 AND status='running'",[id]);
  const current=(await jobList(now)).find(j=>j.id===id)!;
  if(source!=='cli'&&!current.manual_required){if(manual)fail(409,'JOB_NOT_DUE','Job already completed');return {skipped:true};}
  if(source==='scheduled'&&current.retry_at&&new Date(current.retry_at)>now)return {skipped:true};
  await connection.query('BEGIN');
  try{
   if(manual){
    if(!(await connection.query('SELECT id FROM admins WHERE id=$1 AND NOT is_root AND enabled AND auth_version=$2 FOR SHARE',[manual.adminId,manual.version])).rowCount)fail(403,'MODERATOR_REQUIRED','Administrator session expired');
    if(!(await connection.query('UPDATE background_job_previews SET used_at=now() WHERE id=$1 AND job_id=$2 AND admin_id=$3 AND used_at IS NULL AND expires_at>now() RETURNING id',[manual.previewId,id,manual.adminId])).rowCount)fail(409,'PREVIEW_EXPIRED','Prepare a fresh preview');
   }
   runId=(await connection.query("INSERT INTO background_job_runs(job_id,source,admin_id,due_at,status) VALUES($1,$2,$3,$4,'running') RETURNING id",[id,source,manual?.adminId||null,current.due_at])).rows[0].id;
   await connection.query('COMMIT');
  }catch(error){await connection.query('ROLLBACK');throw error;}
  const result=await (work?work(id):id==='cases'?maintainCases():cleanup());
  if('locked' in result)throw Error('Maintenance busy');
  await connection.query('BEGIN');
  try{
   await connection.query("UPDATE background_job_runs SET status='succeeded',finished_at=now(),affected_count=$2 WHERE id=$1",[runId,result.count]);
   await connection.query('UPDATE background_jobs SET last_success_due=$2,last_success_at=now(),retry_at=NULL WHERE id=$1',[id,current.due_at]);
   await connection.query("DELETE FROM background_job_previews WHERE expires_at<now()-interval '1 day'");
   await connection.query("DELETE FROM background_job_runs WHERE finished_at<now()-interval '35 days' AND id<>$1",[runId]);
   await connection.query('COMMIT');
  }catch(error){await connection.query('ROLLBACK');throw error;}
  return {count:result.count};
 }catch(error){
  if(runId){await connection.query("UPDATE background_job_runs SET status='failed',finished_at=now(),error_code='FAILED' WHERE id=$1",[runId]);await connection.query("UPDATE background_jobs SET retry_at=now()+interval '15 minutes' WHERE id=$1",[id]);}
  throw error;
 }finally{if(acquired)await connection.query('SELECT pg_advisory_unlock($1)',[key]);connection.release();}
}
export function startBackgroundJobs(log:(message:string)=>void=console.error,execute:(id:JobId)=>Promise<unknown>=id=>runJob(id,'scheduled')){
 let stopped=false,pending:Promise<void>|undefined;
 async function tick(){for(const id of jobIds){if(stopped)return;try{await execute(id);}catch{log('Background job failed: '+id);}}}
 function launch(){if(stopped||pending)return;pending=tick().finally(()=>{pending=undefined;});}
 const timer=setInterval(launch,30000);timer.unref();launch();
 return async()=>{stopped=true;clearInterval(timer);await pending;};
}
