import {createDbConfigFromEnv,type Env} from './config.js';
/** Explicit local mode: never edits .env and never targets a configured remote database. */
export function localDatabaseEnvironment(source:Env):Record<string,string>{
 if(source.NODE_ENV==='production')throw new Error('Local commands refuse NODE_ENV=production. Use a development environment.');
 const config=createDbConfigFromEnv(source);
 const url=config.connectionString?new URL(config.connectionString):undefined;
 const host=url?.hostname||config.host;
 if(!['localhost','127.0.0.1','::1','[::1]'].includes(String(host)))throw new Error('Local commands refuse remote database configurations. Use a local development .env.');
 const user=url?decodeURIComponent(url.username):String(config.user||'');
 const password=url?decodeURIComponent(url.password):String(config.password||'');
 const name=url?decodeURIComponent(url.pathname.slice(1)):String(config.database||'');
 if(!user||!name||!password||/replace|changeme/i.test(password))throw new Error('Set your local database user, name and password in backend/.env first.');
 if(Buffer.byteLength(user)>63||Buffer.byteLength(name)>63)throw new Error('Database user/name must not exceed 63 UTF-8 bytes.');
 const port=source.LOCAL_DB_PORT||'55433';
 if(!/^\d+$/.test(port)||Number(port)<1024||Number(port)>65535)throw new Error('Invalid LOCAL_DB_PORT (1024–65535)');
 return {
  JT_LOCAL_DB_USER:user,JT_LOCAL_DB_PASSWORD:password,JT_LOCAL_DB_NAME:name,JT_LOCAL_DB_PORT:port,
  // Explicit overrides in the child process win over dotenv and URL precedence.
  ADMIN_DATABASE_URL:'',DATABASE_URL:'',ADMIN_DB_HOST:'127.0.0.1',ADMIN_DB_PORT:port,
  ADMIN_DB_USER:user,ADMIN_DB_PASSWORD:password,ADMIN_DB_NAME:name,ADMIN_DB_SSL:'false',
 };
}
