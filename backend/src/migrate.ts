import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import type {Database} from './database.js';
export async function migrate(db:Database){
 const dir=fileURLToPath(new URL('../migrations/',import.meta.url));
 const files=(await readdir(dir)).filter(name=>/^\d+_[a-z0-9_]+\.sql$/.test(name)).sort();
 await db.transaction(async client=>{
  await client.query("SELECT pg_advisory_xact_lock(173620,1)");
  await client.query('CREATE TABLE IF NOT EXISTS jt_schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  for(const name of files){
   const sql=await readFile(`${dir}/${name}`,'utf8');const checksum=createHash('sha256').update(sql).digest('hex');
   const old=await client.query('SELECT checksum FROM jt_schema_migrations WHERE name=$1',[name]);
   if(old.rowCount){if(old.rows[0].checksum!==checksum)throw new Error('Invalid migration checksum: do not modify already applied migration files');continue;}
   await client.query(sql);await client.query('INSERT INTO jt_schema_migrations(name,checksum) VALUES($1,$2)',[name,checksum]);
  }
 });
}
export async function requireSchema(db:Database){
 const row=await db.query("SELECT to_regclass('public.jt_schema_migrations') AS schema");
 if(!row.rows[0].schema)throw new Error('Run the backend to initialize its database, or use npm run migrate');
 const files=(await readdir(fileURLToPath(new URL('../migrations/',import.meta.url)))).filter(name=>/^\d+_[a-z0-9_]+\.sql$/.test(name)).sort();
 const applied=await db.query('SELECT name,checksum FROM jt_schema_migrations');
 for(const file of files){
  const sql=await readFile(new URL(`../migrations/${file}`,import.meta.url),'utf8');
  if(!applied.rows.some(row=>row.name===file&&row.checksum===createHash('sha256').update(sql).digest('hex')))throw new Error('Pending or modified migration; start the backend to apply updates, or use npm run migrate');
 }
}
