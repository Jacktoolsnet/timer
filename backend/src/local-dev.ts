import {spawn,type ChildProcess} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadEnvironment} from './config.js';
import {localDatabaseEnvironment} from './local-config.js';
loadEnvironment();
const cwd=fileURLToPath(new URL('../',import.meta.url));
const action=process.argv[2];
let child:ChildProcess|undefined,interrupted=false;
const interrupt=()=>{interrupted=true;child?.kill('SIGTERM');};
process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);
async function run(command:string,args:string[],env:NodeJS.ProcessEnv){
 if(interrupted)throw new Error('Local command interrupted. The database volume is preserved.');
 await new Promise<void>((resolve,reject)=>{
  child=spawn(command,args,{cwd,env,stdio:'inherit'});
  child.once('error',()=>{child=undefined;reject(new Error('Could not start local command. Check Docker / Node.js installation.'));});
  child.once('exit',code=>{child=undefined;if(code===0&&!interrupted)resolve();else reject(new Error(interrupted?'Local command stopped. The database remains available.':'Local command failed. Check the output above; no data was deleted.'));});
 });
}
try{
 if(!['db:start','db:stop','db:status','db:logs','migrate:local','dev:local','root:reset:local'].includes(action))throw new Error('Unknown local command');
 const local=localDatabaseEnvironment(process.env);const env={...process.env,...local};
 const compose=['compose','--env-file',fileURLToPath(new URL('../compose.env',import.meta.url)),'--project-name','jacktools-backend-local','--file',fileURLToPath(new URL('../compose.yaml',import.meta.url))];
 const docker=(...args:string[])=>run('docker',[...compose,...args],env);
 const npm=(...args:string[])=>run(process.platform==='win32'?'npm.cmd':'npm',args,env);
 console.log(`Local PostgreSQL target: 127.0.0.1:${local.ADMIN_DB_PORT}. backend/.env is unchanged.`);
 if(action==='db:start')await docker('up','-d','--wait');
 if(action==='db:stop')await docker('stop');
 if(action==='db:status')await docker('ps');
 if(action==='db:logs')await docker('logs','--follow','postgres');
 if(action==='migrate:local')await npm('run','migrate');
 if(action==='root:reset:local'){
  if(!process.argv.includes('--confirm'))throw new Error('Local root reset requires --confirm (revokes local root sessions)');
  await npm('run','root:reset','--','--confirm');
 }
 if(action==='dev:local'){
  await docker('up','-d','--wait');await npm('run','migrate');await npm('run','dev');
 }
}catch(error){console.error(error instanceof Error?error.message:'Local command failed');process.exitCode=interrupted?130:1;}
finally{process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);}
