import {validateSnapshot} from '../src/tv-snapshot.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDbConfigFromEnv,databaseLimits,loadConfig} from '../src/config.js';
import {hashPassword,verifyPassword,digest,equal} from '../src/security.js';
const env={ROOT_USERNAME:'Root',ROOT_PASSWORD:'test-only-root-password!',SESSION_SECRET:'test-only-session-secret-with-more-than-32-chars'};
test('database uses DB variables and safe defaults',()=>{
 const c=createDbConfigFromEnv({DB_HOST:'pg',DB_PORT:'6543',DB_NAME:'own_database',DB_USER:'own_user',DB_PASSWORD:'own-secret',DB_SSL:'true',DB_POOL_MAX:'7'});
 assert.equal(c.host,'pg');assert.equal(c.port,6543);assert.equal(c.database,'own_database');assert.equal(c.user,'own_user');assert.equal(c.password,'own-secret');assert.equal(c.max,7);assert.deepEqual(c.ssl,{rejectUnauthorized:true});
 const defaults=createDbConfigFromEnv({});assert.equal(defaults.host,'localhost');assert.equal(defaults.port,5432);assert.equal(defaults.database,'jacktools');assert.equal(defaults.user,'jacktools');assert.equal(defaults.max,10);assert.equal(defaults.ssl,undefined);
});
test('DATABASE_URL overrides component values but preserves TLS validation',()=>{
 const c=createDbConfigFromEnv({DATABASE_URL:'postgresql://generic/db',DB_HOST:'ignored',DB_NAME:'ignored',DB_SSL:'true'});
 assert.equal(c.connectionString,'postgresql://generic/db');assert.equal(c.host,undefined);assert.deepEqual(c.ssl,{rejectUnauthorized:true});
 assert.throws(()=>createDbConfigFromEnv({DATABASE_URL:'postgresql://user:secret@host/db?sslmode=no-verify',DB_SSL:'true'}),/SSL options/);
});
test('queue and retry limits use DB variables',()=>{
 assert.deepEqual(databaseLimits({}),{maxPending:1000,retryAfter:2});
 assert.deepEqual(databaseLimits({DB_MAX_PENDING_REQUESTS:'25',DB_OVERLOAD_RETRY_AFTER_SECONDS:'4'}),{maxPending:25,retryAfter:4});
 assert.equal(databaseLimits({DB_MAX_PENDING_REQUESTS:'bad'}).maxPending,1000);
});
test('obsolete database variables fail clearly rather than selecting the wrong database',()=>{
 for(const key of ['ADMIN_DB_HOST','ADMIN_DATABASE_URL','ADMIN_DB_MAX_PENDING_REQUESTS']){
  assert.throws(()=>createDbConfigFromEnv({[key]:'secret-value'}),error=>error instanceof Error&&error.message.includes(key)&&!error.message.includes('secret-value'));
 }
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
 const input={...env,DB_HOST:'localhost',DB_PORT:'5432',DB_USER:'local_jt',DB_NAME:'local_jt',DB_PASSWORD:'local-db-$-#-secret',DB_SSL:'true'};
 const before={...input};const result=localDatabaseEnvironment(input);
 assert.deepEqual(input,before);assert.equal(result.DB_PORT,'55433');assert.equal(result.DB_HOST,'127.0.0.1');assert.equal(result.DB_SSL,'false');assert.equal(result.DB_PASSWORD,input.DB_PASSWORD);
 assert.equal(result.DATABASE_URL,'');assert.equal(result.ROOT_PASSWORD,undefined);
 const url=localDatabaseEnvironment({DATABASE_URL:'postgresql://local_user:secret%24%23@127.0.0.1:5432/local_name',LOCAL_DB_PORT:'55435'});
 assert.equal(url.DB_USER,'local_user');assert.equal(url.DB_PASSWORD,'secret$#');assert.equal(url.DB_NAME,'local_name');assert.equal(url.DB_PORT,'55435');
});
test('local commands reject production, remote targets, placeholders and invalid ports',async()=>{
 const {localDatabaseEnvironment}=await import('../src/local-config.js');
 const local={DB_PASSWORD:'some-local-password'};
 assert.throws(()=>localDatabaseEnvironment({...local,NODE_ENV:'production'}),/production/);
 assert.throws(()=>localDatabaseEnvironment({...local,DB_HOST:'database.example.test'}),/remote/);
 assert.throws(()=>localDatabaseEnvironment({DB_PASSWORD:'replace-me'}),/password/);
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

test('optional stream coordinates are bounded, rounded and reject extra fields',()=>{
 assert.equal(validateSnapshot(tvSnapshot).coordinates,undefined);
 assert.deepEqual(validateSnapshot({...tvSnapshot,coordinates:{latitude:52.520007,longitude:13.404954}}).coordinates,{latitude:52.52,longitude:13.405});
 for(const coordinates of [null,{},[],{latitude:52},{latitude:'52',longitude:13},{latitude:91,longitude:0},{latitude:0,longitude:-181},{latitude:NaN,longitude:0},{latitude:Infinity,longitude:0},{latitude:0,longitude:0,accuracy:10}]){
  assert.throws(()=>validateSnapshot({...tvSnapshot,coordinates}));
 }
});
