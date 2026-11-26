import {createCertificateMonitor} from '../src/certificate-monitor.js';
import {parseCertificateTarget} from '../src/certificate-config.js';
import {emptyCertificate,type CertificateStatus} from '../src/certificate-probe.js';
import type {CertificateMail} from '../src/certificate-mail.js';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import type {Server} from 'node:http';
import {loadConfig} from '../src/config.js';
import {Database,BusyError} from '../src/database.js';
import {migrate} from '../src/migrate.js';
import {bootstrapRoot} from '../src/bootstrap.js';
import {createApp} from '../src/app.js';
const url=process.env.TEST_DATABASE_URL;
if(!url||!new URL(url).pathname.endsWith('_test'))throw new Error('TEST_DATABASE_URL must point to a dedicated empty *_test database. Use npm run test:local for an isolated database.');
const origin='http://127.0.0.1:4321';
const config=loadConfig({ADMIN_DATABASE_URL:url,ROOT_USERNAME:'root',ROOT_PASSWORD:'test-only-root-password!',SESSION_SECRET:'test-only-integration-session-secret-12345',ADMIN_ALLOWED_ORIGINS:origin,LOGIN_LIMIT:'100'});
const db=new Database(config);let server:Server,base:string;
let certificateStatus:CertificateStatus='warning',mailFails=false,probeGate:Promise<void>|undefined;
const mailMessages:CertificateMail[]=[];
const certificates=createCertificateMonitor(config.certificates,db,{
 inspect:async target=>{await probeGate;return {...emptyCertificate(target),status:certificateStatus,lastCheckedAt:new Date().toISOString(),validFrom:'2026-01-01T00:00:00Z',validTo:'2027-01-01T00:00:00Z',daysRemaining:20};},
 send:async(_config,message)=>{if(mailFails)throw Error('test SMTP failure');mailMessages.push(message);}
});
type Identity={user:{id:string;username:string;role:string;mustChangePassword:boolean};csrfToken:string};
type Login={cookie:string;data:Identity};
async function request(path:string,method='GET',body?:unknown,login?:Login,headers:Record<string,string>={}){
 return fetch(base+'/api/v1/'+path,{method,headers:{Origin:origin,...(method==='GET'?{}:{'Content-Type':'application/json'}),...(login?{Cookie:login.cookie,'X-CSRF-Token':login.data.csrfToken}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
}
async function login(username='root',password=config.rootPassword){
 const response=await request('auth/login','POST',{username,password});assert.equal(response.status,200);
 const cookie=response.headers.get('set-cookie')!.split(';')[0];return {cookie,data:await response.json() as Identity};
}
before(async()=>{
 // Never erase an existing database. The runner creates a new private cluster.
 const existing=await db.query("SELECT to_regclass('public.jt_users') AS name");
 if(existing.rows[0].name)throw new Error('Refusing to run integration tests against existing JackTools tables');
 await Promise.all([migrate(db),migrate(db)]);
 const created=await Promise.all([bootstrapRoot(db,config),bootstrapRoot(db,config)]);assert.equal(created.filter(Boolean).length,1);
 const app=await createApp(config,db,certificates);server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
 const address=server.address();if(!address||typeof address==='string')throw new Error('Missing test listener');base=`http://127.0.0.1:${address.port}`;
});
after(async()=>{await certificates.close();if(server)await new Promise<void>(resolve=>server.close(()=>resolve()));await db.close();});
test('root authentication, origins, CSRF, sessions and reset',async()=>{
 assert.equal((await fetch(base+'/health/live')).status,200);assert.equal((await fetch(base+'/health/ready')).status,200);
 assert.equal((await request('admin/users')).status,401);
 assert.equal((await request('auth/login','POST',{username:'root',password:'wrong'})).status,401);
 assert.equal((await request('auth/login','POST',{username:'root',password:config.rootPassword},undefined,{Origin:'https://evil.test'})).status,403);
 const root=await login();assert.equal(root.data.user.role,'root');assert.ok(root.cookie.startsWith('jt_admin_dev='));
 assert.equal((await request('auth/me','GET',undefined,root)).status,200);
 assert.equal((await request('admin/users','POST',{},root,{'X-CSRF-Token':''})).status,403);
 assert.equal(await bootstrapRoot(db,{...config,rootPassword:'different-test-password!'}),false);await login();
 await bootstrapRoot(db,config,true);assert.equal((await request('auth/me','GET',undefined,root)).status,401);
});
test('admin lifecycle, forced password change, suspension and password reset',async()=>{
 const root=await login();
 const created=await request('admin/users','POST',{username:'alice',password:'temp-alice-password!',displayName:'Alice',email:'alice@example.test'},root);
 assert.equal(created.status,201);const value=await created.json();const id=value.user.id;
 assert.equal(value.user.role,'admin');assert.equal(value.user.mustChangePassword,true);assert.equal(value.user.password_hash,undefined);
 assert.equal((await request('admin/users','POST',{username:'alice',password:'temp-alice-password!'},root)).status,409);
 assert.equal((await request('admin/users','POST',{username:'evil',password:'temp-password!',role:'root'},root)).status,400);
 let alice=await login('alice','temp-alice-password!');
 assert.equal((await request('admin/users','GET',undefined,alice)).status,403);
 assert.equal((await request('auth/profile','PATCH',{displayName:'changed',email:''},alice)).status,403);
 assert.equal((await request('auth/password','PUT',{currentPassword:'temp-alice-password!',newPassword:'new-alice-password!'},alice)).status,204);
 assert.equal((await request('auth/me','GET',undefined,alice)).status,401);
 alice=await login('alice','new-alice-password!');assert.equal(alice.data.user.mustChangePassword,false);
 assert.equal((await request('auth/profile','PATCH',{displayName:'Alice Updated',email:''},alice)).status,200);
 assert.equal((await request('admin/users','GET',undefined,alice)).status,403);
 assert.equal((await request('admin/users/'+root.data.user.id,'PATCH',{active:false},root)).status,403);
 assert.equal((await request('admin/users/'+id,'PATCH',{active:false},root)).status,200);
 assert.equal((await request('auth/me','GET',undefined,alice)).status,401);
 assert.equal((await request('auth/login','POST',{username:'alice',password:'new-alice-password!'})).status,401);
 assert.equal((await request('admin/users/'+id,'PATCH',{active:true},root)).status,200);
 alice=await login('alice','new-alice-password!');
 assert.equal((await request('admin/users/'+id+'/password','POST',{password:'reset-alice-password!'},root)).status,204);
 assert.equal((await request('auth/me','GET',undefined,alice)).status,401);
 alice=await login('alice','reset-alice-password!');assert.equal(alice.data.user.mustChangePassword,true);
 assert.equal((await request('auth/logout','POST',{},alice)).status,204);
 assert.equal((await request('auth/me','GET',undefined,alice)).status,401);
 const audit=await db.query('SELECT action FROM jt_audit_events');assert.ok(audit.rows.some(row=>row.action==='admin_password_reset'));
});
test('only root can delete an admin, with CSRF; root stays protected and sessions are revoked',async()=>{
 const root=await login();
 const created=await request('admin/users','POST',{username:'delete-test',password:'delete-test-password!'},root);
 assert.equal(created.status,201);const target=(await created.json()).user.id;
 let admin=await login('delete-test','delete-test-password!');
 await request('auth/password','PUT',{currentPassword:'delete-test-password!',newPassword:'delete-test-updated!'},admin);
 admin=await login('delete-test','delete-test-updated!');
 const path='admin/users/'+target;
 assert.equal((await request(path,'DELETE',{})).status,401);
 assert.equal((await request(path,'DELETE',{},admin)).status,403);
 assert.equal((await request(path,'DELETE',{},root,{'X-CSRF-Token':''})).status,403);
 assert.equal((await request(path,'DELETE',{},root,{Origin:'https://clock.jacktools.net'})).status,403);
 assert.equal((await request('admin/users/'+root.data.user.id,'DELETE',{},root)).status,403);
 assert.equal((await request('admin/users/invalid','DELETE',{},root)).status,400);
 assert.equal((await request(path,'DELETE',{unexpected:true},root)).status,400);
 assert.equal((await request('auth/me','GET',undefined,admin)).status,200);
 assert.equal((await request(path,'DELETE',{},root)).status,204);
 assert.equal((await request('auth/me','GET',undefined,admin)).status,401);
 assert.equal((await request('auth/login','POST',{username:'delete-test',password:'delete-test-updated!'})).status,401);
 assert.equal((await request(path,'DELETE',{},root)).status,404);
 assert.equal((await db.query('SELECT 1 FROM jt_users WHERE id=$1',[target])).rowCount,0);
 assert.equal((await db.query('SELECT 1 FROM jt_admin_sessions WHERE user_id=$1',[target])).rowCount,0);
 const audit=await db.query("SELECT target_id FROM jt_audit_events WHERE action='admin_deleted' AND actor_id=$1",[root.data.user.id]);
 assert.equal(audit.rowCount,1);assert.equal(audit.rows[0].target_id,null);
});
test('CORS preflight, payload validation and production session flags',async()=>{
 const pre=await fetch(base+'/api/v1/auth/me',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'GET'}});
 assert.equal(pre.status,204);assert.equal(pre.headers.get('access-control-allow-origin'),origin);assert.equal(pre.headers.get('access-control-allow-credentials'),'true');
 const root=await login();assert.equal((await request('admin/users/invalid','PATCH',{active:false},root)).status,400);
 assert.equal((await request('auth/logout','POST',{},root,{Origin:''})).status,403);
 const response=await fetch(base+'/api/v1/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'invalid json'});assert.equal(response.status,400);
 // Exercise the real production configuration and exact Company origin. HTTP is
 // only the private test transport; the deployment terminates TLS at its proxy.
 const productionConfig=loadConfig({NODE_ENV:'production',ADMIN_DATABASE_URL:url,
  ROOT_USERNAME:config.rootUsername,ROOT_PASSWORD:config.rootPassword,SESSION_SECRET:config.secret,LOGIN_LIMIT:'100'});
 const productionOrigin='https://jacktools.net';
 assert.equal(productionConfig.baseUrl,'https://backend.jacktools.net');
 const production=await createApp(productionConfig,db);const secured=production.listen(0,'127.0.0.1');await new Promise<void>(r=>secured.once('listening',r));
 try{
  const address=secured.address() as {port:number};const endpoint=`http://127.0.0.1:${address.port}/api/v1/`;
  const headers={Origin:productionOrigin,'Content-Type':'application/json'};
  const preflight=await fetch(endpoint+'auth/login',{method:'OPTIONS',headers:{Origin:productionOrigin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,x-csrf-token'}});
  assert.equal(preflight.status,204);assert.match(preflight.headers.get('access-control-allow-methods')!,/DELETE/);assert.equal(preflight.headers.get('access-control-allow-origin'),productionOrigin);
  assert.equal(preflight.headers.get('access-control-allow-credentials'),'true');
  const result=await fetch(endpoint+'auth/login',{method:'POST',headers,body:JSON.stringify({username:'root',password:config.rootPassword})});
  assert.equal(result.status,200);assert.equal(result.headers.get('access-control-allow-origin'),productionOrigin);
  const cookie=result.headers.get('set-cookie')!;assert.match(cookie,/__Host-jt_admin=/);assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Lax/);assert.match(cookie,/Path=\//);assert.doesNotMatch(cookie,/Domain=/);
  const identity=await result.json() as Identity;
  const sessionHeaders={...headers,Cookie:cookie.split(';')[0]};
  assert.equal((await fetch(endpoint+'auth/me',{headers:sessionHeaders})).status,200);
  for(const deniedOrigin of ['http://localhost:4321','https://clock.jacktools.net','https://jacktools.net.evil.test']){
   const denied=await fetch(endpoint+'auth/me',{headers:{...sessionHeaders,Origin:deniedOrigin}});
   assert.equal(denied.status,403);assert.equal(denied.headers.get('access-control-allow-origin'),null);
  }
  assert.equal((await fetch(endpoint+'auth/logout',{method:'POST',headers:sessionHeaders,body:'{}'})).status,403);
  assert.equal((await fetch(endpoint+'auth/logout',{method:'POST',headers:{...sessionHeaders,'X-CSRF-Token':identity.csrfToken},body:'{}'})).status,204);
  assert.equal((await fetch(endpoint+'auth/me',{headers:sessionHeaders})).status,401);
 }finally{await new Promise<void>(r=>secured.close(()=>r()));}
});
test('rate limit shared in PostgreSQL and returns retry guidance',async()=>{
 for(let i=0;i<101;i++){
  const response=await request('auth/login','POST',{username:'missing-user',password:'x'});
  if(i===100){assert.equal(response.status,429);assert.equal(response.headers.get('retry-after'),'900');}
 }
});

test('database queue is bounded and releases a failed transaction connection',async()=>{
 const limited=new Database({...config,limits:{maxPending:1,retryAfter:2}});
 try{
  const pending=limited.query('SELECT pg_sleep(0.05)');
  await assert.rejects(limited.query('SELECT 1'),BusyError);await pending;
  await assert.rejects(limited.transaction(async client=>{await client.query('SELECT 1');throw new Error('rollback-test');}),/rollback-test/);
  assert.equal((await limited.query('SELECT 1 AS ok')).rows[0].ok,1);
 }finally{await limited.close();}
});

const tvSnapshot={version:1,language:'de',settings:{view:'orbit',analogReadout:'off',binaryReadout:'off',orbitReadout:'flip',sundialReadout:'flip',analogDesign:'square-roman',background:'mountains',animateBackground:true,hemisphere:'north',transparency:35,date:'long',dateView:'calendarDate',format:'medium',hourCycle:'24',zone:'Europe/Berlin',seconds:true,numbers:true,smooth:true},appearance:{palette:'blue',style:'technical',theme:'dark',fontSize:'1'}};
test('TV pairing is receiver-approved, scoped, encrypted, revisioned, expiring and independent of admin cookies',async()=>{
 const tvOrigin='http://127.0.0.1:4322';
 const tvRequest=(path:string,method='GET',body?:unknown,bearer?:string,from=tvOrigin)=>fetch(base+'/api/v1/tv/'+path,{method,headers:{Origin:from,...(method==='GET'?{}:{'Content-Type':'application/json'}),...(bearer?{Authorization:'Bearer '+bearer}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const create=async()=>{const response=await tvRequest('receivers','POST',{});assert.equal(response.status,201);assert.equal(response.headers.get('set-cookie'),null);return response.json() as Promise<{id:string;receiverToken:string;pairToken:string;code:string}>;};
 const pre=await tvRequest('claim','OPTIONS');assert.equal(pre.status,204);assert.match(pre.headers.get('access-control-allow-headers')!,/Authorization/);
 assert.equal((await fetch(base+'/api/v1/admin/users',{headers:{Origin:tvOrigin}})).status,403);
 assert.equal((await tvRequest('receivers','POST',{},undefined,'https://evil.test')).status,403);
 const receiver=await create();const other=await create();
 assert.match(receiver.code,/^\d{8}$/);assert.match(receiver.receiverToken,/^[a-f0-9]{64}$/);
 const claim=await tvRequest('claim','POST',{code:receiver.code,snapshot:tvSnapshot});assert.equal(claim.status,200);const sender=await claim.json() as {id:string;senderToken:string};
 assert.equal((await tvRequest('claim','POST',{code:receiver.code,snapshot:tvSnapshot})).status,404);
 assert.equal((await tvRequest('claim','POST',{pairToken:receiver.pairToken,snapshot:tvSnapshot})).status,404);
 assert.equal((await tvRequest(receiver.id+'/receiver','GET',undefined,sender.senderToken)).status,401);
 assert.equal((await tvRequest(receiver.id+'/sender','GET',undefined,receiver.receiverToken)).status,401);
 assert.equal((await tvRequest(other.id+'/receiver','GET',undefined,receiver.receiverToken)).status,401);
 assert.equal((await tvRequest(receiver.id+'/settings','PUT',{revision:1,snapshot:tvSnapshot},sender.senderToken)).status,409);
 assert.equal((await tvRequest(receiver.id+'/approve','POST',{},sender.senderToken)).status,401);
 const pending=await tvRequest(receiver.id+'/receiver','GET',undefined,receiver.receiverToken);assert.equal((await pending.json()).state,'pending');
 const stored=await db.query('SELECT * FROM jt_tv_sessions WHERE id=$1',[receiver.id]);assert.notEqual(stored.rows[0].receiver_hash,receiver.receiverToken);assert.equal(stored.rows[0].code_hash,null);assert.ok(!stored.rows[0].snapshot.includes('Europe/Berlin'));
 assert.equal((await tvRequest(receiver.id+'/approve','POST',{},receiver.receiverToken)).status,204);
 assert.equal((await tvRequest(receiver.id+'/ack','POST',{revision:1},receiver.receiverToken)).status,204);
 const updated={...tvSnapshot,settings:{...tvSnapshot.settings,view:'binary'}};
 assert.equal((await tvRequest(receiver.id+'/settings','PUT',{revision:1,snapshot:updated},sender.senderToken)).status,200);
 assert.equal((await tvRequest(receiver.id+'/settings','PUT',{revision:1,snapshot:tvSnapshot},sender.senderToken)).status,409);
 const current=await (await tvRequest(receiver.id+'/receiver','GET',undefined,receiver.receiverToken)).json();assert.equal(current.revision,2);assert.equal(current.snapshot.settings.view,'binary');
 assert.equal((await tvRequest(receiver.id+'/settings','PUT',{revision:2,snapshot:{...tvSnapshot,coordinates:{latitude:52}}},sender.senderToken)).status,400);
 assert.equal((await tvRequest(receiver.id+'/settings','PUT',{revision:2,snapshot:{...tvSnapshot,settings:{...tvSnapshot.settings,background:'https://evil.test/pixel'}}},sender.senderToken)).status,400);
 assert.equal((await tvRequest(receiver.id+'/settings','PUT',{revision:2,snapshot:{...tvSnapshot,coordinates:{latitude:52.520007,longitude:13.404954}}},sender.senderToken)).status,200);
 const located=await (await tvRequest(receiver.id+'/receiver','GET',undefined,receiver.receiverToken)).json();assert.deepEqual(located.snapshot.coordinates,{latitude:52.52,longitude:13.405});
 const encrypted=await db.query('SELECT snapshot FROM jt_tv_sessions WHERE id=$1',[receiver.id]);assert.ok(!encrypted.rows[0].snapshot.includes('52.52'));
 assert.equal((await tvRequest(receiver.id+'/settings','PUT',{revision:3,snapshot:tvSnapshot},sender.senderToken)).status,200);
 const revoked=await (await tvRequest(receiver.id+'/receiver','GET',undefined,receiver.receiverToken)).json();assert.equal(revoked.snapshot.coordinates,undefined);
 assert.equal((await tvRequest(receiver.id+'/detach','POST',{},sender.senderToken)).status,204);
 assert.equal((await tvRequest(receiver.id+'/sender','GET',undefined,sender.senderToken)).status,401);
 assert.equal((await (await tvRequest(receiver.id+'/receiver','GET',undefined,receiver.receiverToken)).json()).state,'detached');
 assert.equal((await tvRequest(receiver.id+'/stop','POST',{},receiver.receiverToken)).status,204);
 assert.equal((await tvRequest(receiver.id+'/receiver','GET',undefined,receiver.receiverToken)).status,401);
 // A cancelled pending controller must never bypass receiver approval.
 const qr=await tvRequest('claim','POST',{pairToken:other.pairToken,snapshot:tvSnapshot});assert.equal(qr.status,200);const qrSender=await qr.json();
 await tvRequest(other.id+'/detach','POST',{},qrSender.senderToken);assert.equal((await tvRequest(other.id+'/receiver','GET',undefined,other.receiverToken)).status,401);
 const expired=await create();await db.query("UPDATE jt_tv_sessions SET pair_expires_at=now()-interval '1 second' WHERE id=$1",[expired.id]);
 assert.equal((await tvRequest('claim','POST',{code:expired.code,snapshot:tvSnapshot})).status,404);
 const active=await create();const activeSender=await (await tvRequest('claim','POST',{code:active.code,snapshot:tvSnapshot})).json();await tvRequest(active.id+'/approve','POST',{},active.receiverToken);
 await db.query("UPDATE jt_tv_sessions SET expires_at=now()-interval '1 second' WHERE id=$1",[active.id]);
 assert.equal((await tvRequest(active.id+'/sender','GET',undefined,activeSender.senderToken)).status,401);
});

test('real TV browsers pair, confirm, synchronize and keep ticking without the phone', {skip:process.env.TV_BROWSER_TESTS!=='1',timeout:120000},async()=>{
 const {tvBrowserTest}=await import('./tv-browser.js');await tvBrowserTest(base,config);
});

test('certificate admin is authenticated, CSRF protected and independent; leases, mail retries and recoveries persist',async()=>{
 assert.equal((await request('admin/certificates')).status,401);
 const root=await login();
 let response=await request('admin/certificates','GET',undefined,root);
 assert.equal(response.status,200);assert.equal((await response.json()).configuration.enabled,false);
 assert.equal((await request('admin/certificates/check','POST',{},root)).status,409);
 assert.equal((await request('admin/certificates/check','POST',{url:'https://evil.example.test'},root)).status,400);
 config.certificates.enabled=true;config.certificates.targets=[parseCertificateTarget('JackTools|cert.example.test')];
 config.certificates.mail={host:'smtp.example.test',port:465,secure:true,user:'support@example.test',pass:'test-SMTP-secret-must-never-leak',from:'support@example.test'};
 config.certificates.recipient='alerts@example.test';
 assert.equal((await request('admin/certificates/check','POST',{},root,{'X-CSRF-Token':''})).status,403);
 const created=await request('admin/users','POST',{username:'certadmin',password:'test-cert-temp-password!'},root);assert.equal(created.status,201);
 let admin=await login('certadmin','test-cert-temp-password!');
 assert.equal((await request('admin/certificates','GET',undefined,admin)).status,403);
 await request('auth/password','PUT',{currentPassword:'test-cert-temp-password!',newPassword:'test-cert-new-password!'},admin);
 admin=await login('certadmin','test-cert-new-password!');
 assert.equal((await request('admin/certificates/test-email','POST',{},admin)).status,403);
 let release!:()=>void;probeGate=new Promise(resolve=>{release=resolve;});
 assert.equal((await request('admin/certificates/check','POST',{},admin)).status,202);
 assert.equal((await request('admin/certificates/check','POST',{},root)).status,409);
 const other=createCertificateMonitor(config.certificates,db);
 await assert.rejects(other.launch(),/certificates_running/);await other.close();
 release();probeGate=undefined;
 async function done(){for(let i=0;i<100;i++){if(!(await certificates.overview()).monitor.running)return;await new Promise(resolve=>setTimeout(resolve,20));}assert.fail('monitor did not finish');}
 async function next(){await db.query("UPDATE jt_certificate_monitor SET last_started_at=now()-interval '2 minutes' WHERE id=true");await certificates.run('test');}
 await done();assert.equal(mailMessages.length,1);
 assert.equal((await request('admin/certificates/check','POST',{},root)).status,429);
 await next();assert.equal(mailMessages.length,1,'unchanged status must not resend');
 certificateStatus='critical';mailFails=true;await next();
 assert.equal((await certificates.overview()).monitor.lastMailError,'mail_failed');assert.equal(mailMessages.length,1);
 mailFails=false;await next();assert.equal(mailMessages.length,2,'failed mail retries on the next check');
 certificateStatus='ok';await next();assert.equal(mailMessages.length,3,'recovery mail');
 await next();assert.equal(mailMessages.length,3);
 response=await request('admin/certificates','GET',undefined,root);const text=await response.text();
 assert.ok(!text.includes('test-SMTP-secret'));assert.ok(!text.includes('password'));assert.ok(!text.includes('smtp.example.test'));
 assert.equal((await request('admin/certificates/test-email','POST',{to:'evil@example.test'},root)).status,400);
 assert.equal((await request('admin/certificates/test-email','POST',{},root)).status,204);assert.equal(mailMessages.length,4);
 assert.equal((await request('admin/certificates/test-email','POST',{},root)).status,429);
 assert.equal((await db.query("SELECT count(*) AS n FROM jt_audit_events WHERE action='certificate_test_email_sent'")).rows[0].n,'1');
 await db.query("UPDATE jt_certificate_monitor SET last_test_at=now()-interval '2 minutes' WHERE id=true");
 mailFails=true;assert.equal((await request('admin/certificates/test-email','POST',{},root)).status,502);assert.equal((await certificates.overview()).monitor.lastMailError,'mail_failed');mailFails=false;
 await db.query("UPDATE jt_certificate_monitor SET last_started_at=now()-interval '2 minutes' WHERE id=true");
 certificateStatus='warning';config.certificates.schedule='0 0 1 1 *';certificates.startScheduler();certificates.startScheduler();
 for(let i=0;i<100&&mailMessages.length<5;i++)await new Promise(resolve=>setTimeout(resolve,20));
 await done();assert.equal(mailMessages.length,5,'startup check runs without a public HTTP cron endpoint');
 assert.ok((await certificates.overview()).monitor.nextRunAt);
});
