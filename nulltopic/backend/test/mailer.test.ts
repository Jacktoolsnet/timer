import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile,stat,mkdtemp,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {createMailer} from '../src/mailer.js';
const names=['MAIL_MODE','NODE_ENV','PUBLIC_ORIGIN','MAIL_SERVER_SMTP','MAIL_PORT_SMTP','MAIL_USER','MAIL_PASSWORD','MAIL_ADDRESS'] as const;
const saved=Object.fromEntries(names.map(key=>[key,process.env[key]]));
function restore(){for(const key of names){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}}
test('mail transport is fail-closed, validates SMTP and confines local delivery to loopback development',async()=>{
 try{
  process.env.MAIL_MODE='disabled';assert.equal(createMailer().available,false);
  process.env.MAIL_MODE='local';process.env.NODE_ENV='production';process.env.PUBLIC_ORIGIN='https://example.invalid';assert.throws(()=>createMailer(),/Local mail/);
  process.env.NODE_ENV='development';assert.throws(()=>createMailer(),/Local mail/);
  process.env.PUBLIC_ORIGIN='http://127.0.0.1:4321';const path=await mkdtemp(tmpdir()+'/nulltopic-mail-test-');const dir=pathToFileURL(path+'/');const mailer=createMailer(dir);
  const message={to:'synthetic@example.invalid',subject:'Synthetic isolated transport check',text:'No token and no external delivery.'};
  await mailer.send(message);
  const created=await readdir(dir);assert.equal(created.length,1);
  try{const path=new URL(created[0],dir);assert.deepEqual(JSON.parse(await readFile(path,'utf8')),message);assert.equal((await stat(path)).mode&0o777,0o600);}finally{await rm(dir,{recursive:true,force:true});}
  process.env.MAIL_MODE='smtp';for(const key of ['MAIL_SERVER_SMTP','MAIL_USER','MAIL_PASSWORD','MAIL_ADDRESS'])delete process.env[key];assert.throws(()=>createMailer(),/Complete MAIL/);
  Object.assign(process.env,{MAIL_SERVER_SMTP:'smtp.example.invalid',MAIL_PORT_SMTP:'465',MAIL_USER:'synthetic',MAIL_PASSWORD:'synthetic-not-a-real-password',MAIL_ADDRESS:'mail@example.invalid'});assert.equal(createMailer().available,true,'configuration does not open a connection');
 }finally{restore();}
});
