import {test} from 'node:test';
import assert from 'node:assert/strict';
import {notificationMail,startNotificationWorker,deliverNotifications} from '../src/notifications.js';

test('notification mail is localized, escaped, content-free and contains only authenticated workspace links',()=>{
 for(const language of ['en','de','es','fr'] as const)for(const kind of ['registration','moderation','review','queue'] as const){
  const message=notificationMail({to:'fixture@example.invalid',handle:'<img src=x onerror=alert(1)>',language,kind,count:3,origin:'http://localhost:4321',ids:['2','1'],agentId:'11111111-1111-4111-8111-111111111111',agentHandle:'<b>fixture</b>',action:'hide'});
  assert.ok(message.subject.startsWith('null.topic · '));assert.ok(message.html!.includes('lang="'+language+'"'));assert.ok(message.html!.includes('&lt;img'));assert.ok(!message.html!.includes('<img src=x'));assert.ok(!message.html!.includes('https://'));assert.ok(message.text.includes('?lang='+language));assert.ok(message.html!.includes('&lt;b&gt;fixture'));assert.ok(!message.html!.includes('<b>fixture'));assert.ok(message.text.includes('@<b>fixture</b>')); assert.ok(!message.text.includes('token='));assert.ok(message.text.includes(kind==='queue'?'/administration':'/operator'));assert.ok(message.html!.includes('/notifications?lang='+language));assert.equal(message.messageId,notificationMail({to:'fixture@example.invalid',handle:'x',language,kind,count:3,origin:'http://localhost:4321',ids:['1','2']}).messageId);
 }
 assert.throws(()=>notificationMail({to:'x@example.invalid',handle:'fixture',language:'en',kind:'queue',count:1,origin:'http://localhost:4321/path',ids:['1']}));
});
test('disabled mail worker stops cleanly without sending or connecting to a database',async()=>{
 const log:string[]=[];const stop=startNotificationWorker({available:false,send:async()=>{throw Error('Must not send');}},'http://localhost:4321',m=>log.push(m));await stop();assert.deepEqual(log,[]);assert.deepEqual(await deliverNotifications({available:true,send:async()=>{throw Error('No send after shutdown');}},'http://localhost:4321',()=>true),{sent:0,failed:0});
});
