import {validateSnapshot} from '../src/tv-snapshot.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDbConfigFromEnv,databaseLimits,loadConfig} from '../src/config.js';
import {hashPassword,verifyPassword,digest,equal} from '../src/security.js';
const env={ROOT_USERNAME:'Root',ROOT_PASSWORD:'test-only-root-password!',SESSION_SECRET:'test-only-session-secret-with-more-than-32-chars'};
test('MessageDrop variable names and precedence without sharing its database',()=>{
 const c=createDbConfigFromEnv({ADMIN_DB_HOST:'admin-host',DB_HOST:'fallback',ADMIN_DB_PORT:'6543',DB_PORT:'5433',ADMIN_DB_NAME:'own_database',DB_NAME:'fallback',ADMIN_DB_USER:'own_user',DB_USER:'fallback',ADMIN_DB_PASSWORD:'own-secret',DB_PASSWORD:'fallback',ADMIN_DB_SSL:'true',DB_SSL:'false',ADMIN_DB_POOL_MAX:'7',DB_POOL_MAX:'3'});
 assert.equal(c.host,'admin-host');assert.equal(c.port,6543);assert.equal(c.database,'own_database');assert.equal(c.user,'own_user');assert.equal(c.password,'own-secret');assert.equal(c.max,7);assert.deepEqual(c.ssl,{rejectUnauthorized:true});
 const fallback=createDbConfigFromEnv({DB_HOST:'pg',DB_PORT:'5434',DB_NAME:'jt',DB_USER:'jt_user',DB_PASSWORD:'secret',DB_SSL:'true',DB_POOL_MAX:'8'});
 assert.equal(fallback.host,'pg');assert.equal(fallback.port,5434);assert.equal(fallback.database,'jt');assert.equal(fallback.max,8);
 const defaults=createDbConfigFromEnv({});assert.equal(defaults.database,'jacktools');assert.equal(defaults.user,'jacktools');assert.equal(defaults.max,10);assert.equal(defaults.ssl,undefined);
});
test('URL overrides component values, ADMIN URL overrides generic URL',()=>{
 const c=createDbConfigFromEnv({ADMIN_DATABASE_URL:'postgresql://admin/db',DATABASE_URL:'postgresql://generic/db',ADMIN_DB_HOST:'ignored',ADMIN_DB_NAME:'ignored'});
 assert.equal(c.connectionString,'postgresql://admin/db');assert.equal(c.host,undefined);
 assert.equal(createDbConfigFromEnv({DATABASE_URL:'postgresql://generic/db'}).connectionString,'postgresql://generic/db');
 assert.throws(()=>createDbConfigFromEnv({ADMIN_DATABASE_URL:'postgresql://user:secret@host/db?sslmode=no-verify',ADMIN_DB_SSL:'true'}),/SSL options/);
});
test('same queue and retry variables with generic fallbacks',()=>{
 assert.deepEqual(databaseLimits({}),{maxPending:1000,retryAfter:2});
 assert.deepEqual(databaseLimits({ADMIN_DB_MAX_PENDING_REQUESTS:'15',DB_MAX_PENDING_REQUESTS:'20',ADMIN_DB_OVERLOAD_RETRY_AFTER_SECONDS:'3',DB_OVERLOAD_RETRY_AFTER_SECONDS:'7'}),{maxPending:15,retryAfter:3});
 assert.deepEqual(databaseLimits({DB_MAX_PENDING_REQUESTS:'25',DB_OVERLOAD_RETRY_AFTER_SECONDS:'4'}),{maxPending:25,retryAfter:4});
 assert.equal(databaseLimits({ADMIN_DB_MAX_PENDING_REQUESTS:'bad'}).maxPending,1000);
});
test('configuration rejects default secrets, wildcard origins and insecure production',()=>{
 assert.throws(()=>loadConfig({}),/SESSION_SECRET/);
 assert.equal(loadConfig(env).rootUsername,'root');
 assert.throws(()=>loadConfig({...env,ROOT_PASSWORD:'replace-this-password'}),/ROOT_PASSWORD/);
 assert.throws(()=>loadConfig({...env,ADMIN_ALLOWED_ORIGINS:'*'}),/ORIGINS/);
 assert.throws(()=>loadConfig({...env,NODE_ENV:'production',PUBLIC_BASE_URL:'http://backend.test'}),/PUBLIC_BASE_URL/);
 assert.throws(()=>loadConfig({...env,NODE_ENV:'production',ADMIN_ALLOWED_ORIGINS:'http://company.test'}),/ORIGINS/);
});
test('passwords salted, verified safely, tokens are domain separated',async()=>{
 const one=await hashPassword('test-password-123!');const two=await hashPassword('test-password-123!');
 assert.notEqual(one,two);assert.ok(await verifyPassword('test-password-123!',one));assert.equal(await verifyPassword('wrong',one),false);
 assert.equal(await verifyPassword('anything','invalid'),false);assert.notEqual(digest('key','session:token'),digest('key','csrf:token'));assert.equal(equal('x','xx'),false);
});

