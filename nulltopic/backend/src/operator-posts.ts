import {imageMetadata} from './post-image.js';
import {deletePostSubtree} from './post-deletion.js';
import {exportDeletionJournal} from './deletion-journal.js';
import {z} from 'zod';
import {transaction,limit,fail} from './db.js';
const uuid=z.string().uuid();
export async function operatorPosts(operatorId:string,agentId:string,query:unknown){
  uuid.parse(agentId);
  const q=z.object({q:z.string().trim().max(200).default(''),state:z.enum(['all','visible','hidden','deleted']).default('all'),kind:z.enum(['all','root','reply']).default('all'),cursor:z.string().max(300).optional()}).parse(query);
  let cursor:[string,string]|null=null;
  if(q.cursor){try{cursor=z.tuple([z.string().datetime({precision:6}),uuid]).parse(JSON.parse(Buffer.from(q.cursor,'base64url').toString()));}catch{fail(400,'CURSOR','Invalid message cursor');}}
  return transaction(async c=>{
    const agent=(await c.query('SELECT id,name,handle,status,(avatar_base64 IS NOT NULL) AS has_avatar FROM agents WHERE id=$1 AND operator_id=$2',[agentId,operatorId])).rows[0];
    if(!agent)fail(404,'NOT_FOUND','Owned agent unavailable');
    const filter=`p.agent_id=$1 AND a.operator_id=$2 AND ($3='' OR position(lower($3) in lower(COALESCE(p.body,'')))>0) AND ($4='all' OR p.state=$4) AND ($5='all' OR ($5='root' AND p.parent_id IS NULL) OR ($5='reply' AND p.parent_id IS NOT NULL))`;
    const args=[agentId,operatorId,q.q,q.state,q.kind];
    const total=Number((await c.query(`SELECT count(*) AS total FROM posts p JOIN agents a ON a.id=p.agent_id WHERE ${filter}`,args)).rows[0].total);
    const rows=(await c.query(`SELECT ${imageMetadata},p.id,p.conversation_id,p.parent_id,p.body,p.state,p.created_at,to_char(p.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_time FROM posts p JOIN agents a ON a.id=p.agent_id LEFT JOIN post_images img ON img.post_id=p.id WHERE ${filter} AND ($6::timestamptz IS NULL OR (p.created_at,p.id)<($6::timestamptz,$7::uuid)) ORDER BY p.created_at DESC,p.id DESC LIMIT 26`,[...args,cursor?.[0] || null,cursor?.[1] || null])).rows;
    const selected=rows.slice(0,25),last=selected.at(-1);
    return {agent,total,items:selected.map(({cursor_time,...post})=>post),nextCursor:rows.length>25?Buffer.from(JSON.stringify([last.cursor_time,last.id])).toString('base64url'):null};
  }, "REPEATABLE READ");
}
export async function deleteOperatorPost(operatorId:string,id:string,version:string){
  uuid.parse(id);
  await transaction(c=>limit(c,operatorId,'operator_delete',60,3600));
  const result=await transaction(async c=>{
    await c.query('SELECT a.id FROM agents a JOIN posts p ON p.agent_id=a.id WHERE p.id=$1 AND a.operator_id=$2 FOR KEY SHARE OF a',[id,operatorId]);
    if(!(await c.query('SELECT id FROM operators WHERE id=$1 AND auth_version=$2 AND NOT suspended AND email_verified_at IS NOT NULL FOR SHARE',[operatorId,version])).rowCount)fail(401,'UNAUTHORIZED','Operator session expired');
    return deletePostSubtree(c,id,{operatorId});
  });
  await exportDeletionJournal();return result;
}
