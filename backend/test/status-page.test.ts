import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config.js';
import type {Database} from '../src/database.js';
const config=loadConfig({ROOT_USERNAME:'root',ROOT_PASSWORD:'status-test-password!',SESSION_SECRET:'status-test-session-secret-over-32-characters',TV_ENABLED:'false'});
for(const connected of [true,false]){
 test('public HTML status page: database '+(connected?'connected':'unavailable'),async()=>{
  const db={query:async(sql:string)=>{
   assert.equal(sql,'SELECT 1');
   if(!connected)throw new Error('password=private-secret db-host=internal-host');
   return {rows:[{'?column?':1}]};
  }} as unknown as Database;
  const app=await createApp(config,db),server=app.listen(0,'127.0.0.1');
  await new Promise<void>(resolve=>server.once('listening',resolve));
  try{
   const origin='http://127.0.0.1:'+(server.address() as AddressInfo).port;
   const response=await fetch(origin+'/'),html=await response.text();
   assert.equal(response.status,connected?200:503);
   assert.match(response.headers.get('content-type')||'',/text\/html/);
   assert.equal(response.headers.get('cache-control'),'no-store');
   assert.equal(response.headers.get('x-robots-tag'),'noindex');
   const nonce=html.match(/<style nonce="([^"]+)"/)?.[1];assert.ok(nonce);
   assert.ok(response.headers.get('content-security-policy')?.includes("'nonce-"+nonce+"'"));
   assert.match(html,/Server is running/);
   assert.ok(html.includes(connected?'Database connection established':'Database temporarily unavailable'));
   assert.match(html,/http-equiv="refresh" content="15"/);
   assert.ok(!html.includes('private-secret'));assert.ok(!html.includes('internal-host'));
   assert.ok(!html.includes(config.rootPassword));assert.ok(!html.includes(config.secret));
   assert.ok(!html.includes('<script'));assert.ok(!response.headers.has('set-cookie'));
   assert.equal((await fetch(origin+'/health/live')).status,200);
   assert.equal((await fetch(origin+'/health/ready')).status,connected?200:503);
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
 });
}
