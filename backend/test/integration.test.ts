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
 const app=await createApp(config,db);server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
 const address=server.address();if(!address||typeof address==='string')throw new Error('Missing test listener');base=`http://127.0.0.1:${address.port}`;
});
after(async()=>{if(server)await new Promise<void>(resolve=>server.close(()=>resolve()));await db.close();});
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
  assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),productionOrigin);
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
