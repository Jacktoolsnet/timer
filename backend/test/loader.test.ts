import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
async function fixture(source:string,check:(entry:string)=>void){
 const dir=await mkdtemp(join(tmpdir(),'jacktools-loader-'));
 try{
  await mkdir(join(dir,'dist'));
  await writeFile(join(dir,'package.json'),JSON.stringify({type:'module'}));
  await writeFile(join(dir,'server.cjs'),await readFile(new URL('../server.cjs',import.meta.url)));
  await writeFile(join(dir,'dist','server.js'),source);
  check(join(dir,'server.cjs'));
 }finally{await rm(dir,{recursive:true,force:true});}
}
test('Passenger-style require loads the ESM app with top-level await asynchronously',async()=>{
 await fixture("await new Promise(resolve=>setTimeout(resolve,10)); console.log('application-started');",entry=>{
  const result=spawnSync(process.execPath,['-e',"require(process.argv[1]);console.log('loader-returned');",entry],{encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stderr);
  assert.equal(result.stdout,'loader-returned\napplication-started\n');
  assert.equal(result.stderr,'');
 });
});
test('loader failures return an error without leaking raw details',async()=>{
 await fixture("throw new Error('sensitive-fixture-value');",entry=>{
  const result=spawnSync(process.execPath,['-e','setInterval(()=>{},1000); require(process.argv[1]);',entry],{encoding:'utf8',timeout:10000});
  assert.equal(result.status,1);
  assert.match(result.stderr,/startup_failed/);
  assert.ok(!result.stderr.includes('sensitive-fixture-value'));
 });
});
