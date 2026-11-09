import {cleanupCases,reconcileCases} from './case-retention.js';
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {z} from 'zod';
import {createMailer} from './mailer.js';
import {operatorEmail} from './operator-email.js';
import {declarations} from '../../shared/declarations.js';
import {registerOperator} from './authorization.js';
import { migrate, cleanup, pool } from "./db.js";
import { randomUUID } from "node:crypto";
import argon2 from "argon2";
try {
  const command = process.argv[2];
  if (command === "migrate") await migrate();
  else if (command === "cleanup") {
    const reference = new Date();
    console.log(
      JSON.stringify({
        event: "cleanup_start",
        reference: reference.toISOString(),
      }),
    );
    const result = await cleanup(process.argv.includes("--dry-run"), reference);
    console.log(JSON.stringify({ event: "cleanup_end", ...result }));
  } else if (command === 'cleanup-cases') {
    const runner=await pool.connect();let count=0;
    try{
      if(!(await runner.query('SELECT pg_try_advisory_lock(481921) AS acquired')).rows[0].acquired)throw Error('Case cleanup already running; retry later');
      const dryRun=process.argv.includes('--dry-run');
      for(;;){
        const result=await cleanupCases(dryRun);count+=result.count;
        if('locked' in result)throw Error('Case maintenance busy; retry later');
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
      console.log(JSON.stringify({event:'case_cleanup',count,dryRun,batchLimit:100}));
    }finally{await runner.query('SELECT pg_advisory_unlock(481921)');runner.release();}
  } else if(command==='reconcile-cases'){
    const source=process.env.CASE_PURGE_JOURNAL_PATH;
    if(!source)throw Error('Provide a current, trusted out-of-band CASE_PURGE_JOURNAL_PATH; keep the restored service offline');
    const journal=z.object({version:z.literal(1),exportedAt:z.iso.datetime(),entries:z.array(z.object({case_id:z.string().uuid(),purged_at:z.iso.datetime()})).max(1000000)}).strict().parse(JSON.parse(await readFile(source,'utf8')));
    if(Date.now()-Date.parse(journal.exportedAt)>86400000||Date.parse(journal.exportedAt)>Date.now()+60000)throw Error('Restore journal must be refreshed within 24 hours before reconciliation');
    console.log(JSON.stringify({event:'case_restore_reconciliation',...await reconcileCases(journal.entries)}));
  } else if (command === "bootstrap") {
    const handle = process.env.BOOTSTRAP_HANDLE,
      password = process.env.BOOTSTRAP_PASSWORD;
    if (
      !handle ||
      !/^[a-z0-9_]{3,32}$/.test(handle) ||
      !password ||
      password.length < 12
    )
      throw Error(
        "Set BOOTSTRAP_HANDLE (3–32 lowercase letters/digits/underscores) and BOOTSTRAP_PASSWORD (at least 12 characters)",
      );
    const table = process.argv.includes("--admin") ? "admins" : "operators";
    if(table==='operators' && (!['personal','organization'].includes(process.env.BOOTSTRAP_ACCOUNT_TYPE || '') || process.env.BOOTSTRAP_AGE_CONFIRMED!=='true' || (process.env.BOOTSTRAP_ACCOUNT_TYPE==='organization' && process.env.BOOTSTRAP_ORGANIZATION_AUTHORIZED!=='true')))
      throw Error('Use /operator to register, or explicitly set BOOTSTRAP_ACCOUNT_TYPE, BOOTSTRAP_AGE_CONFIRMED=true and (for Organization) BOOTSTRAP_ORGANIZATION_AUTHORIZED=true after reading /api/declarations. No account was created.');
    if(table==='operators'){
    const email=operatorEmail(createMailer(),process.env.PUBLIC_ORIGIN || 'http://localhost:4321');email.available();
    const created=await registerOperator(pool,{
      handle,password,email:process.env.BOOTSTRAP_EMAIL,accountType:process.env.BOOTSTRAP_ACCOUNT_TYPE,
      ageConfirmed:process.env.BOOTSTRAP_AGE_CONFIRMED==='true',ageVersion:declarations.age.version,
      ...(process.env.BOOTSTRAP_ACCOUNT_TYPE==='organization'?{organizationAuthorized:process.env.BOOTSTRAP_ORGANIZATION_AUTHORIZED==='true',organizationVersion:declarations.organization.version}:{}),
    });
    if(!created)throw Error('Operator handle or email already registered');
    await email.request(process.env.BOOTSTRAP_EMAIL!.trim().toLowerCase(),'verify','en','bootstrap');await email.drain();
    }
    else await pool.query('INSERT INTO admins(id,handle,password) VALUES($1,$2,$3)',[randomUUID(),handle,await argon2.hash(password)]);
    console.log(table==='operators'?"Account created; verify the address using the account email before signing in":"Account created");
  } else throw Error("Expected migrate, cleanup, cleanup-cases, reconcile-cases or bootstrap");
} catch (e) {
  console.error(e instanceof Error ? e.message : "Command failed");
  process.exitCode = 1;
} finally {
  await pool.end();
}
