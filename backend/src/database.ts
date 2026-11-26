import {Pool,type PoolClient,type QueryResultRow} from 'pg';
import type {Config} from './config.js';
export class BusyError extends Error { constructor(){super('database_busy');} }
export class Database{
 private readonly pool:Pool;
 private pending=0;
 constructor(private config:Pick<Config,'db'|'limits'>){
  this.pool=new Pool(config.db);
  this.pool.on('error',()=>console.error(JSON.stringify({event:'database_connection_error'})));
 }
 private async slot<T>(work:()=>Promise<T>){
  if(this.pending>=this.config.limits.maxPending)throw new BusyError();
  this.pending++;
  try{return await work();}finally{this.pending--;}
 }
 query<T extends QueryResultRow=QueryResultRow>(sql:string,params:unknown[]=[]){return this.slot(()=>this.pool.query<T>(sql,params));}
 transaction<T>(work:(client:PoolClient)=>Promise<T>){return this.slot(async()=>{
  const client=await this.pool.connect();let broken=false;
  try{await client.query('BEGIN');const result=await work(client);await client.query('COMMIT');return result;}
  catch(error){try{await client.query('ROLLBACK');}catch{broken=true;}throw error;}
  finally{client.release(broken);}
 });}
 close(){return this.pool.end();}
}

/** Safe operational hints: never echo a server error message, URL or credential. */
export function databaseErrorHint(error:unknown):string|undefined{
 const code=error&&typeof error==='object'&&'code' in error?String(error.code):'';
 const hints:Record<string,string>={
  '28P01':'Database authentication failed (28P01). Check target/user/password. For local Docker: npm run db:start, then restart the backend.',
  '3D000':'Configured database does not exist (3D000). Create it first, or start the local Docker database.',
  '42501':'Database permission denied (42501). The configured database user needs schema creation and alteration rights for automatic startup migrations.',
  'ECONNREFUSED':'Database connection refused. Start the database and check its host/port. For local Docker use npm run db:start.',
  'ETIMEDOUT':'Database connection timed out. Check host/port and network access.',
 };
 return hints[code];
}
