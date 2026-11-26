import type {PoolConfig} from 'pg';
import {config as dotenv} from 'dotenv';
import {fileURLToPath} from 'node:url';
export type Env=Record<string,string|undefined>;
export function loadEnvironment(){dotenv({path:fileURLToPath(new URL('../.env',import.meta.url)),quiet:true});}
function number(value:string|undefined,fallback:number,name:string,min=1,max=1000000){
 const parsed=value?Number(value):fallback;
 if(!Number.isSafeInteger(parsed)||parsed<min||parsed>max)throw new Error(`Invalid configuration: ${name}`);
 return parsed;
}
export function createDbConfigFromEnv(env:Env):PoolConfig{
 const connectionString=env.ADMIN_DATABASE_URL||env.DATABASE_URL;
 const ssl=String(env.ADMIN_DB_SSL||env.DB_SSL||'').toLowerCase()==='true';
 const raw=Number(env.ADMIN_DB_POOL_MAX||env.DB_POOL_MAX||10);
 const max=Number.isInteger(raw)&&raw>0?raw:10;
 const common={max,connectionTimeoutMillis:5000,idleTimeoutMillis:30000,statement_timeout:15000,
  ssl:ssl?{rejectUnauthorized:true}:undefined};
 if(connectionString){
  let url:URL;try{url=new URL(connectionString);}catch{throw new Error('Invalid DATABASE_URL');}
  if(!['postgres:','postgresql:'].includes(url.protocol))throw new Error('Invalid DATABASE_URL');
  if([...url.searchParams.keys()].some(key=>key.toLowerCase().startsWith('ssl')))throw new Error('Invalid DATABASE_URL SSL options: use ADMIN_DB_SSL or DB_SSL and NODE_EXTRA_CA_CERTS');
  return {connectionString,...common};
 }
 return {...common,host:env.ADMIN_DB_HOST||env.DB_HOST||'localhost',
  port:number(env.ADMIN_DB_PORT||env.DB_PORT,5432,'DB_PORT',1,65535),
  database:env.ADMIN_DB_NAME||env.DB_NAME||'jacktools',user:env.ADMIN_DB_USER||env.DB_USER||'jacktools',
  password:env.ADMIN_DB_PASSWORD||env.DB_PASSWORD||undefined};
}
export function databaseLimits(env:Env){
 const raw=Number.parseInt(env.ADMIN_DB_MAX_PENDING_REQUESTS||env.DB_MAX_PENDING_REQUESTS||'',10);
 return {maxPending:Number.isFinite(raw)&&raw>0?raw:1000,
  retryAfter:number(env.ADMIN_DB_OVERLOAD_RETRY_AFTER_SECONDS||env.DB_OVERLOAD_RETRY_AFTER_SECONDS,2,'DB_OVERLOAD_RETRY_AFTER_SECONDS',1,3600)};
}
export function loadConfig(env:Env){
 const production=env.NODE_ENV==='production';
 const baseUrl=env.PUBLIC_BASE_URL||(production?'https://backend.jacktools.net':'http://127.0.0.1:4340');
 const base=new URL(baseUrl);
 if(!['http:','https:'].includes(base.protocol)||base.username||base.password||(production&&base.protocol!=='https:'))throw new Error('Invalid PUBLIC_BASE_URL');
 const origins=(env.ADMIN_ALLOWED_ORIGINS||(production?'https://jacktools.net':'http://127.0.0.1:4321,http://localhost:4321')).split(',').map(s=>s.trim()).filter(Boolean);
 if(!origins.length||origins.some(value=>{try{const u=new URL(value);return u.origin!==value||!['http:','https:'].includes(u.protocol)||(production&&u.protocol!=='https:');}catch{return true;}}))throw new Error('Invalid ADMIN_ALLOWED_ORIGINS');
 const secret=env.SESSION_SECRET||'';
 if(secret.length<32||/replace|example|changeme/i.test(secret))throw new Error('Set a unique SESSION_SECRET (at least 32 characters)');
 const rootUsername=(env.ROOT_USERNAME||'').trim().toLowerCase();
 if(!/^[a-z0-9][a-z0-9_.-]{2,63}$/.test(rootUsername))throw new Error('Invalid ROOT_USERNAME (3–64 characters)');
 const rootPassword=env.ROOT_PASSWORD||'';
 if(rootPassword.length<12||rootPassword.length>128||/replace|changeme/i.test(rootPassword))throw new Error('Set a unique ROOT_PASSWORD (12–128 characters)');
 const rootEmail=env.ROOT_EMAIL?.trim()||'';
 if(rootEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rootEmail))throw new Error('Invalid ROOT_EMAIL');
 return {production,host:env.HOST||(production?'0.0.0.0':'127.0.0.1'),port:number(env.PORT,4340,'PORT',1,65535),baseUrl:base.origin,
  origins,secret,rootUsername,rootPassword,rootEmail,db:createDbConfigFromEnv(env),limits:databaseLimits(env),
  trustProxy:number(env.TRUST_PROXY,0,'TRUST_PROXY',0,10),
  sessionIdle:number(env.SESSION_IDLE_SECONDS,3600,'SESSION_IDLE_SECONDS',60,86400),
  sessionMax:number(env.SESSION_MAX_SECONDS,43200,'SESSION_MAX_SECONDS',60,604800),
  loginLimit:number(env.LOGIN_LIMIT,10,'LOGIN_LIMIT',1,100)};
}
export type Config=ReturnType<typeof loadConfig>;
