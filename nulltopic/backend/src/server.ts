import {startBackgroundJobs} from './background-jobs.js';
import { createApp } from "./app.js";
import { pool } from "./db.js";
if(process.env.BACKGROUND_JOBS_ENABLED && !['true','false'].includes(process.env.BACKGROUND_JOBS_ENABLED))throw Error('BACKGROUND_JOBS_ENABLED must be true or false');
const app = await createApp();
await app.listen({ host: "127.0.0.1", port: Number(process.env.PORT || 4322) });
const stopJobs=process.env.BACKGROUND_JOBS_ENABLED==='false'?async()=>{}:startBackgroundJobs();
console.log("NullTopic backend ready");
let stopping=false;
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    if(stopping)return;stopping=true;
    const stopped=stopJobs();
    await app.close();
    await stopped;
    await pool.end();
    process.exit(0);
  });
