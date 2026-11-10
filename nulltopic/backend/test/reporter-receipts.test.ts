import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reportBody,reporterMail,reporterLink,deliverReporterMail} from '../src/reporter-receipts.js';
test('optional reporter fields are bounded, normalized and independent of account ownership',()=>{
 const base={agentId:'11111111-1111-4111-8111-111111111111',reason:'Concern'};
 assert.equal(reportBody.parse(base).goodFaith,false);assert.equal(reportBody.parse({...base,reporterEmail:' TEST@example.invalid '}).reporterEmail,'test@example.invalid');assert.ok(!reportBody.safeParse({...base,reporterName:'a\nb'}).success);assert.ok(!reportBody.safeParse({...base,reporterEmail:'a\nb@example.invalid'}).success);assert.ok(!reportBody.safeParse({...base,reporterName:'a'.repeat(121)}).success);assert.ok(!reportBody.safeParse({...base,postId:base.agentId}).success);assert.ok(!reportBody.safeParse({...base,recipient:'unexpected'}).success);
});
test('reporter mail is localized and contains a private fragment link but no case content or tracking pixels',async()=>{
 const token='A'.repeat(43),url=reporterLink('http://localhost:4321',token,'de');assert.equal(new URL(url).pathname,'/dsa');assert.equal(new URL(url).searchParams.has('token'),false);
 for(const lang of ['en','de','es','fr'] as const){const mail=reporterMail('synthetic@example.invalid',lang,url,true,['1']);assert.ok(mail.text.includes(url));assert.ok(mail.html!.includes('lang="'+lang+'"'));assert.ok(!mail.html!.includes('<img'));assert.equal(mail.messageId,reporterMail('synthetic@example.invalid',lang,url,true,['1']).messageId);assert.ok(!mail.messageId!.includes(token));}
 assert.throws(()=>reporterLink('http://localhost:4321/path',token,'de'));assert.deepEqual(await deliverReporterMail({available:false,send:async()=>{throw Error('No mail');}},'http://localhost:4321','unused'),{sent:0,failed:0});
});