test('explicit local database environment preserves credentials and leaves source untouched',async()=>{
 const {localDatabaseEnvironment}=await import('../src/local-config.js');
 const input={...env,ADMIN_DB_HOST:'localhost',ADMIN_DB_PORT:'5432',ADMIN_DB_USER:'local_jt',ADMIN_DB_NAME:'local_jt',ADMIN_DB_PASSWORD:'local-db-$-#-secret',ADMIN_DB_SSL:'true'};
 const before={...input};const result=localDatabaseEnvironment(input);
 assert.deepEqual(input,before);assert.equal(result.ADMIN_DB_PORT,'55433');assert.equal(result.ADMIN_DB_HOST,'127.0.0.1');assert.equal(result.ADMIN_DB_SSL,'false');assert.equal(result.ADMIN_DB_PASSWORD,input.ADMIN_DB_PASSWORD);
 assert.equal(result.ADMIN_DATABASE_URL,'');assert.equal(result.DATABASE_URL,'');assert.equal(result.ROOT_PASSWORD,undefined);
 const url=localDatabaseEnvironment({ADMIN_DATABASE_URL:'postgresql://local_user:secret%24%23@127.0.0.1:5432/local_name',LOCAL_DB_PORT:'55435'});
 assert.equal(url.ADMIN_DB_USER,'local_user');assert.equal(url.ADMIN_DB_PASSWORD,'secret$#');assert.equal(url.ADMIN_DB_NAME,'local_name');assert.equal(url.ADMIN_DB_PORT,'55435');
});
test('local commands reject production, remote targets, placeholders and invalid ports',async()=>{
 const {localDatabaseEnvironment}=await import('../src/local-config.js');
 const local={ADMIN_DB_PASSWORD:'some-local-password'};
 assert.throws(()=>localDatabaseEnvironment({...local,NODE_ENV:'production'}),/production/);
 assert.throws(()=>localDatabaseEnvironment({...local,ADMIN_DB_HOST:'database.example.test'}),/remote/);
 assert.throws(()=>localDatabaseEnvironment({ADMIN_DB_PASSWORD:'replace-me'}),/password/);
 assert.throws(()=>localDatabaseEnvironment({...local,LOCAL_DB_PORT:'0'}),/LOCAL_DB_PORT/);
});
test('database diagnostics show only known codes and never raw server details',async()=>{
 const {databaseErrorHint}=await import('../src/database.js');
 assert.match(databaseErrorHint({code:'28P01',message:'password=secret'})!,/28P01/);
 assert.ok(!databaseErrorHint({code:'28P01',message:'password=secret'})!.includes('password=secret'));
 assert.equal(databaseErrorHint({code:'UNKNOWN',message:'secret connection string'}),undefined);
});

test('TV is opt-in in production, separate from admin origins and requires an encryption secret',()=>{
 const production=loadConfig({...env,NODE_ENV:'production'});assert.equal(production.tv.enabled,false);assert.deepEqual(production.tv.origins,['https://clock.jacktools.net']);assert.deepEqual(production.origins,['https://jacktools.net']);
 assert.throws(()=>loadConfig({...env,NODE_ENV:'production',TV_ENABLED:'true'}),/TV_STATE_SECRET/);
 assert.throws(()=>loadConfig({...env,TV_ALLOWED_ORIGINS:'*'}),/TV_ALLOWED_ORIGINS/);
 assert.throws(()=>loadConfig({...env,NODE_ENV:'production',TV_ALLOWED_ORIGINS:'http://clock.jacktools.net'}),/TV_ALLOWED_ORIGINS/);
 assert.equal(loadConfig({...env,NODE_ENV:'production',TV_ENABLED:'true',TV_STATE_SECRET:'test-tv-state-encryption-secret-long-enough'}).tv.enabled,true);
});

const tvSnapshot={version:1,language:'de',settings:{view:'orbit',analogReadout:'off',binaryReadout:'off',orbitReadout:'flip',sundialReadout:'flip',analogDesign:'square-roman',background:'mountains',animateBackground:true,hemisphere:'north',transparency:35,date:'long',dateView:'calendarDate',format:'medium',hourCycle:'24',zone:'Europe/Berlin',seconds:true,numbers:true,smooth:true},appearance:{palette:'blue',style:'technical',theme:'dark',fontSize:'1'}};
test('stream device label is optional, short and cannot contain control or bidi characters',()=>{
 assert.equal(validateSnapshot(tvSnapshot).senderName,undefined);
 assert.equal(validateSnapshot({...tvSnapshot,senderName:'Chrome · Android'}).senderName,'Chrome · Android');
 for(const senderName of ['', ' '.repeat(4),'x'.repeat(81),'Phone\nAdmin','Phone\u202eAdmin',42,null]){
  assert.throws(()=>validateSnapshot({...tvSnapshot,senderName}));
 }
});
