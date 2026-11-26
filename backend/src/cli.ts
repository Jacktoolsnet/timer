import {ApiError} from './http.js';
import {createCertificateMonitor,type CertificateMonitor} from './certificate-monitor.js';
import {loadEnvironment,loadConfig} from './config.js';
import {Database,databaseErrorHint} from './database.js';
import {migrate,requireSchema} from './migrate.js';
import {bootstrapRoot} from './bootstrap.js';
loadEnvironment();
const action=process.argv[2];
let db:Database|undefined,certificates:CertificateMonitor|undefined;
try{
 if(!['migrate','root:reset','certificates:check'].includes(action))throw new Error('Unknown command');
 if(action==='root:reset'&&!process.argv.includes('--confirm'))throw new Error('Root reset requires --confirm (revokes all root sessions)');
 const config=loadConfig(process.env);db=new Database(config);
 if(action==='migrate')await migrate(db);
 else if(action==='root:reset'){await requireSchema(db);await bootstrapRoot(db,config,true);}
 else{
  await requireSchema(db);certificates=createCertificateMonitor(config.certificates,db);await certificates.run('cli');
  const overview=await certificates.overview();console.log(JSON.stringify({summary:overview.summary,mailError:overview.monitor.lastMailError}));
  if(overview.monitor.lastMailError==='mail_failed')process.exitCode=1;
 }
 console.log(`${action}: complete`);
}catch(error){
 const monitorErrors:Record<string,string>={certificates_disabled:'Certificate monitor is disabled; set CERT_MONITOR_ENABLED=true',certificates_no_targets:'Certificate monitor has no configured domains',certificates_running:'Certificate check is already running; try again later',certificates_limited:'Certificate check was started less than one minute ago'};
 console.error(error instanceof ApiError&&monitorErrors[error.code]||databaseErrorHint(error)||(error instanceof Error&&/^(Invalid|Set |Root|Unknown|Run |Pending)/.test(error.message)?error.message:'Command failed; check database connection and migration state'));process.exitCode=1;}
finally{await certificates?.close();await db?.close();}
