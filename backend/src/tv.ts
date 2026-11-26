import {Router} from 'express';
import {randomUUID,randomInt,createCipheriv,createDecipheriv,randomBytes,createHash} from 'node:crypto';
import type {PoolClient} from 'pg';
import type {Config} from './config.js';
import type {Database} from './database.js';
import {token,digest} from './security.js';
import {ApiError,object,id} from './http.js';
import {validateSnapshot} from './tv-snapshot.js';
type Row={id:string;state:'waiting'|'pending'|'active'|'detached';snapshot:string|null;revision:number;acknowledged:number;expires_at:Date};
export function tvRouter(config:Config,db:Database){
 const router=Router();const hash=(value:string)=>digest(config.secret,'tv:'+value);
 const key=createHash('sha256').update(config.tv.secret).digest();
 function seal(value:unknown){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);const data=Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64');}
 function open(value:string){const data=Buffer.from(value,'base64');const cipher=createDecipheriv('aes-256-gcm',key,data.subarray(0,12));cipher.setAuthTag(data.subarray(12,28));return JSON.parse(Buffer.concat([cipher.update(data.subarray(28)),cipher.final()]).toString());}
 async function limit(ip:string,action:string,max:number){const result=await db.query(`INSERT INTO jt_rate_limits(key_hash,hits,expires_at) VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(key_hash) DO UPDATE SET hits=CASE WHEN jt_rate_limits.expires_at<=now() THEN 1 ELSE jt_rate_limits.hits+1 END,expires_at=CASE WHEN jt_rate_limits.expires_at<=now() THEN now()+interval '15 minutes' ELSE jt_rate_limits.expires_at END RETURNING hits`,[hash('rate:'+action+':'+ip)]);if(result.rows[0].hits>max)throw new ApiError(429,'tv_limited');}
 router.use(async(req,_res,next)=>{if(!config.tv.enabled)throw new ApiError(503,'tv_disabled');await limit(req.ip||'','requests',3600);next();});
 router.post('/receivers',async(req,res)=>{
  object(req.body,[]);await limit(req.ip||'', 'create',10);
  await db.query("DELETE FROM jt_tv_sessions WHERE expires_at<=now() OR (state IN ('waiting','pending') AND pair_expires_at<=now())");
  const receiverToken=token(),pairToken=token(),sessionId=randomUUID();
  for(let attempt=0;attempt<3;attempt++){
   const code=String(randomInt(10000000,100000000));
   try{await db.query("INSERT INTO jt_tv_sessions(id,receiver_hash,code_hash,qr_hash,state) VALUES($1,$2,$3,$4,'waiting')",[sessionId,hash('receiver:'+receiverToken),hash('code:'+code),hash('qr:'+pairToken)]);res.status(201).json({id:sessionId,receiverToken,pairToken,code,pairSeconds:600});return;}
   catch(error){if((error as {code?:string}).code!=='23505')throw error;}
  }
  throw new ApiError(503,'tv_busy');
 });
 router.post('/claim',async(req,res)=>{
  await limit(req.ip||'','claim',20);const body=object(req.body,['code','pairToken','snapshot']);
  const qr=body.pairToken;const code=body.code;
  if(qr!==undefined?typeof qr!=='string'||!/^[a-f0-9]{64}$/.test(qr):typeof code!=='string'||!/^\d{8}$/.test(code))throw new ApiError(400,'invalid_pairing');
  const snapshot=seal(validateSnapshot(body.snapshot)),senderToken=token();
  const row=await db.transaction(async client=>{
   const result=await client.query<Row>(`SELECT * FROM jt_tv_sessions WHERE ${qr?'qr_hash':'code_hash'}=$1 AND state='waiting' AND pair_expires_at>now() AND expires_at>now() FOR UPDATE`,[hash(qr?'qr:'+qr:'code:'+code)]);
   if(!result.rowCount)throw new ApiError(404,'invalid_pairing');
   const value=result.rows[0];await client.query("UPDATE jt_tv_sessions SET state='pending',sender_hash=$2,snapshot=$3,revision=1,code_hash=NULL,qr_hash=NULL WHERE id=$1",[value.id,hash('sender:'+senderToken),snapshot]);return value;
  });res.json({id:row.id,senderToken,revision:1,state:'pending'});
 });
 async function authorized(client:PoolClient,sessionId:string,authorization:string|undefined,role:'receiver'|'sender'){
  const raw=authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];if(!raw)throw new ApiError(401,'tv_unauthorized');
  const row=await client.query<Row>(`SELECT * FROM jt_tv_sessions WHERE id=$1 AND ${role}_hash=$2 AND expires_at>now() AND (state NOT IN ('waiting','pending') OR pair_expires_at>now()) FOR UPDATE`,[sessionId,hash(role+':'+raw)]);
  if(!row.rowCount)throw new ApiError(401,'tv_unauthorized');return row.rows[0];
 }
 for(const role of ['receiver','sender'] as const){
  router.get('/:id/'+role,async(req,res)=>{
   await limit(req.ip||'','poll',1800);
   const row=await db.transaction(client=>authorized(client,id(req),req.get('Authorization'),role));
   res.json({state:row.state,revision:row.revision,acknowledged:row.acknowledged,expiresAt:row.expires_at,...(role==='receiver'&&row.snapshot?{snapshot:open(row.snapshot)}:{})});
  });
 }
 router.post('/:id/approve',async(req,res)=>{
  object(req.body,[]);await db.transaction(async client=>{const row=await authorized(client,id(req),req.get('Authorization'),'receiver');if(row.state!=='pending')throw new ApiError(409,'tv_conflict');await client.query("UPDATE jt_tv_sessions SET state='active' WHERE id=$1",[row.id]);});res.status(204).end();
 });
 router.put('/:id/settings',async(req,res)=>{
  await limit(req.ip||'','update',300);const body=object(req.body,['revision','snapshot']);const snapshot=seal(validateSnapshot(body.snapshot));
  const revision=await db.transaction(async client=>{const row=await authorized(client,id(req),req.get('Authorization'),'sender');if(row.state!=='active'||body.revision!==row.revision)throw new ApiError(409,'tv_conflict');await client.query('UPDATE jt_tv_sessions SET snapshot=$2,revision=revision+1 WHERE id=$1',[row.id,snapshot]);return row.revision+1;});res.json({revision});
 });
 router.post('/:id/ack',async(req,res)=>{const body=object(req.body,['revision']);await db.transaction(async client=>{const row=await authorized(client,id(req),req.get('Authorization'),'receiver');if(row.state!=='active'||body.revision!==row.revision)throw new ApiError(409,'tv_conflict');await client.query('UPDATE jt_tv_sessions SET acknowledged=$2 WHERE id=$1',[row.id,row.revision]);});res.status(204).end();});
 router.post('/:id/detach',async(req,res)=>{object(req.body,[]);await db.transaction(async client=>{const row=await authorized(client,id(req),req.get('Authorization'),'sender');if(row.state==='pending')await client.query('DELETE FROM jt_tv_sessions WHERE id=$1',[row.id]);else await client.query("UPDATE jt_tv_sessions SET state='detached',sender_hash=NULL,code_hash=NULL,qr_hash=NULL WHERE id=$1",[row.id]);});res.status(204).end();});
 router.post('/:id/stop',async(req,res)=>{object(req.body,[]);await db.transaction(async client=>{const row=await authorized(client,id(req),req.get('Authorization'),'receiver');await client.query('DELETE FROM jt_tv_sessions WHERE id=$1',[row.id]);});res.status(204).end();});
 return router;
}
