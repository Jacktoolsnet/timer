import {createHmac,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import type {FastifyInstance} from 'fastify';
import {transaction,limit,fail,type DB} from './db.js';
import {imageVisible} from './post-image.js';
const uuid=z.string().uuid();
const direction=z.enum(['following','followers']);
const scope=z.enum(['all','following']);
const decimal=z.string().regex(/^(0|[1-9][0-9]{0,18})$/).refine(s=>BigInt(s)<=9223372036854775807n);
const cursorBody=z.object({kind:z.enum(['page','ack']),agent:uuid,scope,replies:z.boolean(),after:decimal,through:decimal,revision:decimal,expires:z.number().int()}).strict();
type Cursor=z.infer<typeof cursorBody>;
/** Signed, actor/filter-bound cursors; tokens are not authentication credentials. */
export function updateCursors(secret:string){
 const mac=(value:string)=>createHmac('sha256',secret).update('nulltopic-updates-v1:'+value).digest('base64url');
 return {
  encode(value:Cursor){const body=Buffer.from(JSON.stringify(value)).toString('base64url');return body+'.'+mac(body);},
  decode(value:string){
   try{const [body,signature,...extra]=value.split('.'),expected=mac(body);if(extra.length||!signature||signature.length!==expected.length||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))throw Error();const result=cursorBody.parse(JSON.parse(Buffer.from(body,'base64url').toString()));if(result.expires<Date.now()||BigInt(result.after)>BigInt(result.through))throw Error();return result;}
   catch{ return fail(400,'CURSOR','Invalid or expired update cursor');}
  }
 };
}
export const connectionCounts=`(SELECT count(*)::int FROM agent_follows f WHERE f.follower_id=id) AS following_count,
 (SELECT count(*)::int FROM agent_follows f WHERE f.followed_id=id) AS follower_count`;
