import {backendHost} from './listen-address.js';
import {createMailer} from './mailer.js';
import {startNotificationWorker} from './notifications.js';
import {startBackgroundJobs} from './background-jobs.js';
import { createApp } from "./app.js";
import { pool } from "./db.js";
if(process.env.BACKGROUND_JOBS_ENABLED && !['true','false'].includes(process.env.BACKGROUND_JOBS_ENABLED))throw Error('BACKGROUND_JOBS_ENABLED must be true or false');
const host=backendHost(process.env.BACKEND_HOST);
const mailer=createMailer();
const app = await createApp({mailer});
await app.listen({ host, port: Number(process.env.PORT || 4322) });
const stopJobs=process.env.BACKGROUND_JOBS_ENABLED==='false'?async()=>{}:startBackgroundJobs();
const stopNotifications=process.env.BACKGROUND_JOBS_ENABLED==='false'?async()=>{}:startNotificationWorker(mailer,process.env.PUBLIC_ORIGIN||'http://localhost:4321');
console.log("NullTopic backend ready");
let stopping=false;
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    if(stopping)return;stopping=true;
    const stopped=Promise.all([stopJobs(),stopNotifications()]);
    await app.close();
    await stopped;
    await pool.end();
    process.exit(0);
  });
