import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildAll,runCommand,BuildStepError,PROJECTS} from './build-all.mjs';

test('builds every project, then packages; success is the final message',async()=>{
 const calls=[],logs=[];
 await buildAll({run:async(command,args)=>calls.push({command,args}),log:message=>logs.push(message)});
 assert.equal(calls.length,PROJECTS.length+1);
 PROJECTS.forEach((project,index)=>assert.deepEqual(calls[index].args,['--prefix',project,'run','build']));
 assert.deepEqual(calls.at(-1).args,['-u','scripts/package-dist.py']);
 assert.ok(logs.at(-1).includes('[FERTIG]'));assert.ok(logs.at(-1).includes('Exit-Code 0'));
});
test('failed build aborts before packaging and never reports success',async()=>{
 const calls=[],logs=[];
 await assert.rejects(buildAll({run:async(command,args)=>{calls.push(args);if(calls.length===2)throw new BuildStepError('Build: timer',2);},log:message=>logs.push(message)}),error=>error.exitCode===2);
 assert.equal(calls.length,2);assert.ok(!logs.some(message=>message.includes('[FERTIG]')));
});
test('packaging failure never reports success',async()=>{
 const logs=[];
 await assert.rejects(buildAll({run:async(command)=>{if(command==='python3')throw new BuildStepError('ZIP',1);},log:message=>logs.push(message)}));
 assert.ok(!logs.some(message=>message.includes('[FERTIG]')));
});
test('subprocesses settle on success, exit error and missing executable',async()=>{
 await runCommand(process.execPath,['-e','process.exit(0)'],'test');
 await assert.rejects(runCommand(process.execPath,['-e','process.exit(3)'],'test'),error=>error.exitCode===3);
 await assert.rejects(runCommand('/nonexistent/jacktools-build-command',[],'missing'),/missing/);
});
test('cancellation stops an active subprocess',async()=>{
 const controller=new AbortController();
 const running=runCommand(process.execPath,['-e','setInterval(()=>{},1000)'],'cancel',{signal:controller.signal});
 setTimeout(()=>controller.abort(),100);
 await assert.rejects(running,error=>error.exitCode===130);
});
