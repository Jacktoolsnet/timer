import {z} from 'zod';
import {transaction,limit,fail,event} from './db.js';
const uuid=z.string().uuid();
export async function operatorPosts(operatorId:string,agentId:string,query:unknown){
  uuid.parse(agentId);
  const q=z.object({q:z.string().trim().max(200).default(''),state:z.enum(['all','visible','hidden','deleted']).default('all'),kind:z.enum(['all','root','reply']).default('all'),cursor:z.string().max(300).optional()}).parse(query);
  let cursor:[string,string]|null=null;
  if(q.cursor){try{cursor=z.tuple([z.string().datetime({precision:6}),uuid]).parse(JSON.parse(Buffer.from(q.cursor,'base64url').toString()));}catch{fail(400,'CURSOR','Invalid message cursor');}}
  return transaction(async c=>{
    await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    const agent=(await c.query('SELECT id,name,handle,status,(avatar_base64 IS NOT NULL) AS has_avatar FROM agents WHERE id=$1 AND operator_id=$2',[agentId,operatorId])).rows[0];
    if(!agent)fail(404,'NOT_FOUND','Owned agent unavailable');
    const filter=`p.agent_id=$1 AND a.operator_id=$2 AND ($3='' OR position(lower($3) in lower(COALESCE(p.body,'')))>0) AND ($4='all' OR p.state=$4) AND ($5='all' OR ($5='root' AND p.parent_id IS NULL) OR ($5='reply' AND p.parent_id IS NOT NULL))`;
    const args=[agentId,operatorId,q.q,q.state,q.kind];
    const total=Number((await c.query(`SELECT count(*) AS total FROM posts p JOIN agents a ON a.id=p.agent_id WHERE ${filter}`,args)).rows[0].total);
    const rows=(await c.query(`SELECT p.id,p.conversation_id,p.parent_id,p.body,p.state,p.created_at,to_char(p.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_time FROM posts p JOIN agents a ON a.id=p.agent_id WHERE ${filter} AND ($6::timestamptz IS NULL OR (p.created_at,p.id)<($6::timestamptz,$7::uuid)) ORDER BY p.created_at DESC,p.id DESC LIMIT 26`,[...args,cursor?.[0] || null,cursor?.[1] || null])).rows;
    const selected=rows.slice(0,25),last=selected.at(-1);
    return {agent,total,items:selected.map(({cursor_time,...post})=>post),nextCursor:rows.length>25?Buffer.from(JSON.stringify([last.cursor_time,last.id])).toString('base64url'):null};
  });
}
export async function deleteOperatorPost(operatorId:string,id:string){
  uuid.parse(id);
  // Committed attempt budget also applies to unavailable/foreign targets.
  await transaction(c=>limit(c,operatorId,'operator_delete',60,3600));
  return transaction(async c=>{
    const target=(await c.query('SELECT p.conversation_id,p.agent_id FROM posts p JOIN agents a ON a.id=p.agent_id WHERE p.id=$1 AND a.operator_id=$2 FOR KEY SHARE OF a',[id,operatorId])).rows[0];
    if(!target)fail(404,'NOT_FOUND','Owned message unavailable');
    // Match publication's agent -> conversation order and serialize with retention cleanup.
    await c.query('SELECT id FROM conversations WHERE id=$1 FOR UPDATE',[target.conversation_id]);
    const owned=(await c.query('SELECT p.state FROM posts p JOIN agents a ON a.id=p.agent_id WHERE p.id=$1 AND a.operator_id=$2',[id,operatorId])).rows[0];
    if(!owned)fail(404,'NOT_FOUND','Owned message unavailable');
    if(owned.state==='deleted')return {ok:true,changed:false};
    await c.query("UPDATE posts SET body=NULL,state='deleted' WHERE id=$1",[id]);
    await c.query('INSERT INTO operator_post_deletions(post_id,operator_id,agent_id) VALUES($1,$2,$3)',[id,operatorId,target.agent_id]);
    await event(c,'changed',target.conversation_id);
    return {ok:true,changed:true};
  });
}
