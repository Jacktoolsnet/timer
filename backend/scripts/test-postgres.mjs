// Disposable PostgreSQL cluster owned by the current non-root user. Never uses a real server.
import {mkdtemp,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync,spawn} from 'node:child_process';
import {createServer} from 'node:net';
let bin=process.env.PG_BIN;
if(!bin){for(const version of ['18','17','16','15','14']){const dir=`/usr/lib/postgresql/${version}/bin`;try{await access(join(dir,'initdb'));bin=dir;break;}catch{}}}
if(!bin){console.error('Set PG_BIN to your PostgreSQL bin directory (initdb and pg_ctl required).');process.exit(1);}
if(process.getuid?.()===0){console.error('Run this test as a non-root user.');process.exit(1);}
const dir=await mkdtemp(join(tmpdir(),'jacktools-pg-test-'));
const listener=createServer();await new Promise(resolve=>listener.listen(0,'127.0.0.1',resolve));const port=listener.address().port;await new Promise(resolve=>listener.close(resolve));
let started=false;
const command=(name,args)=>{const result=spawnSync(join(bin,name),args,{encoding:'utf8'});if(result.status!==0)throw new Error(`${name} failed: ${result.stderr||result.stdout}`);};
try{
 command('initdb',['-D',join(dir,'data'),'--auth=trust','--no-locale','-E','UTF8']);
 command('pg_ctl',['-D',join(dir,'data'),'-l',join(dir,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port} -k ${dir}`,'-w','start']);started=true;
 command('createdb',['-h','127.0.0.1','-p',String(port),'jacktools_test']);
 const url=`postgresql://${encodeURIComponent(process.env.USER||'postgres')}@127.0.0.1:${port}/jacktools_test`;
 const child=spawn(process.platform==='win32'?'npm.cmd':'npm',['run','test:integration'],{stdio:'inherit',env:{...process.env,TEST_DATABASE_URL:url}});
 const result=await new Promise(resolve=>child.once('exit',code=>resolve(code??1)));process.exitCode=result;
}finally{if(started)try{command('pg_ctl',['-D',join(dir,'data'),'-m','immediate','-w','stop']);}catch{process.exitCode=1;}await rm(dir,{recursive:true,force:true});}
