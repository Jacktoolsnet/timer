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
  } else throw Error("Expected migrate, cleanup or bootstrap");
} catch (e) {
  console.error(e instanceof Error ? e.message : "Command failed");
  process.exitCode = 1;
} finally {
  await pool.end();
}
