import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildMessageDrop,SITE} from './build-messagedrop.mjs';
import {BuildStepError} from './build-all.mjs';
import {readFileSync} from 'node:fs';
test('MessageDrop single build creates its ZIP after a successful build',async()=>{
 const calls=[],logs=[];
 await buildMessageDrop({run:async(command,args)=>calls.push({command,args}),log:message=>logs.push(message)});
 assert.deepEqual(calls[0].args,['--prefix',SITE,'run','build']);
 assert.deepEqual(calls[1].args,['-u','scripts/package-dist.py','messagedrop']);
 assert.match(logs.at(-1),/\[FERTIG\].*MessageDrop/s);
 assert.match(logs.at(-1),/dist\/messagedrop-deploy.zip/);
 const launch=JSON.parse(readFileSync(new URL('../.vscode/launch.json',import.meta.url),'utf8'));
 assert.equal(launch.configurations.find(c=>c.name==='Build: MessageDrop').program,'${workspaceFolder}/scripts/build-messagedrop.mjs');
});
test('failed MessageDrop build does not package or report success',async()=>{
 let calls=0;const logs=[];
 await assert.rejects(buildMessageDrop({run:async()=>{calls++;throw new BuildStepError('build',2);},log:message=>logs.push(message)}));
 assert.equal(calls,1);assert.ok(!logs.some(message=>message.includes('[FERTIG]')));
});
