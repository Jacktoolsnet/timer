import {test} from 'node:test';
import assert from 'node:assert/strict';
import tls from 'node:tls';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {certificateConfig,parseCertificateTarget} from '../src/certificate-config.js';
import {classifyCertificate,publicAddress,inspectCertificate} from '../src/certificate-probe.js';
import {certificateMessage} from '../src/certificate-mail.js';

test('certificate configuration is isolated, deduplicates domains and validates cron, thresholds and mail',()=>{
 const config=certificateConfig({CERT_MONITOR_DOMAINS:'Company|jacktools.net;Clock|https://clock.jacktools.net/path',CERT_MONITOR_DOMAINS_2:'https://jacktools.net',MAIL_SERVER_SMTP:'smtp.example.test',MAIL_PORT_SMTP:'465',MAIL_USER:'support@example.test',MAIL_PASSWORD:'test-only',CERT_MONITOR_NOTIFY_EMAIL:'alerts@example.test'});
 assert.equal(config.enabled,false);assert.equal(config.targets.length,2);assert.equal(config.timezone,'Europe/Berlin');assert.equal(config.mail?.secure,true);assert.equal(config.mail?.from,'support@example.test');
 assert.equal(parseCertificateTarget('Clock=clock.jacktools.net:8443').port,8443);
 for(const value of ['http://jacktools.net','https://user:password@jacktools.net','https://jacktools.net?q=secret','127.0.0.1','[::1]','localhost','host.localhost','bad host.test','jacktools.net:99999'])assert.throws(()=>parseCertificateTarget(value));
 for(const env of [{CERT_MONITOR_CRON:'invalid'},{CERT_MONITOR_TIMEZONE:'not-a-zone'},{CERT_MONITOR_WARNING_DAYS:'10',CERT_MONITOR_CRITICAL_DAYS:'11'},{MAIL_HOST:'smtp.example.test'},{MAIL_HOST:'smtp.example.test',MAIL_USER:'a@example.test',MAIL_PASSWORD:'test',MAIL_TLS_IGNORE_INVALID:'true'},{CERT_MONITOR_ENABLED:'yes'}])assert.throws(()=>certificateConfig(env));
 assert.equal(certificateConfig({MAIL_HOST:'smtp.example.test',MAIL_USER:'a@example.test',MAIL_PASSWORD:'test'}).mail?.secure,false);
});
test('TLS statuses use exact expiry instants and treat trust, hostname and not-yet-valid errors as errors',()=>{
 const now=Date.now(),day=86400000;
 assert.equal(classifyCertificate(now-day,now+40*day,null,now,30,14),'ok');
 assert.equal(classifyCertificate(now-day,now+30*day,null,now,30,14),'warning');
 assert.equal(classifyCertificate(now-day,now+14*day,null,now,30,14),'critical');
 assert.equal(classifyCertificate(now-day,now,null,now,30,14),'expired');
 assert.equal(classifyCertificate(now-day,now+40*day,'SELF_SIGNED',now,30,14),'error');
 assert.equal(classifyCertificate(now+day,now+40*day,null,now,30,14),'error');
 assert.equal(classifyCertificate(NaN,NaN,null,now,30,14),'error');
});
test('SSRF protection blocks nonpublic IPv4, IPv6 and mapped addresses',()=>{
 for(const address of ['127.0.0.1','10.0.0.1','192.168.0.1','172.16.0.1','169.254.169.254','100.64.0.1','0.0.0.0','224.0.0.1','::1','::','fc00::1','fe80::1','4000::1','2001:db8::1','2002:7f00:1::1','::ffff:127.0.0.1','invalid'])assert.equal(publicAddress(address),false,address);
 assert.equal(publicAddress('8.8.8.8'),true);assert.equal(publicAddress('2606:4700:4700::1111'),true);
});
test('probe refuses mixed DNS answers, enforces deadline and supports shutdown cancellation',async()=>{
 const target=parseCertificateTarget('cert.example.test'),options={timeoutMs:30,warningDays:30,criticalDays:14};
 let connected=false;
 const blocked=await inspectCertificate(target,options,{resolve:async()=>['8.8.8.8','127.0.0.1'],connect:()=>{connected=true;throw Error('must not connect');}});
 assert.equal(blocked.error,'PRIVATE_ADDRESS_BLOCKED');assert.equal(connected,false);
 const timeout=await inspectCertificate(target,options,{resolve:()=>new Promise(()=>{})});assert.equal(timeout.error,'TLS_TIMEOUT');
 const controller=new AbortController();controller.abort();
 assert.equal((await inspectCertificate(target,{...options,signal:controller.signal})).error,'CHECK_CANCELLED');
});
test('real TLS probe uses SNI, reads issuer and expiry but does not trust a self-signed certificate',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'jt-cert-'));
 let server:tls.Server|undefined;
 try{
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(dir,'key.pem'),'-out',join(dir,'cert.pem'),'-days','2','-subj','/CN=cert.example.test','-addext','subjectAltName=DNS:cert.example.test'],{stdio:'ignore'});
  let sni='';
  const key=readFileSync(join(dir,'key.pem')),cert=readFileSync(join(dir,'cert.pem'));
  server=tls.createServer({key,cert,SNICallback:(hostname,done)=>{sni=hostname;done(null,tls.createSecureContext({key,cert}));}});
  server.on('tlsClientError',()=>{});
  await new Promise<void>(resolve=>server!.listen(0,'127.0.0.1',resolve));
  const address=server.address();assert.ok(address&&typeof address!=='string');
  const result=await inspectCertificate(parseCertificateTarget('cert.example.test'),{timeoutMs:2000,warningDays:30,criticalDays:14},{resolve:async()=>['8.8.8.8'],connect:options=>tls.connect({...options,host:'127.0.0.1',port:address.port})});
  assert.equal(result.status,'error');assert.ok(result.error);assert.ok(result.validTo);assert.ok(result.fingerprint);assert.match(result.subject!,/cert.example.test/);
  // The server callback can follow the client's secureConnect by one event-loop tick.
  await new Promise(resolve=>setTimeout(resolve,20));assert.equal(sni,'cert.example.test');
 }finally{await new Promise<void>(resolve=>server?server.close(()=>resolve()):resolve());rmSync(dir,{recursive:true,force:true});}
});
test('JackTools mail templates include recoveries and escape untrusted certificate labels',()=>{
 const target=parseCertificateTarget('cert.example.test');
 const message=certificateMessage([{...target,label:'<img src=x onerror=alert(1)>',status:'ok',error:null,subject:null,issuer:null,subjectAltName:null,fingerprint:null,validFrom:null,validTo:'2030-01-01T00:00:00Z',daysRemaining:40,lastCheckedAt:'2026-11-26T12:00:00Z'}]);
 assert.match(message.subject,/JackTools/);assert.match(message.subject,/1 Entwarnungen/);assert.ok(!message.html.includes('<img'));assert.match(message.html,/&lt;img/);assert.match(message.text,/cert.example.test/);
});