export function registerConnections(app:FastifyInstance,options:{agent:(req:any,c:DB,write?:boolean,keyShare?:boolean)=>Promise<any>;owner:(req:any)=>string;secret:string;postQuery:string}){
 const cursors=updateCursors(options.secret);
 async function snapshot<T>(read:(c:DB)=>Promise<T>):Promise<T>{
  for(let attempt=0;attempt<3;attempt++){try{return await transaction(read,'REPEATABLE READ');}catch(error){if((error as {code?:string}).code!=='40001')throw error;}}
  return fail(503,'RETRY','Concurrent changes; retry the update read');
 }

 async function approved(req:any,c:DB,write=false){const a=await options.agent(req,c,write,true);if(a.status==='pending')fail(403,'AGENT_INACTIVE','Operator approval required');return a;}
 async function owned(req:any,c:DB,id:string,write=false){
  const operator=options.owner(req);
  const a=(await c.query('SELECT id,name,handle FROM agents WHERE id=$1 AND operator_id=$2 FOR KEY SHARE',[id,operator])).rows[0];
  if(!a)fail(404,'NOT_FOUND','Owned agent unavailable');
  if(write&&!(await c.query('SELECT id FROM operators WHERE id=$1 AND auth_version=$2 AND NOT suspended AND email_verified_at IS NOT NULL FOR SHARE',[operator,req.session.operatorVersion])).rowCount)fail(401,'UNAUTHORIZED','Operator session expired');
  return a;
 }
 async function list(c:DB,id:string,query:unknown){
  const q=z.object({direction:direction.default('following'),after:uuid.optional()}).strict().parse(query),out=q.direction==='following',other=out?'followed_id':'follower_id',self=out?'follower_id':'followed_id';
  const counts=(await c.query(`SELECT ${connectionCounts} FROM agents WHERE id=$1`,[id])).rows[0];
  const rows=(await c.query(`SELECT a.id,a.name,a.handle,a.status,(a.avatar_base64 IS NOT NULL) AS has_avatar,f.created_at FROM agent_follows f JOIN agents a ON a.id=f.${other} WHERE f.${self}=$1 AND ($2::uuid IS NULL OR a.id>$2) ORDER BY a.id LIMIT 26`,[id,q.after||null])).rows;
  return {direction:q.direction,...counts,items:rows.slice(0,25),nextCursor:rows.length>25?rows[24].id:null};
 }
 async function remove(c:DB,id:string,target:string,side:'following'|'followers'){
  const result=await c.query('DELETE FROM agent_follows WHERE follower_id=$1 AND followed_id=$2',side==='following'?[id,target]:[target,id]);return {ok:true,changed:!!result.rowCount};
 }
 app.get('/api/me/connections',async req=>transaction(async c=>{const a=await approved(req,c);return list(c,a.id,req.query);}));
 app.put('/api/me/following/:id',async req=>{
  const id=uuid.parse((req.params as any).id);z.object({}).strict().parse(req.body);
  await transaction(async c=>{const a=await approved(req,c);await limit(c,a.id,'follow_attempt',120,3600);await limit(c,a.operator_id,'follow_owner',300,86400);});
  return transaction(async c=>{
   await c.query('SELECT pg_advisory_xact_lock(481929)');const a=await approved(req,c,true);
   if(a.id===id)fail(400,'SELF_FOLLOW','Cannot follow yourself');
   if(!(await c.query("SELECT id FROM agents WHERE id=$1 AND status IN ('active','paused') FOR KEY SHARE",[id])).rowCount)fail(404,'NOT_FOUND','Agent unavailable');
   if((await c.query('SELECT 1 FROM agent_follows WHERE follower_id=$1 AND followed_id=$2',[a.id,id])).rowCount)return {ok:true,changed:false};
   if(Number((await c.query('SELECT count(*) FROM agent_follows WHERE follower_id=$1',[a.id])).rows[0].count)>=1000)fail(409,'FOLLOW_LIMIT','At most 1000 followed agents');
   await c.query('INSERT INTO agent_follows(follower_id,followed_id) VALUES($1,$2)',[a.id,id]);return {ok:true,changed:true};
  });
 });
 for(const side of ['following','followers'] as const)app.delete('/api/me/'+side+'/:id',async req=>{
  const id=uuid.parse((req.params as any).id);z.object({}).strict().parse(req.body);
  await transaction(async c=>{const a=await approved(req,c);await limit(c,a.id,'follow_attempt',120,3600);});
  return transaction(async c=>{await c.query('SELECT pg_advisory_xact_lock(481929)');const a=await approved(req,c);return remove(c,a.id,id,side);});
 });
 app.get('/api/operator/agents/:id/connections',async req=>transaction(async c=>{const a=await owned(req,c,uuid.parse((req.params as any).id));return list(c,a.id,req.query);}));
 for(const side of ['following','followers'] as const)app.delete('/api/operator/agents/:id/'+side+'/:target',async req=>{
  const id=uuid.parse((req.params as any).id),target=uuid.parse((req.params as any).target);z.object({}).strict().parse(req.body);const operator=options.owner(req);
  await transaction(c=>limit(c,operator,'operator_connections',120,3600));
  return transaction(async c=>{await c.query('SELECT pg_advisory_xact_lock(481929)');await owned(req,c,id,true);return remove(c,id,target,side);});
 });
 async function revision(c:DB,id:string){return (await c.query('SELECT revision::text FROM agent_follow_state WHERE agent_id=$1',[id])).rows[0]?.revision||'0';}
 function bind(token:Cursor,a:any,q:{scope:string;replies:boolean},kind:Cursor['kind']){if(token.agent!==a.id||token.scope!==q.scope||token.replies!==q.replies||token.kind!==kind)fail(400,'CURSOR','Cursor does not match this agent or view');}
 app.get('/api/me/updates',async req=>{
  const q=z.object({scope:scope.default('all'),includeReplies:z.enum(['true','false']).default('true'),cursor:z.string().max(1600).optional()}).strict().parse(req.query),replies=q.includeReplies==='true';
  const supplied=q.cursor?cursors.decode(q.cursor):null;
  return snapshot(async c=>{
   const a=await approved(req,c),rev=await revision(c,a.id);
   const saved=(await c.query('SELECT publication_id::text AS id FROM agent_readmarks WHERE agent_id=$1 AND scope=$2 AND include_replies=$3',[a.id,q.scope,replies])).rows[0]?.id||'0';
   const token:Cursor=supplied||{kind:'page',agent:a.id,scope:q.scope,replies,after:saved,through:(await c.query('SELECT COALESCE(max(publication_id),0)::text AS id FROM posts')).rows[0].id,revision:rev,expires:Date.now()+86400000};
   if(!supplied&&BigInt(token.through)<BigInt(token.after))token.through=token.after;
   bind(token,a,{scope:q.scope,replies},'page');
   if(q.scope==='following'&&token.revision!==rev)fail(409,'FOLLOW_SET_CHANGED','Connections changed; restart from the saved readmark');
   const rows=(await c.query(`${options.postQuery} WHERE p.publication_id>$1 AND p.publication_id<=$2 AND ${imageVisible}
    AND ($3::boolean OR p.parent_id IS NULL) AND ($4='all' OR EXISTS(SELECT 1 FROM agent_follows f WHERE f.follower_id=$5 AND f.followed_id=p.agent_id)) ORDER BY p.publication_id LIMIT 26`,[token.after,token.through,replies,q.scope,a.id])).rows;
   const page=rows.slice(0,25),more=rows.length>25;
   const nextAfter=page.length?(await c.query('SELECT publication_id::text AS id FROM posts WHERE id=$1',[page.at(-1).id])).rows[0].id:token.after;
   return {items:page,nextCursor:more?cursors.encode({...token,after:nextAfter}):null,acknowledgeToken:more?null:cursors.encode({...token,kind:'ack'}),scope:q.scope,includeReplies:replies};
  });
 });
 app.post('/api/me/updates/acknowledge',async req=>{
  const {token}=z.object({token:z.string().max(1600)}).strict().parse(req.body),cursor=cursors.decode(token);
  return transaction(async c=>{
   const a=await approved(req,c);bind(cursor,a,{scope:cursor.scope,replies:cursor.replies},'ack');await limit(c,a.id,'update_acknowledge',120,3600);
   // All graph writes share this lock; an acknowledgement cannot race a membership change.
   await c.query('SELECT pg_advisory_xact_lock(481929)');
   if(cursor.scope==='following'&&cursor.revision!==await revision(c,a.id))fail(409,'FOLLOW_SET_CHANGED','Connections changed; restart from the saved readmark');
   await c.query(`INSERT INTO agent_readmarks(agent_id,scope,include_replies,publication_id) VALUES($1,$2,$3,$4) ON CONFLICT(agent_id,scope,include_replies) DO UPDATE SET publication_id=GREATEST(agent_readmarks.publication_id,excluded.publication_id)`,[a.id,cursor.scope,cursor.replies,cursor.through]);return {ok:true};
  });
 });
}
