import {loadEnvironment,loadConfig} from './config.js';
import {Database,databaseErrorHint} from './database.js';
import {requireSchema} from './migrate.js';
import {bootstrapRoot} from './bootstrap.js';
import {createApp} from './app.js';
loadEnvironment();
let db:Database|undefined;
try{
 const config=loadConfig(process.env);db=new Database(config);
 await requireSchema(db);await bootstrapRoot(db,config);
 const app=await createApp(config,db);
 const server=app.listen(config.port,config.host,()=>console.log(JSON.stringify({event:'listening',host:config.host,port:config.port})));
 server.on('error',()=>{console.error('HTTP listener failed');void db?.close().finally(()=>process.exit(1));});
 const cleanup=setInterval(()=>{
  void db!.query("DELETE FROM jt_tv_sessions WHERE expires_at<=now() OR (state IN ('waiting','pending') AND pair_expires_at<=now())").catch(()=>{});
  void db!.query('DELETE FROM jt_admin_sessions WHERE expires_at<=now() OR last_seen_at<now()-($1*interval \'1 second\')',[config.sessionIdle]).catch(()=>{});
  void db!.query('DELETE FROM jt_rate_limits WHERE expires_at<=now()').catch(()=>{});
  void db!.query("DELETE FROM jt_audit_events WHERE created_at<now()-interval '90 days'").catch(()=>{});
 },60000);cleanup.unref();
 let stopping=false;
 const shutdown=()=>{
  if(stopping)return;stopping=true;clearInterval(cleanup);
  const force=setTimeout(()=>process.exit(1),10000);force.unref();
  server.close(()=>{void db!.close().finally(()=>{clearTimeout(force);process.exit(0);});});
 };
 process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
}catch(error){
 // Configuration errors contain variable names only, never supplied values/connection URLs.
 console.error(JSON.stringify({event:'startup_failed',message:databaseErrorHint(error)||(error instanceof Error&&/^(Invalid|Set |Run |Pending)/.test(error.message)?error.message:'Check database connection, schema and root configuration')}));
 await db?.close();process.exitCode=1;
}
